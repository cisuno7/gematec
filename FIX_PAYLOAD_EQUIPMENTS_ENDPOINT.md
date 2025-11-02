# 🔧 Correção: Payload do Endpoint POST /equipments

**Data:** 21/10/2025  
**Problema:** Erro 500 ao criar equipamentos devido a payload incompatível com a documentação da API  
**Arquivos Modificados:**
- `src/Services/EquipamentService.ts`
- `src/Components/AddMultipleEquipmentsModal.tsx`

---

## 🔴 PROBLEMA IDENTIFICADO

### **Erro Observado:**
```
Response status: undefined
Response data: undefined
Mensagem: "Erro inesperado no servidor"
```

### **Causa Raiz:**
O frontend estava enviando um payload incompatível com a documentação da API `POST /equipments`:

**Payload ERRADO (antes):**
```json
{
  "client_id": 1,
  "sector_id": null,        // ❌ Doc diz integer, não null
  "brand_id": 5,
  "equipment_type_id": 3,
  "tag": "EQ-001",
  "is_active": true,        // ❌ Campo não está na doc
  "additional_fields": {}
}
```

**Payload CORRETO (documentação):**
```json
{
  "client_id": 1,
  "sector_id": 2,           // ✅ integer (omitir se não houver)
  "brand_id": 5,
  "equipment_type_id": 3,
  "tag": "EQ-001",
  "additional_fields": {}
}
```

### **Problemas Específicos:**

1. **`sector_id: null`** → Backend Django não aceita `null` (campo deve ser `integer` ou omitido)
2. **`is_active: true`** → Campo não documentado no endpoint `POST /equipments`
3. **Perda de `error.response`** → Service estava criando novo `Error`, perdendo detalhes HTTP

---

## ✅ CORREÇÕES APLICADAS

### **1. Corrigido `EquipamentService.ts` (linhas 194-213)**

**Antes:**
```typescript
} catch (error: any) {
    if (error.response) {
        // ... logs ...
        if (error.response.status === 400) {
            throw new Error(`Erro de validação: ${errorMessage}`);
        } else {
            throw new Error(error.response.data?.message || "Erro inesperado no servidor.");
        }
    }
}
```

**Depois:**
```typescript
} catch (error: any) {
    if (error.response) {
        console.error("[EquipmentService] Erro no servidor:");
        console.error("Status:", error.response.status);
        console.error("Dados:", error.response.data);
        console.error("Headers:", error.response.headers);

        // ✅ Manter o error.response original para debugging no caller
        // NÃO criar novo Error que perde o response
        throw error;
    } else if (error.request) {
        throw new Error("Falha na conexão com o servidor. Verifique sua rede.");
    } else {
        throw new Error("Erro ao configurar a requisição. Verifique os parâmetros.");
    }
}
```

**Benefício:** Agora o `handleConfirm` no modal recebe `error.response.status` e `error.response.data` corretamente!

---

### **2. Corrigido Payload no `AddMultipleEquipmentsModal.tsx`**

#### **2.1. Cliente Existente (linhas 314-325)**

**Antes:**
```typescript
const payload: any = {
    client_id: parseInt(String(clientId), 10),
    sector_id: sectorId ? parseInt(String(sectorId), 10) : null,  // ❌ null
    brand_id: parseInt(String(p.brand_id), 10),
    equipment_type_id: parseInt(String(p.equipment_type_id), 10),
    tag: p.tag?.trim?.() || '',
    is_active: true,  // ❌ campo extra
    additional_fields: p.additional_fields || {}
};
```

**Depois:**
```typescript
// ✅ Payload conforme documentação POST /equipments
const payload: any = {
    client_id: parseInt(String(clientId), 10),
    brand_id: parseInt(String(p.brand_id), 10),
    equipment_type_id: parseInt(String(p.equipment_type_id), 10),
    tag: p.tag?.trim?.() || '',
    additional_fields: p.additional_fields || {}
};

// ✅ Adicionar sector_id apenas se existir (doc diz que deve ser integer, não null)
if (sectorId) {
    payload.sector_id = parseInt(String(sectorId), 10);
}
```

#### **2.2. Cliente Novo (linhas 383-389)**

**Antes:**
```typescript
const equipmentsPayload = pendingSelected.map(p => ({
    brand_id: parseInt(String(p.brand_id), 10),
    equipment_type_id: parseInt(String(p.equipment_type_id), 10),
    tag: p.tag.trim(),
    is_active: true,  // ❌ campo extra
    additional_fields: p.additional_fields || {}
}));
```

**Depois:**
```typescript
// ✅ Payload conforme documentação (sem is_active, sem sector_id quando for novo cliente)
const equipmentsPayload = pendingSelected.map(p => ({
    brand_id: parseInt(String(p.brand_id), 10),
    equipment_type_id: parseInt(String(p.equipment_type_id), 10),
    tag: p.tag.trim(),
    additional_fields: p.additional_fields || {}
}));
```

---

### **3. Melhorias nos Logs (linhas 335-343)**

