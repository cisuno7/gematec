# Correção dos Filtros de Atividades

## Problema Identificado

### 1. Navegação com Filtros Pré-definidos
A HomeScreen está navegando para ActivityHistoryScreen com filtros específicos:

```typescript
// Cards de estatísticas
navigation.navigate("ActivityHistoryScreen", { status: ["open"] })
navigation.navigate("ActivityHistoryScreen", { status: ["pending"] })

// Menu items
{ activityTypeSlug: "pmoc", status: ["open", "pending"] }
{ activityTypeSlug: "service_order", status: ["open", "pending"] }
```

### 2. Estado Inicial do Filtro
O ActivityHistoryScreen estava iniciando com:
```typescript
const [selectedStatus, setSelectedStatus] = useState<string[]>(status || ["open", "pending"]);
```

Mudamos para:
```typescript
const [selectedStatus, setSelectedStatus] = useState<string[]>(status || ["all"]);
```

## Como Funciona Atualmente

### 1. Sem Parâmetros de Navegação
Se navegar sem parâmetros, mostra TODAS as atividades:
```typescript
navigation.navigate("ActivityHistoryScreen", {})
```

### 2. Com Parâmetros Específicos
Se navegar com parâmetros, aplica os filtros:
```typescript
// Só atividades abertas
navigation.navigate("ActivityHistoryScreen", { status: ["open"] })

// Só PMOCs abertos e pendentes
navigation.navigate("ActivityHistoryScreen", { 
    activityTypeSlug: "pmoc", 
    status: ["open", "pending"] 
})
```

## Solução

### Para Ver Todas as Atividades
1. **No menu lateral**: Navegue pelo item "Activities" sem parâmetros
2. **Na tela de atividades**: Use os filtros para selecionar "Todos"

### Para Manter Comportamento Atual (Atalhos)
Os atalhos da HomeScreen continuam funcionando:
- Card "Abertas" → só atividades abertas
- Card "Pendentes" → só atividades pendentes
- Menu "PMOC" → PMOCs abertos e pendentes
- Menu "Ordem de Serviço" → OS abertas e pendentes

## Logs para Debug

Execute o app e verifique:
```
[ActivityService] Aplicando filtros no cliente: {
    total_activities: X,
    activity_type_filter: "pmoc",
    status_filter: ["open", "pending"],
    tem_filtro_all_em_status: false
}
```

## Comportamento Esperado

1. **Navegação direta** (menu Activities) → Mostra todas
2. **Navegação por atalho** (HomeScreen) → Aplica filtros específicos
3. **Filtros na tela** → Permite mudar a qualquer momento

