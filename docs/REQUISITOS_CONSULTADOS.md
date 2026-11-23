# Fonte consultada

Google Docs oficial: https://docs.google.com/document/d/16VITyC159td_VVrpxTaNVbvFsYnYUFQh_4ZRhJPh8m0/edit?tab=t.mb53vg794r6h

Consulta: 23/11/2026. Aba: Documentação do sistema. Revisão retornada pelo conector: `AHj4eMQq2RVsJz-8mv-eTe9frX7W5jdbwDH7l-bWwFqP9RmD1vVKXAW6_aIKbNuq15oRh3ykRqbs0FouXu4NEvXwqfxy8THICtUqiLeLO8Y`.

Trecho de consulta RN, RF e RNF (texto extraído do documento; não substitui sua versão vigente):

2.1 REGRAS DE NEGÓCIO
As regras de negócio definem as condições que o sistema deve respeitar em qualquer situação. Os Quadros 1 a 9 apresentam cada uma delas.
Quadro 1 – Regra de negócio RN01
Identificador
RN01
Nome
Perfis de acesso
Descrição
O sistema possui três perfis: Notificante (familiar ou cuidador do paciente), Agente Comunitário de Saúde (ACS) e Farmácia (farmacêutico ou atendente da farmácia da unidade). Cada usuário possui um único perfil, e as funcionalidades são liberadas de acordo com ele. O farmacêutico responsável pela unidade cadastra as contas de ACS e de Farmácia.
Fonte: Elaborado pelos autores (2026).
Quadro 2 – Regra de negócio RN02
Identificador
RN02
Nome
Cadastro e vínculo do paciente
Descrição
Somente o ACS pode cadastrar pacientes, e apenas os de sua microárea. O cadastro informa um código do paciente, as iniciais do nome, a microárea e a lista de medicamentos e insumos de uso contínuo. Um notificante só pode registrar faltas de pacientes aos quais foi vinculado pelo ACS.
Fonte: Elaborado pelos autores (2026).
Quadro 3 – Regra de negócio RN03
Identificador
RN03
Nome
Dados mínimos
Descrição
Em conformidade com a LGPD, o sistema não registra nome completo, CPF, endereço ou diagnóstico do paciente. A identificação do paciente para a entrega é feita pela farmácia, a partir do código, no cadastro já existente da unidade de saúde.
Fonte: Elaborado pelos autores (2026).
Quadro 4 – Regra de negócio RN04
Identificador
RN04
Nome
Registro da falta
Descrição
Toda notificação deve informar o paciente, o insumo em falta, sua categoria (insulina, anti-hipertensivo, fralda geriátrica ou outro) e a data em que o insumo acabou ou deixou de ser entregue, podendo incluir uma observação. Não pode existir mais de uma notificação em aberto para o mesmo paciente e o mesmo insumo.
Fonte: Elaborado pelos autores (2026).
Quadro 5 – Regra de negócio RN05
Identificador
RN05
Nome
Cálculo de prioridade
Descrição
A fila da farmácia é ordenada por uma pontuação calculada pelo sistema: peso do insumo (insulina = 5, anti-hipertensivo = 3, fralda geriátrica = 2, outros = 1), mais 1 ponto por dia sem o insumo, mais 2 pontos quando o paciente usa cinco ou mais medicamentos de uso contínuo. Em caso de empate, a notificação mais antiga é atendida primeiro. A pontuação é recalculada diariamente.
Fonte: Elaborado pelos autores (2026).
Quadro 6 – Regra de negócio RN06
Identificador
RN06
Nome
Ciclo de status
Descrição
Toda notificação é criada com o status Pendente e segue a sequência Pendente, Em separação, Saiu para entrega e Entregue. Somente a Farmácia altera o status. Se a entrega não for concluída, a Farmácia registra a tentativa sem sucesso e a notificação volta para Pendente, retornando à fila.
Fonte: Elaborado pelos autores (2026).
Quadro 7 – Regra de negócio RN07
Identificador
RN07
Nome
Cancelamento
Descrição
A Farmácia pode cancelar uma notificação Pendente ou Em separação, informando obrigatoriamente o motivo. O notificante pode cancelar a própria notificação apenas enquanto ela estiver Pendente, por exemplo, quando o insumo chegou por outro meio. Notificações Entregues ou Canceladas não podem ser reabertas; uma nova falta exige uma nova notificação.
Fonte: Elaborado pelos autores (2026).
Quadro 8 – Regra de negócio RN08
Identificador
RN08
Nome
Prazos de resposta
Descrição
A Farmácia deve dar a primeira resposta, retirando a notificação do status Pendente, em até 2 dias úteis, e concluir a entrega em até 7 dias corridos após a abertura. Ultrapassado qualquer um desses prazos, a notificação recebe a marcação "Em atraso", sem alterar seu status. Os prazos podem ser ajustados pela unidade de saúde.
Fonte: Elaborado pelos autores (2026).
Quadro 9 – Regra de negócio RN09
Identificador
RN09
Nome
Histórico e visibilidade
Descrição
Cada mudança de status é registrada com a data e a hora do servidor e com o usuário que a realizou, e esses registros não podem ser alterados ou excluídos. O notificante visualiza apenas as notificações dos pacientes vinculados a ele, o ACS as de sua microárea e a Farmácia todas as notificações da unidade.
Fonte: Elaborado pelos autores (2026).

