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
  const insets = useSafeAreaInsets();
  const r = useResponsive();

  const paddingStyle = useMemo(() => {
    // Safe area SEMPRE. `withPadding` controla apenas o "padding base" adicional do app.
    const base = withPadding ? r.spacing(1) : 0; // ~ 8..28 (clamp)
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
    return (
      <SafeAreaView edges={[]} style={styles.safe}>
        <ScrollView
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          bounces={bounces}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        >
          {Inner}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <View style={styles.container}>{Inner}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  centered: { alignSelf: 'center' },
});

export default ResponsiveContainer;


