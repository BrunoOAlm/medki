# Validação observada — 23/11/2026

## Atualização: revisão dos padrões visuais

Pesquisa multilíngue, diagnóstico e decisões estão em `PESQUISA_FRONTEND.md`. O frontend foi ajustado para tarefas de atendimento: login direto, fila em tabela, pacientes em registros e indicadores em resumo/tabelas. RNF01 (responsividade), RNF02 (acessibilidade) e RNF03 (usabilidade) orientaram a mudança; não houve alteração em RN01–RN09, permissões, dados ou regras de atendimento.

- `manage.py test --noinput -v 1`: **30 testes passaram em 6,835 segundos**, incluindo o fluxo completo e concorrência.
- `manage.py makemigrations --check --dry-run`: **No changes detected**.
- Cliente HTTP do Django + `html.parser` em 11 combinações de página/perfil (login, fila/pacientes nos três perfis, falta para ACS/Notificante e indicadores/contas da Farmácia): **HTTP 200, um H1, IDs únicos e rótulos associados aos campos**.
- Cálculo WCAG por luminância sRGB dos tokens e fundos especificados: texto principal/branco **12,66:1**, secundário/branco **6,37:1**, botão branco/verde **6,97:1**, Pendente/branco **7,21:1**, Saiu para entrega/branco **8,42:1**, atraso/branco **7,71:1**, secundário/fundo da tabela **5,80:1**. São verificações de pares definidos no CSS, não uma auditoria de todas as combinações e estados renderizados.
- Detector Impeccable em `templates` e `static/css`: **`[]`**, sem achados mecânicos. Não se declara qualidade estética certificada nem detecção de autoria humana.
- `git diff --check`: sem erros de whitespace.
- **Desktop/mobile visual não verificado:** inventário CUA sem navegador controlável; janela disponível era gerenciador de senhas, que não foi automatizado. Rolagem horizontal da tabela no celular, zoom e leitor de tela ainda precisam de ensaio real. Não foram produzidas screenshots nem se declara que esses ensaios passaram.

A atualização opcional do Impeccable foi autorizada por Cadu. `npx --yes impeccable update` não reconheceu a instalação antiga; `npx --yes impeccable install --providers=codex --scope=global` instalou **4.10.0** no diretório gerenciado e seus hooks. A cópia antiga foi arquivada em `.evidence/impeccable-4.0.4-backup`, ignorada pelo Git. A sessão usou as instruções carregadas antes da atualização; novas sessões usarão a instalação gerenciada. Essa instalação não é dependência de execução do Medki.

## Atualização: organização para edição pelo grupo

Após o pedido de facilitar mudanças no frontend e backend, foram extraídos componentes de template, cinco camadas de CSS, módulos JS de rascunho/sessão e módulos Python de consultas/permissões. As rotas, formulários, entidades, regras e serviços públicos usados pelos testes foram preservados.

- `manage.py test --noinput -v 1`: **30 testes passaram em 6,954 segundos**, incluindo fluxo HTTP completo, concorrência e permissões.
- `manage.py makemigrations --check --dry-run`: **No changes detected**; nenhuma migração nova.
- `node --check` nos três arquivos JS (`app.js`, `js/draft.js`, `js/session.js`): sem erros de sintaxe. Node foi usado somente para esta verificação, não é necessário para executar o site.
- Comparação do CSS anterior com a concatenação das cinco camadas, desconsiderando espaços: mesmos seletores, regras, valores e ordem. Esta comparação não substitui uma inspeção visual no navegador.
- A limitação anterior da ferramenta de navegador permanece. A reorganização foi verificada por renderização de templates nos testes HTTP e checagens estáticas; os módulos JS ainda precisam de ensaio de interação no navegador.

O mapa e os exemplos estão em `GUIA_DE_EDICAO.md`.

Ambiente: Windows, Python 3.12.14, Django 5.2.19, SQLite em arquivo, ReportLab 4.5.1. Repositório local isolado: `Faculdade/medki`, branch `feature/mvp-medki`. Dados exclusivamente fictícios. Consulte o README para instalação reproduzível.

## Comandos e resultados

