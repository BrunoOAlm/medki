from django.conf import settings
from django.contrib.auth import views as auth_views
from django.urls import include, path, re_path
from django.views.generic import RedirectView
from django.views.static import serve

from care import api, views
from care.forms import LoginForm

# Telas originais renderizadas pelo Django (mantidas como alternativa em /classico/)
classico = [
    path('', views.dashboard, name='dashboard'),
    path('entrar/', auth_views.LoginView.as_view(template_name='login.html', authentication_form=LoginForm), name='login'),
    path('sair/', auth_views.LogoutView.as_view(), name='logout'),
    path('pacientes/', views.patients, name='patients'),
    path('pacientes/novo/', views.patient_create, name='patient_create'),
    path('insumos/novo/', views.supply_create, name='supply_create'),
    path('pacientes/<int:pk>/convite/', views.invite, name='invite'),
    path('convite/<str:token>/', views.accept, name='accept'),
    path('faltas/nova/', views.notification_create, name='notification_create'),
    path('faltas/<int:pk>/', views.detail, name='detail'),
    path('faltas/<int:pk>/status/', views.change_status, name='change_status'),
    path('contas/', views.accounts, name='accounts'),
    path('contas/nova/', views.account_edit, name='account_create'),
    path('contas/<int:pk>/', views.account_edit, name='account_edit'),
    path('unidade/prazos/', views.unit_settings, name='unit_settings'),
    path('indicadores/', views.report, name='report'),
    path('sessao/renovar/', views.renew, name='renew'),
    path('privacidade/', views.privacy, name='privacy'),
]

api_urls = [
    path('estado', api.estado),
    path('entrar', api.entrar),
    path('sair', api.sair),
    path('sessao/renovar', api.renovar),
    path('avisos', api.avisos),
    path('avisos/<str:aviso>/status', api.aviso_status),
    path('pacientes', api.pacientes),
    path('convites', api.convites),
    path('convites/aceitar', api.convite_aceitar),
    path('contas', api.contas),
    path('contas/<str:conta>', api.contas),
    path('contas/<str:conta>/alternar', api.conta_alternar),
    path('prazos', api.prazos),
]

urlpatterns = [
    path('', RedirectView.as_view(url='/figma/index.html')),
    path('api/', include(api_urls)),
    path('classico/', include(classico)),
    # Site e painel estáticos, servidos pelo Django para ficarem na mesma origem da API (sessão e CSRF)
    re_path(r'^(?P<path>(?:figma|paginas|assets)/.+)$', serve, {'document_root': settings.BASE_DIR}),
]
