Criação de tela de Roadmap


Descrição

Contexto
O técnico terá registrado um roteiro com as atividades a serem realizadas no dia. O roteiro basicamente é uma lista de atividades onde o técnico poderá ir e acessar rapidamente essas atividades

O que deve ser feito?
Ao clicar no atalho “Roteiro“ o técnico deverá ir para uma tela onde será listado todas as atividades do dia, ao clicar ele deve ir para a tela de visualização das atividades.

Contrato com o backend 
Ajustes na tela de Equipamentos


Descrição

Contexto
Os equipamentos terão campos dinâmicos e campos fixos. Os campos dinâmicos serão definidas a partir de um template configurado pela conta.

Então será necessário buscar o equipment_template para saber como definir os campos dos equipamentos dinâmicos.

Você poderá acessar dois tipos de telas de listagem de equipamentos. Para simplificar a leitura da task irei dividir em dois termos:

Listagem geral de equipamentos: é a tela que conterá filtros de cliente/setor e subsetor.

Listagem estrita de equipamentos: é a tela que lista os equipamentos de um setor em específico.

A tela de listagem geral de equipamentos poderá ser acessado através dos botões “Listar equipamentos“ nos setores.

A tela de listagem estrita de equipamentos poderá ser acessado pelo menu.

O que deve ser feito?
Ler QRCode
Deverá ser possível ler QRCode de um equipamento, seja no atalho na Home, ou na tela de listagem geral de equipamentos.


Tela de listagem geral de equipamentos
Criar tela de equipamentos com três filtros interdependentes:

Clientes

Setores

Subsetores (Opcional)

Ao entrar não deve ser listado os equipamentos, deve aparecer uma mensagem informando ao usuário que ele deve utilizar os filtros. Ao selecionar os filtros de Clientes e Setor deverá ser feito a requisição pro backend.

O filtro de subsetor é opcional, mas se o valor for mudado deverá fazer a requisição.

Na tela de listagem deverá ter dois botões:

Visualizar Equipamento (ou um ícone de olho). Só deve aparecer se o usuário tiver a permissão "equipments.view_equipment"

Editar Equipamento (ou ícone de lápis). Só deve aparecer se o usuário tiver a permissão "equipments.change_equipment"

Remover Equipamento (ou ícone de lixeira). Só deve aparecer se o usuário tiver a permissão "equipments.delete_equipment"

Realizar Atividade (ou um ícone de ferramenta). Só deve aparecer se o usuário tiver a permissão "activities.add_activity"

Tela de listagem restrita de equipamentos
Criar tela de equipamentos com um campo de busca por termo

Na listagem mostrar os campos:

Tag

Tipo de Equipamento

Fabricante

Na tela de listagem deverá ter dois botões:

Visualizar Equipamento (ou um ícone de olho). Só deve aparecer se o usuário tiver a permissão "equipments.view_equipment"

Editar Equipamento (ou ícone de lápis). Só deve aparecer se o usuário tiver a permissão "equipments.change_equipment"

Remover Equipamento (ou ícone de lixeira). Só deve aparecer se o usuário tiver a permissão "equipments.delete_equipment"

Realizar Atividade (ou um ícone de ferramenta). Só deve aparecer se o usuário tiver a permissão "activities.add_activity"

Tela de visualização de equipamentos
Criar tela de visualização de equipamentos, para os campos adicionais, usar o label como nome do campo e o value como o valor.

Deverá ter um botão “Criar atividades“. Só deve aparecer se o usuário tiver a permissão "activities.add_activity"(Isso será melhor tratado na task de Atividades)

Tela de criação de equipamentos
Criar tela de criação de equipamentos, com os campos:

Tag (Opcional)

Fabricante (buscar dados do endpoint de brands)

Tipo de Equipamento (buscar dados do endpoint de equipment_types)

Campos adicionais (Buscar esses campos do endpoint de Template)

Tela de edição de equipamentos
Criar tela de criação de equipamentos, com os campos:

Tag (Opcional)

Fabricante (buscar dados do endpoint de brands)

Tipo de Equipamento (buscar dados do endpoint de equipment_types)

Campos adicionais (Buscar esses campos do endpoint de Template)

Buscar dados do equipamento e vincular valores com os campos através do campo key.

Deleção de equipamentos
Deverá mostrar um popup confirmando a exclusão.

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
    }
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
    }
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
    ]
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
    ]
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
    "justification_target": "Option A"
  },
]
Enquanto que o modelo de campos dinâmicos por parte do Equipamento ficaria assim:



"additional_fields": {
      "compressor_type": {
          "value": "ABC",
          "label": "Label 3"
      }
  },
