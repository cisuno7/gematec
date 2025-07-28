# Implementação do Sistema Multitenant

Este documento descreve as mudanças implementadas para transformar a aplicação em um sistema multitenant separado por schema, conforme especificado nos requisitos.

## Resumo das Mudanças

### 1. Configuração da API (`src/config/apiConfig.ts`)

- **Novo**: URLs dinâmicas baseadas na conta do usuário
- **Novo**: Validação de nomes de conta com regex `^[a-z0-9_]+$`
- **Novo**: Lista de palavras reservadas que não podem ser usadas como nomes de conta
- **Novo**: Função `getApiBaseUrl(account)` para gerar URLs dinâmicas
- **Novo**: Função `validateAccountName(account)` para validar nomes de conta

### 2. Tela de Login (`src/Screens/LoginScreen.tsx`)

- **Novo**: Campo "Conta" obrigatório na tela de login
- **Novo**: Validação em tempo real do nome da conta
- **Novo**: Tratamento de erros específicos:
  - `getaddrinfo` → "Conta inválida"
  - `401` → "Email ou senha inválidos"
- **Atualizado**: Lógica de login para usar a nova estrutura de tokens
- **Removido**: Dependência de sliding_token

### 3. Serviço de Autenticação (`src/Services/AuthService.ts`)

- **Atualizado**: Todos os métodos agora recebem `account` como primeiro parâmetro
- **Novo**: `login(account, email, password)` retorna `{access, refresh}`
- **Novo**: `refreshAccessToken(account, refreshToken)` 
- **Novo**: `revokeToken(account, refreshToken)` usando endpoint `/api/token/blacklist`
- **Removido**: Métodos `getAccounts()` e `switchAccount()`
- **Removido**: Sliding token
- **Atualizado**: Todos os endpoints agora usam URLs dinâmicas baseadas na conta

### 4. Contexto do Usuário (`src/Context/UserContext.tsx`)

- **Atualizado**: `login()` agora recebe `accessToken`, `refreshToken`, `account` e `keepLoggedIn`
- **Novo**: Gerenciamento da conta do usuário no estado
- **Atualizado**: `logout()` agora executa revoke token automaticamente
- **Removido**: Lógica de switch account
- **Removido**: Dependência de sliding_token

### 5. Cliente da API (`src/Context/ApiClient.ts`)

- **Novo**: URLs dinâmicas baseadas na conta armazenada
- **Atualizado**: Interceptor de request define URL base dinamicamente
- **Atualizado**: Interceptor de response detecta erro específico de token expirado
- **Novo**: Refresh automático de token quando detectado erro de token expirado
- **Novo**: Limpeza automática de sessão quando refresh falha

### 6. Navegação (`src/Routers/AppRouter.tsx`)

- **Removido**: `AccountSelectionScreen` da navegação
- **Atualizado**: Login bem-sucedido navega diretamente para `HomeScreen`

### 7. Drawer Navigation (`src/Routers/DrawerNavigation.tsx`)

- **Atualizado**: Logout agora usa o método `logout()` do UserContext
- **Removido**: Lógica manual de revoke token (agora no UserContext)

### 8. Tela de Dados Pessoais (`src/Screens/PersonalDataScreen.tsx`)

- **Atualizado**: Usa nova estrutura do AuthService com parâmetro `account`
- **Atualizado**: Busca conta do AsyncStorage para passar aos métodos

### 9. App Principal (`App.tsx`)

- **Atualizado**: Verificação de autenticação agora requer `access_token`, `refresh_token` e `account`
- **Removido**: Dependência de sliding_token

## Arquivos Removidos

- `src/Screens/AccountSelectionScreen.tsx` - Não é mais necessária
- `src/Services/PersonalDataService.ts` - Funcionalidades movidas para AuthService

## Fluxo de Autenticação

### Novo Fluxo de Login
1. Usuário informa conta, email e senha
2. Validação do nome da conta (regex e palavras reservadas)
3. Requisição POST para `https://{conta}.keosstg001.xyz/api/token`
4. Recebe `access_token` e `refresh_token`
5. Salva tokens e conta no AsyncStorage
6. Navega diretamente para HomeScreen

### Refresh Automático de Token
1. Requisição API retorna 401 com erro específico de token expirado
2. ApiClient automaticamente chama refresh usando a conta salva
3. Atualiza access_token e retry da requisição original
4. Se refresh falha, limpa sessão e redireciona para login

### Logout Seguro
1. Chama `/api/token/blacklist` para revogar refresh_token
2. Limpa todos os dados do AsyncStorage
3. Navega para tela de login

## Contratos da API

### Login
```
POST https://{conta}.keosstg001.xyz/api/token
{
  "email": "email",
  "password": "password"
}
```

### Refresh Token
```
POST https://{conta}.keosstg001.xyz/api/token/refresh
{
  "refresh": "refresh_token"
}
```

### Revoke Token
```
POST https://{conta}.keosstg001.xyz/api/token/blacklist
{
  "refresh": "refresh_token"
}
```

## Validações Implementadas

### Nome da Conta
- Regex: `^[a-z0-9_]+$`
- Máximo 64 caracteres
- Não pode ser palavra reservada
- Convertido automaticamente para minúsculas

### Palavras Reservadas
- admin, api, www, mail, ftp, localhost, public, default, postgres, root, test

## Tratamento de Erros

### Conta Inválida
- Erro `getaddrinfo` → "Conta inválida. Verifique o nome da conta informado."

### Credenciais Inválidas
- Status 401 → "Email ou senha inválidos. Verifique suas credenciais."

### Token Expirado
- Detectado automaticamente e refresh executado
- Se refresh falha → Logout automático

## Migração de Dados

Para usuários já logados na versão anterior:
- App detecta ausência de novos tokens/conta
- Força logout e limpeza de dados antigos
- Usuário precisa fazer login novamente com a nova estrutura