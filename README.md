# Medki — RemédioEmCasa-Alerta

MVP web acadêmico para registrar faltas de medicamentos e outros insumos, organizar a fila da unidade de saúde e acompanhar o atendimento. **Use somente dados fictícios.** Django 5.2 LTS, templates, SQLite e ReportLab; sem serviço externo obrigatório.

## Rodar localmente

Requer Python **3.12+**, Git e acesso ao PyPI na instalação. Execute na pasta deste repositório.

Windows / PowerShell:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_demo
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Linux / macOS:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.lock
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo
.venv/bin/python manage.py runserver 127.0.0.1:8000
```

Abra **http://127.0.0.1:8000/**. No Windows, `abrir-site.bat` faz todos os passos acima e abre o navegador. Se `py` não existir, substitua pelo caminho do Python instalado. Não precisa ativar o ambiente virtual. `requirements.lock` fixa as versões verificadas; `requirements.txt` descreve as faixas para atualizações deliberadas. Atualizar dependências exige rodar os testes novamente.

O Django serve tudo no mesmo endereço:

| Endereço | O que é |
| --- | --- |
| `/figma/index.html` e `/paginas/` | Site e painel (front em HTML, CSS e JavaScript) |
| `/api/` | API JSON usada pelo painel; as regras ficam em `care/services.py` e `care/selectors.py` (`care/api.py` só traduz o formato) |
| `/classico/` | Telas originais renderizadas pelo Django, mantidas como alternativa |

O front não funciona aberto direto do disco nem em outro servidor: ele precisa da API no mesmo endereço (sessão e CSRF).

O comando `seed_demo` cria a unidade fictícia, duas microáreas, o catálogo, seis pacientes, vínculos e 90 dias de avisos para os indicadores. É idempotente: não troca senhas nem sobrescreve registros existentes. Gera uma senha aleatória **impressa somente no terminal**, comum a todas as contas:

| E-mail fictício | Perfil | Acesso |
| --- | --- | --- |
| `paula@unidade.exemplo` | Farmácia responsável | Unidade; contas e prazos |
| `rafael@unidade.exemplo` | Farmácia | Unidade |
| `joana@unidade.exemplo` | ACS | Microárea 01 |
| `marcos@unidade.exemplo` | ACS | Microárea 02 |
| `ana@familia.exemplo` | Notificante | P-0142 e P-0157 |
| `carlos@familia.exemplo` | Notificante | P-0203 e P-0219 |

Guarde a senha localmente. Opcionalmente defina `MEDKI_DEMO_PASSWORD` antes do primeiro seed. Nunca publique a senha, o banco, capturas com credenciais, `.env` ou `.secret_key`. O seed só roda em modo de demonstração (`MEDKI_DEBUG=1`). Não há senha universal no código.

## Demonstração com os três perfis

1. Entre como **ACS**. Em Pacientes → Cadastrar paciente, informe código e iniciais. A microárea vem da conta, sem permitir troca pelo formulário. A lista de uso contínuo pode ficar vazia. Cadastre novos itens no catálogo quando necessário, distinguindo medicamento de outro insumo.
2. No cartão do paciente, clique **Convidar familiar ou cuidador**, informe um e-mail fictício e copie o link. Saia da conta do ACS antes de abrir o convite na mesma janela. Convites expiram em sete dias, são de uso único e exigem confirmação pelo destinatário. Para uma conta existente, entre com o e-mail convidado; para uma nova, crie uma senha. Nenhum e-mail é enviado automaticamente.
3. Como **Notificante**, clique Registrar falta, escolha paciente e insumo/categoria, data e observação opcional. Revise os dados antes de confirmar. Uma duplicada leva à notificação existente, sem criar nova. Só registros autorizados são consultados.
4. Como **Farmácia**, consulte a fila por maior pontuação, com desempate pela abertura mais antiga. Filtre status, categoria, microárea ou atraso. No detalhe, use Iniciar separação → Registrar saída para entrega → Confirmar entrega. Em Saiu para entrega, uma tentativa sem sucesso com motivo retorna para Pendente. A Farmácia cancela Pendente/Em separação com motivo.
5. Volte ao **Notificante** para ver status, prazos e histórico. Pode cancelar somente a própria notificação Pendente. O ACS acompanha sua microárea e registra faltas, mas não opera o atendimento nem cancela.
6. Na **Farmácia**, abra Indicadores, escolha o período e exporte CSV ou PDF. Como responsável, use Contas para criar, editar e desativar profissionais da unidade e Prazos para configurar as próximas notificações.

Entregue e Cancelada são finais. Uma nova falta após encerramento é uma nova notificação. Nunca se apaga o histórico para corrigir atendimento.

## Regras e decisões de implementação

- RN01–RN09/RF01–RF16 foram lidos no Google Docs vigente em **23/11/2026**. [Fonte e revisão](docs/REQUISITOS_CONSULTADOS.md). As **seis figuras** das seções 2.3–2.7 foram abertas e interpretadas visualmente, incluindo as duas de classes: [registro por figura](docs/DIAGRAMAS.md). Nenhum PDF oficial estava anexado no workspace; foram usadas as imagens incorporadas ao documento.
- Um usuário tem um único perfil. Responsável é um atributo da Farmácia, não um quarto perfil. O seed provisiona o responsável inicial. A interface não concede responsabilidade nem edita a própria conta responsável, evitando retirar o último gestor. Contas existentes preservam perfil/microárea; uma transferência de equipe exige processo futuro explícito para não transferir dados antigos silenciosamente.
- Pacientes: código, iniciais, microárea, itens contínuos; sem campos de nome completo, CPF, endereço ou diagnóstico. `0..*` itens foi **confirmado visualmente na classe Paciente–Insumo**, e não ficou como suposição provisória. O código é único por microárea; a unidade resolve o código junto da microárea em seu cadastro de entrega. O sistema não guarda endereços.
- Itens pertencem ao catálogo da unidade. Nome normalizado com Unicode NFKC, caixa e espaços impede variações simples de duplicidade. A categoria é exibida junto ao insumo e copiada pelo servidor; o usuário não consegue forjá-la. A indicação de medicamento é independente da categoria: fraldas não contam como medicamento; itens da categoria Outro podem contar quando forem medicamentos.
- Prioridade = peso (5/3/2/1) + dias desde a falta + 2 se houver pelo menos cinco medicamentos contínuos distintos. Fraldas e outros insumos não medicamentos ficam fora da contagem. Calculada a cada consulta com a data local do servidor, sem depender de cron ou de pontos armazenados que possam ficar desatualizados à meia-noite.
- Integridade concorrente: índice único parcial `(paciente, insumo)` apenas para estados abertos, transação `BEGIN IMMEDIATE` no SQLite e histórico gravado na mesma transação. O segundo envio retorna o mesmo registro autorizado. Mudanças de status incluem estado esperado para rejeitar cliques de páginas desatualizadas. A identidade do insumo vem do catálogo, não de texto livre em cada notificação.
- Histórico: autor, estado anterior/novo, motivo e horário do servidor; sem rotas de edição/exclusão, com proteção de modelo, FKs e gatilhos SQLite contra `UPDATE`/`DELETE`, incluindo SQL direto. Administradores com acesso ao arquivo do banco podem remover gatilhos: o MVP não oferece prova criptográfica contra administrador do servidor.
- **Decisão provisória RN08/RF14:** dias úteis são segunda a sexta, sem calendário de feriados (não fornecido). Contagem exclui o dia de abertura e mantém o horário local: sexta às 10h + 2 dias úteis = terça às 10h. Entrega usa dias corridos no mesmo horário local. No instante exato do prazo ainda não há atraso; após ele há. Ajustes de prazo valem para novas notificações; as antigas preservam seus vencimentos. Confirmar calendário e retroatividade antes de uso real.
- Primeira resposta é a primeira saída de Pendente pela Farmácia, inclusive seu cancelamento; cancelamento pelo próprio notificante não conta como resposta da Farmácia. Retorno por tentativa sem sucesso não zera o prazo nem perde a primeira resposta. “Em atraso” é um marcador derivado em notificações abertas, separado do status, conforme a nota na máquina de estados. Entregas encerradas entram nos indicadores, sem marcador operacional ativo.
- **Decisão estatística RF15/RF16:** período seleciona a coorte de notificações **abertas** entre as datas inclusivas. Média e percentual usam apenas entregas dessa coorte; percentual em até sete dias é fixo, mesmo quando o prazo da unidade é outro. Sem entregas, o valor é indefinido (—), não zero. Recorrência mostra a quantidade de faltas por paciente nos 90 dias inclusivos até o fim selecionado, inclusive a primeira; contagens maiores que um indicam repetição. Código + microárea evita agrupar pacientes homônimos de código. Confirmar esta definição antes de avaliação epidemiológica.
- Convites por link com token aleatório, validade de sete dias e aceite autenticado para conta já existente. Novas contas são criadas no aceite. Não se envia e-mail, conforme a alternativa “e-mail ou link” do RF04. E-mails de profissionais não podem ser convertidos em notificantes pelo convite.
- Sessão: servidor encerra após 30 minutos sem atividade; interface avisa aos 28 e permite renovar por POST com CSRF. Interações reais renovam no máximo uma vez por minuto; abas ociosas não renovam sozinhas. Sem JavaScript, a expiração funciona, mas o aviso/renovação não.
- Rascunho da falta fica no `sessionStorage` da aba, por usuário; removido após registro ou saída. Não guarda senha; não usa armazenamento permanente. Reconexão exige revisão e envio consciente, sem criar notificações automaticamente. Não é um aplicativo offline: fechar a aba ou limpar armazenamento perde o rascunho.

## Testes e verificações

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test --noinput -v 2
.\.venv\Scripts\python.exe -m pip check
# Depois de seed_demo, gera artefatos fictícios na pasta ignorada .evidence:
.\.venv\Scripts\python.exe scripts\verify_exports.py
```

