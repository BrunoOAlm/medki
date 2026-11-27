import time
from datetime import timedelta
from unittest.mock import patch

from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from care.models import Invitation, Link, Notification, Patient, User
from care.reports import indicators
from care.services import transition
from .test_domain import Fixtures


class WebTests(Fixtures, TestCase):
    def setUp(self):
        self.build_data()

    def as_user(self, user):
        self.client.force_login(user)

    def test_full_journey_acs_invite_notifier_pharmacy_tracking(self):
        self.as_user(self.acs)
        response = self.client.post(reverse('patient_create'), {'code': 'NEW-001', 'initials': 'A.B.', 'supplies': [self.supply.pk]})
        self.assertEqual(response.status_code, 302)
        patient = Patient.objects.get(code='NEW-001')
        self.assertEqual(patient.microarea_id, self.area.pk)
        response = self.client.post(reverse('invite', args=[patient.pk]), {'email': 'new@test.example'})
        self.assertContains(response, 'Convite criado')
        invitation = Invitation.objects.get(patient=patient)
        self.client.logout()
        password = 'Ficticia-medki!72935'
        response = self.client.post(reverse('accept', args=[invitation.token]), {'password': password, 'confirmation': password})
        self.assertEqual(response.status_code, 302)
        user = User.objects.get(email='new@test.example')
        self.assertTrue(user.check_password(password))
        self.assertTrue(Link.objects.filter(notifier=user, patient=patient).exists())
        payload = {'patient': patient.pk, 'supply': self.supply.pk, 'shortage_date': str(timezone.localdate()), 'note': 'Demonstração fictícia.'}
        response = self.client.post(reverse('notification_create'), payload)
        self.assertContains(response, 'Confira antes de enviar')
        self.assertEqual(Notification.objects.count(), 0)
        response = self.client.post(reverse('notification_create') + '?edit=1', payload)
        self.assertContains(response, 'Revisar dados')
        response = self.client.post(reverse('notification_create'), {**payload, 'confirmed': 'yes'})
        self.assertEqual(response.status_code, 302)
        n = Notification.objects.get()
        self.assertEqual(n.author_id, user.pk)
        self.as_user(self.pharmacy)
        self.assertContains(self.client.get('/classico/'), 'Insulina')
        for expected in ['pending', 'picking', 'shipping']:
            self.assertEqual(self.client.post(reverse('change_status', args=[n.pk]), {'action': 'advance', 'expected': expected}).status_code, 302)
        self.as_user(user)
        response = self.client.get(reverse('detail', args=[n.pk]))
        self.assertEqual(response['Cache-Control'], 'private, no-store')
        self.assertContains(response, 'Entregue')
        self.assertEqual(n.history.count(), 4)
        self.assertEqual(self.client.get(reverse('accept', args=[invitation.token])).status_code, 410)

    def test_login_case_insensitive_and_inactive(self):
        self.notifier.set_password('Teste-local!47589')
        self.notifier.save()
        response = self.client.post(reverse('login'), {'username': 'NOTIFIER@TEST.EXAMPLE', 'password': 'Teste-local!47589'})
        self.assertEqual(response.status_code, 302)
        self.client.logout()
        self.notifier.is_active = False
        self.notifier.save()
        response = self.client.post(reverse('login'), {'username': self.notifier.email, 'password': 'Teste-local!47589'})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_pages_scope_and_actions_denied(self):
        n = self.new_notification()
        for user in [self.unlinked, self.acs2, self.foreign]:
            self.as_user(user)
            self.assertEqual(self.client.get(reverse('detail', args=[n.pk])).status_code, 404)
            self.assertEqual(self.client.post(reverse('change_status', args=[n.pk]), {'action': 'advance', 'expected': 'pending'}).status_code, 404)
        for user in [self.notifier, self.acs]:
            self.as_user(user)
            for page in ['accounts', 'account_create', 'report', 'unit_settings']:
                self.assertEqual(self.client.get(reverse(page)).status_code, 403)
        self.as_user(self.pharmacy)
        self.assertEqual(self.client.get(reverse('patient_create')).status_code, 403)
        self.assertEqual(self.client.get(reverse('notification_create')).status_code, 403)
        self.as_user(self.acs)
        self.assertEqual(self.client.get(reverse('invite', args=[self.patient2.pk])).status_code, 404)

    def test_forged_patient_and_supply_do_not_leak_duplicate(self):
        self.new_notification()
        self.as_user(self.unlinked)
        response = self.client.post(reverse('notification_create'), {'patient': self.patient.pk, 'supply': self.supply.pk, 'shortage_date': str(timezone.localdate()), 'confirmed': 'yes'})
        self.assertContains(response, 'Faça uma escolha válida')
        self.assertNotContains(response, 'Já existe uma notificação')
        self.assertEqual(Notification.objects.count(), 1)

    def test_existing_account_invite_requires_identity(self):
        invitation = Invitation.objects.create(patient=self.patient2, email=self.notifier.email, created_by=self.acs2)
        url = reverse('accept', args=[invitation.token])
        self.assertEqual(self.client.post(url).status_code, 302)
        self.as_user(self.unlinked)
        self.assertEqual(self.client.post(url).status_code, 403)
        self.as_user(self.notifier)
        self.assertEqual(self.client.post(url).status_code, 302)
        self.assertTrue(Link.objects.filter(patient=self.patient2, notifier=self.notifier).exists())

    def test_invalid_expired_and_professional_invites(self):
        invitation = Invitation.objects.create(patient=self.patient, email='expired@test.example', created_by=self.acs)
        Invitation.objects.filter(pk=invitation.pk).update(created_at=timezone.now() - timedelta(days=8))
        self.assertEqual(self.client.get(reverse('accept', args=[invitation.token])).status_code, 410)
        self.as_user(self.acs)
        response = self.client.post(reverse('invite', args=[self.patient.pk]), {'email': self.pharmacy.email})
        self.assertContains(response, 'conta profissional')

    def test_account_management_tenant_role_and_deactivation(self):
        self.as_user(self.pharmacy)
        response = self.client.post(reverse('account_create'), {'email': 'worker@test.example', 'role': 'acs', 'microarea': self.area3.pk, 'is_active': 'on', 'password': 'Ficticia!475962'})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(email='worker@test.example').exists())
        response = self.client.post(reverse('account_create'), {'email': 'worker@test.example', 'role': 'acs', 'microarea': self.area.pk, 'is_active': 'on', 'password': 'Ficticia!475962'})
        self.assertEqual(response.status_code, 302)
        worker = User.objects.get(email='worker@test.example')
        self.assertEqual(worker.unit_id, self.unit.pk)
        self.assertFalse(worker.responsible)
        response = self.client.post(reverse('account_edit', args=[worker.pk]), {'email': worker.email, 'role': 'pharmacy', 'microarea': self.area3.pk})
        self.assertEqual(response.status_code, 302)
        worker.refresh_from_db()
        self.assertEqual(worker.role, 'acs')
        self.assertEqual(worker.microarea_id, self.area.pk)
        self.assertFalse(worker.is_active)
        self.assertEqual(self.client.get(reverse('account_edit', args=[self.foreign.pk])).status_code, 404)
        self.assertEqual(self.client.get(reverse('account_edit', args=[self.pharmacy.pk])).status_code, 403)

    def test_csrf_and_post_only(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.pharmacy)
        n = self.new_notification()
        url = reverse('change_status', args=[n.pk])
        self.assertEqual(client.post(url, {'action': 'advance'}).status_code, 403)
        self.assertEqual(client.get(url).status_code, 405)

    def test_session_expires_after_idle_and_renews(self):
        self.as_user(self.notifier)
        session = self.client.session
        session['last_activity'] = time.time() - 1801
        session.save()
        self.assertEqual(self.client.get('/classico/').status_code, 302)
        self.as_user(self.notifier)
        self.assertEqual(self.client.post(reverse('renew')).status_code, 200)
        self.assertLess(time.time() - self.client.session['last_activity'], 5)

    def test_report_values_exports_and_period_validation(self):
        now = timezone.now()
        with patch('care.services.timezone.now', return_value=now - timedelta(days=5)):
            n = self.new_notification()
        for _ in range(3):
            transition(self.pharmacy, n.pk, 'advance')
        self.as_user(self.pharmacy)
        start, end = timezone.localdate() - timedelta(days=30), timezone.localdate()
        data = indicators(self.pharmacy, start, end)
        self.assertEqual(data['average'], 5.0)
        self.assertEqual(data['on_time'], 100.0)
        self.assertEqual(data['recurrence'], [('P1 / A1', 1)])
        for fmt, content_type in [('csv', 'text/csv'), ('pdf', 'application/pdf')]:
            response = self.client.get(reverse('report'), {'start': str(start), 'end': str(end), 'format': fmt})
            self.assertEqual(response.status_code, 200)
            self.assertIn(content_type, response['Content-Type'])
            self.assertGreater(len(response.content), 100)
            if fmt == 'pdf':
                self.assertTrue(response.content.startswith(b'%PDF-'))
        self.assertContains(self.client.get(reverse('report'), {'start': str(end), 'end': str(start)}), 'anterior ao fim')
        self.assertEqual(indicators(self.foreign, start, end)['total'], 0)

    def test_filters_and_html_escaping(self):
        n = self.new_notification()
        self.as_user(self.pharmacy)
        self.assertContains(self.client.get('/classico/', {'category': 'insulin', 'status': 'pending', 'microarea': self.area.pk}), 'Insulina')
        self.assertNotContains(self.client.get('/classico/', {'category': 'diaper'}), f'#{n.pk} ·')
        self.assertNotContains(self.client.get('/classico/', {'microarea': self.area2.pk}), f'#{n.pk} ·')
        Notification.objects.filter(pk=n.pk).update(note='<script>alert(1)</script>', response_due=timezone.now() - timedelta(days=1))
        self.assertContains(self.client.get('/classico/', {'late': '1'}), 'Em atraso')
        response = self.client.get(reverse('detail', args=[n.pk]))
        self.assertContains(response, '&lt;script&gt;')
        self.assertNotContains(response, '<script>alert(1)</script>')

    def test_csv_neutralizes_spreadsheet_formulas(self):
        self.supply.name = '=HYPERLINK("https://example.invalid")'
        self.supply.save()
        self.new_notification()
        self.as_user(self.pharmacy)
        response = self.client.get(reverse('report'), {'start': str(timezone.localdate()), 'end': str(timezone.localdate()), 'format': 'csv'})
        self.assertIn("'=HYPERLINK", response.content.decode('utf-8-sig'))

    def test_patient_cannot_assign_foreign_items_and_rejects_full_name(self):
        self.as_user(self.acs)
        response = self.client.post(reverse('patient_create'), {'code': 'BAD', 'initials': 'Nome Completo', 'microarea': self.area3.pk})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Patient.objects.filter(code='BAD').exists())
        response = self.client.post(reverse('patient_create'), {'code': 'AREA', 'initials': 'A.B.', 'microarea': self.area3.pk})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(Patient.objects.get(code='AREA').microarea_id, self.area.pk)
