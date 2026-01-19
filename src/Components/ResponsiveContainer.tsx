import React, { useMemo } from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../hooks/useResponsive';

export type ResponsiveContainerProps = {
  children: React.ReactNode;
  /**
   * Estilo aplicado no container interno (View/ScrollView content).
   */
  style?: ViewStyle | ViewStyle[];
  /**
   * Ativa padding automático respeitando safe-area + padding responsivo.
   */
  withPadding?: boolean;
  /**
   * Se `true`, renderiza um `ScrollView` (útil para telas longas).
   * Se `false`, renderiza um `View`.
   */
  scroll?: boolean;
  /**
   * Estilo do contentContainer quando `scroll=true`.
   */
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  /**
   * Centraliza e limita a largura em tablets (melhor legibilidade).
   */
  maxWidth?: number;
  centerContent?: boolean;
} & Pick<ScrollViewProps, 'keyboardShouldPersistTaps' | 'showsVerticalScrollIndicator' | 'bounces'>;

/**
 * Wrapper base global para telas:
 * - SafeAreaView
 * - padding responsivo
 * - suporte a ScrollView opcional
 * - suporte a maxWidth/centralização (tablet)
 */
const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  withPadding = true,
  scroll = false,
  contentContainerStyle,
  maxWidth,
  centerContent,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  bounces = false,
}) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6613393d-1811-4ee8-8ac4-8aace6947144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/Components/ResponsiveContainer.tsx:39',message:'ResponsiveContainer render',data:{scroll,withPadding,childrenCount:React.Children.count(children)},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
  // #endregion
  
  let insets;
  try {
    insets = useSafeAreaInsets();
  } catch (error) {
    console.error('[ResponsiveContainer] ❌ Erro ao obter safe area insets:', error);
    insets = { top: 0, bottom: 0, left: 0, right: 0 };
  }
  
  let r;
  try {
    r = useResponsive();
  } catch (error) {
    console.error('[ResponsiveContainer] ❌ Erro ao obter responsive:', error);
    // Fallback completo com todas as propriedades necessárias
    r = {
      spacing: () => 8,
      isTablet: false,
      scale: (size: number) => size,
      verticalScale: (size: number) => size,
      width: 414,
      height: 896,
    } as any;
  }

  const paddingStyle = useMemo(() => {
    // Safe area SEMPRE. `withPadding` controla apenas o "padding base" adicional do app.
    // IMPORTANTE: Quando withPadding=false, não aplicamos padding automático
    // para permitir controle manual na tela (como em ActivityQuestionnaireScreen)
    if (!withPadding) {
      // Sem padding automático - tela controla manualmente
      return {} as ViewStyle;
    }
    const base = r.spacing(1); // ~ 8..28 (clamp)
    return {
      paddingTop: Math.max(base, insets.top),
      paddingBottom: Math.max(base, insets.bottom),
      paddingLeft: Math.max(base, insets.left),
      paddingRight: Math.max(base, insets.right),
    } as ViewStyle;
  }, [withPadding, r, insets.top, insets.bottom, insets.left, insets.right]);

  const shouldCenter = centerContent ?? r.isTablet;
  const effectiveMaxWidth = maxWidth ?? (r.isTablet ? 760 : undefined);

  const Inner = (
    <View
      style={[
        paddingStyle,
        shouldCenter && styles.centered,
        effectiveMaxWidth ? { maxWidth: effectiveMaxWidth, width: '100%' } : undefined,
        style as any,
      ]}
    >
      {children}
    </View>
  );

  if (scroll) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6613393d-1811-4ee8-8ac4-8aace6947144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/Components/ResponsiveContainer.tsx:84',message:'ResponsiveContainer retornando ScrollView',data:{},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
    // #endregion
    // Quando scroll=true, usar SafeAreaView com edges apropriados conforme MD
    // edges={[]} significa que não aplica padding automático (deixamos o paddingStyle fazer isso)
    return (
      <SafeAreaView 
        edges={withPadding ? ['top', 'bottom', 'left', 'right'] : []} 
        style={[styles.safe, { backgroundColor: 'transparent' }]}
      >
        <ScrollView
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          bounces={bounces}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          style={{ flex: 1 }}
        >
          {Inner}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6613393d-1811-4ee8-8ac4-8aace6947144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/Components/ResponsiveContainer.tsx:99',message:'ResponsiveContainer retornando View',data:{},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
  // #endregion
  // Quando scroll=false, usar SafeAreaView com edges conforme MD
  // edges={[]} quando withPadding=false para permitir controle manual
  return (
    <SafeAreaView 
      edges={withPadding ? ['top', 'bottom', 'left', 'right'] : []} 
      style={[styles.safe, { backgroundColor: 'transparent' }]}
    >
      <View style={styles.container}>{Inner}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  centered: { alignSelf: 'center' },
});

export default ResponsiveContainer;


