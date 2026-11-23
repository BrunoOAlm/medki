import os
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from care.models import Link, Microarea, Patient, Supply, Unit, User
from care.services import register, transition


class Command(BaseCommand):
    help = 'Cria demonstração fictícia idempotente; nunca altera senhas ou dados já existentes.'

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('Demonstração permitida somente com MEDKI_DEBUG=1.')
        password = os.getenv('MEDKI_DEMO_PASSWORD') or secrets.token_urlsafe(16)
        unit, _ = Unit.objects.get_or_create(name='UBS Jardim do Cuidado — FICTÍCIA')
        area, _ = Microarea.objects.get_or_create(unit=unit, name='Microárea 01')
        Microarea.objects.get_or_create(unit=unit, name='Microárea 02')
        users = {}
        created = []
        for email, role, extra in [('farmacia@medki.example', 'pharmacy', {'unit': unit, 'responsible': True}), ('acs@medki.example', 'acs', {'unit': unit, 'microarea': area}), ('familiar@medki.example', 'notifier', {})]:
            user = User.objects.filter(email=email).first()
            if not user:
                user = User.objects.create_user(email, password, role=role, **extra)
                created.append(email)
            users[role] = user
        supplies = []
        for name, category, medication in [('Insulina NPH', 'insulin', True), ('Losartana 50 mg', 'pressure', True), ('Metformina 500 mg', 'other', True), ('Sinvastatina 20 mg', 'other', True), ('AAS 100 mg', 'other', True), ('Fralda geriátrica G', 'diaper', False)]:
            supply, _ = Supply.objects.get_or_create(unit=unit, key=name.casefold(), defaults={'name': name, 'category': category, 'medication': medication})
            supplies.append(supply)
        p, new = Patient.objects.get_or_create(code='DEMO-001', microarea=area, defaults={'initials': 'M.A.S.'})
        if new:
            p.supplies.set(supplies)
        Link.objects.get_or_create(patient=p, notifier=users['notifier'], defaults={'created_by': users['acs']})
        if not p.notification_set.exists():
            register(users['notifier'], p, supplies[0], timezone.localdate() - timedelta(days=3), 'Registro fictício para demonstração.')
            n, _ = register(users['acs'], p, supplies[5], timezone.localdate() - timedelta(days=1))
            transition(users['pharmacy'], n.pk, 'advance')
        self.stdout.write(self.style.SUCCESS('Demonstração preparada. Contas: farmacia@medki.example, acs@medki.example, familiar@medki.example'))
        if created:
            self.stdout.write(f'Senha apenas para contas criadas nesta execução: {password}')
            self.stdout.write('Guarde-a localmente. Não publique senhas ou banco de demonstração no Git.')
        else:
            self.stdout.write('Contas já existiam; senhas e registros foram preservados.')
