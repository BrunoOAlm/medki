"""Local artifact verification; writes fictitious exports only to ignored .evidence/."""
import os
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.test import Client
from django.utils import timezone
from care.models import User

client = Client()
client.force_login(User.objects.get(email='paula@unidade.exemplo'))
directory = Path('.evidence')
directory.mkdir(exist_ok=True)
for fmt in ['csv', 'pdf']:
    response = client.get('/classico/indicadores/', {'start': str(timezone.localdate() - timedelta(days=30)), 'end': str(timezone.localdate()), 'format': fmt})
    assert response.status_code == 200, response.status_code
    target = directory / f'indicadores.{fmt}'
    target.write_bytes(response.content)
    print(f'{fmt}: HTTP {response.status_code}, {len(response.content)} bytes -> {target}')
