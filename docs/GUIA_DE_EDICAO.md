# Como editar o frontend e o backend

O Medki usa um projeto Django com camadas separadas. Frontend e backend ficam no mesmo repositório, com arquivos próprios e integração por formulários HTTP. Não é necessário instalar Node, React ou um compilador para editar as telas.

## Mapa para o grupo

| Quero mudar… | Arquivo ou pasta | Responsabilidade |
| --- | --- | --- |
| Cores do sistema | `static/css/theme.css` | Variáveis de cores compartilhadas |
| Tipografia, navegação e estrutura geral | `static/css/base.css` | Estilos fundamentais |
| Botões, campos, filtros, tabelas e status | `static/css/components.css` | Componentes visuais compartilhados |
| Tela de acesso | `static/css/pages.css`, `templates/login.html` | Apresentação específica da página |
| Comportamento em celular | `static/css/responsive.css` | Regras de largura de tela e movimento reduzido |
| Cabeçalho, rodapé, mensagens ou aviso de sessão | `templates/components/` | Trechos reutilizados pelo layout base |
| Linha de uma notificação | `templates/components/notification_row.html` | Recebe a variável `n` da fila; conserva os cabeçalhos da tabela |
| Conteúdo de uma tela | `templates/*.html` | HTML e apresentação dos dados enviados pela view |
| Rascunho e avisos de conexão | `static/js/draft.js` | Interações no navegador, sem decidir autorização |
| Aviso e renovação de sessão | `static/js/session.js` | Interações com a sessão do servidor |
| Carregamento dos scripts | `static/app.js` | Inicialização dos módulos ES nativos |
| Endereço de uma tela | `config/urls.py` | Rotas e seus nomes usados nos templates |
| Receber um formulário e escolher a resposta | `care/views.py` | Coordenação HTTP: autenticação, formulário, serviço e template |
| Campos, rótulos, ajuda e validação de entrada | `care/forms.py` | Contrato dos formulários; os `name` dos campos fazem parte da integração |
| Consultas, isolamento e ordenação da fila | `care/selectors.py` | Leituras autorizadas por vínculo, microárea e unidade |
| Permissão para executar ações | `care/permissions.py` | Verificações de perfil no servidor |
| Registrar falta, mudar status ou calcular vencimento | `care/services.py` | Operações transacionais e regras de negócio |
| Estados abertos compartilhados | `care/constants.py` | Identificadores usados nas consultas e operações |
| Entidades, atributos e restrições | `care/models.py`, `care/migrations/` | Persistência e integridade do banco |
| Indicadores, PDF e CSV | `care/reports.py` | Agregações e formatos de exportação |
| Configuração e sessão no servidor | `config/settings.py`, `care/middleware.py` | Ambiente e políticas do servidor |
| Testes de regras e fluxo completo | `care/tests/` | Proteção contra regressões |

Os estilos são carregados nesta ordem: **theme → base → components → pages → responsive**. Preserve a ordem para manter a cascata. `static/app.css` é uma entrada de compatibilidade; as páginas carregam as cinco camadas diretamente, permitindo ao navegador buscá-las em paralelo.

## Exemplo: mudar somente o visual

Para trocar a cor principal, edite `--green` e `--dark` em `theme.css`, mantendo contraste adequado. Para mudar a fila, edite `notification_row.html` e as regras `.notification-table` em `components.css`. Preserve cabeçalhos, rótulos de status e a região de rolagem por teclado. Nenhuma migração é necessária.

A apresentação atual prioriza o trabalho de atendimento: acesso direto, registro tabular de notificações, pacientes em linhas e indicadores em resumo/tabelas. Evite reintroduzir slogans, rótulos decorativos sobre títulos ou transformar cada informação em um cartão. A [pesquisa de padrões visuais](PESQUISA_FRONTEND.md) explica as fontes, o diagnóstico e os limites dessa escolha.

Toda página estende `base.html`. Ela pode definir `title`, `content`, `extra_css` e `extra_js`. Por exemplo, para adicionar um CSS específico sem alterar o layout das outras telas:

```django
{% extends 'base.html' %}
{% load static %}
{% block title %}Minha tela | Medki{% endblock %}
{% block extra_css %}
  <link rel="stylesheet" href="{% static 'css/minha-tela.css' %}">
{% endblock %}
{% block content %}
  <h1>Minha tela</h1>
{% endblock %}
```

Crie o arquivo referenciado dentro de `static/css/`. Os arquivos-fonte são legíveis e não precisam de minificação manual. Recarregue a página após editar CSS, HTML ou JS; se o navegador mantiver um arquivo antigo, use recarregamento forçado.

## Exemplo: mudar um fluxo no backend

1. Confira a RN/RF afetada na documentação oficial e os critérios acordados pelo grupo.
2. Ajuste o formulário em `forms.py` se a entrada mudou.
3. Ajuste o caso de uso em `services.py`. Reutilize `selectors.py` para consultar somente os registros autorizados.
4. A view chama o serviço e escolhe uma resposta; o template apresenta o resultado. Não copie as transições ou o cálculo de prioridade para JavaScript.
5. Se houver mudança de dados persistentes, altere o modelo, gere a migração e revise-a antes de aplicar.
6. Execute os testes relevantes e o fluxo completo.

Não esconda permissões apenas nos botões: a ação precisa continuar protegida no servidor. Preserve CSRF, os campos `name`, nomes de rotas e valores de status, ou atualize os dois lados e os testes juntos. Os IDs `shortage-form`, `draft-status`, `shortage-confirm`, `notification-saved`, `session-warning`, `renew-session` e `session-error`, e os atributos `data-authenticated` e `data-user`, são usados pelos módulos JS.

As funções de leitura e permissão continuam disponíveis em `care.services` por compatibilidade com chamadas existentes. Código novo deve importá-las dos módulos responsáveis (`selectors` ou `permissions`). O projeto não oferece uma API REST neste momento: para usar React/Vue em um frontend separado, será preciso definir e implementar uma API autenticada que reutilize esses serviços e regras.

## Trabalhar e validar

```powershell
# Na pasta medki. O servidor recarrega Python automaticamente; não use --noreload ao desenvolver.
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000

# Após mudanças de comportamento ou integração entre camadas:
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test --noinput

# Apenas se os modelos mudaram:
.\.venv\Scripts\python.exe manage.py makemigrations
.\.venv\Scripts\python.exe manage.py migrate
```

O grupo pode dividir trabalho por arquivos: uma pessoa edita templates/CSS, outra formulários/serviços. Combinem alterações no contrato (campos, rotas e dados de contexto) antes de integrar. Criem branches a partir da versão de trabalho acordada e revisem as diferenças antes de mesclar. Nunca incluam banco, `.env`, chave local ou dados reais nos commits.
