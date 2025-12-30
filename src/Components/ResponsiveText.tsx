import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../Context/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';

type Variant = 'title' | 'subtitle' | 'body' | 'caption' | 'button';

type ResponsiveTextProps = TextProps & {
  variant?: Variant;
  weight?: 'normal' | '600' | 'bold';
  color?: string;
  /**
   * Limite do scaling de fonte do sistema (acessibilidade).
   * - Por padrão, mantemos maior em textos de leitura (body) e menor em UI densa (button).
   */
  maxFontSizeMultiplier?: number;
};

const baseSizes: Record<Variant, number> = {
  title: 22,
  subtitle: 18,
  body: 14,
  caption: 12,
  button: 16,
};

const defaultMaxFontMultiplier: Record<Variant, number> = {
  title: 2.0,
  subtitle: 1.9,
  body: 2.0,
  caption: 1.8,
  button: 1.3,
};

const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  variant = 'body',
  weight = 'normal',
  color,
  maxFontSizeMultiplier,
  style,
  ...rest
}) => {
  const theme = useTheme();
  const r = useResponsive();

  // Responsividade por tela (largura/altura), não por acessibilidade.
  // Acessibilidade continua ativa e é controlada via `maxFontSizeMultiplier`.
  const fontSize = r.responsiveFontSize(baseSizes[variant]);
  const cap = maxFontSizeMultiplier ?? defaultMaxFontMultiplier[variant];

  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={cap}
      style={[
        styles.text,
        { fontSize, color: color ?? theme.colors.textPrimary, fontWeight: weight },
        style as any,
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: { includeFontPadding: false, textAlignVertical: 'center' },
});

export default ResponsiveText;


