Ajustes na tela de Atividades I


Descrição

image-20250731-041613.png
Contexto
O usuário poderá acessar as atividades de diversas formas no sistema, através dos atalhos ou do menu.

Os atalhos PMOC, Ordem de Serviço, Assistência Técnica e Instalação devem redirecionar para uma tela de listagem de atividades, assim como a opção no menu, a diferença é que cada atalho aplicará um filtro na tela.

O que deve ser feito?
Tela de listagem de atividades
Criar uma tela de listagem de serviços com um filtro do tipo de serviço e de status

Cada atividade terá os campos:

Nome

Status

Data de início

Data Final

Tipo de Atividade

Cada item terá um botão de Visualização

Atalhos
Ao clicar no PMOC o usuário deverá ser redirecionado para a tela de listagem de atividades com os filtros:

Tipo de atividade: pmoc

Status: open,pending

Ao clicar no Ordem de Serviço o usuário deverá ser redirecionado para a tela de listagem de atividades com os filtros:

Tipo de atividade: service_order

Status: open,pending

Ao clicar no Assistência Técnica o usuário deverá ser redirecionado para a tela de listagem de atividades com os filtros:

Tipo de atividade: technical_assistance

Status: open,pending

Ao clicar no Instalation o usuário deverá ser redirecionado para a tela de listagem de atividades com os filtros:

Tipo de atividade: instalation

Status: open,pending

Visualização de Equipamentos vinculados
Ao clicar na atividade deverá ser retornado a lista de equipamentos vinculados, deverá ter um filtro de cliente, setores e subsetor (no mesmo esquema da tela de equipamentos), porém o filtro de clientes n deve ser editável, pois a atividade sempre terá um único cliente.

Deverá ter um campo de busca de termo e um filtro de status

Deverá ter um filtro em que o usuário clique para mostrar apenas os equipamentos que ele iniciou o trabalho.

Os campos a serem apresentados são:

Status

Tag do Equipamento

Fabricante do Equipamento

Setor do Equipamento

Tipo do Equipamento

Deverá ter um botão de visualização detalhada daquele equipamento

 

Contrato com o backend
Listar atividades
GET /api/activities

GET /api/activities?activity_type_slug=<slug>

GET /api/activities?status=<status1>&status=<status2>

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-8e7b0516-410e-4340-8cd4-3cca8387e02b?action=share&source=copy-link&creator=34422452&ctx=documentation

Visualizar equipamentos vinculados
GET /api/activities/:activity_id/equipments

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-197ec0ce-a7d9-4704-9304-ef5ff67a1bcb?action=share&source=copy-link&creator=34422452&ctx=documentation
Ajustes na tela de Atividades II


Descrição

image-20250731-042002.png
Contexto
Após selecionar um equipamento o usuário poderá responder uma questão e realizar uploads.

O que deve ser feito?
Questionário
Após selecionar um equipamento vinculado a atividade o usuário deverá visualizar as questões daquele equipamento.

Se o status do equipamento for “created“ deverá habilitar um botão de “iniciar atividade no equipamento”, após isso ele poderá responder.

Ao responder e realizar o upload(opcional) de uma ou mais fotos deve ser enviado uma requisição salvando os dados.

Deverá ter um botão para a conclusão da atividade naquele equipamento, mas só deve ser habilitado se todas as opções obrigatórias estiverem preenchidas.

Modelo de Campos dinâmicos
O modelo de dados dos campos dinâmicos retorna um conjuntos de fields, a estrutura de um field segue o seguinte modelo:



