"""API JSON do front estático (figma/, paginas/, assets/).

Só traduz dados para o formato do front; as regras de negócio ficam em services.py e selectors.py.
"""
import json
import re
import secrets
import unicodedata
from datetime import date
from functools import wraps

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied, ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .models import Invitation, Link, Microarea, Notification, Patient, Supply, User
from .permissions import require_role
from .selectors import notifications_for, patients_for
from .services import register, transition

CAT = {'insulin': 'insulina', 'pressure': 'antihipertensivo', 'diaper': 'fralda', 'other': 'outro'}
CAT_IN = {v: k for k, v in CAT.items()}
PERFIL = {'notifier': 'notificante', 'acs': 'acs', 'pharmacy': 'farmacia'}
PERFIL_IN = {v: k for k, v in PERFIL.items()}
ROTULO = dict(Notification.Status.choices)
ROTULO_IN = {v: k for k, v in ROTULO.items()}
PESO = {'insulin': 5, 'pressure': 3, 'diaper': 2, 'other': 1}
ACAO = {'avancar': 'advance', 'sem_sucesso': 'failed', 'cancelar': 'cancel'}


def erro(msg, status=400):
    return JsonResponse({'erro': msg}, status=status)


def corpo(request):
    try:
        dados = json.loads(request.body or b'{}')
    except ValueError:
        raise ValidationError('Requisição inválida.')
    if not isinstance(dados, dict):
        raise ValidationError('Requisição inválida.')
    return dados


def texto(dados, campo):
    return ' '.join(str(dados.get(campo) or '').split())


def protegido(view):
    """Exige sessão e transforma erros de domínio em JSON."""
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return erro('Sua sessão terminou. Entre novamente.', 401)
        try:
            return view(request, *args, **kwargs)
        except PermissionDenied:
            return erro('Você não tem permissão para esta ação.', 403)
        except ObjectDoesNotExist:
            return erro('Registro não encontrado.', 404)
        except ValidationError as exc:
            return erro(' '.join(exc.messages))
    return wrapper


def responsavel(user):
    require_role(user, User.Role.PHARMACY)
    if not user.responsible:
        raise PermissionDenied


# ---------- formato do front ----------
def uid(pk):
    return f'U{pk}'


def nid(n):
    return f'N-{1000 + n.pk}'


def pk_aviso(valor):
    m = re.fullmatch(r'N-(\d+)', str(valor))
    if not m or int(m[1]) <= 1000:
        raise Notification.DoesNotExist
    return int(m[1]) - 1000


def iso(dt):
    return dt.isoformat() if dt else None


def usuario_json(u, com_email=False):
    d = {'id': uid(u.pk), 'nome': u.name or u.email.split('@')[0], 'perfil': PERFIL[u.role], 'responsavel': u.responsible, 'ativo': u.is_active, 'microarea': u.microarea.name if u.microarea_id else None}
    if com_email:
        d['email'] = u.email
    return d


def paciente_json(p):
    return {'id': p.code, 'iniciais': p.initials, 'microarea': p.microarea.name, 'vinculos': [uid(x.pk) for x in p.notifiers.all()], 'medicamentos': [{'nome': s.name, 'categoria': CAT[s.category], 'medicamento': s.medication} for s in p.supplies.all()]}


def aviso_json(n, hoje):
    hist = list(n.history.all())
    fim = timezone.localdate(n.closed_at) if n.closed_at else hoje
    dias = max(0, (fim - n.shortage_date).days)
    extra = 2 if n.patient.medication_count >= 5 else 0  # RN05: só itens marcados como medicamento
    return {
        'id': nid(n), 'pacienteId': n.patient.code, 'insumo': n.supply.name, 'categoria': CAT[n.category],
        'dataFalta': n.shortage_date.isoformat(), 'observacao': n.note, 'criadoEm': iso(n.opened_at), 'criadoPor': uid(n.author_id),
        'status': ROTULO[n.status], 'primeiraResposta': iso(n.first_response_at),
        'historico': [{'status': ROTULO[h.status], 'data': iso(h.created_at), 'usuario': uid(h.author_id), 'nota': h.reason} for h in hist],
        'tentativas': sum(1 for h in hist if h.previous_status == 'shipping' and h.status == 'pending'),
        'motivoCancelamento': next((h.reason for h in hist if h.status == 'cancelled'), ''),
        'prazoRespostaEm': iso(n.response_due), 'prazoEntregaEm': iso(n.delivery_due),
        'prioridade': {'total': PESO[n.category] + dias + extra, 'peso': PESO[n.category], 'dias': dias, 'extra': extra},
        'atraso': n.overdue, 'diasSem': dias,
    }