2.2 LEVANTAMENTO DE REQUISITOS
Os requisitos foram derivados das regras de negócio e das evidências reunidas na revisão de literatura. O Quadro 10 apresenta os requisitos funcionais, que descrevem o que o sistema deve fazer, e o Quadro 11, os requisitos não funcionais, que definem como ele deve se comportar.
Quadro 10 – Requisitos funcionais
ID
Nome
Descrição
RF01
Autenticação
O sistema deve permitir que o usuário acesse com e-mail e senha e liberar as funcionalidades de acordo com seu perfil.
RF02
Gerenciar contas da unidade
O sistema deve permitir que o farmacêutico responsável cadastre, edite e desative contas de ACS e de Farmácia.
RF03
Cadastrar paciente
O sistema deve permitir que o ACS cadastre pacientes de sua microárea, informando código, iniciais, microárea e medicamentos e insumos de uso contínuo.
RF04
Vincular notificante
O sistema deve permitir que o ACS convide um familiar ou cuidador por e-mail ou link e o vincule a um ou mais pacientes.
RF05
Registrar falta
O sistema deve permitir que o notificante ou o ACS registre a falta de um insumo, informando paciente, insumo, categoria, data da falta e observação opcional.
RF06
Bloquear duplicidade
O sistema deve impedir uma nova notificação para o mesmo paciente e insumo enquanto houver outra em aberto, exibindo a notificação existente.
RF07
Calcular prioridade
O sistema deve calcular a pontuação de prioridade de cada notificação no momento do registro e recalculá-la diariamente, conforme a RN05.
RF08
Exibir fila de prioridade
O sistema deve exibir para a Farmácia as notificações em aberto, ordenadas pela pontuação de prioridade.
RF09
Filtrar a fila
O sistema deve permitir filtrar a fila por status, categoria de insumo, microárea e marcação de atraso.
RF10
Atualizar status
O sistema deve permitir que a Farmácia avance o status da notificação com um clique, de Pendente até Entregue.
RF11
Registrar tentativa sem sucesso
O sistema deve permitir que a Farmácia registre uma entrega não concluída, retornando a notificação para Pendente.
RF12
Cancelar notificação
O sistema deve permitir o cancelamento da notificação conforme a RN07, exigindo o motivo quando realizado pela Farmácia.
RF13
Acompanhar notificações
O sistema deve permitir que o notificante e o ACS consultem o status atual e o histórico das notificações que podem visualizar.
RF14
Marcar atraso
O sistema deve aplicar automaticamente a marcação "Em atraso" às notificações que ultrapassarem os prazos da RN08.
RF15
Painel de indicadores
O sistema deve exibir à Farmácia o tempo médio até a entrega, o percentual de entregas em até 7 dias, as falhas por insumo e por microárea e a recorrência por paciente em 90 dias.
RF16
Exportar relatório
O sistema deve permitir exportar os indicadores de um período em PDF ou em planilha (CSV).
Fonte: Elaborado pelos autores (2026).






Quadro 11 – Requisitos não funcionais
ID
Nome
Descrição
RNF01
Acesso pelo navegador
O sistema deve ser acessado pela internet, no navegador, sem necessidade de instalação, com layout responsivo para celular e computador.
RNF02
Acessibilidade
O sistema deve atender ao nível AA da WCAG 2.2, com contraste mínimo de 4,5:1, texto ampliável até 200% sem perda de conteúdo, rótulo em todos os campos e navegação por teclado.
RNF03
Usabilidade
O registro de uma falta deve ser concluído em até três telas, com linguagem simples, poucos campos obrigatórios e confirmação antes do envio.
RNF04
Privacidade
O sistema deve coletar apenas os dados previstos na RN03, identificar os pacientes por código e exibir uma política de privacidade, em conformidade com a LGPD.
RNF05
Segurança e controle de acesso
O sistema deve usar HTTPS, armazenar as senhas com hash e restringir o acesso aos dados conforme o perfil e o vínculo do usuário.
RNF06
Sessão
A sessão deve expirar após 30 minutos sem uso, avisando o usuário antes e permitindo prolongá-la.
RNF07
Rastreabilidade
O sistema deve registrar as mudanças de status com a data e a hora do servidor e impedir a alteração ou exclusão desses registros.
RNF08
Conexão instável
O formulário de registro deve preservar os dados preenchidos caso a conexão caia, permitindo o envio quando ela for restabelecida.
RNF09
Desempenho
As páginas devem carregar em até 3 segundos em conexão móvel 4G, em condições normais de uso.
Fonte: Elaborado pelos autores (2026).
