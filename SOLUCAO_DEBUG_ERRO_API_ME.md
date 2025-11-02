# ✅ Solução: Debug do Erro `/api/me` 

## 📊 Situação Atual

**Confirmado pelo Antonio (Backend):**
- ✅ `/api/me` funciona perfeitamente no Postman
- ✅ `/api/activities` funciona perfeitamente no Postman
- ✅ Migrations executadas corretamente
- ✅ Tenant "develop" existe e funciona

**Problema:**
- ❌ App mobile recebe erro 500 (HTML do Django)
- ❌ Erro: `ProgrammingError: relation "core_users_user" does not exist`

## 🎯 Conclusão

**O problema NÃO é no backend!** Se funciona no Postman, o backend está OK.

O problema está no **app mobile** - alguma diferença entre o que o Postman envia e o que o app envia.

## 🛠️ Solução Implementada

Foram criadas ferramentas de debug completas para identificar exatamente qual é o problema.

### **1. Logs Aprimorados**

O `ApiClient` agora exibe:
- Account usado
- Token JWT (primeiros 50 caracteres)
- URL sendo construída
- URL completa da requisição
- Detecção de respostas HTML do Django
- Extração automática do erro específico

### **2. Utilitários de Debug**

Criado arquivo `src/utils/debugAuth.ts` com funções para:
- Mostrar dados de autenticação armazenados
- Verificar se token está expirado
- Testar construção de URLs
- Listar todas as chaves do AsyncStorage
- Limpar cache de autenticação

### **3. Tela de Debug**

Adicionados botões na aba "Perfil" para executar testes facilmente:
- 🔍 Mostrar Dados de Auth
- 🌐 Testar Construção de URL
- 📋 Mostrar Todas as Chaves
- 🚀 Executar Todos os Testes
- 🗑️ Limpar Cache de Auth

---

## 📝 Como Usar

### **Passo 1: Abrir o App**
1. Inicie o app mobile
2. Navegue até a aba **"Perfil"**

### **Passo 2: Executar Testes**
1. Clique em **"🚀 Executar Todos os Testes"**
2. Abra o console do React Native
3. Analise os logs gerados

### **Passo 3: Procurar por Problemas**

Verifique se aparece algum destes problemas:

#### **Token Expirado**
```
⚠️ TOKEN EXPIRADO!
- Expirou há: 30 minutos atrás
```
**Solução:** Clique em "🗑️ Limpar Cache de Auth", reinicie e faça login novamente.

#### **Account Incorreto**
```
📦 Account no AsyncStorage: (não definido)
ou
📦 Account no AsyncStorage: outro_valor
```
**Solução:** Deve ser "develop". Limpe cache e faça login com account correto.

#### **URL Incorreta**
```
✅ Base URL final: https://develop.https://keosstg001.xyz/api
```
**Solução:** Problema na configuração do `apiConfig.ts`.

#### **Token de Outro Tenant**
```
🔑 Access Token Payload:
  user_id: 1
  (mas usando schema errado)
```
**Solução:** Token gerado para outro tenant. Limpe cache e gere novo token.

---

## 🔍 Possíveis Causas

Com base na análise, o erro pode ser causado por:

### **1. Token JWT Expirado (Mais Provável)**
- App está usando token antigo armazenado no AsyncStorage
- Postman usa token novo/válido
- Solução: Limpar cache e fazer novo login

### **2. Token de Outro Tenant**
- App tem token do tenant "production" armazenado
- Mas está tentando usar no tenant "develop"
- Solução: Limpar cache e fazer login no tenant correto

### **3. Cache Corrompido**
- AsyncStorage tem dados inconsistentes
- Account em uma chave, token em outra
- Solução: Limpar completamente o AsyncStorage

### **4. Renovação de Token Falhando**
- App tenta renovar token automaticamente
- Renovação falha mas app continua usando token expirado
- Solução: Verificar implementação do refresh token