Contrato com o backend
Listar equipamentos por cliente e setor
GET /api/equipments?client_id=<client_id>&sector_id=<sector_id>

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-17f1dd7c-e683-46ef-ac6f-33d383952959?action=share&source=copy-link&creator=34422452&ctx=documentation


Buscar equipamentos por id
GET /api/equipments/:equipment_id

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-b641d238-8692-4c8c-a9a7-602e0e5d396f?action=share&source=copy-link&creator=34422452&ctx=documentation

Buscar equipamentos por QR Code
GET /api/equipments/:qr_code(uuid)
Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-b641d238-8692-4c8c-a9a7-602e0e5d396f?action=share&source=copy-link&creator=34422452&ctx=documentation

Buscar template de equipamento atual 
GET /api/equipment_template/current
Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-84c622a9-5c7f-4fa4-bf67-d280d5473cfd?action=share&source=copy-link&creator=34422452&ctx=documentation


Criar equipamentos
POST /api/equipments



{
    "client_id": 1,
    "sector_id": 2,
    "brand_id": 1,
    "equipment_type_id": 2,
    "tag": "NP001",
    "additional_fields": {
        "compressor_type": "ABC"
    }
}
Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-e4b45bbb-e462-4b03-bcd1-81b7ec8d3f95?action=share&source=copy-link&creator=34422452&ctx=documentation


Editar equipamentos 
PUT /api/equipments/:equipment_id



{
    "client_id": 1,
    "sector_id": 2,
    "brand_id": 1,
    "equipment_type_id": 2,
    "tag": "NP001",
    "additional_fields": {
        "compressor_type": "ABC"
    }
}
Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-04b90195-560b-41ea-a7e9-05d832ae945b?action=share&source=copy-link&creator=34422452&ctx=documentation


Deletar um equipamento
DELETE /api/equipments/:equipment_id

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-035b88df-e530-4ae3-88c1-1ac38599e152?action=share&source=copy-link&creator=34422452&ctx=documentation 
justes na tela de Atividades I


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
Ajustes na tela de Setores


Descrição

Contexto
Os setores terão relacionamento hierárquico com outros setores, montando uma estrutura de setor-pai e setor-filho, para identificar o nível hierárquico temos o atributo level e para identificar de quem o setor é filho temos o atributo parent_id.

O fluxo se dará da seguinte maneira:

image-20250729-231131.png
 

O que deve ser feito?


Tela de listagem de Setores Pais
Ao clicar no botão “Setores“ na tela de listagem de clientes ou clicar no botão “Listar Setores“ na tela de visualização de clientes o usuário deverá ser redirecionado para um tela de listagem de setores.


Essa tela só deverá listar os setores-pais e exibir o campo nome.

Em cada item terá dois botões:

Listar equipamentos

Visualizar setor 

Tela de visualização de Setores Pais
Ao clicar no botão “Visualizar setor“ na tela de listagem de setores deverá ser aberto uma tela que exibirá as informações:

Nome

Nome completo

Deverá ter um botão “Listar equipamentos“ na tela, com uma mensagem explicando que essa opção se trata de equipamentos que não estão alocados em nenhum setor filho.

Além disso deverá ter uma lista de subsetores (se houver). Essa lista terá o campo nome e dois botões em cada item:

Listar equipamentos

Visualizar setor

Tela de visualização de Setores Filhos
Ao clicar no botão “Visualizar setor“ na tela de listagem de setores deverá ser aberto uma tela que exibirá as informações:

Nome

Nome completo

Deverá ter um botão “Listar equipamentos“ na tela

Para a listagem de setores, o usuário deve ter a permissão "clients.list_sectors" e para visualização deve ter a permissão "clients.view_sector"

Contrato com o backend
Listar setores por nível hierárquico
GET /api/clients/:client_id/sectors?level=<0ou 1>

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-ba896150-c671-43d5-9a5e-679edbd4cea4?action=share&source=copy-link&creator=34422452&ctx=documentation


Listar setores-filhos de um setor
GET /api/clients/:client_id/sectors?parent_id=<sector_id>

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-ba896150-c671-43d5-9a5e-679edbd4cea4?action=share&source=copy-link&creator=34422452&ctx=documentation


Buscar setor por id
GET /api/clients/:client_id/sectors/:sector_id
Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-beb2501d-deee-40e1-927d-c99a56a6d8c1?action=share&source=copy-link&creator=34422452&ctx=documentation
Ajustes na tela de Clientes


Descrição

Contexto
Será inserido na área de clientes novas seções, contratos, contatos e endereços.

O fluxo se dará da seguinte maneira:

Captura de tela de 2025-07-29 18-23-58.png
 

O que deve ser feito?


Tela de listagem de Clientes
Criar tela de listagem de clientes, separando clientes avulsos de clientes de contrato. Ambas as telas só poderão ser acessadas por quem tiver a permissão "clients.list_clients"

