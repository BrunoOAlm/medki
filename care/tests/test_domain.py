from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from threading import Barrier
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import DatabaseError, IntegrityError, close_old_connections, connection, transaction
from django.test import TestCase, TransactionTestCase
from django.utils import timezone

from care.models import History, Link, Microarea, Notification, Patient, Supply, Unit, User
from care.services import deadline, notifications_for, patients_for, queue, register, transition


class Fixtures:
    def build_data(self):
        self.unit = Unit.objects.create(name='Unidade A')
        self.other_unit = Unit.objects.create(name='Unidade B')
        self.area = Microarea.objects.create(unit=self.unit, name='A1')
        self.area2 = Microarea.objects.create(unit=self.unit, name='A2')
        self.area3 = Microarea.objects.create(unit=self.other_unit, name='B1')
        # Users have unusable passwords in domain tests; login tests set actual hashes.
        self.acs = User.objects.create_user('acs@test.example', role='acs', unit=self.unit, microarea=self.area)
        self.acs2 = User.objects.create_user('acs2@test.example', role='acs', unit=self.unit, microarea=self.area2)
        self.pharmacy = User.objects.create_user('pharmacy@test.example', role='pharmacy', unit=self.unit, responsible=True)
        self.foreign = User.objects.create_user('foreign@test.example', role='pharmacy', unit=self.other_unit)
        self.notifier = User.objects.create_user('notifier@test.example', role='notifier')
        self.unlinked = User.objects.create_user('unlinked@test.example', role='notifier')
        self.patient = Patient.objects.create(code='P1', initials='A.B.', microarea=self.area)
        self.patient2 = Patient.objects.create(code='P2', initials='C.D.', microarea=self.area2)
        self.patient3 = Patient.objects.create(code='P3', initials='E.F.', microarea=self.area3)
        Link.objects.create(patient=self.patient, notifier=self.notifier, created_by=self.acs)
        self.supply = Supply.objects.create(unit=self.unit, name='Insulina', category='insulin', medication=True)
        self.diaper = Supply.objects.create(unit=self.unit, name='Fralda', category='diaper', medication=False)

    def new_notification(self, user=None, patient=None, supply=None, date=None):
        return register(user or self.notifier, patient or self.patient, supply or self.supply, date or timezone.localdate())[0]


