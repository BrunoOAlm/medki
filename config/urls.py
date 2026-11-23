from django.contrib.auth import views as auth_views
from django.urls import path
from care import views
from care.forms import LoginForm

urlpatterns = [
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
