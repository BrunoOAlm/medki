"""Read queries and tenant-scoped lists. Never write data here."""
from django.db.models import Count, Q, Prefetch

from .constants import OPEN_STATUSES
from .models import Notification, Patient, Supply, User


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


def queue(user, filters):
    qs = notifications_for(user)
    status = filters.get('status', 'open')
    if status == 'open':
        qs = qs.filter(status__in=OPEN_STATUSES)
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
