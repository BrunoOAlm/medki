from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('care', '0002_history_immutable')]

    operations = [
        migrations.AddField(model_name='user', name='name', field=models.CharField(blank=True, max_length=80, verbose_name='Nome')),
    ]
