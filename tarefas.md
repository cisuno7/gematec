

Criação de múltiplos equipamentos.
Deverá ser possível criar múltiplos equipamentos, para isso será realizado um POST para o endpoint de criação de

Múltiplos equipamentos.

Precisa ter um foco na responsividade para que o usuário possa adicionar os equipamentos e eles aparecerem na lista sem que isso gere problemas para adicionar novos equipamentos

 

Enviar Orçamento

Na tela do Questionário, quando houver o botão de “Enviar Orçamento” e o técnico clicar precisará ser exibido um modal pedindo para que o técnico selecione os serviços correspondentes à aquele equipamento.

Precisa ser listado todos os serviços globais usando o endpoint de Listagem de Serviços e permitir que o técnico selecione um ou mais serviços (multiselect).

Depois de selecionar o serviço, o técnico precisa Enviar, ao enviar deverá ser usado o endpoint Enviar Equipamento para o Orçamento

Contrato com o backend
Criação de Múltiplos Equipamentos

POST /api/activities/:activity_id/equipments
Listagem de Serviços
[
    {
        "id": 14,
        "qrcode": "3a5fe02e-9a41-436c-81a7-48277520fb6e",
        "tag": "NP069",
        "brand": {
            "id": 1,
            "name": "LG",
            "brand_content_url": null
        },
        "client": {
            "id": 1,
            "name": "Cliente 001 (Com Contrato)"
        },
        "sector": {
            "id": 1,
            "complete_name": "Sede"
        },
        "equipment_type": {
            "id": 1,
            "name": "split"
        },
        "is_active": true
    },
    {
        "id": 15,
        "qrcode": "0b72d1f5-25ad-415f-8f3a-7de23edb222b",
        "tag": "NP069",
        "brand": {
            "id": 1,
            "name": "LG",
            "brand_content_url": null
        },
        "client": {
            "id": 1,
            "name": "Cliente 001 (Com Contrato)"
        },
        "sector": {
            "id": 1,
            "complete_name": "Sede"
        },
        "equipment_type": {
            "id": 1,
            "name": "split"
        },
        "is_active": true
    }
]
GET /api/services?scope=global
{
    "links": {
        "next": null,
        "previous": null
    },
    "count": 1,
    "results": [
        {
            "id": 2,
            "name": "Nome do Serviço 2",
            "amount": 15000,
            "scope": "global"
        }
    ]
}
Enviar Equipamento para o Orçamento

PATCH /api/activities/:activity_id/equipments/:activity_equipment_id/services
{
    "services_ids": [1]
}