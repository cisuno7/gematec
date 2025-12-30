# Responsividade Global (Expo SDK 54)

Este app usa uma camada global de responsividade baseada em **utils + hook + wrappers**, sem media queries e seguindo as APIs oficiais do React Native.

## Componentes e utilitários

- **`src/utils/responsive.ts`**
  - Funções: `scale`, `verticalScale`, `moderateScale`, `responsiveFontSize`, `spacing`, `isTablet`, `clamp`, etc.
  - Guideline: **iPhone 11 (414x896)**.

- **`src/hooks/useResponsive.ts`**
  - Hook global que retorna:
    - `width`, `height`, `isTablet`, `isLandscape`, `fontScale`
    - Helpers já “bindados”: `scale`, `verticalScale`, `moderateScale`, `responsiveFontSize`, `spacing`, `percentageWidth`, `percentageHeight`

- **`src/Components/ResponsiveContainer.tsx`**
  - Wrapper padrão para **todas as telas**
  - Usa `SafeAreaView` + padding responsivo + `scroll` opcional
  - Suporta `maxWidth/centerContent` para melhorar layout em tablets

- **`src/Components/ResponsiveText.tsx`**
  - Tipografia responsiva com `responsiveFontSize`
  - Controle de acessibilidade via `maxFontSizeMultiplier` por variante (sem “matar” o scaling do sistema)

## Padrão obrigatório: wrapper em todas as telas

Em telas novas, use `ResponsiveContainer` como raiz.

Exemplo:

```tsx
import ResponsiveContainer from '../Components/ResponsiveContainer';

export default function MinhaTela() {
  return (
    <ResponsiveContainer>
      {/* conteúdo */}
    </ResponsiveContainer>
  );
}
```

## Exemplo de uso no StyleSheet (espaçamentos + tipografia)

```tsx
import { StyleSheet } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

export function MyCard() {
  const r = useResponsive();

  const styles = StyleSheet.create({
    card: {
      padding: r.spacing(1.25),
      borderRadius: r.scale(12),
      gap: r.scale(10),
    },
    title: {
      fontSize: r.responsiveFontSize(18),
      fontWeight: '700',
    },
    body: {
      fontSize: r.responsiveFontSize(14),
      lineHeight: r.responsiveFontSize(14) * 1.35,
    },
  });

  // ...
  return null;
}
```

## Exemplo em componente real: texto acessível sem quebrar layout

Preferir `ResponsiveText` para textos recorrentes:

```tsx
import ResponsiveText from '../Components/ResponsiveText';

<ResponsiveText variant="title">Título</ResponsiveText>
<ResponsiveText variant="body">
  Texto de leitura com scaling alto permitido.
</ResponsiveText>
<ResponsiveText variant="button">
  Botão (cap menor para não estourar layout)
</ResponsiveText>
```

Dicas para não quebrar layout com fontes grandes:
- Use `numberOfLines`, `ellipsizeMode`, `flexShrink: 1` onde necessário
- Evite alturas fixas em containers que possuem texto
- Em botões, prefira `paddingVertical` e `minHeight` escalados, não `height` fixo

## Tablet (>= 768px)

Você pode centralizar e limitar largura automaticamente:

```tsx
<ResponsiveContainer maxWidth={760} centerContent>
  {/* conteúdo */}
</ResponsiveContainer>
```

Ou condicionar layout (grid/colunas) com `useResponsive()`:

```tsx
const r = useResponsive();

const columns = r.isTablet ? 2 : 1;
// use flexWrap + width percentual/escala para cards
```

## Orientação (portrait / landscape)

`useResponsive()` é reativo à rotação via `useWindowDimensions()`.

Use:
- `isLandscape` para ajustar grids e áreas “wide”
- `width/height` para cálculos que antes usavam `Dimensions.get('window')`