---

## 📊 Comparação: Postman vs App

### **Postman (Funciona ✅)**
```
GET https://develop.keosstg001.xyz/api/me
Headers:
  Authorization: Bearer [TOKEN_VÁLIDO_ATUAL]
```

### **App Mobile (Falha ❌)**
```
GET https://develop.keosstg001.xyz/api/me
Headers:
  Authorization: Bearer [TOKEN_EXPIRADO_OU_DE_OUTRO_TENANT]
```

**A diferença está no TOKEN!**

---

## 🚀 Ações Imediatas

### **Para o Usuário (Você):**

1. **Execute os testes:**
   ```
   - Abra o app
   - Vá em "Perfil"
   - Clique "🚀 Executar Todos os Testes"
   ```

2. **Copie os logs do console e compartilhe**

3. **Tente limpar cache:**
   ```
   - Clique "🗑️ Limpar Cache de Auth"
   - Reinicie o app
   - Faça login novamente
   - Teste se funcionou
   ```

### **Para o Backend (Antonio):**

Se o problema persistir após limpar cache:

1. **Verificar configuração do JWT:**
   ```python
   # settings.py
   SIMPLE_JWT = {
       'ACCESS_TOKEN_LIFETIME': timedelta(minutes=45),  # Verificar se não é muito curto
       'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
   }
   ```

2. **Verificar middleware de tenants:**
   ```python
   # Garantir que TenantMainMiddleware vem ANTES do AuthenticationMiddleware
   MIDDLEWARE = [
       'corsheaders.middleware.CorsMiddleware',
       'django_tenants.middleware.main.TenantMainMiddleware',  # PRIMEIRO
       'django.middleware.common.CommonMiddleware',
       'django.contrib.sessions.middleware.SessionMiddleware',
       'django.contrib.auth.middleware.AuthenticationMiddleware',  # DEPOIS
       ...
   ]
   ```

3. **Desabilitar pool de conexões (teste):**
   ```python
   # settings.py
   DATABASES = {
       'default': {
           'ENGINE': 'django_tenants.postgresql_backend',
           'CONN_MAX_AGE': 0,  # Desabilita pool
           ...
       }
   }
   ```

---

## 📈 Resultados Esperados

### **Após usar as ferramentas de debug:**

Você terá logs completos mostrando:
- ✅ Qual token está sendo usado
- ✅ Se o token está válido ou expirado
- ✅ Qual URL está sendo construída
- ✅ Qual account está armazenado
- ✅ Todos os dados no AsyncStorage

### **Após limpar cache:**

- ✅ Dados antigos removidos
- ✅ Novo login com credenciais corretas
- ✅ Token novo e válido
- ✅ App funcionando normalmente

---

## 📝 Arquivos Criados/Modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/Context/ApiClient.ts` | MODIFICADO | Logs aprimorados + detecção HTML |
| `src/utils/debugAuth.ts` | NOVO | Utilitários de debug |
| `app/(tabs)/profile.tsx` | MODIFICADO | Botões de debug |
| `DEBUG_AUTH_TOOLS.md` | NOVO | Documentação das ferramentas |
| `SOLUCAO_DEBUG_ERRO_API_ME.md` | NOVO | Este documento |

---

## 💡 Conclusão

**Não é problema de cache do Cloudflare!**  
**Não é problema de migrations do Django!**  
**Não é problema de configuração do tenant!**

É muito provavelmente um problema de **token JWT expirado ou inválido** no app mobile.

**Próximo passo:** Execute os testes de debug e compartilhe os resultados! 🚀

---

## 🆘 Se Precisar de Ajuda

Se após executar os testes e limpar cache o problema persistir:

1. Copie TODOS os logs gerados pelos testes
2. Copie o erro completo que aparece no console
3. Tire screenshot da tela de debug
4. Compartilhe com o time de desenvolvimento

Com essas informações, será possível identificar exatamente onde está o problema!