def insumo_do_catalogo(unidade, nome, categoria):
    """O insumo vem do catálogo da unidade; a categoria de um item já cadastrado não pode ser trocada pelo usuário."""
    if not nome:
        raise ValidationError('Informe o remédio ou insumo.')
    if len(nome) > 100:
        raise ValidationError('O nome do insumo deve ter até 100 caracteres.')
    chave = unicodedata.normalize('NFKC', nome).casefold()
    item = Supply.objects.filter(unit=unidade, key=chave).first()
    if item:
        return item
    if categoria not in CAT:
        raise ValidationError('Escolha a categoria do insumo.')
    try:
        with transaction.atomic():
            return Supply.objects.create(unit=unidade, name=nome, category=categoria, medication=categoria != 'diaper')
    except IntegrityError:
        return Supply.objects.get(unit=unidade, key=chave)


# ---------- leitura ----------
@ensure_csrf_cookie
@require_GET
def estado(request):
    u = request.user
    if not u.is_authenticated:
        return JsonResponse({'usuario': None})
    hoje = timezone.localdate()
    pacientes = list(patients_for(u).prefetch_related('notifiers'))
    avisos = list(notifications_for(u).prefetch_related('history'))
    ids = {u.pk}
    for p in pacientes:
        ids.update(x.pk for x in p.notifiers.all())
    for n in avisos:
        ids.add(n.author_id)
        ids.update(h.author_id for h in n.history.all())
    gestor = u.role == User.Role.PHARMACY and u.responsible
    equipe = User.objects.filter(unit=u.unit, role__in=['acs', 'pharmacy']) if gestor else User.objects.none()
    pessoas = (User.objects.filter(pk__in=ids) | equipe).select_related('microarea').distinct()
    unidade = u.unit or (pacientes[0].microarea.unit if pacientes else None)
    return JsonResponse({
        'usuario': uid(u.pk),
        'unidade': {'nome': unidade.name if unidade else '', 'prazoRespostaUteis': unidade.response_days if unidade else 2, 'prazoEntregaDias': unidade.delivery_days if unidade else 7},
        'usuarios': [usuario_json(x, com_email=x.pk == u.pk or (gestor and x.unit_id == u.unit_id and x.role != 'notifier')) for x in pessoas],
        'pacientes': [paciente_json(p) for p in pacientes],
        'notificacoes': [aviso_json(n, hoje) for n in avisos],
    })


# ---------- sessão (RF01, RNF06) ----------
@require_POST
def entrar(request):
    try:
        dados = corpo(request)
    except ValidationError as exc:
        return erro(' '.join(exc.messages))
    email, senha = str(dados.get('email') or '').strip().lower(), str(dados.get('senha') or '')
    user = authenticate(request, username=email, password=senha)
    if user is None:
        inativo = User.objects.filter(email__iexact=email, is_active=False).first()
        if inativo and inativo.check_password(senha):
            return erro('Esta conta está desativada. Fale com a farmácia da unidade.', 403)
        return erro('E-mail ou senha incorretos.')
    login(request, user)
    return JsonResponse({'ok': uid(user.pk)})


@require_POST
def sair(request):
    logout(request)
    return JsonResponse({'ok': True})


@require_POST
@protegido
def renovar(request):
    return JsonResponse({'ok': True})


# ---------- avisos (RF05, RF06, RF10–RF12) ----------
@require_POST
@protegido
def avisos(request):
    dados = corpo(request)
    paciente = patients_for(request.user).filter(code=dados.get('pacienteId')).select_related('microarea__unit').first()
    if not paciente:
        raise PermissionDenied
    insumo = insumo_do_catalogo(paciente.microarea.unit, texto(dados, 'insumo'), CAT_IN.get(dados.get('categoria')))
    try:
        data_falta = date.fromisoformat(str(dados.get('dataFalta')))
    except ValueError:
        raise ValidationError('Informe a data em que o insumo acabou.')
    n, novo = register(request.user, paciente, insumo, data_falta, str(dados.get('observacao') or '').strip())
    return JsonResponse({'ok': nid(n)} if novo else {'duplicada': nid(n)}, status=201 if novo else 200)