class DomainTests(Fixtures, TestCase):
    def setUp(self):
        self.build_data()

    def test_isolation_and_registration_roles(self):
        n = self.new_notification()
        for user in [self.notifier, self.acs, self.pharmacy]:
            self.assertTrue(notifications_for(user).filter(pk=n.pk).exists())
        for user in [self.unlinked, self.acs2, self.foreign]:
            self.assertFalse(notifications_for(user).filter(pk=n.pk).exists())
        for user, patient in [(self.unlinked, self.patient), (self.acs, self.patient2), (self.pharmacy, self.patient)]:
            with self.assertRaises(PermissionDenied):
                self.new_notification(user=user, patient=patient)

    def test_multi_patient_multi_notifier(self):
        Link.objects.create(patient=self.patient, notifier=self.unlinked, created_by=self.acs)
        Link.objects.create(patient=self.patient2, notifier=self.notifier, created_by=self.acs2)
        self.assertEqual(patients_for(self.notifier).count(), 2)
        self.assertEqual(patients_for(self.unlinked).count(), 1)

    def test_duplicate_returns_existing_and_final_allows_new(self):
        n = self.new_notification()
        other, created = register(self.acs, self.patient, self.supply, timezone.localdate())
        self.assertFalse(created)
        self.assertEqual(other.pk, n.pk)
        self.assertEqual(n.history.count(), 1)
        closed = transition(self.notifier, n.pk, 'cancel')
        self.assertIsNone(closed.first_response_at)
        self.assertFalse(closed.overdue)
        self.assertNotEqual(self.new_notification().pk, n.pk)

    def test_database_constraint_rejects_bypass(self):
        n = self.new_notification()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Notification.objects.create(patient=n.patient, supply=n.supply, author=n.author, category=n.category, shortage_date=n.shortage_date, response_due=n.response_due, delivery_due=n.delivery_due)

    def test_priority_weights_days_and_only_medications_count(self):
        n = self.new_notification(date=timezone.localdate() - timedelta(days=3))
        self.patient.supplies.add(self.supply, self.diaper)
        for i in range(3):
            s = Supply.objects.create(unit=self.unit, name=f'Medicamento {i}', category='other', medication=True)
            self.patient.supplies.add(s)
        self.assertEqual(n.priority(), 8)  # 4 medicines + 1 diaper do not earn bonus
        fifth = Supply.objects.create(unit=self.unit, name='Quinto medicamento', category='other', medication=True)
        self.patient.supplies.add(fifth)
        self.assertEqual(n.priority(), 10)
        self.assertEqual(n.priority(timezone.localdate() + timedelta(days=1)), 11)
        for category, weight in [('insulin', 5), ('pressure', 3), ('diaper', 2), ('other', 1)]:
            n.category = category
            self.assertEqual(n.priority(), weight + 3 + 2)

    def test_queue_tie_oldest_first(self):
        now = timezone.now()
        with patch('care.services.timezone.now', return_value=now - timedelta(hours=1)):
            first = self.new_notification(date=timezone.localdate())
        later = self.new_notification(supply=self.diaper, date=timezone.localdate() - timedelta(days=3))
        self.assertEqual([n.pk for n in queue(self.pharmacy, {})], [first.pk, later.pk])

    def test_valid_transitions_failed_delivery_and_history(self):
        n = self.new_notification()
        for action in ['advance', 'advance', 'failed', 'advance', 'advance', 'advance']:
            n = transition(self.pharmacy, n.pk, action, 'Ausente' if action == 'failed' else '')
        self.assertEqual(n.status, 'delivered')
        self.assertEqual(n.history.count(), 7)
        self.assertEqual(list(n.history.values_list('status', flat=True)), ['pending', 'picking', 'shipping', 'pending', 'picking', 'shipping', 'delivered'])
        self.assertIsNotNone(n.first_response_at)
        self.assertIsNotNone(n.closed_at)
        for action in ['advance', 'cancel', 'failed']:
            with self.assertRaises(ValidationError):
                transition(self.pharmacy, n.pk, action, 'Motivo')

    def test_unauthorized_transitions_and_cancellations(self):
        n = self.new_notification()
        for user in [self.acs, self.notifier]:
            with self.assertRaises(PermissionDenied):
                transition(user, n.pk, 'advance')
        with self.assertRaises(ValidationError):
            transition(self.pharmacy, n.pk, 'failed', 'Ausente')
        with self.assertRaises(ValidationError):
            transition(self.pharmacy, n.pk, 'cancel')
        transition(self.pharmacy, n.pk, 'advance')
        with self.assertRaises(PermissionDenied):
            transition(self.notifier, n.pk, 'cancel')
        n = transition(self.pharmacy, n.pk, 'cancel', 'Pedido indevido')
        self.assertEqual(n.status, 'cancelled')
        self.assertEqual(n.history.last().previous_status, 'picking')

    def test_notifier_only_cancels_own_pending(self):
        n = self.new_notification(user=self.acs)
        with self.assertRaises(PermissionDenied):
            transition(self.notifier, n.pk, 'cancel')
        with self.assertRaises(PermissionDenied):
            transition(self.acs, n.pk, 'cancel')

    def test_stale_update_rejected(self):
        n = self.new_notification()
        transition(self.pharmacy, n.pk, 'advance', expected='pending')
        with self.assertRaises(ValidationError):
            transition(self.pharmacy, n.pk, 'advance', expected='pending')

    def test_deadlines_weekend_boundary_and_overdue(self):
        friday = datetime(2026, 11, 20, 10, 30, tzinfo=ZoneInfo('America/Sao_Paulo'))
        self.assertEqual(deadline(friday, 2, True).weekday(), 1)
        self.assertEqual(deadline(friday, 2, True).day, 24)
        with patch('care.services.timezone.now', return_value=friday):
            n = self.new_notification()
        self.assertEqual(n.delivery_due.day, 27)
        with patch('care.models.timezone.now', return_value=n.response_due):
            self.assertFalse(n.overdue)
        with patch('care.models.timezone.now', return_value=n.response_due + timedelta(seconds=1)):
            self.assertTrue(n.overdue)
        with patch('care.services.timezone.now', return_value=friday + timedelta(days=1)):
            n = transition(self.pharmacy, n.pk, 'advance')
        with patch('care.models.timezone.now', return_value=n.delivery_due - timedelta(seconds=1)):
            self.assertFalse(n.overdue)
        with patch('care.models.timezone.now', return_value=n.delivery_due + timedelta(seconds=1)):
            self.assertTrue(n.overdue)
        self.unit.response_days = 10
        self.unit.save()
        n.refresh_from_db()
        self.assertEqual(n.response_due.day, 24)

    def test_future_date_foreign_supply_and_inactive_rejected(self):
        with self.assertRaises(ValidationError):
            self.new_notification(date=timezone.localdate() + timedelta(days=1))
        foreign_supply = Supply.objects.create(unit=self.other_unit, name='Item B', category='other')
        with self.assertRaises(ValidationError):
            self.new_notification(supply=foreign_supply)
        self.notifier.is_active = False
        with self.assertRaises(PermissionDenied):
            self.new_notification()

    def test_queue_has_no_per_row_queries(self):
        self.new_notification()
        self.new_notification(supply=self.diaper)
        with self.assertNumQueries(2):
            rows = queue(self.pharmacy, {})
            for n in rows:
                _ = (n.patient.code, n.patient.microarea.name, n.supply.name, n.overdue, n.score)

    def test_first_response_preserved_after_failed_delivery(self):
        n = self.new_notification()
        n = transition(self.pharmacy, n.pk, 'advance')
        first_response = n.first_response_at
        transition(self.pharmacy, n.pk, 'advance')
        n = transition(self.pharmacy, n.pk, 'failed', 'Pessoa ausente')
        self.assertEqual(n.first_response_at, first_response)
        self.assertEqual(n.status, 'pending')
        self.assertIsNone(n.closed_at)


