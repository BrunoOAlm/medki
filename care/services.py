"""Transactional use cases; templates and views must not reproduce these rules."""
from datetime import datetime, timedelta

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from .constants import OPEN_STATUSES
from .models import History, Notification, User
from .permissions import require_role
# Compatibility exports preserve existing callers of the MVP service module.
from .selectors import notifications_for, patients_for, queue


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
        existing = notifications_for(user).filter(patient=patient, supply=supply, status__in=OPEN_STATUSES).first()
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
        elif action == 'advance' and old in OPEN_STATUSES:
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