@require_POST
@protegido
def aviso_status(request, aviso):
    dados = corpo(request)
    acao = ACAO.get(dados.get('acao'))
    if not acao:
        raise ValidationError('Ação inválida.')
    esperado = ROTULO_IN.get(dados.get('esperado'))
    n = transition(request.user, pk_aviso(aviso), acao, str(dados.get('motivo') or ''), expected=esperado)
    return JsonResponse({'ok': nid(n), 'status': ROTULO[n.status]})


# ---------- pacientes e convites (RF03, RF04) ----------
@require_POST
@protegido
def pacientes(request):
    u = request.user
    require_role(u, User.Role.ACS)
    dados = corpo(request)
    codigo = str(dados.get('id') or '').strip().upper()
    if not re.fullmatch(r'P-\d{4}', codigo):
        raise ValidationError('O código deve seguir o formato P-0000.')
    if Patient.objects.filter(code=codigo, microarea__unit=u.unit).exists():
        raise ValidationError('Já existe um paciente com este código.')
    iniciais = str(dados.get('iniciais') or '').strip().upper()
    if not re.fullmatch(r'([A-ZÀ-Ú]\.\s?){1,4}', iniciais):
        raise ValidationError('Informe só as iniciais, por exemplo: M. S.')
    itens = [x for x in (dados.get('medicamentos') or []) if isinstance(x, dict) and texto(x, 'nome')]
    with transaction.atomic():
        p = Patient.objects.create(code=codigo, initials=iniciais, microarea=u.microarea)
        p.supplies.set([insumo_do_catalogo(u.unit, texto(x, 'nome'), CAT_IN.get(x.get('categoria'), 'other')) for x in itens])
    return JsonResponse({'ok': p.code}, status=201)


@require_POST
@protegido
def convites(request):
    u = request.user
    require_role(u, User.Role.ACS)
    dados = corpo(request)
    email = str(dados.get('email') or '').strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        raise ValidationError('Informe um e-mail válido.')
    codigos = {str(c) for c in (dados.get('pacientes') or [])}
    if not codigos:
        raise ValidationError('Escolha pelo menos um paciente.')
    escolhidos = list(patients_for(u).filter(code__in=codigos))
    if len(escolhidos) != len(codigos):
        raise PermissionDenied
    existente = User.objects.filter(email__iexact=email).first()
    if existente and existente.role != User.Role.NOTIFIER:
        raise ValidationError('Este e-mail pertence a uma conta da unidade.')
    # Um código para vários pacientes: cada convite recebe o token "<código>.<n>" (token_urlsafe não usa ponto).
    codigo = secrets.token_urlsafe(24)
    with transaction.atomic():
        for i, p in enumerate(escolhidos):
            Invitation.objects.create(patient=p, email=email, created_by=u, token=f'{codigo}.{i}')
    return JsonResponse({'ok': {'convite': codigo, 'contaExistente': bool(existente)}}, status=201)


@require_POST
def convite_aceitar(request):
    try:
        dados = corpo(request)
    except ValidationError as exc:
        return erro(' '.join(exc.messages))
    codigo, nome, senha = str(dados.get('codigo') or '').strip(), texto(dados, 'nome'), str(dados.get('senha') or '')
    if not re.fullmatch(r'[A-Za-z0-9_-]{16,}', codigo):
        return erro('Convite não encontrado, expirado ou já usado.', 404)
    with transaction.atomic():
        lista = [c for c in Invitation.objects.select_for_update().filter(token__startswith=codigo + '.').select_related('patient', 'created_by') if c.valid]
        if not lista:
            return erro('Convite não encontrado, expirado ou já usado.', 404)
        email = lista[0].email
        user = User.objects.filter(email__iexact=email).first()
        if user:
            if user.role != User.Role.NOTIFIER or not user.is_active or not user.check_password(senha):
                return erro('Este e-mail já tem conta no MedKi. Informe a senha dessa conta para aceitar o convite.')
        else:
            if len(nome) < 2:
                return erro('Informe seu nome.')
            try:
                validate_password(senha)
            except ValidationError as exc:
                return erro(' '.join(exc.messages))
            user = User.objects.create_user(email, senha, role=User.Role.NOTIFIER, name=nome)
        for c in lista:
            acs = c.created_by
            if acs.is_active and acs.role == User.Role.ACS and acs.microarea_id == c.patient.microarea_id:
                Link.objects.get_or_create(patient=c.patient, notifier=user, defaults={'created_by': acs})
            c.accepted_at = timezone.now()
            c.save(update_fields=['accepted_at'])
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    return JsonResponse({'ok': uid(user.pk)})


