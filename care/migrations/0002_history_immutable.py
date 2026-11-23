from django.db import migrations

SQL = [
    "CREATE TRIGGER IF NOT EXISTS history_no_update BEFORE UPDATE ON care_history BEGIN SELECT RAISE(ABORT, 'Historico imutavel'); END;",
    "CREATE TRIGGER IF NOT EXISTS history_no_delete BEFORE DELETE ON care_history BEGIN SELECT RAISE(ABORT, 'Historico imutavel'); END;",
]


class Migration(migrations.Migration):
    dependencies = [('care', '0001_initial')]
    operations = [migrations.RunSQL(SQL, reverse_sql=['DROP TRIGGER IF EXISTS history_no_update;', 'DROP TRIGGER IF EXISTS history_no_delete;'])]
