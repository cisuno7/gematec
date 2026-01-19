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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6613393d-1811-4ee8-8ac4-8aace6947144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/Components/ResponsiveText.tsx:44',message:'ResponsiveText render iniciado',data:{variant,weight,color,children:typeof children},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
  // #endregion

  let theme;
  let r;
  try {
    theme = useTheme();
  } catch (error) {
    console.error('[ResponsiveText] Erro ao obter theme:', error);
    theme = { colors: { textPrimary: '#000' } } as any;
  }
  
  try {
    r = useResponsive();
  } catch (error) {
    console.error('[ResponsiveText] Erro ao obter responsive:', error);
    r = { responsiveFontSize: (size: number) => size } as any;
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6613393d-1811-4ee8-8ac4-8aace6947144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/Components/ResponsiveText.tsx:46',message:'Hooks executados',data:{theme:!!theme,r:!!r,themeColors:theme?.colors},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
  // #endregion

  // Responsividade por tela (largura/altura), não por acessibilidade.
  // Acessibilidade continua ativa e é controlada via `maxFontSizeMultiplier`.
  const fontSize = r?.responsiveFontSize ? r.responsiveFontSize(baseSizes[variant]) : baseSizes[variant];
  const cap = maxFontSizeMultiplier ?? defaultMaxFontMultiplier[variant];

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6613393d-1811-4ee8-8ac4-8aace6947144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/Components/ResponsiveText.tsx:52',message:'Calculando valores',data:{fontSize,cap,baseSize:baseSizes[variant],themeColor:theme.colors.textPrimary},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
  // #endregion

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
  text: { includeFontPadding: false, textAlignVertical: 'center', lineHeight: 20 },
});
export default ResponsiveText;


