from datetime import timedelta

from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.paginator import Paginator
from django.db import IntegrityError, transaction
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.views.decorators.cache import never_cache

from .forms import AcceptForm, AccountForm, InviteForm, NotificationForm, PatientForm, PeriodForm, SupplyForm, UnitForm
from .models import Invitation, Link, Microarea, Notification, Supply, User
from .reports import csv_report, indicators, pdf_report
from .permissions import require_role
from .selectors import notifications_for, patients_for, queue
from .services import register, transition


def form_page(request, form, title, **context):
    return render(request, 'form.html', {'form': form, 'title': title, **context})


@login_required
def dashboard(request):
    rows = queue(request.user, request.GET)
    return render(request, 'dashboard.html', {'page': Paginator(rows, 25).get_page(request.GET.get('page')), 'total': len(rows), 'categories': Supply.Category.choices, 'statuses': Notification.Status.choices, 'areas': Microarea.objects.filter(pk__in=patients_for(request.user).values('microarea_id')), 'filters_query': request.GET.urlencode()})


@login_required
def patients(request):
    return render(request, 'patients.html', {'patients': patients_for(request.user)})


@login_required
def patient_create(request):
    require_role(request.user, 'acs')
    form = PatientForm(request.POST or None, user=request.user)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Paciente cadastrado na sua microárea.')
        return redirect('patients')
    return form_page(request, form, 'Cadastrar paciente', subtitle=f'Microárea: {request.user.microarea}. Não informe dados identificadores diretos.')


@login_required
def supply_create(request):
    require_role(request.user, 'acs', 'pharmacy')
    form = SupplyForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        supply = form.save(commit=False)
        supply.unit = request.user.unit
        try:
            with transaction.atomic():
                supply.save()
            messages.success(request, 'Insumo incluído no catálogo da unidade.')
            return redirect('patients')
        except IntegrityError:
            form.add_error('name', 'Já existe um insumo com esse nome na unidade.')
    return form_page(request, form, 'Cadastrar insumo', subtitle='O catálogo evita nomes diferentes para o mesmo item. A categoria será usada no cálculo de prioridade.')


@login_required
def invite(request, pk):
    require_role(request.user, 'acs')
    patient = get_object_or_404(patients_for(request.user), pk=pk)
    form = InviteForm(request.POST or None)
    url = None
    if request.method == 'POST' and form.is_valid():
        email = form.cleaned_data['email'].lower()
        existing = User.objects.filter(email__iexact=email).first()
        if existing and existing.role != 'notifier':
            form.add_error('email', 'Este e-mail pertence a uma conta profissional. Use outro e-mail para o notificante.')
        else:
            invitation = Invitation.objects.create(patient=patient, email=email, created_by=request.user)
            url = request.build_absolute_uri(reverse('accept', args=[invitation.token]))
    return form_page(request, form, f'Convidar notificante — {patient.code}', invitation_url=url, subtitle='Compartilhe o link de uso único com a pessoa indicada. Ele expira em sete dias. Nenhum e-mail é enviado automaticamente.')


@never_cache
def accept(request, token):
    invitation = get_object_or_404(Invitation, token=token)
    if not invitation.valid:
        return render(request, 'notice.html', {'title': 'Convite indisponível', 'text': 'O convite expirou ou já foi utilizado. Solicite um novo link ao ACS.'}, status=410)
    existing = User.objects.filter(email__iexact=invitation.email).first()
    if existing:
        if not request.user.is_authenticated:
            return redirect(f'{reverse("login")}?next={request.path}')
        if request.user.pk != existing.pk or existing.role != 'notifier' or not existing.is_active:
            raise PermissionDenied
        form = None
    else:
        if request.user.is_authenticated:
            return render(request, 'notice.html', {'title': 'Saia da conta atual', 'text': 'O convite é destinado a uma nova conta. Saia e abra este link novamente.'}, status=403)
        form = AcceptForm(request.POST or None)
    if request.method == 'POST' and (form is None or form.is_valid()):
        with transaction.atomic():
            invitation = Invitation.objects.select_for_update().get(pk=invitation.pk)
            if not invitation.valid:
                raise Http404
            if not invitation.created_by.is_active or invitation.created_by.role != 'acs' or invitation.created_by.microarea_id != invitation.patient.microarea_id:
                raise PermissionDenied
            user = User.objects.filter(email__iexact=invitation.email).first()
            if existing is None:
                if user:
                    messages.error(request, 'A conta foi criada em outra sessão. Entre nela para aceitar o convite.')
                    return redirect('login')
                user = User.objects.create_user(invitation.email, form.cleaned_data['password'], role='notifier')
            elif user.pk != request.user.pk or user.role != 'notifier':
                raise PermissionDenied
            Link.objects.get_or_create(patient=invitation.patient, notifier=user, defaults={'created_by': invitation.created_by})
            invitation.accepted_at = timezone.now()
            invitation.save(update_fields=['accepted_at'])
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        messages.success(request, 'Vínculo confirmado. Você já pode acompanhar o paciente.')
        return redirect('patients')
    return form_page(request, form, 'Aceitar convite', subtitle=f'Confirme o vínculo com o paciente {invitation.patient.code}. Conta: {invitation.email}', button='Aceitar vínculo')


