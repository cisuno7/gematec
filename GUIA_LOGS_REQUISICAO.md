# 📋 Guia de Logs de Requisições HTTP

## ✅ O que foi implementado

Agora **TODA requisição HTTP** do app exibe um log COMPLETO mostrando:

1. ✅ **URL completa** sendo consultada
2. ✅ **Token JWT completo** sendo usado
3. ✅ **Se o token está expirado** (antes de enviar!)
4. ✅ **Account/Tenant** sendo usado
5. ✅ **Headers**, query params e body
6. ✅ **Diagnóstico automático** de problemas

---

## 📊 Exemplo de Log (Requisição com Sucesso)

Quando você fizer qualquer requisição (ex: `/api/me`), verá isto no console:

```
╔═══════════════════════════════════════════════════════════════╗
║           🚀 REQUISIÇÃO HTTP - LOG COMPLETO                  ║
╚═══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│  🎯 DETALHES DA REQUISIÇÃO                                 │
└─────────────────────────────────────────────────────────────┘

🔧 MÉTODO: GET
🌐 URL COMPLETA: https://develop.keosstg001.xyz/api/me
📦 ACCOUNT: develop

🔑 ACCESS TOKEN:
   ✅ Token presente
   📏 Length: 245
   🔤 Início: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoi...
   🔤 Final: ...NY__BQJNVVRYTmY890sTdIoGNwxguPgm5nRK4-1l7BE

   📋 TOKEN COMPLETO (copie para testar no Postman):
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzYxMTQwODM0LCJpYXQiOjE3NjExMzgxMzQsImp0aSI6IjlmNmYwM2M3NzlkZDQyNDhhNzhmYTA0Y2QyNDgzNzBlIiwidXNlcl9pZCI6MSwidXNlcl9uYW1lIjoiZGV2ZWxvcCIsImF1ZCI6ImF1ZCIsImlzcyI6ImlzcyJ9.NY__BQJNVVRYTmY890sTdIoGNwxguPgm5nRK4-1l7BE

   🔍 Payload do Token:
      - user_id: 1
      - user_name: develop
      - exp: 1761140834
      - exp_date: 22/10/2025 11:47:14

   ✅ Token válido
      Expira em: 45 minutos

📤 HEADERS:
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Content-Type: application/json

╔═══════════════════════════════════════════════════════════════╗
║           ⏳ EXECUTANDO REQUISIÇÃO...                        ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 🚨 Exemplo de Log (Requisição com ERRO)

Se a requisição falhar, você verá:

```
╔═══════════════════════════════════════════════════════════════╗
║               ❌ ERRO NA REQUISIÇÃO HTTP                      ║
╚═══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│  🚨 INFORMAÇÕES DO ERRO                                    │
└─────────────────────────────────────────────────────────────┘

🔧 MÉTODO: GET
🌐 URL COMPLETA: https://develop.keosstg001.xyz/api/me
❌ STATUS CODE: 500
💬 MENSAGEM: Request failed with status code 500

🔑 TOKEN USADO NA REQUISIÇÃO:
   ✅ Token estava presente
   📏 Length: 245
   🔤 Início: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   🔤 Final: ...NY__BQJNVVRYTmY890sTdIoGNwxguPgm5nRK4-1l7BE

   📋 TOKEN COMPLETO (teste no Postman para comparar):
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzYxMTQwODM0...

   🔍 Payload do Token:
      - user_id: 1
      - user_name: develop
      - exp: 1761138000
      - exp_date: 22/10/2025 10:00:00

   ⚠️⚠️⚠️  TOKEN ESTAVA EXPIRADO! ⚠️⚠️⚠️
      🔴 ESTA É A CAUSA DO ERRO!
      Expirou há: 107 minutos
      ✅ SOLUÇÃO: Limpe o cache e faça login novamente!

📥 PAYLOAD DA RESPONSE:
🚨 RESPOSTA É HTML (ERRO DO DJANGO)! 🚨
Primeiros 500 caracteres: <!DOCTYPE html>...
🔴 Tipo do erro Django: ProgrammingError
🔴 Mensagem do erro: relation "core_users_user" does not exist
```

---

## 🎯 Como Usar os Logs para Diagnosticar

### **Cenário 1: Token Expirado**

**Você verá:**
```
⚠️⚠️⚠️  TOKEN ESTAVA EXPIRADO! ⚠️⚠️⚠️
   🔴 ESTA É A CAUSA DO ERRO!
   Expirou há: X minutos