[
  {
    "label": "Label 1",
    "key": "label1",
    "type": "text",
    "help_text": "asdas",
    "rules": {
      "required": true,
      "max_length": 200,
      "min_length": 4
    },
    has_upload: true // Obrigado upload
  },
  {
    "label": "Label 2",
    "key": "label2",
    "type": "measure",
    "help_text": "asdas",
    "rules": {
      "required": true,
      "min_value": 2,
      "max_value": 3
    },
    has_upload: true 
  },
  {
    "label": "Label 3",
    "key": "label3",
    "type": "select",
    "help_text": "asdas",
    "rules": {
      "required": true
    },
    "options": [
      "Option A",
      "Option B",
      "Option C"
    ],
    has_upload: true,
  },
  {
    "label": "Label 4",
    "key": "label4",
    "type": "radio",
    "help_text": "asdas",
    "rules": {
      "required": true
    },
    "options": [
      "Option A",
      "Option B",
      "Option C"
    ],
    "has_upload": true
  },
  {
    "label": "Label 5",
    "key": "label5",
    "type": "radio_with_justification",
    "help_text": "asdas",
    "rules": {
      "required": true,
      "min_length": 1,
      "max_length": 300
    },
    "options": [
      "Option A",
      "Option B",
      "Option C"
    ],
    "justification_target": "Option A",
    "has_upload": true,
  },
]
Enquanto que o modelo de campos dinâmicos por parte da Resposta ficaria assim:
Em formato form-data



{
"question_id": 1,
"value": "valor da resposta",
"justification": "justificativa" // só é preenchido quando o tipo for radio_with_justification.
"uploads": [] // array de FileObjects
}
Contrato com o backend
Visualizar dados do equipamento
GET /api/equipments/:id

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-b641d238-8692-4c8c-a9a7-602e0e5d396f?action=share&source=copy-link&creator=34422452&ctx=documentation


Visualizar questões
GET /api/activity_plans/:activity_plan_id/versions/:version_id

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-0142201b-98bc-430b-9826-5a265d1f4e01?action=share&source=copy-link&creator=34422452&ctx=documentation

Visualizar respostas
GET /api/activity_plans/:activity_plan_id/versions/:version_id

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-680e2daa-d84e-49f2-9323-839bd0920abf?action=share&source=copy-link&creator=34422452&ctx=documentation

Registrar abertura de atividade no equipamento
PATCH /api/activities/:activity_id/equipments/:activity_equipment_id

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-5874a6c9-19b0-4b94-8cf8-cbdbf6d59d55?action=share&source=copy-link&creator=34422452&ctx=documentation

Criar respostas
POST /api/activities/:activity_id/equipments/:activity_equipment_id/answers

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-814f8c08-905b-4ff8-a463-bab8496a8400?action=share&source=copy-link&creator=34422452&ctx=documentation


Registrar fechamento de atividade no equipamento
PATCH /api/activities/:activity_id/equipments/:activity_equipment_id

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-5874a6c9-19b0-4b94-8cf8-cbdbf6d59d55?action=share&source=copy-link&creator=34422452&ctx=documentation
Ajuste na tela de Atividades III


Descrição

Contexto
Se o usuário for em equipamentos na tela de visualização de Equipamentos deverá ver um um botão chamado “Criar atividade“

O que deve ser feito?
Criação da atividade
Deverá aparecer um modal com alguns campos para o usuário responder.

Nome

Tipo de atividade (Deve retornar apenas tipos de atividade com politica de criação comum e politica de inserção manual, veja a conexão com backend)

Data de inicio (Pré selecionado para hoje)

Data final

Precisará ser feito duas chamadas pro backend para a criação da atividade:

Criação da atividade

Vincular equipamento a atividade

Contrato com o backend
Listar tipos de atividades possíveis de serem cadastradas pelo técnico
GET /api/activity_types?equipment_insertion_policy=manual&creation_policy=common&is_active=true

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-5874a6c9-19b0-4b94-8cf8-cbdbf6d59d55?action=share&source=copy-link&creator=34422452&ctx=documentation


Cadastrar atividades
POST /api/activities

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-b6c1975b-4f28-49c0-a494-a6517f65bce6?action=share&source=copy-link&creator=34422452&ctx=documentation


Vincular equipamento á atividade
POST /api/activities/:activity_id/equipments

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-7688bd11-d98b-41bb-9d99-280028ce2851?action=share&source=copy-link&creator=34422452&ctx=documentation