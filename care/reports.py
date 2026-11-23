import csv
import io
from collections import Counter
from datetime import timedelta
from html import escape

from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from .services import notifications_for


def indicators(user, start, end):
    rows = list(notifications_for(user).filter(opened_at__date__gte=start, opened_at__date__lte=end))
    delivered = [n for n in rows if n.status == 'delivered']
    durations = [(n.closed_at - n.opened_at).total_seconds() / 86400 for n in delivered]
    window_start = end - timedelta(days=89)
    # Include microarea in labels because patient codes may repeat between microareas.
    recurrence = Counter(f'{n.patient.code} / {n.patient.microarea.name}' for n in notifications_for(user).filter(opened_at__date__range=(window_start, end)))
    return {'start': start, 'end': end, 'total': len(rows), 'delivered': len(delivered), 'average': round(sum(durations) / len(durations), 2) if durations else None, 'on_time': round(100 * sum(d <= 7 for d in durations) / len(durations), 1) if durations else None, 'supplies': sorted(Counter(n.supply.name for n in rows).items()), 'areas': sorted(Counter(n.patient.microarea.name for n in rows).items()), 'recurrence': sorted(recurrence.items()), 'window_start': window_start}


def report_rows(data):
    result = [['Indicador', 'Grupo', 'Valor'], ['Período', 'Início', str(data['start'])], ['Período', 'Fim', str(data['end'])], ['Notificações', 'Total', data['total']], ['Entregas', 'Total', data['delivered']], ['Tempo médio (dias)', 'Entregas', data['average'] if data['average'] is not None else 'Sem entregas'], ['Entregas até 7 dias (%)', 'Entregas', data['on_time'] if data['on_time'] is not None else 'Sem entregas']]
    for key, label in [('supplies', 'Faltas por insumo'), ('areas', 'Faltas por microárea'), ('recurrence', f'Recorrência {data["window_start"]} a {data["end"]}')]:
        result.extend([[label, group, value] for group, value in data[key]])
    return result


def csv_report(data):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="medki-indicadores.csv"'
    response.write('\ufeff')
    writer = csv.writer(response, delimiter=';')
    for row in report_rows(data):
        writer.writerow([("'" + value if value.lstrip().startswith(('=', '+', '-', '@', '\t', '\r')) else value) if isinstance(value, str) else value for value in row])
    return response


def pdf_report(data, unit):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=(21 * cm, 29.7 * cm), rightMargin=1.5 * cm, leftMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    contents = [Paragraph('Medki | Indicadores de atendimento', styles['Title']), Paragraph(escape(unit.name), styles['Normal']), Spacer(1, .5 * cm)]
    rows = [[Paragraph(escape(str(v)), styles['BodyText']) for v in row] for row in report_rows(data)]
    table = Table(rows, colWidths=[6 * cm, 8 * cm, 4 * cm], repeatRows=1)
    table.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ddeee9')), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BOTTOMPADDING', (0, 0), (-1, -1), 8), ('LINEBELOW', (0, 0), (-1, -1), .3, colors.HexColor('#ccd6d2'))]))
    contents.extend([table, Spacer(1, .5 * cm), Paragraph('Coorte: notificações abertas no período. Recorrência: janela de 90 dias encerrada no fim selecionado. Sem dados identificadores diretos.', styles['Normal'])])
    doc.build(contents)
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="medki-indicadores.pdf"'
    return response
