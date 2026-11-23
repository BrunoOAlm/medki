from datetime import datetime, timedelta

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Prefetch
from django.utils import timezone

from .models import History, Notification, Patient, Supply, User

OPEN = ['pending', 'picking', 'shipping']


def patients_for(user):
    qs = Patient.objects.select_related('microarea__unit').prefetch_related('supplies')
    if not user.is_active:
        return qs.none()
    if user.role == User.Role.NOTIFIER:
        return qs.filter(notifiers=user)
    if user.role == User.Role.ACS:
        return qs.filter(microarea_id=user.microarea_id, microarea__unit_id=user.unit_id)
    if user.role == User.Role.PHARMACY:
        return qs.filter(microarea__unit_id=user.unit_id)
    return qs.none()


def notifications_for(user):
    patients = Patient.objects.annotate(medication_count=Count('supplies', filter=Q(supplies__medication=True)))
    return Notification.objects.filter(patient__in=patients_for(user)).select_related('supply', 'author').prefetch_related(Prefetch('patient', queryset=patients.select_related('microarea__unit')))


def require_role(user, *roles):
    if not user.is_active or user.role not in roles:
        raise PermissionDenied


def deadline(opened, days, business=False):
    local = timezone.localtime(opened)
    date = local.date()
    while days > 0:
        date += timedelta(days=1)
        if not business or date.weekday() < 5:
            days -= 1
    return timezone.make_aware(datetime.combine(date, local.timetz().replace(tzinfo=None)))


def register(user, patient, supply, shortage_date, note=''):
    require_role(user, User.Role.NOTIFIER, User.Role.ACS)
    if not patients_for(user).filter(pk=patient.pk).exists():
        raise PermissionDenied
    if supply.unit_id != patient.microarea.unit_id:
        raise ValidationError('Selecione um insumo da unidade do paciente.')
    if shortage_date > timezone.localdate():
        raise ValidationError('A data da falta não pode estar no futuro.')
    if len(note) > 500:
        raise ValidationError('A observação deve ter até 500 caracteres.')
    now = timezone.now()
    unit = patient.microarea.unit
    # SQLite BEGIN IMMEDIATE serializes writers; the partial unique index is the invariant.
    try:
        with transaction.atomic():
            n = Notification.objects.create(patient=patient, supply=supply, category=supply.category, shortage_date=shortage_date, note=note, author=user, opened_at=now, response_due=deadline(now, unit.response_days, True), delivery_due=deadline(now, unit.delivery_days))
            History.objects.create(notification=n, author=user, status=n.status, reason='Abertura da notificação')
        return n, True
    except IntegrityError:
        existing = notifications_for(user).filter(patient=patient, supply=supply, status__in=OPEN).first()
        if existing:
            return existing, False
        raise


@transaction.atomic
def transition(user, pk, action, reason='', expected=None):
    n = notifications_for(user).select_for_update().get(pk=pk)
    if expected is not None and n.status != expected:
        raise ValidationError('O status mudou. Atualize a página antes de continuar.')
    old = n.status
    if not n.is_open:
        raise ValidationError('Notificações finalizadas não podem ser alteradas.')
    pharmacy = user.role == User.Role.PHARMACY
    if action == 'cancel':
        allowed = pharmacy and old in ['pending', 'picking']
        allowed |= user.role == User.Role.NOTIFIER and n.author_id == user.pk and old == 'pending'
        if not allowed:
            raise PermissionDenied
        if pharmacy and not reason.strip():
            raise ValidationError('Informe o motivo do cancelamento.')
        n.status = 'cancelled'
    else:
        if not pharmacy:
            raise PermissionDenied
        if action == 'failed' and old == 'shipping':
            if not reason.strip():
                raise ValidationError('Informe o motivo da tentativa sem sucesso.')
            n.status = 'pending'
        elif action == 'advance' and old in OPEN:
            n.status = {'pending': 'picking', 'picking': 'shipping', 'shipping': 'delivered'}[old]
        else:
            raise ValidationError('Transição não permitida.')
    if len(reason) > 500:
        raise ValidationError('O motivo deve ter até 500 caracteres.')
    now = timezone.now()
    if pharmacy and old == 'pending' and n.first_response_at is None:
        n.first_response_at = now
    if not n.is_open:
        n.closed_at = now
    n.save(update_fields=['status', 'first_response_at', 'closed_at'])
    History.objects.create(notification=n, author=user, previous_status=old, status=n.status, reason=reason.strip())
    return n


def queue(user, filters):
    qs = notifications_for(user)
    status = filters.get('status', 'open')
    if status == 'open':
        qs = qs.filter(status__in=OPEN)
    elif status in Notification.Status.values:
        qs = qs.filter(status=status)
    if filters.get('category') in Supply.Category.values:
        qs = qs.filter(category=filters['category'])
    area = filters.get('microarea', '')
    if area.isdigit():
        qs = qs.filter(patient__microarea_id=int(area))
    rows = list(qs)
    for n in rows:
        n.score = n.priority()
    if filters.get('late') == '1':
        rows = [n for n in rows if n.overdue]
    return sorted(rows, key=lambda n: (-n.score, n.opened_at, n.pk))