@login_required
def notification_create(request):
    require_role(request.user, 'notifier', 'acs')
    form = NotificationForm(request.POST or None, user=request.user)
    if request.GET.get('edit') == '1':
        return form_page(request, form, 'Registrar falta', button='Revisar dados', draft=True)
    if request.method == 'POST' and form.is_valid():
        if request.POST.get('confirmed') != 'yes':
            return render(request, 'confirm.html', {'form': form, 'data': form.cleaned_data})
        n, created = register(request.user, **form.cleaned_data)
        messages.success(request, 'Falta registrada.' if created else 'Já existe uma notificação aberta para este paciente e insumo.')
        return redirect('detail', pk=n.pk)
    return form_page(request, form, 'Registrar falta', button='Revisar dados', draft=True)


@login_required
def detail(request, pk):
    n = get_object_or_404(notifications_for(request.user), pk=pk)
    can_cancel = (request.user.role == 'pharmacy' and n.status in ['pending', 'picking']) or (request.user.role == 'notifier' and n.author_id == request.user.pk and n.status == 'pending')
    return render(request, 'detail.html', {'n': n, 'history': n.history.select_related('author'), 'can_cancel': can_cancel, 'next_label': {'pending': 'Iniciar separação', 'picking': 'Registrar saída para entrega', 'shipping': 'Confirmar entrega'}.get(n.status)})


@login_required
@require_POST
def change_status(request, pk):
    get_object_or_404(notifications_for(request.user), pk=pk)
    try:
        transition(request.user, pk, request.POST.get('action'), request.POST.get('reason', ''), expected=request.POST.get('expected', ''))
        messages.success(request, 'Atualização registrada no histórico.')
    except ValidationError as exc:
        messages.error(request, ' '.join(exc.messages))
    return redirect('detail', pk=pk)


def responsible(user):
    require_role(user, 'pharmacy')
    if not user.responsible:
        raise PermissionDenied


@login_required
def accounts(request):
    responsible(request.user)
    return render(request, 'accounts.html', {'accounts': User.objects.filter(unit=request.user.unit, role__in=['acs', 'pharmacy']).select_related('microarea')})


@login_required
def account_edit(request, pk=None):
    responsible(request.user)
    instance = get_object_or_404(User, pk=pk, unit=request.user.unit, role__in=['acs', 'pharmacy']) if pk else None
    if instance and instance.responsible:
        raise PermissionDenied
    form = AccountForm(request.POST or None, user=request.user, instance=instance)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Conta salva. Perfil e microárea de contas existentes são preservados para manter o isolamento.')
        return redirect('accounts')
    return form_page(request, form, 'Editar conta' if pk else 'Criar conta profissional')


@login_required
def unit_settings(request):
    responsible(request.user)
    form = UnitForm(request.POST or None, instance=request.user.unit)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Prazos salvos para as próximas notificações. Os prazos já registrados foram preservados.')
        return redirect('dashboard')
    return form_page(request, form, 'Prazos da unidade', subtitle='Dias úteis: segunda a sexta. Feriados não são descontados nesta demonstração.')


@login_required
def report(request):
    require_role(request.user, 'pharmacy')
    today = timezone.localdate()
    form = PeriodForm(request.GET or {'start': str(today - timedelta(days=29)), 'end': str(today)})
    data = None
    if form.is_valid():
        data = indicators(request.user, **form.cleaned_data)
        if request.GET.get('format') == 'csv':
            return csv_report(data)
        if request.GET.get('format') == 'pdf':
            return pdf_report(data, request.user.unit)
    return render(request, 'report.html', {'form': form, 'data': data})


@login_required
@require_POST
def renew(request):
    return JsonResponse({'ok': True})


def privacy(request):
    return render(request, 'notice.html', {'title': 'Privacidade', 'text': 'Demonstração acadêmica: use somente dados fictícios. Guardamos código, iniciais, microárea, itens contínuos e notificações do paciente; e-mail e senha protegida por hash dos usuários. Não informe nome completo, CPF, endereço ou diagnóstico, inclusive em observações e motivos. O acesso depende do perfil, unidade, microárea e vínculo. O histórico de atendimento é imutável. Para entrega, a unidade consulta o código em seu próprio cadastro. Antes de uso real, a instituição deve definir controlador, canal de direitos, fundamento legal, retenção e política de incidentes.'})