Na tela de listagem de clientes deverá ser listado todos os clientes com os seguintes campos:

Nome

Email

Documento

Na tela de listagem deverá ter dois botões:

Visualizar Cliente (ou um ícone de olho). Só deve aparecer se o usuário tiver a permissão "clients.view_client"

Setores. Só deve aparecer se o usuário tiver a permissão "clients.list_sectors"

Na tela de listagem deverá ter um campo de busca por termo para as colunas apresentadas

Tela de visualização de Clientes
Após clicar no botão “Visualizar Cliente“ o usuário deverá ser redirecionado para a tela de visualização de clientes.

Na tela de Visualização de Clientes deverá mostrar todos os dados do cliente:

Nome

Email

Documento

Telefone

Nome Fantasia

Registro Estadual

Data de abertura

Total de Setores

Total de Equipamentos

Na tela de visualização de clientes deverá ser listado também os contratos daquele cliente, com os campos:

Data de início

Data final

Frequência de atividade

Na tela de visualização de clientes deverá ser listado também os contatos daquele cliente, com os campos:

Nome

Email

Telefone

Na tela de visualização de clientes deverá ser listado também os endereços daquele cliente, com os campos:

Nome

Cidade / Estado / País

Bairro

Endereço

Número

Cep

Na tela de listagem deverá ter um botão “Listar Setores“

A forma como essas informações são dispostas na tela pode ser de sua livre escolha, precisa ser algo responsivo.
Pode ser usado modais ou seções colapsadas

Para a listagem de contratos, o usuário deve ter a permissão "clients.view_contract"

Contrato com o backend
Listar clientes por tipo
GET /api/clients?has_contract=<true|false>

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-51a0b1b0-599c-4197-b996-5db81f379a5d?action=share&source=copy-link&creator=34422452&ctx=documentation


Buscar clientes por id
GET /api/clients/:client_id

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-dd149a2a-51ae-49cd-b489-49dea1e3d94f?action=share&source=copy-link&creator=34422452&ctx=documentation


Listar contratos de um cliente
GET /api/clients/:client_id/contracts

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-74dbbf0d-ea2d-4265-b576-be8b677309d1?action=share&source=copy-link&creator=34422452&ctx=documentation


Listar contatos de um cliente
GET /api/clients/:client_id/contacts

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-ae7b96a9-3bb9-4560-98db-ac365dd7fb28?action=share&source=copy-link&creator=34422452&ctx=documentation



Listar endereços de um cliente
GET /api/clients/:client_id/addresses

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-0c29d960-59aa-4a40-ba90-e88643f14385?action=share&source=copy-link&creator=34422452&ctx=documentation
Uso do endpoint de permissões


Descrição

Contexto
Antigamente o token carregava as informações da permissões, mas por conta da grande quantidade de permissões o tamanho do token cresceu, o que causou problemas.

Foi criado um endpoint para trazer as permissões do usuário.

O que deve ser feito?
Após o login, ou o refresh token deverá ser feito uma requisição para o endpoint de permissions

As permissões deverão ser armazenadas em um storage local para evitar múltiplos requests para o backend.

Contrato com o backend
Buscar permissões
GET /api/me/permissions

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-7c82b3b5-b590-4966-b34c-6175ac80109f?action=share&source=copy-link&creator=34422452&ctx=documentation
Criação da tela de preferência de Usuários


Descrição

Contexto
Visando atingir um público internacional, será necessário criar uma tela para que o usuário visualize e edite suas preferências de idioma, essa escolha irá refletir no idioma do sistema como um todo.

O que deve ser feito?
Ao logar no sistema deverá ser puxado a preferência de idioma do usuário e usar isso para a internacionalização.

Enquanto essa request não é feita o idioma padrão deverá ser 'pt-br' 

Deverá ser criado uma tela para visualização / edição das preferências de usuário com somente um campo (idiomas). Esse campo é um select com os seguintes dados(Label precisa ser internacionalizada também):

Português: ‘pt-br’

Inglês: ‘en’

Ao salvar as preferências o sistema precisa refletir isso

Contrato com backend
Listar preferências
GET /api/me/preferences

Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-cc676891-0f0c-4982-9461-0e895b74e954?action=share&source=copy-link&creator=34422452&ctx=documentation

Editar preferências
PATCH /api/me/preferences



{
    "language": "en"
}
Segue link para documentação completa da API: https://keos-sgm.postman.co/workspace/GEMATEC~6fafc1c0-f4df-40ba-8c4b-658c9445a625/request/34422452-43f13f8e-889b-40a0-9af3-857e69124930?action=share&source=copy-link&creator=34422452&ctx=documentation