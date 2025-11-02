# ⚙️ Fluxo de Criação e Seleção de Equipamentos

Este documento descreve o fluxo completo de **seleção, criação e vínculo de múltiplos equipamentos** dentro de uma atividade, cobrindo os casos de **Cliente Existente** e **Novo Cliente**.

---

## 🧭 Visão Geral

O sistema permite ao usuário:

1. Selecionar múltiplos equipamentos existentes;
2. Criar novos equipamentos durante o fluxo;
3. Vincular todos (novos e existentes) a uma **atividade** no backend.

A lógica adapta-se de acordo com o tipo de cliente selecionado.

---

## 🧩 Caso 1 — Cliente Existente

### 🔹 Inicialização
- O sistema realiza uma **requisição GET** para buscar equipamentos já cadastrados do cliente.
- A lista é preenchida com os equipamentos existentes.
- O usuário pode:
  - Selecionar múltiplos equipamentos;
  - Filtrar ou buscar por nome/tag;
  - Limpar todas as seleções de uma vez;
  - Ver um contador com o total selecionado.

### 🔹 Criação de Novo Equipamento
O usuário pode criar um novo equipamento diretamente nesse fluxo.

**Campos obrigatórios:**
- `tag`
- `brand_id` (Fabricante)
- `equipment_type_id` (Tipo de Equipamento)
- `additional_fields` (Campos dinâmicos)

**Endpoint utilizado:**
}}/api/equipments

**Body:**
```json
{
  "client_id": 1,
  "sector_id": 1,
  "brand_id": 1,
  "equipment_type_id": 2,
  "tag": "E015",
  "additional_fields": {
    "q1et2": { "value": "Resposta", "justification": null },
    "q2et2": { "value": 13, "justification": "" },
    "q3et2": { "value": "Option B", "justification": "" },
    "q4et2": { "value": "Option B", "justification": "" },
    "q5et2": { "value": "Option A", "justification": "Justificativa" }
  }
}
Após criação:

O novo equipamento é adicionado automaticamente à lista principal;

Ele aparece já selecionado;

O contador de selecionados é atualizado;

O usuário pode criar outros equipamentos ou selecionar mais da lista.

🔹 Finalização

Ao confirmar:

O sistema separa equipamentos novos e existentes;

Os novos são criados em lote (caso haja mais de um);

Os existentes são vinculados por ID.
🧩 Caso 2 — Novo Cliente
🔹 Inicialização

Não há busca inicial (nenhum equipamento cadastrado).

A lista inicia vazia.

O usuário pode:

Criar novos equipamentos para preencher a lista;

Ver contador de selecionados (0 inicialmente);

Utilizar o filtro (sem resultados iniciais);

Limpar seleções a qualquer momento.
🔹 Criação de Novo Equipamento

O usuário deve cadastrar equipamentos do zero.

Campos obrigatórios:

tag

brand_id (Fabricante)

equipment_type_id (Tipo)

additional_fields (Campos dinâmicos personalizáveis)

Cada campo dinâmico contém:
{
  "campo_nome": {
    "label": "Nome do Campo",
    "value": "Valor informado",
    "justification": ""
  }
}
Após criação:

O equipamento é adicionado à lista;

Fica automaticamente selecionado;

O usuário pode adicionar quantos quiser.

🔹 Finalização

Ao salvar:

O sistema utiliza o endpoint de criação múltipla, vinculando todos os equipamentos novos diretamente à atividade.
Criação de Atividade

Antes de vincular equipamentos, é necessário criar a atividade principal.
POST {{gematec__host}}/api/activities
{
  "name": "teste50",
  "activity_type_id": 3,
  "client_id": 1,
  "observation": "ADAS para teste"
}
Resposta esperada:
{
    "id": 3,
    "name": "Ordem de Serviço ABC 3",
    "activity_type": {
        "id": 3,
        "name": "Assistência Técnica",
        "slug": "technical_assistance",
        "creation_policy": "common",
        "equipment_insertion_policy": "manual",
        "closure_policy": "all_closed",
        "budget_policy": "free",
        "is_active": true,
        "anchor_entity": "brand"
    },
    "client": {
        "id": 2,
        "name": "Torres",
        "phone": "",
        "addresses": []
    },
    "status": "created",
    "observation": "",
    "opened_at": null,
    "closed_at": null,
    "created_at": "27/10/2025 14:54",
    "updated_at": "27/10/2025 14:54",
    "start_date": null,
    "end_date": null,
    "is_overdue": false,
    "approver_name": "",
    "approver_document": "",
    "approver_email": "",
    "approver_technical_document": "",
    "approved_at": null
}
O campo id retornado representa o activity_id, usado nas próximas requisições.
🧩 Criação de Múltiplos Equipamentos (Vínculo em Lote)
POST {{gematec__host}}/api/activities/:activity_id/equipments
{
  "equipments": [
    {
      "client_id": 1,
      "sector_id": 1,
      "brand_id": 1,
      "equipment_type_id": 1,
      "tag": "NP069",
      "additional_fields": {
        "fruta_preferida_1": {
          "label": "Fruta preferida",
          "value": "B",
          "justification": ""
        }
      }
    },
    {
      "client_id": 1,
      "sector_id": 1,
      "brand_id": 1,
      "equipment_type_id": 1,
      "tag": "NP070",
      "additional_fields": {
        "fruta_preferida_1": {
          "label": "Fruta preferida",
          "value": "A",
          "justification": ""
        }
      }
    }
  ]
}
alidações obrigatórias:

Cada item do array equipments deve conter client_id e sector_id;

Todos os additional_fields devem incluir label, value e justification;

Se o campo label não vier do front, usar o nome da chave como fallback.