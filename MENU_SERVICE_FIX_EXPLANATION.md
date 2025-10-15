# Correção do MenuService - Explicação Detalhada

## Problema Identificado
A API retorna o menu em formato hierárquico com um único item "clients", mas o app espera dois itens separados:
- `clients_with_contract` (Clientes com Contrato)
- `clients_without_contract` (Clientes Avulsos)

## Formato da API (Real)
```json
[
  {
    "slug": "operational",
    "icon": "briefcase",
    "items": [
      {
        "slug": "clients",
        "required_permissions": ["list_clients", "list_me_clients"],
        "required_apps": ["web"]
      }
    ]
  }
]
```

## O que o App Espera
- `clients_with_contract` → navega para `ClientsComContratoScreen`
- `clients_without_contract` → navega para `ClientsAvulsosScreen`

## Solução Implementada

### 1. Processamento Especial da Categoria "operational"
Quando encontramos o item "clients", expandimos ele em dois itens:

```typescript
if (item.slug === 'clients') {
    processedItems.push({
        slug: 'clients_with_contract',
        title: 'Clientes com Contrato',
        required_permissions: item.required_permissions,
        required_apps: item.required_apps
    });
    
    processedItems.push({
        slug: 'clients_without_contract',
        title: 'Clientes Avulsos',
        required_permissions: item.required_permissions,
        required_apps: item.required_apps
    });
}
```

### 2. Adição de Itens Base
Se o item "home" não vier da API, adicionamos automaticamente:

```typescript
if (!existingSlugs.has('home')) {
    processedMenu.unshift({
        slug: 'home',
        title: 'Home',
        icon: 'home',
        required_permissions: [],
        required_apps: ['mobile']
    });
}
```

## Resultado Final
O menu agora mostrará:
- Home (se não vier da API)
- Operational
  - **Clientes com Contrato** ✓
  - **Clientes Avulsos** ✓
  - Equipments
  - Activities
  - Roadmaps
- Basic
- Administrator
- Support

## Logs para Debug
```
[MenuService] Expandindo item 'clients' em clientes com/sem contrato
[MenuService] Menu processado: [...]
```
