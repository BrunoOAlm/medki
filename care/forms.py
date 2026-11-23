import re
from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import Microarea, Patient, Supply, Unit, User
from .services import patients_for


class LoginForm(AuthenticationForm):
    username = forms.EmailField(label='E-mail', widget=forms.EmailInput(attrs={'autocomplete': 'username'}))


class PatientForm(forms.ModelForm):
    class Meta:
        model = Patient
        fields = ['code', 'initials', 'supplies']
        help_texts = {'initials': 'Somente iniciais, por exemplo M.A.S.', 'supplies': 'Opcional. Selecione com Ctrl ou Command para escolher vários itens.'}

    def __init__(self, *args, user, **kwargs):
        super().__init__(*args, **kwargs)
        self.instance.microarea = user.microarea
        self.fields['supplies'].queryset = Supply.objects.filter(unit=user.unit)

    def clean_initials(self):
        value = self.cleaned_data['initials'].upper().strip()
        if not re.fullmatch(r'[A-ZÀ-Ý](?:[.\s]?[A-ZÀ-Ý]){0,5}\.?', value):
            raise ValidationError('Informe somente as iniciais separadas por ponto ou espaço.')
        return value


class SupplyForm(forms.ModelForm):
    class Meta:
        model = Supply
        fields = ['name', 'category', 'medication']

    def clean(self):
        data = super().clean()
        if data.get('category') == 'diaper' and data.get('medication'):
            self.add_error('medication', 'Fralda geriátrica não é medicamento.')
        if data.get('category') in ['insulin', 'pressure'] and not data.get('medication'):
            self.add_error('medication', 'Esta categoria deve ser marcada como medicamento.')
        return data


class NotificationForm(forms.Form):
    patient = forms.ModelChoiceField(label='Paciente', queryset=Patient.objects.none())
    supply = forms.ModelChoiceField(label='Insumo e categoria', queryset=Supply.objects.none())
    shortage_date = forms.DateField(label='Data da falta', initial=timezone.localdate, widget=forms.DateInput(attrs={'type': 'date'}, format='%Y-%m-%d'))
    note = forms.CharField(label='Observação (opcional)', required=False, max_length=500, widget=forms.Textarea(attrs={'rows': 3}), help_text='Não inclua nome completo, CPF, endereço ou diagnóstico.')

    def __init__(self, *args, user, **kwargs):
        super().__init__(*args, **kwargs)
        patients = patients_for(user)
        self.fields['patient'].queryset = patients
        self.fields['supply'].queryset = Supply.objects.filter(unit_id__in=patients.values('microarea__unit_id')).order_by('name')

    def clean(self):
        data = super().clean()
        p, s = data.get('patient'), data.get('supply')
        if p and s and p.microarea.unit_id != s.unit_id:
            self.add_error('supply', 'Selecione um insumo da unidade do paciente.')
        if data.get('shortage_date') and data['shortage_date'] > timezone.localdate():
            self.add_error('shortage_date', 'A data não pode estar no futuro.')
        return data


class InviteForm(forms.Form):
    email = forms.EmailField(label='E-mail do familiar ou cuidador')


class AcceptForm(forms.Form):
    password = forms.CharField(label='Crie sua senha', widget=forms.PasswordInput(attrs={'autocomplete': 'new-password'}), validators=[validate_password])
    confirmation = forms.CharField(label='Confirme a senha', widget=forms.PasswordInput(attrs={'autocomplete': 'new-password'}))

    def clean(self):
        data = super().clean()
        if data.get('password') != data.get('confirmation'):
            self.add_error('confirmation', 'As senhas devem ser iguais.')
        return data


class AccountForm(forms.ModelForm):
    password = forms.CharField(label='Nova senha', required=False, widget=forms.PasswordInput, validators=[validate_password], help_text='Obrigatória para novas contas. Deixe vazio para manter a atual.')

    class Meta:
        model = User
        fields = ['email', 'role', 'microarea', 'is_active']
        labels = {'is_active': 'Conta ativa', 'microarea': 'Microárea (somente ACS)'}

    def __init__(self, *args, user, **kwargs):
        super().__init__(*args, **kwargs)
        self.instance.unit = user.unit
        self.fields['role'].choices = [(User.Role.ACS, 'ACS'), (User.Role.PHARMACY, 'Farmácia')]
        self.fields['microarea'].queryset = Microarea.objects.filter(unit=user.unit)
        if self.instance.pk:
            self.fields['role'].disabled = True
            self.fields['microarea'].disabled = True

    def clean(self):
        data = super().clean()
        if not self.instance.pk and not data.get('password'):
            self.add_error('password', 'Informe uma senha para a nova conta.')
        return data

    def save(self, commit=True):
        user = super().save(commit=False)
        if self.cleaned_data.get('password'):
            user.set_password(self.cleaned_data['password'])
        if commit:
            user.save()
        return user


class UnitForm(forms.ModelForm):
    class Meta:
        model = Unit
        fields = ['response_days', 'delivery_days']


class PeriodForm(forms.Form):
    start = forms.DateField(label='De', widget=forms.DateInput(attrs={'type': 'date'}, format='%Y-%m-%d'))
    end = forms.DateField(label='Até', widget=forms.DateInput(attrs={'type': 'date'}, format='%Y-%m-%d'))

    def clean(self):
        data = super().clean()
        if data.get('start') and data.get('end') and data['start'] > data['end']:
            raise ValidationError('O início deve ser anterior ao fim do período.')
        return data
