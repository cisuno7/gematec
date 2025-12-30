import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, TextInput, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { useTheme } from '../Context/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';

export type AppTextInputProps = TextInputProps & {
  /**
   * Tamanho base (antes da responsividade). Defaults: 16
   */
  baseFontSize?: number;
  /**
   * Cap do scaling do sistema para este input.
   * Default: 1.8 (mais acessível sem explodir layout).
   */
  maxFontSizeMultiplier?: number;
  /**
   * Se true, aplica estilos de “campo padrão” (bordas/padding/bg).
   * Se você já estiliza por fora, pode desativar.
   */
  withDefaultStyle?: boolean;
};

/**
 * TextInput global para reduzir bugs comuns:
 * - texto “branco/invisível” por falta de `color`
 * - placeholder inconsistente
 * - quebra de layout com fonte grande (cap por input)
 * - tamanhos fixos que não respondem a rotação/tablet
 */
const AppTextInput = forwardRef<TextInput, AppTextInputProps>(
  (
    {
      baseFontSize = 16,
      maxFontSizeMultiplier = 1.8,
      withDefaultStyle = true,
      placeholderTextColor,
      style,
      multiline,
      ...props
    },
    ref,
  ) => {
    const theme = useTheme();
    const r = useResponsive();

    const fontSize = r.responsiveFontSize(baseFontSize);

    const computedStyle = useMemo(() => {
      const base: (ViewStyle | TextStyle)[] = [];

      if (withDefaultStyle) {
        base.push(styles.inputBase);
      }

      base.push({
        fontSize,
        color: theme.colors.textPrimary, // evita “texto branco” em fundo claro
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        paddingVertical: r.spacing(0.75, 10, 18),
        paddingHorizontal: r.spacing(1, 12, 20),
        minHeight: multiline ? r.verticalScale(44) : r.verticalScale(44),
        textAlignVertical: multiline ? 'top' : 'center',
      });

      return base;
    }, [withDefaultStyle, fontSize, theme.colors, r, multiline]);

    return (
      <TextInput
        ref={ref}
        {...props}
        multiline={multiline}
        allowFontScaling={props.allowFontScaling ?? true}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        placeholderTextColor={placeholderTextColor ?? theme.colors.textSecondary}
        selectionColor={props.selectionColor ?? theme.colors.primary}
        style={[computedStyle as any, style as any]}
      />
    );
  },
);

const styles = StyleSheet.create({
  inputBase: {
    borderWidth: 1,
    borderRadius: 10,
  },
});

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;


