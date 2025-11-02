<!-- b0df7421-3429-4f53-a616-9825daee87a0 8e9ef7f0-e344-4444-acff-30bfda71d514 -->
# Correção do Formulário de Múltiplos Equipamentos

## Problemas Identificados

### 1. Campo "tag" obrigatório incorretamente
**Arquivo**: `src/Components/AddMultipleEquipmentsModal.tsx`
**Linha 494**: Validação `!newTag.trim()` impede criação sem tag

### 2. Teclado desaparecendo durante digitação
**Causa raiz**: Formulário de criação está dentro de `ListHeaderComponent` da FlatList, causando re-render completo a cada digitação
**Linhas problemáticas**: 620-716 (renderTopHeader), 763 (ListHeaderComponent)

### 3. Verificação de requisições durante digitação
**Status**: ✅ Não há requisições durante digitação - o DynamicEquipmentFields só busca template quando `equipmentTypeId` muda

## Soluções Implementadas

### Problema 1: Tornar campo "tag" opcional

**Arquivo**: `src/Components/AddMultipleEquipmentsModal.tsx`

#### Mudança 1: Remover validação obrigatória (linha ~494)
```typescript
// ANTES:
if (!newTag.trim() || !Number.isFinite(brandNum) || !Number.isFinite(typeNum)) {
    Alert.alert('Atenção', 'Preencha Tag, Fabricante e Tipo de Equipamento');
    return;
}

// DEPOIS:
if (!Number.isFinite(brandNum) || !Number.isFinite(typeNum)) {
    Alert.alert('Atenção', 'Preencha Fabricante e Tipo de Equipamento');
    return;
}
```

#### Mudança 2: Garantir envio de string vazia (linhas ~352, ~418, ~531)
Verificar que em todos os payloads, tag seja convertida para `""` quando vazia:
```typescript
tag: p.tag?.trim?.() || '', // Já está correto
```

#### Mudança 3: Atualizar placeholder do campo Tag (linha ~657)
```typescript
placeholder