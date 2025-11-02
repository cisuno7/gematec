# 🔧 Ferramentas de Debug de Autenticação

## 📋 Resumo

Se o endpoint `/api/me` funciona no **Postman** mas dá erro 500 no **app mobile**, o problema está na forma como o app está enviando as requisições.

## ✅ O que funciona

- ✅ Backend Django está funcionando
- ✅ Tenant "develop" existe e está configurado
- ✅ Migrations aplicadas corretamente
- ✅ Autenticação JWT funcionando (testado no Postman)

## ❌ O problema

- ❌ App mobile recebe erro 500 HTML do Django
- ❌ Erro específico: `ProgrammingError: relation "core_users_user" does not exist`

**Isso sugere que o app está:**
1. Usando um token JWT expirado ou inválido
2. Enviando o token de um tenant diferente
3. Construindo a URL incorretamente
4. Com cache de dados antigos no AsyncStorage

---

## 🛠️ Ferramentas de Debug Implementadas

### 1. **Logs Aprimorados no ApiClient**

Agora o `ApiClient` exibe informações detalhadas de cada requisição:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 DEBUG ACCOUNT/SCHEMA
📦 Account no AsyncStorage: develop
🔑 Token (primeiros 50 chars): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
🔑 Token length: 245
🌐 Base URL antes: undefined
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Base URL final: https://develop.keosstg001.xyz/api
✅ URL completa: https://develop.keosstg001.xyz/api/me
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. **Detecção de Erros HTML do Django**

Quando o backend retorna HTML (erro do Django), o app agora detecta e extrai as informações importantes:

```
🚨 RESPOSTA É HTML (ERRO DO DJANGO)! 🚨
Primeiros 500 caracteres: <!DOCTYPE html>...
🔴 Tipo do erro Django: ProgrammingError
🔴 Local do erro: /api/me
🔴 Mensagem do erro: relation "core_users_user" does not exist
```

### 3. **Tela de Debug na Aba "Perfil"**

Foram adicionados botões de debug na aba "Perfil" do app:

#### **🔍 Mostrar Dados de Auth**
- Exibe informações do token armazenado
- Mostra se o token está expirado
- Decodifica o payload do JWT
- Exibe account, user_id, datas de expiração

#### **🌐 Testar Construção de URL**
- Verifica qual URL está sendo construída
- Mostra a URL completa para `/api/me`
- Confirma se o account está correto

#### **📋 Mostrar Todas as Chaves**
- Lista todas as chaves no AsyncStorage
- Mostra preview dos valores armazenados
- Útil para encontrar dados inconsistentes

#### **🚀 Executar Todos os Testes**
- Roda todos os testes de uma vez
- Gera um relatório completo no console

#### **🗑️ Limpar Cache de Auth**
- Remove todos os dados de autenticação
- Força logout completo
- Útil para resolver problemas de cache

---

## 📝 Como Usar

### **Passo 1: Reproduzir o Erro**

1. Abra o app mobile
2. Tente fazer login ou acessar uma tela que chame `/api/me`
3. Observe o erro no console

### **Passo 2: Executar Debug**

1. Navegue até a aba **"Perfil"**
2. Clique em **"🚀 Executar Todos os Testes"**
3. Abra o **console do React Native**
4. Analise os logs gerados

### **Passo 3: Verificar Informações**

Procure por:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 DEBUG: DADOS DE AUTENTICAÇÃO ARMAZENADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Account: develop
🔑 Access Token:
  - Length: 245
  - Payload: {
      user_id: 1,
      user_name: "develop",
      exp: 1729611234,
      exp_date: "2024-10-22T15:13:54.000Z"
    }
  ⚠️ TOKEN EXPIRADO!  ← PROBLEMA AQUI!
  - Expirou há: 30 minutos atrás