No Linux/macOS, troque o executável por `.venv/bin/python`. Os testes usam **test.sqlite3 separado**, nunca o banco local. O teste concorrente usa duas conexões/threads reais contra banco em arquivo e barreira de sincronização; não usa SQLite em memória. Na limpeza exclusiva dos testes transacionais, os gatilhos são temporariamente retirados e restaurados para permitir o `flush` do Django.

Os testes cobrem permissões, isolamento de unidade/microárea/vínculo, contas, convite, fluxo HTTP completo, CSRF, expiração, duplicidade concorrente, prioridade e desempate, transições, finais, histórico imutável, prazos, filtros, indicadores e exportações. [Comandos e resultados observados](docs/VALIDACAO.md).

## Rastreabilidade e pendências

| Requisito | Funcionalidade / evidência | Resultado e limite |
| --- | --- | --- |
| RN01 / RF01 | Usuário com e-mail normalizado, senha hash Django, perfil único; testes de login e isolamento | Atendido localmente |
| RN01 / RF02 | Farmácia responsável cria/edita/desativa ACS/Farmácia da unidade; testes de gerenciamento | Atendido no escopo; responsável inicial via provisionamento/seed; transferência de perfil/microárea protegida |
| RN02–RN03 / RF03 | Paciente mínimo, área do ACS, catálogo M:N, ausência de identificadores diretos | Atendido; lista vazia suportada pela figura |
| RN02 / RF04 | Convite de uso único/expiração, aceite, vínculo M:N e testes de identidade | Atendido pela modalidade link |
| RN04 / RF05 | Formulário, revisão e gravação com data válida e categoria do catálogo | Atendido |
| RN04 / RF06 | Índice parcial, transação, teste de duas submissões simultâneas e retorno seguro | Atendido |
| RN05 / RF07–RF08 | Prioridade corrente, contagem de medicamentos e desempate; testes de pesos/dias/fila | Atendido por cálculo na consulta |
| RF09 | Filtros status/categoria/microárea/atraso e paginação de 25 itens | Atendido |
| RN06 / RF10–RF11 | Avanço de uma etapa, tentativa com motivo e retorno Pendente | Atendido |
| RN07 / RF12 | Cancelamento conforme autor/perfil/status, motivo na Farmácia, finais fechados | Atendido |
| RN09 / RF13 | Consulta e histórico com escopo verificado no servidor | Atendido |
| RN08 / RF14 | Prazos por unidade, primeira resposta, vencimentos e marcador separado | Atendido com decisão provisória de calendário e retroatividade |
| RF15 | Média, entregas até sete dias, faltas por item/área e recorrência 90 dias | Atendido conforme definição estatística acima; confirmar coorte com o grupo |
| RF16 | Período validado, PDF multipágina e CSV UTF-8 com proteção de fórmulas | Atendido; testes e artefatos locais |
| RNF01 | Templates responsivos e acesso HTTP local | Parcial: publicação HTTPS/internet não executada; inspeção visual do navegador bloqueada pela ferramenta |
| RNF02 | HTML semântico, rótulos, foco visível, skip link, layout fluido, cores legíveis | Parcial: auditoria WCAG 2.2 AA, leitor de tela e zoom 200% ainda não verificáveis |
| RNF03 | Formulário → revisão → protocolo, validação clara | Atendido pelo fluxo HTTP; teste de usabilidade com pessoas pendente |
| RNF04 | Dados mínimos e aviso de privacidade | Parcial: implantação real exige política institucional de retenção, fundamento legal, controlador/canal de direitos; não se declara conformidade LGPD integral |
| RNF05 | Hash, CSRF, ORM, escape, autorização por recurso; configurações HTTPS para produção | Parcial: TLS e hospedagem real não exercitados; sem rate limit de login nesta demonstração |
| RNF06 | Middleware de inatividade, aviso e renovação JS | Servidor testado; aviso visual ainda não verificado no navegador |
| RNF07 | Histórico com hora/autor, sem edição/exclusão, gatilhos e teste SQL | Atendido no SQLite da demonstração |
| RNF08 | Rascunho por aba, aviso de desconexão e reenvio manual | Parcial: implementação JS; ensaio de queda/reconexão no navegador não executado |
| RNF09 | Consultas compartilhadas/prefetch, paginação, CSS/JS locais e sem framework cliente | Não verificável para meta de 3s em 4G; falta medição em dispositivo/rede representativos |

