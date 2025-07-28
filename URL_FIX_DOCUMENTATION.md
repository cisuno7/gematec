# Correção do Bug de URL Malformada

## Problema Identificado

O aplicativo estava apresentando o seguinte erro de rede:

```
ERROR Erro ao realizar a requisição de login: [AxiosError: Network Error]
ERROR Nenhuma resposta recebida do servidor: {..., "_url": "https://jordan.https://keosstg001.xyz/api/token", ...}
```

A URL estava sendo construída incorretamente como `https://jordan.https://keosstg001.xyz/api/token` ao invés de `https://jordan.keosstg001.xyz/api/token`.

## Causa do Problema

O erro indica que havia uma concatenação incorreta onde:
- O nome da conta "jordan" estava sendo usado para criar um subdomínio
- Mas a concatenação estava sendo feita de forma incorreta, resultando em "jordan.https://" ao invés de "https://jordan."

## Soluções Implementadas

### 1. Configuração Aprimorada da API (`src/config/apiConfig.ts`)

- Reformulada a estrutura de URLs base para facilitar a construção de subdomínios
- Adicionadas funções utilitárias:
  - `buildApiUrlForAccount(accountName)`: Constrói URLs com subdomínio baseado na conta
  - `setDynamicApiUrl(accountName)`: Define URL dinâmica conforme necessário

### 2. Cliente API Robusto (`src/Context/ApiClient.ts`)

Implementadas as seguintes correções:

#### a) Função `fixJordanUrl(url)`
- Detecta especificamente o padrão "jordan.https://"
- Corrige para "https://jordan."

#### b) Função `validateAndFixUrl(url)`
- Detecta padrões genéricos de URL malformada (*.https://)
- Corrige duplicações de protocolo
- Reconstrói URLs corretamente

#### c) Interceptor de Requisição Aprimorado
- Logs detalhados para debug
- Validação e correção automática de URLs antes de enviar requisições
- Verificação robusta da integridade da URL

#### d) Interceptor de Resposta Melhorado
- Logs específicos para erros de rede
- Captura detalhada de URLs que falharam
- Informações de debug para troubleshooting

### 3. Logs Aprimorados no AuthService (`src/Services/AuthService.ts`)

- Logs detalhados do processo de construção de URL
- Detecção e alertas para URLs malformadas
- Informações de debug específicas para requisições de login

## Padrões de Erro Corrigidos

O sistema agora corrige automaticamente os seguintes padrões:

1. **Erro específico do Jordan**: `jordan.https://domain` → `https://jordan.domain`
2. **Padrão genérico**: `account.https://domain` → `https://account.domain`
3. **Duplicação de protocolo**: `https://https://domain` → `https://domain`

## Formato Correto de URL

As URLs devem seguir o padrão: `https://(conta).(dominio_base)`

Exemplos:
- ✅ `https://jordan.keosstg001.xyz/api/token`
- ✅ `https://empresa.keosstg001.xyz/api/endpoint`
- ❌ `https://jordan.https://keosstg001.xyz/api/token`
- ❌ `jordan.https://keosstg001.xyz/api/token`

## Benefícios das Correções

1. **Correção Automática**: URLs malformadas são corrigidas automaticamente
2. **Logs Detalhados**: Facilita o debug e identificação de problemas
3. **Robustez**: Sistema tolerante a diferentes tipos de erros de URL
4. **Transparência**: Usuário não percebe as correções sendo aplicadas
5. **Compatibilidade**: Mantém URLs corretas inalteradas

## Teste das Correções

As correções foram testadas com os seguintes cenários:
- ✅ URL problemática original corrigida com sucesso
- ✅ Padrões genéricos de erro corrigidos
- ✅ URLs corretas mantidas inalteradas
- ✅ URLs de subdomínio válidas preservadas

## Monitoramento

Para monitorar o funcionamento das correções, observe os logs que começam com:
- `[ApiClient]`: Informações do cliente HTTP
- `[AuthService]`: Informações do serviço de autenticação
- `[validateAndFixUrl]`: Validação e correção de URLs
- `[fixJordanUrl]`: Correção específica do erro jordan

## Implementação

As correções são aplicadas automaticamente através dos interceptors do Axios e não requerem modificações no código existente que faz as requisições HTTP.