class ConcurrencyTests(Fixtures, TransactionTestCase):
    def _fixture_teardown(self):
        # Django's test-only flush needs to empty immutable audit tables.
        # Production has no endpoint/command that disables these triggers.
        from importlib import import_module
        sql = import_module('care.migrations.0002_history_immutable').SQL
        with connection.cursor() as cursor:
            cursor.execute('DROP TRIGGER IF EXISTS history_no_update')
            cursor.execute('DROP TRIGGER IF EXISTS history_no_delete')
        try:
            super()._fixture_teardown()
        finally:
            with connection.cursor() as cursor:
                for statement in sql:
                    cursor.execute(statement)

    def setUp(self):
        self.build_data()

    def test_simultaneous_submissions(self):
        barrier = Barrier(2)
        def submit(_):
            close_old_connections()
            try:
                user = User.objects.get(pk=self.notifier.pk)
                patient = Patient.objects.select_related('microarea__unit').get(pk=self.patient.pk)
                supply = Supply.objects.get(pk=self.supply.pk)
                barrier.wait(timeout=10)
                n, created = register(user, patient, supply, timezone.localdate())
                return n.pk, created
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(submit, range(2)))
        self.assertEqual(len(set(pk for pk, _ in results)), 1)
        self.assertEqual(sum(created for _, created in results), 1)
        self.assertEqual(Notification.objects.count(), 1)
        self.assertEqual(History.objects.count(), 1)

    def test_history_immutable_even_queryset_and_sql(self):
        n = self.new_notification()
        h = n.history.get()
        with self.assertRaises(ValidationError):
            h.save()
        with self.assertRaises(ValidationError):
            h.delete()
        with self.assertRaises(DatabaseError), transaction.atomic():
            History.objects.filter(pk=h.pk).update(reason='Alterado')
        with self.assertRaises(DatabaseError), transaction.atomic():
            History.objects.filter(pk=h.pk).delete()
        with self.assertRaises(DatabaseError), transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute('DELETE FROM care_history WHERE id = %s', [h.pk])

    def test_simultaneous_status_updates_only_one_advances(self):
        n = self.new_notification()
        barrier = Barrier(2)
        def advance(_):
            close_old_connections()
            try:
                user = User.objects.get(pk=self.pharmacy.pk)
                barrier.wait(timeout=10)
                try:
                    transition(user, n.pk, 'advance', expected='pending')
                    return 'advanced'
                except ValidationError:
                    return 'stale'
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(advance, range(2)))
        self.assertCountEqual(results, ['advanced', 'stale'])
        n.refresh_from_db()
        self.assertEqual(n.status, 'picking')
        self.assertEqual(n.history.count(), 2)