O escopo é **demonstração acadêmica local**, não operação real de saúde. O SQLite atende a demonstração; grandes filas ainda são ordenadas em memória no servidor antes da paginação. Não há promessa de escala sem medição. Para produção: configurar servidor WSGI, arquivos estáticos, TLS, backups, monitoração, política institucional e avaliar migração para PostgreSQL. Gatilhos de imutabilidade precisam de adaptação ao trocar o banco.

## Configuração e segurança

`.env.example` é referência; as variáveis devem ser exportadas no shell (não há leitor automático de `.env`). Defaults de demonstração: `MEDKI_DEBUG=1`, hosts localhost/127.0.0.1. A chave local aleatória é criada em `.secret_key`, ignorada no Git. Produção exige `MEDKI_DEBUG=0`, `MEDKI_SECRET_KEY` privado e `MEDKI_ALLOWED_HOSTS`; ativa redirect HTTPS, cookies Secure e HSTS. Nunca exponha `runserver` na internet. Execute `manage.py check --deploy` com a configuração real e sirva estáticos coletados por `manage.py collectstatic`.

Não há painel Django Admin nem rotas genéricas que permitam modificar histórico ou ultrapassar os perfis. O banco e a chave local ficam fora do Git. Relatórios têm somente código/microárea e agregados e devem permanecer dentro do acesso da Farmácia. As observações são texto livre com aviso de minimização; o sistema não consegue garantir que alguém não digite dados proibidos.

## Branch e entrega ao grupo

Implementação em **`feature/mvp-medki`**, repositório local independente dentro de `Faculdade/medki`. O repositório remoto estava vazio, sem branch base. Nenhuma alteração foi enviada para `main`. Os commits locais ficam prontos para revisão; não é possível abrir PR enquanto não existir uma base remota.

Depois que o responsável pelo repositório estabelecer a branch base acordada pelo grupo, publique a branch de trabalho e abra PR em rascunho. Não crie `main` silenciosamente com esta implementação para contornar a ausência de base.