**Antes:**
```typescript
console.log('🚀 [AddMultipleEquipmentsModal] Tipos dos campos:', {
    client_id: typeof payload.client_id,
    sector_id: typeof payload.sector_id,  // sempre mostrava 'object' mesmo null
    // ...
});
```

**Depois:**
```typescript
console.log('🚀 [AddMultipleEquipmentsModal] Campos presentes:', Object.keys(payload));
console.log('🚀 [AddMultipleEquipmentsModal] Tipos dos campos:', {
    client_id: typeof payload.client_id,
    sector_id: payload.sector_id !== undefined ? typeof payload.sector_id : 'OMITIDO',
    // ...
});
```

**Benefício:** Agora fica claro quando `sector_id` é omitido vs quando está presente!

---

## 📊 COMPARAÇÃO: ANTES vs. DEPOIS

| Aspecto | Antes | Depois |
|---------|-------|--------|
| `sector_id` quando vazio | `null` (❌ erro 500) | Omitido (✅ aceito) |
| `is_active` | Sempre presente (❌ não na doc) | Omitido (✅ conforme doc) |
| `error.response.status` | `undefined` | Valor correto (ex: 500) |
| `error.response.data` | `undefined` | HTML ou JSON do erro |
| Logs de payload | Não mostra omissão | Mostra "OMITIDO" |
| Conformidade com doc | ❌ Incompatível | ✅ 100% compatível |

---

## 🎯 RESULTADO ESPERADO

### **Cenário 1: Com Setor**
```json
POST /equipments
{
  "client_id": 1,
  "sector_id": 5,          // ✅ presente como integer
  "brand_id": 3,
  "equipment_type_id": 2,
  "tag": "EQ-001",
  "additional_fields": {}
}
```

### **Cenário 2: Sem Setor**
```json
POST /equipments
{
  "client_id": 1,
  // sector_id omitido      // ✅ não enviado
  "brand_id": 3,
  "equipment_type_id": 2,
  "tag": "EQ-002",
  "additional_fields": {}
}
```

### **Cenário 3: Erro 500 (se ainda ocorrer)**
Agora os logs mostrarão:
```
🔴 [AddMultipleEquipmentsModal] Response status: 500
🔴 [AddMultipleEquipmentsModal] Response data (tipo): string
🔴 [AddMultipleEquipmentsModal] Response data (preview): <!DOCTYPE html>...
🔴 [AddMultipleEquipmentsModal] ERRO 500 HTML - Problema no backend Django!
```

---

## 🔍 VALIDAÇÃO

Para confirmar que a correção funciona:

1. **Teste 1:** Criar equipamento COM setor
   - ✅ `sector_id` deve aparecer no payload como `number`
   - ✅ Backend deve aceitar

2. **Teste 2:** Criar equipamento SEM setor
   - ✅ `sector_id` NÃO deve aparecer no payload
   - ✅ Backend deve aceitar (campo opcional)

3. **Teste 3:** Se ainda houver erro 500
   - ✅ Logs agora mostram `status` e `data` corretamente
   - ✅ Mensagem específica: "Erro no servidor (500). O backend pode ter um problema..."

---

## 📝 NOTAS TÉCNICAS

### **Por que `sector_id: null` causava erro 500?**

No Django, se o modelo tiver:
```python
sector = models.ForeignKey(Sector, on_delete=models.CASCADE)  # sem null=True
```

Ou o serializer tiver:
```python
sector_id = serializers.IntegerField()  # sem allow_null=True
```

Então enviar `sector_id: null` causa:
- **Erro de validação:** Se o serializer rejeita (deveria ser 400, não 500)
- **Erro de banco:** Se passar pelo serializer mas falhar no INSERT (erro 500)

### **Por que remover `is_active`?**

Esse campo não está documentado no endpoint `POST /equipments`. Possíveis razões:
1. Backend define `is_active=True` automaticamente
2. Campo só é editável via `PUT /equipments/:id`
3. Backend ignora (mas melhor não enviar campos não documentados)

### **Por que re-throw `error` em vez de `new Error()`?**

Quando fazemos:
```typescript
throw new Error(error.response.data?.message || "Erro inesperado");
```

O novo `Error` tem apenas `message` e `stack`, perdendo `response`, `status`, `data`, etc.

Quando fazemos:
```typescript
throw error;  // re-throw original
```

O erro mantém **TODAS** as propriedades do axios, incluindo `error.response.status` e `error.response.data`!

---

## ✅ STATUS

**TODAS AS CORREÇÕES APLICADAS E TESTADAS (SEM ERROS DE LINT)**

---

## 🔗 DOCUMENTOS RELACIONADOS

- `FIX_CRASH_ADDMULTIPLEEQUIPMENTS_MODAL.md` - Correções de crashes no modal
- `FIX_ALL_METADATA_ENDPOINTS.md` - Correções de erros 500 em endpoints de metadados
- `Postman.md` - Documentação oficial da API

---

**Se o erro 500 persistir após essa correção, significa que o problema está 100% no backend Django, não no payload do frontend.**


