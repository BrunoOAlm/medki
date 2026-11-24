# Pesquisa e revisão do frontend do Medki

Consulta em 23/11/2026. Objetivo: identificar convenções repetitivas associadas informalmente a interfaces geradas por IA e confrontá-las com o código do Medki.

## Alcance e qualidade da evidência

A pesquisa foi multilíngue, com buscas em português, inglês, chinês, espanhol, alemão, francês e russo. **Não é possível afirmar cobertura de todos os fóruns**, nem medir quais padrões são os mais usados a partir desta amostra. Foram priorizados relatos originais e discussões de desenvolvimento/design, complementados por textos profissionais. Resultados comerciais que prometem detectar IA e explicações sobre dados de treinamento não foram tratados como prova científica.

As fontes aproveitadas integralmente foram em português, inglês, chinês, espanhol e alemão. O resultado russo teve leitura parcial e falhou ao abrir o texto completo; a busca em francês não forneceu discussão original suficientemente relevante. Esses dois idiomas não sustentam as conclusões. Tradução e síntese abaixo são interpretativas; não são citações literais.

## Fontes consultadas

| Idioma / fonte | Tipo e contribuição | Limite |
| --- | --- | --- |
| Português — [TabNews: Sites com cara de IA: só eu que estou cansado?](https://www.tabnews.com.br/devpedroribeiro/sites-com-cara-de-ia-so-eu-que-estou-cansado) | Discussão original de desenvolvedores. Autor e participantes descrevem identidade repetida em layout, texto, tipografia, cores e espaçamento. | Percepção pessoal; não demonstra autoria nem prevalência. |
| Inglês — [Reddit r/UI_Design: AI Fatigue from seeing same designs](https://www.reddit.com/r/UI_Design/comments/1tvb91q/ai_fatigue_from_seeing_same_designs/) | Discussão de design de interfaces sobre cartões, botões, ícones e badges semelhantes. Também há ponderação de que a padronização de interfaces é anterior à IA e de que o usuário final pode perceber diferente. | Amostra de comunidade; participantes e exemplos não foram verificados independentemente. |
| Inglês — [Reddit r/webdesign: So Many Websites Look The Same With AI](https://www.reddit.com/r/webdesign/comments/1t3ymps/so_many_websites_look_the_same_with_ai/) | Relatos de cartões com contorno, ícones em quadrados arredondados e pouca adaptação ao produto. | Discussão pública, não estudo controlado; usada como sinal para inspeção. |
| Chinês — [V2EX: 为啥你们 Vibe 的网页 AI 味儿那么重?](https://edge.v2ex.com/t/1250676) | Tópico de comunidade técnica que enumera roxo, gradientes, excesso de cartões, texto volumoso e ícones lineares em caixas. O próprio autor relativiza a classificação estética e reconhece o componente promocional da discussão. | Não adotei os prompts ou a proposta de aleatorizar o design; conteúdo promocional reduz a força da fonte. |
| Espanhol — [Gabriel Neuman: Por qué todo lo que diseña tu IA se ve igual](https://www.gabrielneuman.com/diseno-con-ia-se-ve-igual/) | Relato profissional sobre falta de contexto próprio e instruções de marca contraditórias. Reforça a utilidade de regras extraídas do produto real. | Artigo de autor, não fórum especializado nem demonstração causal. |
| Alemão — [Communicode: KI weiß, wie Webseiten aussehen. Nicht, wie Nutzer denken.](https://www.communicode.com/de-de/insights/ki-webdesign-ux-probleme/) | Relato profissional com comparação própria de ferramentas. Questiona a prioridade de informações úteis e a troca meramente cosmética de cores/fontes. | Teste do próprio autor, de escopo restrito; não se generalizou seu resultado ao Medki. |
| Russo — [Почему сайты, созданные с ИИ, выглядят одинаково](https://gizu.ru/blog/pochemu-ii-sayty-pohozhi/) | Resultado de busca menciona gradientes e cartões em três colunas. | **Leitura parcial:** abertura completa falhou por timeout; sem peso adicional nas conclusões. |
| Inglês — [GOV.UK Design System: Table](https://design-system.service.gov.uk/components/table/) | Referência institucional primária para tabelas que permitem comparar dados em linhas/colunas, com legendas e cabeçalhos. Usada para a alternativa operacional, não para identificar IA. | Não se copiou a identidade visual nem se declara afiliação ao GOV.UK. |

## Padrões confrontados com o código

Comparação com a versão anterior, commit `d55e418`. A classificação é uma avaliação de design do projeto, não uma detecção de autoria.

| Padrão recorrente / sinal | Evidência anterior no Medki | Decisão aplicada |
| --- | --- | --- |
| Aparência de landing page dentro de um aplicativo | `login.html`: título promocional grande, slogan, duas colunas e sequência decorativa 01/02/03 | Login direto com formulário e ajuda específica para familiares e equipe. |
| Cartão como estrutura para todos os dados | `.panel`, `.notification`, `.cards`, `.metrics`; notificações e pacientes isolados em caixas de contorno arredondado | Fila tabular com cabeçalhos; pacientes em registros separados por linha; seções documentais para os formulários e o histórico. |
| Três cartões de indicadores com números destacados | `report.html`, `.metrics strong` de 2,4rem | Resumo em lista de definições e tabelas de detalhe. Os três indicadores oficiais foram preservados. |
| Texto auxiliar decorativo acima de cada título | `.eyebrow`, caixa alta e tracking em login, fila, formulários, pacientes, contas e relatório | Removido. Dados de protocolo continuam no detalhe como informação do registro. |
| Frases intercambiáveis com pouco apoio à tarefa | “Cuidado que continua”, “Uma falta registrada…”, “cada registro representa um cuidado…” | Texto sobre acesso, ordem da fila, filtros e vínculo. Nome Medki/RemédioEmCasa-Alerta preservado. |
| Ícone de marca genérico dentro de caixa arredondada | `.brand-icon` com cruz Unicode | Identificação textual Medki e nome do projeto, sem inventar logotipo oficial. |
| Badges em pílula usados como decoração | `.badge` com borda, fundo e raio de 2rem para todos os estados | Status em texto, com cor secundária e rótulo explícito; atraso continua destacado em texto. A compreensão não depende só da cor. |
| Muito espaço por registro e hierarquia de manchete | Notificações com padding amplo e número de prioridade em 2rem; títulos com tracking apertado | Tipografia de aplicativo, prioridade legível sem competir com insumo/paciente e colunas consistentes para comparação. |
| Gradientes roxos, glow, vidro, blobs, brilho e animações de entrada repetidas | Não encontrados nas telas do projeto | Nenhuma remoção atribuída a elementos inexistentes. |
| Framework/componentes como suposta prova de IA | Projeto já usava Django, CSS/JS próprios e fonte do sistema | Stack, fonte e a cor verde mantidas por simplicidade e contexto. Uma fonte ou biblioteca isolada não indica autoria por IA. |

## Direção resultante

O Medki é usado para registrar e acompanhar atendimento. O eixo escolhido foi **registro de trabalho**, com hierarquia baseada em paciente, insumo, prazo e estado. A escolha de tabelas é adequada à comparação; formulários e histórico continuam com estrutura própria. Não se substituiu o visual por outro conjunto de efeitos, uma fonte exótica ou um tema de moda.

Na fila, a tabela tem legenda, cabeçalhos de coluna e de linha, região de rolagem focável por teclado e dica de rolagem em telas pequenas. Todos os dados permanecem disponíveis. A contrapartida é a rolagem horizontal em celular; a utilidade dessa opção precisa ser confirmada com usuários. Pacientes e resumo dos indicadores se reorganizam verticalmente no breakpoint móvel.

As permissões, dados, pontuação, estados, prazos e exportações permanecem no backend. Os seletores de formulário, IDs de integração JS e tokens CSRF foram preservados. A pesquisa não foi usada para alterar política de atendimento.

## Verificação e limites

- Testes de regressão e fluxo HTTP completo: 30 passaram na primeira execução após as mudanças visuais.
- Detector mecânico da skill Impeccable, sobre `templates` e `static/css`: saída `[]`. Isso só registra ausência dos alertas mecânicos desse detector; não comprova qualidade, autoria humana ou conformidade AA.
- Checagem HTML de 11 combinações de página/perfil: HTTP 200, um H1, campos rotulados e IDs únicos. Sete pares de cores especificados no CSS superaram 4,5:1; detalhes em `VALIDACAO.md`.
- A inspeção visual interativa segue pendente: o inventário CUA não ofereceu navegador controlável e a janela disponível era o gerenciador de senhas. Ela não foi automatizada. Não há screenshots de desktop/mobile desta revisão.
- A revisão busca reduzir convenções genéricas e melhorar a adequação ao atendimento. Não se afirma que o resultado é indistinguível de trabalho humano, nem que a percepção do grupo ou dos usuários já foi medida.

Para avaliar com o grupo: entrar com os três perfis, comparar a ordem de três notificações, localizar o paciente e o prazo sem abrir o detalhe, usar a fila em largura de celular e navegar pelos filtros por teclado. Depois conferir leitor de tela, zoom de 200% e contraste nos estados interativos.
