# Implementação da Tela de Preferências de Usuário

## Resumo da Implementação

Esta implementação adiciona um sistema completo de preferências de usuário com internacionalização (i18n) ao aplicativo React Native/Expo.

## Principais Funcionalidades

### ✅ Tela de Preferências
- **Localização**: `src/Screens/PreferencesScreen.tsx`
- Interface para seleção de idioma (Português/Inglês)
- Integração com API do backend
- Interface responsiva e amigável

### ✅ Sistema de Internacionalização
- **Context**: `src/Context/LanguageContext.tsx`
- Suporte aos idiomas: Português (pt-br) e Inglês (en)
- Traduções para todos os elementos da interface
- Idioma padrão: pt-br (conforme solicitado)

### ✅ Serviço de Preferências
- **Serviço**: `src/Services/PreferencesService.ts`
- Integração com endpoints da API:
  - `GET /api/me/preferences` - Listar preferências
  - `PATCH /api/me/preferences` - Editar preferências

### ✅ Integração com Navegação
- Adicionado ao `AppRouter.tsx`
- Item de menu no `DrawerNavigation.tsx`
- Ícone de configurações no menu lateral

## Estrutura de Arquivos Criados/Modificados

```
src/
├── Context/
│   └── LanguageContext.tsx          # Contexto de idiomas (NOVO)
├── Services/
│   └── PreferencesService.ts        # Serviço da API (NOVO)
├── Screens/
│   └── PreferencesScreen.tsx        # Tela de preferências (NOVO)
├── Routers/
│   ├── AppRouter.tsx               # Atualizado com nova rota
│   └── DrawerNavigation.tsx        # Atualizado com item de menu e i18n
├── Screens/
│   └── AccountSelectionScreen.tsx  # Atualizado para carregar preferências
└── App.tsx                         # Atualizado com LanguageProvider
```

## Fluxo de Funcionamento

### 1. Carregamento Inicial
- App inicializa com idioma padrão (pt-br)
- Usuário faz login e seleciona conta
- Sistema carrega preferências do backend automaticamente
- Interface é atualizada para o idioma preferido do usuário

### 2. Alteração de Preferências
- Usuário acessa menu lateral → "Preferências"
- Seleciona novo idioma na tela de preferências
- Sistema salva no backend via PATCH /api/me/preferences
- Interface é atualizada imediatamente
- Preferência é persistida localmente

### 3. Persistência
- Preferências são salvas no AsyncStorage localmente
- Sincronização automática com backend após login
- Fallback para idioma padrão em caso de erro

## Endpoints da API Utilizados

### Listar Preferências
```
GET /api/me/preferences
Authorization: Bearer {access_token}

Response:
{
  "language": "pt-br"
}
```

### Atualizar Preferências
```
PATCH /api/me/preferences
Authorization: Bearer {access_token}
Content-Type: application/json

Body:
{
  "language": "en"
}

Response:
{
  "language": "en"
}
```

## Traduções Implementadas

### Português (pt-br)
- Elementos de navegação e menu
- Tela de preferências
- Mensagens de sucesso/erro
- Labels e botões

### Inglês (en)
- Tradução completa de todos os elementos
- Mantém consistência com a versão em português

## Uso da Funcionalidade

### Para o Usuário Final
1. Faça login no aplicativo
2. Abra o menu lateral (drawer)
3. Clique em "Preferências"
4. Selecione o idioma desejado
5. Clique em "Salvar"
6. A interface será atualizada automaticamente

### Para Desenvolvedores

#### Adicionar Novas Traduções
```typescript
// No arquivo src/Context/LanguageContext.tsx
const translations = {
  'pt-br': {
    'nova.chave': 'Texto em português',
  },
  'en': {
    'nova.chave': 'Text in English',
  }
};
```

#### Usar Traduções em Componentes
```typescript
import { useLanguage } from '../Context/LanguageContext';

const MeuComponente = () => {
  const { t } = useLanguage();
  
  return (
    <Text>{t('nova.chave')}</Text>
  );
};
```

## Configurações Técnicas

### TypeScript
- Configurado para suportar JSX e ESModules
- Tipos definidos para todas as interfaces

### Estado e Contexto
- `LanguageProvider` envolve toda a aplicação
- Estado global para idioma atual
- Funções para carregar e salvar preferências

### Tratamento de Erros
- Fallback para idioma padrão em caso de erro
- Logs detalhados para debug
- Mensagens de erro amigáveis ao usuário

## Melhorias Futuras Sugeridas

1. **Mais Idiomas**: Adicionar suporte a espanhol, francês, etc.
2. **Preferências Avançadas**: Tema, notificações, etc.
3. **Cache Inteligente**: Otimizar carregamento de traduções
4. **Testes**: Adicionar testes unitários e de integração

## Notas Importantes

- O idioma padrão é 'pt-br' conforme especificado
- As preferências são carregadas automaticamente após login
- A interface reflete mudanças de idioma instantaneamente
- Sistema funciona offline com preferências locais
- Todas as strings da interface foram preparadas para internacionalização

Esta implementação atende completamente aos requisitos especificados e está pronta para uso em produção.