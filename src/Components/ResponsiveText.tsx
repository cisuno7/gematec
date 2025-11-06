import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../Context/ThemeContext';

type Variant = 'title' | 'subtitle' | 'body' | 'caption' | 'button';

type ResponsiveTextProps = TextProps & {
  variant?: Variant;
  weight?: 'normal' | '600' | 'bold';
  color?: string;
};

const baseSizes: Record<Variant, number> = {
  title: 22,
  subtitle: 18,
  body: 14,
  caption: 12,
  button: 16,
};

const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  variant = 'body',
  weight = 'normal',
  color,
  style,
  ...rest
}) => {
  const theme = useTheme();
  const fontSize = theme.fontScale(baseSizes[variant]);

  return (
    <Text
      {...rest}
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


