# Debug - Menu Clientes não Aparecendo

## Análise do Problema

### 1. O que a API retorna:
```json
{
  "slug": "operational",
  "items": [
    {
      "slug": "clients",
      "required_permissions": ["list_clients", "list_me_clients"],
      "required_apps": ["web"]
    }
  ]
}
```

### 2. O que o MenuService faz:
- Detecta o item "clients" dentro de "operational"
- Expande em dois itens:
  - `clients_with_contract` (Clientes com Contrato)
  - `clients_without_contract` (Clientes Avulsos)
- Define `required_apps: ['web', 'mobile']`

### 3. O que o DrawerNavigation espera:
- Slugs mapeados em `SLUG_TO_APP_DATA`
- `clients_with_contract` → `ClientsComContratoScreen`
- `clients_without_contract` → `ClientsAvulsosScreen`

## Possíveis Problemas

### 1. Filtro por App (MAIS PROVÁVEL)
O item original tem `required_apps: ["web"]` e o app é mobile. Mesmo que mudamos para `['web', 'mobile']`, o filtro pode estar acontecendo antes.

### 2. Filtro por Permissões
Se o usuário não tem `list_clients` ou `list_me_clients`, os itens não aparecem.

### 3. Estrutura do Menu
O processamento pode não estar aplicando corretamente aos sub-itens.

## Logs para Verificar

Execute o app e procure por:

1. **MenuService:**
   ```
   [MenuService] Expandindo item 'clients' em clientes com/sem contrato
   [MenuService] Categoria: operational
     - Item: clients_with_contract (Clientes com Contrato)
     - Item: clients_without_contract (Clientes Avulsos)
   ```

2. **DrawerNavigation:**
   ```
   [DrawerNavigation] Processando item: clients_with_contract
   [DrawerNavigation] Renderizando item: clients_with_contract
   ```

## Solução Alternativa

Se o problema for o filtro por `required_apps`, podemos:
1. Remover o filtro por apps no DrawerNavigation
2. Ou garantir que todos os itens de menu mobile tenham `'mobile'` em `required_apps`
