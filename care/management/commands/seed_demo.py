import os
import secrets
from datetime import datetime, time, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from care.models import History, Link, Microarea, Notification, Patient, Supply, Unit, User
from care.services import deadline

# Mesmos dados fictícios que o front mostrava antes de ser ligado ao servidor.
USUARIOS = [
    ('paula', 'Paula Ribeiro', 'paula@unidade.exemplo', 'pharmacy', None, True),
    ('rafael', 'Rafael Costa', 'rafael@unidade.exemplo', 'pharmacy', None, False),
    ('joana', 'Joana Lima', 'joana@unidade.exemplo', 'acs', '01', False),
    ('marcos', 'Marcos Silva', 'marcos@unidade.exemplo', 'acs', '02', False),
    ('ana', 'Ana Souza', 'ana@familia.exemplo', 'notifier', None, False),
    ('carlos', 'Carlos Mendes', 'carlos@familia.exemplo', 'notifier', None, False),
]
PACIENTES = [
    ('P-0142', 'M. S.', '01', ['ana'], [('Insulina NPH 100 UI/mL', 'insulin'), ('Losartana 50 mg', 'pressure'), ('Metformina 850 mg', 'other'), ('Sinvastatina 20 mg', 'other'), ('AAS 100 mg', 'other')]),
    ('P-0157', 'J. A.', '01', ['ana'], [('Enalapril 10 mg', 'pressure'), ('Fralda geriátrica G', 'diaper')]),
    ('P-0203', 'R. C.', '02', ['carlos'], [('Insulina Regular 100 UI/mL', 'insulin'), ('Hidroclorotiazida 25 mg', 'pressure'), ('Glibenclamida 5 mg', 'other')]),
    ('P-0219', 'L. F.', '02', ['carlos'], [('Fralda geriátrica M', 'diaper'), ('Atenolol 50 mg', 'pressure'), ('Captopril 25 mg', 'pressure'), ('Omeprazol 20 mg', 'other'), ('Furosemida 40 mg', 'other'), ('Sinvastatina 20 mg', 'other')]),
    ('P-0230', 'E. P.', '01', [], [('Losartana 50 mg', 'pressure'), ('Anlodipino 5 mg', 'pressure')]),
    ('P-0248', 'T. R.', '02', [], [('Insulina NPH 100 UI/mL', 'insulin'), ('Fralda geriátrica G', 'diaper')]),
]
# (paciente, insumo, dias desde a falta, dias desde a abertura, autor, [(status, dias após abrir, quem, motivo)], observação)
AVISOS = [
    ('P-0142', 'Insulina NPH 100 UI/mL', 5, 4, 'ana', [], 'A entrega de terça não chegou.'),
    ('P-0219', 'Fralda geriátrica M', 3, 3, 'carlos', [('picking', 1, 'rafael', '')], ''),
    ('P-0203', 'Hidroclorotiazida 25 mg', 2, 2, 'marcos', [('picking', .4, 'paula', ''), ('shipping', 1.2, 'rafael', '')], ''),
    ('P-0157', 'Enalapril 10 mg', 1, 0, 'ana', [], ''),
    ('P-0230', 'Anlodipino 5 mg', 9, 8, 'joana', [('picking', 1.5, 'rafael', '')], ''),
    ('P-0248', 'Insulina NPH 100 UI/mL', 2, 1, 'marcos', [], ''),
    ('P-0157', 'Enalapril 10 mg', 37, 36, 'ana', [('cancelled', .5, 'ana', 'O remédio chegou por outro meio.')], ''),
    ('P-0203', 'Hidroclorotiazida 25 mg', 62, 61, 'marcos', [('picking', 1, 'rafael', ''), ('cancelled', 2, 'paula', 'Medicamento substituído pela equipe médica.')], ''),
]
# Entregues nos últimos 90 dias, para os indicadores (paciente, insumo, dias desde a abertura, autor, dias até a entrega)
ENTREGUES = [
    ('P-0142', 'Insulina NPH 100 UI/mL', 20, 'ana', 4), ('P-0142', 'Losartana 50 mg', 46, 'ana', 6), ('P-0142', 'Insulina NPH 100 UI/mL', 72, 'joana', 3),
    ('P-0157', 'Fralda geriátrica G', 33, 'ana', 9), ('P-0203', 'Insulina Regular 100 UI/mL', 25, 'carlos', 2), ('P-0203', 'Glibenclamida 5 mg', 58, 'marcos', 8),
    ('P-0219', 'Atenolol 50 mg', 15, 'carlos', 5), ('P-0219', 'Fralda geriátrica M', 40, 'marcos', 7), ('P-0219', 'Omeprazol 20 mg', 64, 'carlos', 4),
    ('P-0230', 'Losartana 50 mg', 28, 'joana', 3), ('P-0248', 'Fralda geriátrica G', 50, 'marcos', 11), ('P-0248', 'Insulina NPH 100 UI/mL', 84, 'marcos', 2),
]