| Comando / ação | Resultado efetivamente observado |
| --- | --- |
| `git clone https://github.com/BrunoOAlm/medki.git medki` | Clone concluído com aviso de repositório vazio; nenhuma branch base/código existente. A primeira tentativa de `git ls-remote` dentro do sandbox não alcançou o GitHub; clone autorizado fora do sandbox confirmou o estado. |
| `git switch -c feature/mvp-medki` | Branch de trabalho criada. Arquivos acadêmicos do repositório pai preservados. |
| `python --version` | Alias WindowsApps indisponível neste host. Usado executável Python 3.12.14 do runtime local para criar `.venv`. Não é dependência obrigatória do projeto. |
| `python -m venv .venv` | Ambiente virtual criado. |
| `.venv\Scripts\python.exe -m pip install "Django>=5.2.8,<5.3" "reportlab>=4.4,<5"` | Instalação concluída; versões exatas registradas em `requirements.lock`. |
| `.venv\Scripts\python.exe manage.py makemigrations care` | Migração inicial gerada. Na primeira checagem, a associação M:N exigiu `through_fields` devido às duas FKs de usuário no vínculo; corrigido antes de migrar. |
| `.venv\Scripts\python.exe manage.py migrate --noinput` | Todas as migrações aplicadas com sucesso, incluindo `care.0001_initial` e `care.0002_history_immutable`. |
| `.venv\Scripts\python.exe manage.py showmigrations care` | Ambas as migrações marcadas `[X]`. |
| `.venv\Scripts\python.exe manage.py check` | `System check identified no issues (0 silenced).` |
| `.venv\Scripts\python.exe manage.py makemigrations --check --dry-run` | `No changes detected`. |
| `.venv\Scripts\python.exe -m pip check` | `No broken requirements found.` |
| `.venv\Scripts\python.exe manage.py test --noinput -v 2` | **Rodada final: 30 testes em 6,992 segundos, todos OK.** Banco de testes separado criado, migrado e destruído pelo Django. |
| `.venv\Scripts\python.exe manage.py seed_demo` | Unidade, microáreas, catálogo, paciente, três perfis e duas notificações fictícias criados. Senha gerada apenas na saída local. Segunda execução preservou contas/senhas/registros, confirmando idempotência. |
| `.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000 --noreload` | Servidor iniciado em segundo plano. `Invoke-WebRequest http://127.0.0.1:8000/entrar/ -UseBasicParsing` retornou **HTTP 200**. |
| `.venv\Scripts\python.exe scripts/verify_exports.py` | CSV: HTTP 200, 393 bytes. PDF: HTTP 200, 2464 bytes. Artefatos salvos somente em `.evidence/`, ignorada. |
| `pdftoppm -png -scale-to 1500 -singlefile .evidence/indicadores.pdf .evidence/indicadores` e abertura do PNG | PDF renderizado e examinado visualmente: título, tabela, acentos e notas legíveis, sem cortes ou sobreposição. O Poppler emitiu avisos de fontes de fallback do host, sem impedir renderização. Extração com pypdf confirmou uma página e o conteúdo esperado. |
| `git check-ignore db.sqlite3 .secret_key .venv .evidence .env` | Todos os cinco destinos confirmados como ignorados. |
| `git diff --check` | Sem erros de whitespace antes dos commits. |

Rodadas intermediárias detectaram um conflito de nome da função de preparação dos testes com `TestCase.fixtures` e uma remoção indevida do import `Supply` durante limpeza. Ambos foram corrigidos; a rodada final acima inclui os caminhos afetados. Não há falha de teste pendente conhecida.

## Evidências de aceitação