# ---------- gestão da unidade (RF02, RN08) ----------
@require_POST
@protegido
def contas(request, conta=None):
    u = request.user
    responsavel(u)
    dados = corpo(request)
    nome, email = texto(dados, 'nome'), str(dados.get('email') or '').strip().lower()
    perfil, area = PERFIL_IN.get(dados.get('perfil')), str(dados.get('microarea') or '').strip()
    if len(nome) < 2:
        raise ValidationError('Informe o nome.')
    try:
        validate_email(email)
    except ValidationError:
        raise ValidationError('Informe um e-mail válido.')
    if perfil not in ('acs', 'pharmacy'):
        raise ValidationError('Escolha o perfil: Agente Comunitário de Saúde ou Farmácia.')
    if perfil == 'acs' and not re.fullmatch(r'\d{2}', area):
        raise ValidationError('Informe a microárea com 2 dígitos.')
    outro = User.objects.filter(email__iexact=email)
    if conta:
        alvo = User.objects.get(pk=int(conta[1:]) if conta[1:].isdigit() else 0, unit=u.unit, role__in=['acs', 'pharmacy'])
        if alvo.responsible:
            raise PermissionDenied
        if outro.exclude(pk=alvo.pk).exists():
            raise ValidationError('Já existe uma conta com este e-mail.')
        if alvo.role != perfil or (perfil == 'acs' and alvo.microarea.name != area):
            raise ValidationError('O perfil e a microárea de uma conta não mudam, para não levar dados de uma equipe para outra. Desative esta conta e crie uma nova.')
        alvo.name, alvo.email = nome, email
        alvo.full_clean(exclude=['password'])
        alvo.save()
        return JsonResponse({'ok': uid(alvo.pk)})
    if outro.exists():
        raise ValidationError('Já existe uma conta com este e-mail.')
    micro = Microarea.objects.get_or_create(unit=u.unit, name=area)[0] if perfil == 'acs' else None
    senha = secrets.token_urlsafe(9)
    novo = User.objects.create_user(email, senha, role=perfil, unit=u.unit, microarea=micro, name=nome)
    return JsonResponse({'ok': uid(novo.pk), 'senhaProvisoria': senha}, status=201)


@require_POST
@protegido
def conta_alternar(request, conta):
    u = request.user
    responsavel(u)
    alvo = User.objects.get(pk=int(conta[1:]) if conta[1:].isdigit() else 0, unit=u.unit, role__in=['acs', 'pharmacy'])
    if alvo.pk == u.pk or alvo.responsible:
        raise PermissionDenied
    alvo.is_active = not alvo.is_active
    alvo.save(update_fields=['is_active'])
    return JsonResponse({'ok': uid(alvo.pk), 'ativo': alvo.is_active})


@require_POST
@protegido
def prazos(request):
    u = request.user
    responsavel(u)
    dados = corpo(request)
    try:
        resposta, entrega = int(dados.get('resposta')), int(dados.get('entrega'))
    except (TypeError, ValueError):
        raise ValidationError('Informe os prazos em dias inteiros.')
    if not 1 <= resposta <= 30:
        raise ValidationError('A primeira resposta deve ficar entre 1 e 30 dias úteis.')
    if not 1 <= entrega <= 60:
        raise ValidationError('A entrega deve ficar entre 1 e 60 dias corridos.')
    u.unit.response_days, u.unit.delivery_days = resposta, entrega
    u.unit.save(update_fields=['response_days', 'delivery_days'])
    return JsonResponse({'ok': True})
