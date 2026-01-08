Como funcionará o novo fluxo.
Foi adicionado novos status nos Equipamentos adicionados à Atividade, o que mudará a ordem para a seguinte.

Teremos dois fluxos possíveis:

Fluxo 1: Envio do Orçamento
Caminho A: Orçamento Aprovado e Registro Aprovado
Criar Atividade → Atividade: CREATED

Anexar Equipamentos → Atividade: CREATED | Equipamentos: CREATED

Iniciar Atividade no Equipamento → Atividade: OPEN | Equipamentos: OPEN

Preencher Primeira Questão → Atividade: OPEN | Equipamentos: PENDING

Enviar para Orçamento → Atividade: WAITING_BUDGET_APPROVAL | Equipamentos: WAITING_BUDGET_APPROVAL

Orçamento Aprovado → Atividade: BUDGET_APPROVAL | Equipamentos: BUDGET_APPROVAL

Executar Atividade → Atividade: BUDGET_APPROVAL | Equipamentos: COMPLETED

Criar Registro de Trabalho → Atividade: BUDGET_APPROVAL | Equipamentos: WAITING_WORK_APPROVAL

Registro Aprovado → Atividade: BUDGET_APPROVAL | Equipamentos: CLOSED ✓ FIM

Caminho B: Orçamento Reprovado
Criar Atividade → Atividade: CREATED

Anexar Equipamentos → Atividade: CREATED | Equipamentos: CREATED

Iniciar Atividade no Equipamento → Atividade: OPEN | Equipamentos: OPEN

Preencher Primeira Questão → Atividade: OPEN | Equipamentos: PENDING

Preencher Demais Questões → Atividade: OPEN | Equipamentos: PENDING

Enviar para Orçamento → Atividade: WAITING_BUDGET_APPROVAL | Equipamentos: WAITING_BUDGET_APPROVAL

Orçamento Reprovado → Atividade: BUDGET_DISAPPROVAL | Equipamentos: BUDGET_DISAPPROVAL⟲ VOLTA PARA PASSO 5

Caminho C: Orçamento Aprovado mas Registro Reprovado
Criar Atividade → Atividade: CREATED

Anexar Equipamentos → Atividade: CREATED | Equipamentos: CREATED

Iniciar Atividade no Equipamento → Atividade: OPEN | Equipamentos: OPEN

Preencher Primeira Questão → Atividade: OPEN | Equipamentos: PENDING

Preencher Demais Questões → Atividade: OPEN | Equipamentos: PENDING

Enviar para Orçamento → Atividade: WAITING_BUDGET_APPROVAL | Equipamentos: WAITING_BUDGET_APPROVAL

Orçamento Aprovado → Atividade: BUDGET_APPROVAL | Equipamentos: BUDGET_APPROVAL

Executar Atividade → Atividade: BUDGET_APPROVAL | Equipamentos: COMPLETED

Criar Registro de Trabalho → Atividade: BUDGET_APPROVAL | Equipamentos: WAITING_WORK_APPROVAL

Registro Reprovado → Atividade: BUDGET_APPROVAL | Equipamentos: PENDING ⟲ VOLTA PARA PASSO 6

Fluxo 2: Continuar para Execução
Caminho A: Registro Aprovado 
Criar Atividade → Atividade: CREATED

Anexar Equipamentos → Atividade: CREATED | Equipamentos: CREATED

Iniciar Atividade no Equipamento → Atividade: OPEN | Equipamentos: OPEN

Preencher Primeira Questão → Atividade: OPEN | Equipamentos: PENDING

Preencher Demais Questões → Atividade: OPEN | Equipamentos: PENDING

Executar Atividade (Pula etapa de orçamento) → Atividade: OPEN | Equipamentos: COMPLETED

Criar Registro de Trabalho → Atividade: OPEN | Equipamentos: WAITING_WORK_APPROVAL

Registro Aprovado → Atividade: OPEN | Equipamentos: CLOSED ✓ FIM

Caminho B: Registro Reprovado
Criar Atividade → Atividade: CREATED

Anexar Equipamentos → Atividade: CREATED | Equipamentos: CREATED

Iniciar Atividade no Equipamento → Atividade: OPEN | Equipamentos: OPEN

Preencher Primeira Questão → Atividade: OPEN | Equipamentos: PENDING

Preencher Demais Questões → Atividade: OPEN | Equipamentos: PENDING

Executar Atividade (Pula etapa de orçamento) → Atividade: OPEN | Equipamentos: COMPLETED

Criar Registro de Trabalho → Atividade: OPEN | Equipamentos: WAITING_WORK_APPROVAL

Registro Reprovado → Atividade: OPEN | Equipamentos: PENDING ⟲ VOLTA PARA PASSO 4