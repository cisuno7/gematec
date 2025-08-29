Contrato com o backend
Listar tipos de atividades possíveis de serem cadastradas pelo técnico
GET /api/activity_types?equipment_insertion_policy=manual&creation_policy=common&is_active=true
Ponto de extremidade da API: obter detalhes do tipo de atividade
Método de solicitação
OBTER
Extremidade
{{gematec__host}}/api/activity_types/:activity_type_id
Descrição
Esse endpoint recupera informações detalhadas sobre um tipo de atividade específico identificado pelo activity_type_id. 
Parâmetros
activity_type_id (parâmetro de caminho): o identificador exclusivo do tipo de atividade que você deseja recuperar.

Formato de resposta esperada
A resposta estará no formato JSON e incluirá a seguinte estrutura:
links: Um objeto que contém informações de paginação.
next: URL para a próxima página de resultados (se houver).
previous: URL para a página anterior de resultados (se houver).

count: número total de resultados retornados para a consulta.
results: Uma matriz de objetos do tipo atividade, em que cada objeto contém:
id: identificador exclusivo para o tipo de atividade.
name: nome do tipo de atividade.
creation_policy: Política relativa à criação deste tipo de atividade.
equipment_insertion_policy: Política relativa à inserção de equipamentos relacionados a este tipo de atividade.
closure_policy: Política para fechar esse tipo de atividade.


Exemplo de resposta


JSON








{
  "links": {
    "next": null,
    "previous": null
  },
  "count": 0,
  "results": [
    {
      "id": 0,
      "name": "",
      "creation_policy": "",
      "equipment_insertion_policy": "",
      "closure_policy": ""
    }
  ]
}


Essa estrutura permite que os usuários entendam as políticas do tipo de atividade e outros detalhes relevantes.


Propósito
Esse endpoint recupera informações detalhadas sobre um tipo de atividade específico identificado por sua ID exclusiva. É útil para obter as propriedades e políticas associadas a um determinado tipo de atividade no sistema.
Método de solicitação
OBTER
Extremidade
{{gematec__host}}/api/activity_types/:activity_type_id
Parâmetros
activity_type_id (Parâmetro de caminho): o identificador exclusivo do tipo de atividade que você deseja recuperar. Essa ID deve ser substituída na URL pela ID real do tipo de atividade.

Formato de resposta esperada
A resposta estará no formato JSON e incluirá os seguintes campos:
links: Um objeto que contém links de paginação.
next: URL para a próxima página de resultados (se aplicável).
previous: URL para a página anterior de resultados (se aplicável).

count: o número total de tipos de atividade que correspondem à solicitação (geralmente 0 ou 1 para esse ponto de extremidade).
results: Uma matriz de objetos do tipo atividade, em que cada objeto contém:
id: o identificador exclusivo do tipo de atividade.
name: o nome do tipo de atividade.
creation_policy: a política que rege a criação desse tipo de atividade.
equipment_insertion_policy: A política de inserção de equipamentos relacionados a este tipo de atividade.
closure_policy: a política que determina como o tipo de atividade pode ser fechado.


Exemplo de resposta


JSON








{
  "links": {
    "next": null,
    "previous": null
  },
  "count": 0,
  "results": [
    {
      "id": 0,
      "name": "",
      "creation_policy": "",
      "equipment_insertion_policy": "",
      "closure_policy": ""
    }
  ]
}


Essa resposta indica que não há tipos de atividade encontrados para a ID fornecida, com a matriz de resultados contendo um único objeto com valores padrão.




