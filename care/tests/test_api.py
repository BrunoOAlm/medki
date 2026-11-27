import json
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from care.models import Link, Microarea, Notification, Patient, Supply, Unit, User


class ApiTests(TestCase):
    """Fluxos da API usada pelo front, regra a regra do documento."""

    def setUp(self):
        self.unit = Unit.objects.create(name='UBS Teste')
        self.a1 = Microarea.objects.create(unit=self.unit, name='01')
        self.a2 = Microarea.objects.create(unit=self.unit, name='02')
        mk = User.objects.create_user
        self.farm = mk('farm@t.ex', 'senha-forte-1', role='pharmacy', unit=self.unit, responsible=True, name='Paula')
        self.farm2 = mk('farm2@t.ex', 'senha-forte-1', role='pharmacy', unit=self.unit, name='Rafael')
        self.acs = mk('acs@t.ex', 'senha-forte-1', role='acs', unit=self.unit, microarea=self.a1, name='Joana')
        self.fam = mk('fam@t.ex', 'senha-forte-1', role='notifier', name='Ana')
        self.ins = Supply.objects.create(unit=self.unit, name='Insulina NPH', category='insulin')
        meds = [Supply.objects.create(unit=self.unit, name=f'Remedio {i}', category='other') for i in range(4)]
        self.fralda = Supply.objects.create(unit=self.unit, name='Fralda G', category='diaper', medication=False)
        self.pac = Patient.objects.create(code='P-0001', initials='M. S.', microarea=self.a1)
        self.pac.supplies.set([self.ins, *meds, self.fralda])
        self.outro = Patient.objects.create(code='P-0002', initials='J. A.', microarea=self.a2)
        Link.objects.create(patient=self.pac, notifier=self.fam, created_by=self.acs)

    def entrar(self, user):
        self.client.logout()
        r = self.post('entrar', {'email': user.email, 'senha': 'senha-forte-1'})
        self.assertEqual(r.status_code, 200, r.content)

    def post(self, url, dados=None):
        return self.client.post('/api/' + url, json.dumps(dados or {}), content_type='application/json')

    def estado(self):
        return self.client.get('/api/estado').json()

    def avisar(self, insumo='Insulina NPH', categoria='insulina', dias=0, paciente='P-0001'):
        return self.post('avisos', {'pacienteId': paciente, 'insumo': insumo, 'categoria': categoria, 'dataFalta': str(timezone.localdate() - timedelta(days=dias))})

    def test_sem_sessao_nao_ve_dados(self):
        self.assertEqual(self.estado(), {'usuario': None})
        self.assertEqual(self.avisar().status_code, 401)

    def test_login_errado_e_conta_desativada(self):
        self.assertEqual(self.post('entrar', {'email': 'fam@t.ex', 'senha': 'errada'}).status_code, 400)
        self.fam.is_active = False
        self.fam.save()
        self.assertEqual(self.post('entrar', {'email': 'fam@t.ex', 'senha': 'senha-forte-1'}).status_code, 403)

    def test_rn09_visibilidade_por_perfil(self):
        self.entrar(self.fam)
        self.assertEqual([p['id'] for p in self.estado()['pacientes']], ['P-0001'])
        self.entrar(self.acs)
        self.assertEqual([p['id'] for p in self.estado()['pacientes']], ['P-0001'])
        self.entrar(self.farm)
        self.assertEqual({p['id'] for p in self.estado()['pacientes']}, {'P-0001', 'P-0002'})

    def test_rn04_rf06_duplicidade_e_categoria_do_catalogo(self):
        self.entrar(self.fam)
        r = self.avisar(insumo='  insulina   NPH ', categoria='fralda')
        self.assertEqual(r.status_code, 201)
        aviso = self.estado()['notificacoes'][0]
        self.assertEqual(aviso['categoria'], 'insulina')  # o catálogo decide, não quem avisa
        r2 = self.avisar(insumo='INSULINA NPH')
        self.assertEqual(r2.json(), {'duplicada': aviso['id']})
        self.assertEqual(Notification.objects.count(), 1)

    def test_notificante_sem_vinculo_e_data_futura(self):
        self.entrar(self.fam)
        self.assertEqual(self.avisar(paciente='P-0002').status_code, 403)
        self.assertEqual(self.avisar(dias=-1).status_code, 400)

    def test_rn05_prioridade_ignora_fralda(self):
        self.entrar(self.acs)
        self.avisar(dias=3)
        prio = self.estado()['notificacoes'][0]['prioridade']
        # 4 remédios + insulina = 5 medicamentos (a fralda não conta)
        self.assertEqual(prio, {'total': 5 + 3 + 2, 'peso': 5, 'dias': 3, 'extra': 2})
        self.pac.supplies.remove(Supply.objects.get(name='Remedio 0'))
        self.assertEqual(self.estado()['notificacoes'][0]['prioridade']['extra'], 0)

    def test_rn06_rn07_ciclo_de_status(self):
        self.entrar(self.fam)
        nid = self.avisar().json()['ok']
        url = f'avisos/{nid}/status'
        self.assertEqual(self.post(url, {'acao': 'avancar'}).status_code, 403)  # só a farmácia
        self.entrar(self.acs)
        self.assertEqual(self.post(url, {'acao': 'cancelar'}).status_code, 403)  # ACS não cancela
        self.entrar(self.farm2)
        self.assertEqual(self.post(url, {'acao': 'cancelar', 'motivo': ''}).status_code, 400)  # motivo obrigatório
        self.assertEqual(self.post(url, {'acao': 'avancar', 'esperado': 'Pendente'}).json()['status'], 'Em separação')
        self.assertEqual(self.post(url, {'acao': 'avancar', 'esperado': 'Pendente'}).status_code, 400)  # página desatualizada
        self.post(url, {'acao': 'avancar'})
        self.assertEqual(self.post(url, {'acao': 'sem_sucesso', 'motivo': 'ninguém em casa'}).json()['status'], 'Pendente')
        aviso = self.estado()['notificacoes'][0]
        self.assertEqual(aviso['tentativas'], 1)
        self.assertTrue(aviso['primeiraResposta'])
        for _ in range(3):
            self.post(url, {'acao': 'avancar'})
        self.assertEqual(self.post(url, {'acao': 'cancelar', 'motivo': 'x'}).status_code, 400)  # Entregue é final

    def test_rn07_notificante_cancela_o_proprio_pendente(self):
        self.entrar(self.fam)
        nid = self.avisar().json()['ok']
        self.assertEqual(self.post(f'avisos/{nid}/status', {'acao': 'cancelar'}).json()['status'], 'Cancelada')

    def test_rn02_rf03_cadastro_de_paciente(self):
        self.entrar(self.acs)
        self.assertEqual(self.post('pacientes', {'id': 'P-0100', 'iniciais': 'A. B.', 'medicamentos': []}).status_code, 201)
        p = Patient.objects.get(code='P-0100')
        self.assertEqual(p.microarea, self.a1)  # a microárea vem da conta do ACS
        self.assertEqual(self.post('pacientes', {'id': 'P-0100', 'iniciais': 'A. B.'}).status_code, 400)
        self.assertEqual(self.post('pacientes', {'id': 'P-0101', 'iniciais': 'Maria Silva'}).status_code, 400)
        self.entrar(self.farm)
        self.assertEqual(self.post('pacientes', {'id': 'P-0102', 'iniciais': 'A. B.'}).status_code, 403)

    def test_rf04_convite_novo_e_conta_existente(self):
        self.entrar(self.acs)
        self.assertEqual(self.post('convites', {'email': 'farm@t.ex', 'pacientes': ['P-0001']}).status_code, 400)
        self.assertEqual(self.post('convites', {'email': 'x@t.ex', 'pacientes': ['P-0002']}).status_code, 403)
        codigo = self.post('convites', {'email': 'novo@t.ex', 'pacientes': ['P-0001']}).json()['ok']['convite']
        self.client.logout()
        self.assertEqual(self.post('convites/aceitar', {'codigo': codigo, 'nome': 'Novo', 'senha': '12345678'}).status_code, 400)
        self.assertEqual(self.post('convites/aceitar', {'codigo': codigo, 'nome': 'Novo', 'senha': 'cuidado-2026'}).status_code, 200)
        self.assertEqual([p['id'] for p in self.estado()['pacientes']], ['P-0001'])
        self.client.logout()
        self.assertEqual(self.post('convites/aceitar', {'codigo': codigo, 'nome': 'Novo', 'senha': 'cuidado-2026'}).status_code, 404)  # uso único

    def test_rf02_contas_e_rn08_prazos_so_para_o_responsavel(self):
        self.entrar(self.farm2)
        self.assertEqual(self.post('prazos', {'resposta': 3, 'entrega': 10}).status_code, 403)
        self.assertEqual(self.post('contas', {'nome': 'Bia', 'email': 'bia@t.ex', 'perfil': 'acs', 'microarea': '02'}).status_code, 403)
        self.entrar(self.farm)
        r = self.post('contas', {'nome': 'Bia', 'email': 'bia@t.ex', 'perfil': 'acs', 'microarea': '02'})
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json()['senhaProvisoria'])
        uid = r.json()['ok']
        self.assertEqual(self.post(f'contas/{uid}', {'nome': 'Bia', 'email': 'bia@t.ex', 'perfil': 'farmacia'}).status_code, 400)
        self.assertFalse(self.post(f'contas/{uid}/alternar').json()['ativo'])
        self.assertEqual(self.post(f'contas/U{self.farm.pk}/alternar').status_code, 403)
        self.assertEqual(self.post('prazos', {'resposta': 0, 'entrega': 10}).status_code, 400)
        self.assertEqual(self.post('prazos', {'resposta': 3, 'entrega': 10}).status_code, 200)
        self.assertEqual(self.estado()['unidade']['prazoEntregaDias'], 10)

    def test_historico_nao_muda_e_api_exige_csrf(self):
        self.entrar(self.fam)
        self.avisar()
        n = Notification.objects.get()
        with self.assertRaises(Exception):
            h = n.history.get()
            h.reason = 'alterado'
            h.save()
        from django.test import Client
        csrf = Client(enforce_csrf_checks=True)
        csrf.force_login(self.fam)
        self.assertEqual(csrf.post('/api/avisos', '{}', content_type='application/json').status_code, 403)