```

**Solução:**
1. Abra a aba "Perfil" no app
2. Clique em "🗑️ Limpar Cache de Auth"
3. Reinicie o app
4. Faça login novamente

---

### **Cenário 2: Token Diferente do Postman**

**Você verá:**
```
📋 TOKEN COMPLETO (copie para testar no Postman):
eyJhbGc...
```

**Como verificar:**
1. Copie o token do log do app
2. Teste no Postman com esse token
3. Compare com o token que funciona no Postman

**Se os tokens forem diferentes:**
- O app está usando token antigo
- Solução: Limpar cache e fazer login

**Se o token for igual mas só falha no app:**
- Problema na construção da URL
- Verifique a URL completa no log

---

### **Cenário 3: URL Incorreta**

**Você verá:**
```
🌐 URL COMPLETA: https://develop.https://keosstg001.xyz/api/me
```

**Problema:** URL malformada (tem "https" duplicado)

**Solução:**
- Verificar `src/config/apiConfig.ts`
- Limpar cache

---

### **Cenário 4: Account Errado**

**Você verá:**
```
📦 ACCOUNT: production
```

**Mas deveria ser:**
```
📦 ACCOUNT: develop
```

**Solução:**
1. Limpar cache
2. Fazer login com account correto ("develop")

---

### **Cenário 5: Sem Token**

**Você verá:**
```
🔑 ACCESS TOKEN:
   ❌ Nenhum token encontrado!
   ⚠️  REQUISIÇÃO SEM AUTENTICAÇÃO - VAI FALHAR!
```

**Solução:**
- Fazer login no app

---

## 📝 Checklist de Diagnóstico

Use esta sequência quando houver erro:

1. **Verifique a URL:**
   ```
   ✅ Deve ser: https://develop.keosstg001.xyz/api/[endpoint]
   ❌ Não deve ter: https duplicado, subdomínios estranhos
   ```

2. **Verifique o Account:**
   ```
   ✅ Deve ser: develop
   ❌ Não deve ser: null, undefined, outro valor
   ```

3. **Verifique o Token:**
   ```
   ✅ Token presente: SIM
   ✅ Token expirado: NÃO
   ❌ Se expirado: Limpar cache e fazer login
   ```

4. **Compare com Postman:**
   ```
   - Copie o token do log
   - Teste no Postman
   - Veja se dá o mesmo erro
   ```

5. **Se tudo estiver OK mas ainda falha:**
   ```
   - Problema no backend
   - Enviar os logs para o Antonio
   ```

---

## 🚀 Testando Agora

Para ver os novos logs em ação:

1. **Abra o app mobile**
2. **Faça qualquer ação** que chame a API (ex: abrir tela de atividades)
3. **Abra o console** do React Native
4. **Veja o log completo** antes e depois da requisição

---

## 💡 Dicas

### **Para copiar o token rapidamente:**
- O log mostra o token completo pronto para copiar
- Use Ctrl+C no console
- Cole no Postman para testar

### **Para comparar com Postman:**
1. Copie a "URL COMPLETA" do log
2. Copie o "TOKEN COMPLETO" do log  
3. Faça a mesma requisição no Postman
4. Compare os resultados

### **Para enviar logs para análise:**
1. Copie TODO o bloco desde "🚀 REQUISIÇÃO HTTP" até o erro
2. Inclua tanto o log de REQUEST quanto o de ERROR
3. Envie para o time de desenvolvimento

---

## 📊 Comparação: Antes vs Depois

### **Antes ❌**
```
[ApiClient] Erro na requisição
Status: 500
```
**Não sabíamos:** Qual URL? Qual token? Por que falhou?

### **Depois ✅**
```
╔═══════════════════════════════════════════════════════════════╗
║               ❌ ERRO NA REQUISIÇÃO HTTP                      ║
╚═══════════════════════════════════════════════════════════════╝

🌐 URL COMPLETA: https://develop.keosstg001.xyz/api/me
🔑 TOKEN COMPLETO: eyJhbGc...
⚠️⚠️⚠️  TOKEN ESTAVA EXPIRADO! ⚠️⚠️⚠️
🔴 ESTA É A CAUSA DO ERRO!
✅ SOLUÇÃO: Limpe o cache e faça login novamente!
```
**Agora sabemos EXATAMENTE** o que está errado e como resolver!

---

## 🎯 Conclusão

Com esses logs, você pode:

✅ Ver a URL exata sendo chamada  
✅ Ver o token completo sendo usado  
✅ Saber se o token está expirado ANTES de enviar  
✅ Comparar com o Postman facilmente  
✅ Identificar a causa do erro automaticamente  
✅ Ter a solução sugerida no próprio log  

**Não é mais necessário adivinhar!** Os logs mostram tudo! 🎉