class Command(BaseCommand):
    help = 'Cria a demonstração fictícia do front; não altera senhas nem dados já existentes.'

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('Demonstração permitida somente com MEDKI_DEBUG=1.')
        if User.objects.filter(email='paula@unidade.exemplo').exists():
            self.stdout.write('A demonstração já existe; senhas e registros foram preservados.')
            return
        password = os.getenv('MEDKI_DEMO_PASSWORD') or secrets.token_urlsafe(12)
        unit = Unit.objects.create(name='Clínica da Família Exemplo · UBS Centro')
        areas = {nome: Microarea.objects.create(unit=unit, name=nome) for nome in ('01', '02')}
        u = {}
        for chave, nome, email, role, area, resp in USUARIOS:
            extra = {'unit': unit} if role != 'notifier' else {}
            u[chave] = User.objects.create_user(email, password, name=nome, role=role, microarea=areas.get(area), responsible=resp, **extra)
        insumos = {}

        def insumo(nome, cat):
            if nome not in insumos:
                insumos[nome] = Supply.objects.create(unit=unit, name=nome, category=cat, medication=cat != 'diaper')
            return insumos[nome]

        pacientes = {}
        for codigo, iniciais, area, vinculos, itens in PACIENTES:
            p = Patient.objects.create(code=codigo, initials=iniciais, microarea=areas[area])
            p.supplies.set([insumo(n, c) for n, c in itens])
            acs = u['joana'] if area == '01' else u['marcos']
            for v in vinculos:
                Link.objects.create(patient=p, notifier=u[v], created_by=acs)
            pacientes[codigo] = p

        agora, hoje = timezone.now(), timezone.localdate()
        campo = History._meta.get_field('created_at')
        campo.auto_now_add = False  # só no seed: o histórico fictício precisa de datas passadas
        try:
            for i, (cod, nome, falta, aberto, autor, passos, obs) in enumerate(AVISOS + [(c, n, a + 1, a, au, [('picking', min(1, d / 3), 'rafael', ''), ('shipping', d - .4, 'rafael', ''), ('delivered', d, 'rafael', 'Entregue ao cuidador')], '') for c, n, a, au, d in ENTREGUES]):
                inicio = timezone.make_aware(datetime.combine(hoje - timedelta(days=aberto), time(8 + i % 6, 15)))
                inicio = min(inicio, agora - timedelta(minutes=5))
                self.aviso(unit, pacientes[cod], Supply.objects.get(unit=unit, name=nome), hoje - timedelta(days=falta), inicio, u[autor], [(s, inicio + timedelta(days=d), u[q], m) for s, d, q, m in passos], obs)
        finally:
            campo.auto_now_add = True
        self.stdout.write(self.style.SUCCESS('Demonstração criada: ' + ', '.join(x[2] for x in USUARIOS)))
        self.stdout.write(f'Senha das contas de demonstração: {password}')
        self.stdout.write('Guarde-a localmente. Não publique senhas ou banco de demonstração no Git.')

    def aviso(self, unit, paciente, insumo, data_falta, inicio, autor, passos, obs):
        status, primeira, fim = 'pending', None, None
        for novo, quando, quem, _ in passos:
            if status == 'pending' and quem.role == 'pharmacy' and primeira is None:
                primeira = quando
            status = novo
            if novo in ('delivered', 'cancelled'):
                fim = quando
        n = Notification.objects.create(patient=paciente, supply=insumo, category=insumo.category, shortage_date=data_falta, note=obs, author=autor, status=status, opened_at=inicio, first_response_at=primeira, closed_at=fim, response_due=deadline(inicio, unit.response_days, True), delivery_due=deadline(inicio, unit.delivery_days))
        History.objects.create(notification=n, author=autor, status='pending', reason='Abertura da notificação', created_at=inicio)
        anterior = 'pending'
        for novo, quando, quem, motivo in passos:
            History.objects.create(notification=n, author=quem, previous_status=anterior, status=novo, reason=motivo, created_at=quando)
            anterior = novo