```

### **Passo 4: Resolver o Problema**

#### **Se o token estiver expirado:**
```
1. Clique em "🗑️ Limpar Cache de Auth"
2. Reinicie o app
3. Faça login novamente
4. Teste novamente
```

#### **Se o account estiver errado:**
```
1. Verifique se está usando "develop"
2. Limpe o cache
3. Faça login com account correto
```

#### **Se a URL estiver errada:**
```
Deve ser: https://develop.keosstg001.xyz/api/me
Se aparecer outra coisa, há problema na construção da URL
```

---

## 🔍 Checklist de Diagnóstico

Use este checklist para diagnosticar o problema:

- [ ] **Token presente no AsyncStorage?**
  - Sim → Continue
  - Não → Faça login novamente

- [ ] **Token expirado?**
  - Sim → Limpe cache e faça login novamente
  - Não → Continue

- [ ] **Account correto no AsyncStorage?**
  - `develop` → Continue
  - Outro ou vazio → Limpe cache e faça login com account correto

- [ ] **URL construída corretamente?**
  - `https://develop.keosstg001.xyz/api` → Continue
  - Outra → Problema na configuração do apiConfig.ts

- [ ] **Mesmo token funciona no Postman?**
  - Sim → Problema na configuração do app
  - Não → Token realmente inválido, gere um novo

---

## 🎯 Comparação: Postman vs App

### **O que o Postman envia:**
```
GET https://develop.keosstg001.xyz/api/me
Headers:
  Authorization: Bearer eyJhbGc...
  Accept: application/json
```

### **O que o App deve enviar:**
```
GET https://develop.keosstg001.xyz/api/me
Headers:
  Authorization: Bearer eyJhbGc...
  Accept: application/json
```

**Se o app enviar algo diferente, haverá problema!**

---

## 📊 Logs Esperados (Tudo OK)

Quando tudo estiver funcionando, você verá:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 DEBUG ACCOUNT/SCHEMA
📦 Account no AsyncStorage: develop
🔑 Token (primeiros 50 chars): eyJhbGc...
🔑 Token length: 245
🌐 Base URL antes: undefined
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Base URL final: https://develop.keosstg001.xyz/api
✅ URL completa: https://develop.keosstg001.xyz/api/me
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ApiClient] Configuração final: {
  baseURL: 'https://develop.keosstg001.xyz/api',
  url: '/me',
  method: 'GET',
  hasAuth: true
}

[ApiClient] Resposta bem-sucedida para: /me
```

---

## ⚠️ Logs de Erro (Problema Detectado)

Quando há problema, você verá:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 ERRO NA REQUISIÇÃO HTTP - LOG DETALHADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 URL: /me
🔧 Método: GET
🌐 Base URL: https://develop.keosstg001.xyz/api

❌ STATUS CODE: 500

📥 PAYLOAD DA RESPONSE:
🚨 RESPOSTA É HTML (ERRO DO DJANGO)! 🚨
Primeiros 500 caracteres: <!DOCTYPE html>...
🔴 Tipo do erro Django: ProgrammingError
🔴 Mensagem do erro: relation "core_users_user" does not exist
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Isso indica que o token está enviando para o schema errado!**

---

## 🚀 Próximos Passos

1. **Execute os testes de debug** na tela de Perfil
2. **Copie os logs** do console e envie para análise
3. **Compare com os logs do Postman** (se possível)
4. **Tente limpar o cache** e fazer login novamente
5. **Se o problema persistir**, há um bug no backend que o Antonio precisa corrigir

---

## 📝 Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/Context/ApiClient.ts` | Logs aprimorados + detecção de HTML |
| `src/utils/debugAuth.ts` | Utilitários de debug (NOVO) |
| `app/(tabs)/profile.tsx` | Botões de debug adicionados |

---

## 💡 Dica Final

Se depois de limpar o cache e fazer login novamente **o problema persistir**, significa que há um **bug no backend** relacionado ao multi-tenancy que o Antonio (backend) precisa corrigir.

Possíveis problemas no backend:
- Pool de conexões PostgreSQL reutilizando schema errado
- Middleware de tenants executando na ordem errada
- Modelo `User` em `TENANT_APPS` quando deveria estar em `SHARED_APPS`