| Área / requisito | Evidência executada | Resultado |
| --- | --- | --- |
| Fluxo completo RF01–RF05, RF10, RF13 | Teste HTTP: ACS cria paciente → gera convite → nova conta aceita com senha hash → notificante revisa sem gravar → confirma → Farmácia avança três etapas → notificante consulta Entregue e quatro entradas do histórico | Atendido localmente, incluindo formulários e templates; não é um ensaio visual de navegador |
| RN01/RN02/RN09, RF02/RF13 | Perfis sem permissão recebem 403; registro fora do escopo recebe 404; notificante sem vínculo não obtém a duplicada; responsável não acessa contas de outra unidade; área forjada no POST não muda a do ACS | Atendido |
| RN04/RF06 | Dois envios sincronizados por `Barrier` em threads/conexões independentes no SQLite em arquivo | Um ID, uma criação, uma devolução do existente, um histórico; índice também bloqueia tentativa direta de inserção duplicada |
| RN05/RF07–RF08 | Pesos 5/3/2/1, dias, quatro medicamentos + fralda sem bônus, cinco medicamentos com bônus, mudança de dia e empate por antiguidade | Atendido |
| Otimização de consultas | `assertNumQueries(2)` para fila e acesso aos dados dos cartões com múltiplas notificações | Sem consultas por item nos cartões; não demonstra meta RNF09 em 4G |
| RN06–RN07/RF10–RF12 | Transições válidas/inválidas, tentativa em Saiu para entrega, cancelamento por perfil/autor/estado, motivo obrigatório, finais bloqueados | Atendido |
| Concorrência no atendimento | Dois avanços simultâneos com estado esperado Pendente | Um avanço para Em separação; outra ação rejeitada como desatualizada; exatamente duas entradas incluindo abertura |
| RN09/RNF07 | Tentativa de edição/exclusão via instância, QuerySet e SQL direto | Bloqueadas; gatilhos ativos no SQLite |
| RN08/RF14 | Sexta + dois dias úteis = terça; sete corridos; instante exato do prazo e instante posterior; primeira resposta preservada após tentativa; prazo antigo preservado após ajuste da unidade | Atendido conforme calendário provisório documentado |
| RF09 | Status, categoria, microárea e atraso em consultas HTTP | Atendido |
| RF15/RF16 | Entrega com duração controlada de cinco dias: média 5,0; percentual 100%; recorrência 1; unidade alheia total 0; período invertido rejeitado | Atendido conforme definição de coorte do README |
| RF16/segurança | Respostas PDF/CSV, assinatura `%PDF-`, fórmula de planilha neutralizada no CSV, texto de script escapado no HTML | Atendido |
| RF04 | Convite expirado/usado, profissional não convertido em notificante, conta existente exige autenticação do e-mail correto | Atendido |
| RNF05/RNF06 | Login por e-mail sem distinção de caixa, conta desativada, CSRF, métodos POST, cache privado/no-store, expiração por inatividade e renovação | Atendido nos controles locais testados; TLS não exercitado |

## Limitações da verificação

- **Inspeção visual do site no navegador não executada.** O inventário não disponibilizou navegador controlável; ao tentar selecionar o Opera, a ferramenta encerrou Computer Use porque não conseguiu determinar a URL atual no Windows com segurança. Nenhum contorno foi tentado. Fluxos HTTP e templates passaram nos testes, mas responsividade visual, leitor de tela, zoom a 200%, aviso de sessão e reconexão devem ser conferidos pelo grupo.
- **Diagramas são outra evidência:** as seis imagens oficiais foram efetivamente abertas e interpretadas fora dessa tentativa de navegação, antes do bloqueio. Veja `DIAGRAMAS.md`.
- Não foi executada auditoria integral WCAG/LGPD, teste de carga/rede 4G, teste em celular real, TLS ou implantação pública. Não se declara conformidade integral nesses itens.
- A configuração de produção existe, mas não foi usada contra infraestrutura de produção. A CI foi escrita e não executada no GitHub, pois o remoto estava vazio e não houve publicação.
- O teste de queda de conexão/recuperação do rascunho é pendente de navegador. O teste de sessão valida o servidor; não comprova o diálogo JavaScript.

## Revisão de segurança delimitada

Foram examinados `models.py`, `forms.py`, `services.py`, `views.py`, `reports.py`, middleware, configuração e templates quanto a autorização, dados mínimos, CSRF, escape, injeção em CSV, convites e exposição de segredos. A consulta sempre limita paciente/unidade antes de buscar dados de detalhe ou duplicidade. O horário vem do servidor; o formulário não aceita status/autor/unidade como autoridade. Não há operações remotas, pacientes reais nem envio de mensagens.

Limites materiais: sem limitação de tentativas de login, sem auditoria contra administrador do banco, rascunho depende do navegador, uso institucional exige retenção/direitos/backups e controles de produção. Esta revisão não é uma auditoria externa nem uma certificação de segurança.
