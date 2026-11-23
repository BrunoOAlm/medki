import secrets
import unicodedata
from datetime import timedelta

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone


class Unit(models.Model):
    name = models.CharField('Nome da unidade', max_length=100)
    response_days = models.PositiveSmallIntegerField('Primeira resposta (dias úteis)', default=2)
    delivery_days = models.PositiveSmallIntegerField('Entrega (dias corridos)', default=7)

    def __str__(self):
        return self.name


class Microarea(models.Model):
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT)
    name = models.CharField('Microárea', max_length=60)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['unit', 'name'], name='unique_microarea')]

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    def get_by_natural_key(self, username):
        return self.get(email__iexact=username.strip())

    def create_user(self, email, password=None, **extra):
        user = self.model(email=email.strip().lower(), **extra)
        user.set_password(password)
        user.full_clean(exclude=['password'])
        user.save()
        return user

    def create_superuser(self, email, password, **extra):
        return self.create_user(email, password, is_staff=True, is_superuser=True, **extra)


class User(AbstractUser):
    class Role(models.TextChoices):
        NOTIFIER = 'notifier', 'Notificante'
        ACS = 'acs', 'ACS'
        PHARMACY = 'pharmacy', 'Farmácia'

    username = None
    first_name = None
    last_name = None
    email = models.EmailField('E-mail', unique=True)
    role = models.CharField('Perfil', max_length=12, choices=Role.choices)
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT, null=True, blank=True)
    microarea = models.ForeignKey(Microarea, on_delete=models.PROTECT, null=True, blank=True)
    responsible = models.BooleanField('Farmacêutico responsável', default=False)
    objects = UserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        constraints = [models.UniqueConstraint(Lower('email'), name='unique_email_ci'), models.CheckConstraint(condition=models.Q(role__in=['notifier', 'acs', 'pharmacy']), name='valid_role')]

    def clean(self):
        super().clean()
        self.email = self.email.strip().lower()
        if self.role == self.Role.ACS and (not self.microarea_id or self.microarea.unit_id != self.unit_id):
            raise ValidationError('O ACS precisa de uma microárea da própria unidade.')
        if self.role == self.Role.PHARMACY and not self.unit_id:
            raise ValidationError('A Farmácia precisa de uma unidade.')
        if self.role != self.Role.ACS and self.microarea_id:
            raise ValidationError('Somente ACS possui microárea.')
        if self.responsible and self.role != self.Role.PHARMACY:
            raise ValidationError('Responsável deve ter perfil Farmácia.')


class Supply(models.Model):
    class Category(models.TextChoices):
        INSULIN = 'insulin', 'Insulina'
        PRESSURE = 'pressure', 'Anti-hipertensivo'
        DIAPER = 'diaper', 'Fralda geriátrica'
        OTHER = 'other', 'Outro'

    unit = models.ForeignKey(Unit, on_delete=models.PROTECT)
    name = models.CharField('Insumo', max_length=100)
    key = models.CharField(max_length=100, editable=False)
    category = models.CharField('Categoria', max_length=10, choices=Category.choices)
    medication = models.BooleanField('É medicamento', default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['unit', 'key'], name='unique_supply')]

    def save(self, *args, **kwargs):
        self.name = ' '.join(self.name.split())
        self.key = unicodedata.normalize('NFKC', self.name).casefold()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} — {self.get_category_display()}'


class Patient(models.Model):
    code = models.CharField('Código', max_length=30)
    initials = models.CharField('Iniciais', max_length=12)
    microarea = models.ForeignKey(Microarea, on_delete=models.PROTECT)
    supplies = models.ManyToManyField(Supply, blank=True, verbose_name='Itens de uso contínuo')
    notifiers = models.ManyToManyField(User, through='Link', through_fields=('patient', 'notifier'), related_name='patients')

    class Meta:
        constraints = [models.UniqueConstraint(fields=['microarea', 'code'], name='unique_patient_code')]

    def __str__(self):
        return f'{self.code} ({self.initials})'


class Link(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT)
    notifier = models.ForeignKey(User, on_delete=models.PROTECT)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['patient', 'notifier'], name='unique_link')]


def invite_token():
    return secrets.token_urlsafe(32)


class Invitation(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT)
    email = models.EmailField('E-mail do familiar ou cuidador')
    token = models.CharField(max_length=64, unique=True, default=invite_token)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    @property
    def valid(self):
        return not self.accepted_at and timezone.now() < self.created_at + timedelta(days=7)


class Notification(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendente'
        PICKING = 'picking', 'Em separação'
        SHIPPING = 'shipping', 'Saiu para entrega'
        DELIVERED = 'delivered', 'Entregue'
        CANCELLED = 'cancelled', 'Cancelada'

    patient = models.ForeignKey(Patient, on_delete=models.PROTECT)
    supply = models.ForeignKey(Supply, on_delete=models.PROTECT)
    category = models.CharField(max_length=10, choices=Supply.Category.choices)
    shortage_date = models.DateField('Data da falta')
    note = models.CharField('Observação (opcional)', max_length=500, blank=True)
    author = models.ForeignKey(User, on_delete=models.PROTECT)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    opened_at = models.DateTimeField(default=timezone.now, editable=False)
    first_response_at = models.DateTimeField(null=True, editable=False)
    closed_at = models.DateTimeField(null=True, editable=False)
    response_due = models.DateTimeField(editable=False)
    delivery_due = models.DateTimeField(editable=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['patient', 'supply'], condition=models.Q(status__in=['pending', 'picking', 'shipping']), name='one_open_notification'), models.CheckConstraint(condition=models.Q(status__in=['pending', 'picking', 'shipping', 'delivered', 'cancelled']), name='valid_status')]
        indexes = [models.Index(fields=['status', 'opened_at'])]

    @property
    def is_open(self):
        return self.status in ['pending', 'picking', 'shipping']

    def priority(self, today=None):
        today = today or timezone.localdate()
        count = getattr(self.patient, 'medication_count', None)
        if count is None:
            count = self.patient.supplies.filter(medication=True).count()
        return {'insulin': 5, 'pressure': 3, 'diaper': 2, 'other': 1}[self.category] + max(0, (today - self.shortage_date).days) + (2 if count >= 5 else 0)

    @property
    def overdue(self):
        if not self.is_open:
            return False
        end = self.closed_at or timezone.now()
        response_end = self.first_response_at or end
        response_late = response_end > self.response_due
        delivery_late = end > self.delivery_due
        return response_late or delivery_late


class History(models.Model):
    notification = models.ForeignKey(Notification, on_delete=models.PROTECT, related_name='history')
    author = models.ForeignKey(User, on_delete=models.PROTECT)
    previous_status = models.CharField(max_length=12, choices=Notification.Status.choices, blank=True)
    status = models.CharField(max_length=12, choices=Notification.Status.choices)
    reason = models.CharField('Motivo', max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'pk']

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError('O histórico é imutável.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('O histórico é imutável.')
