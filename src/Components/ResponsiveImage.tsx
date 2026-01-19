import React, { useMemo } from 'react';
import { Image, ImageProps, ImageStyle, StyleProp } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

type Props = ImageProps & {
  widthPct?: number; // 0..1 da largura da tela
  maxWidth?: number;
  aspectRatio?: number; // largura/altura
  style?: StyleProp<ImageStyle>;
};

const ResponsiveImage: React.FC<Props> = ({ widthPct = 0.8, maxWidth = 480, aspectRatio, style, ...rest }) => {
  let r;
  try {
    r = useResponsive();
  } catch (error) {
    console.error('[ResponsiveImage] Erro ao obter responsive:', error);
    r = { width: 414 } as any;
  }
  const screenWidth = r?.width ?? 414;
  const computed = useMemo(() => {
    const width = Math.min(screenWidth * widthPct, maxWidth);
    const heightStyle = aspectRatio ? { height: width / aspectRatio } : undefined;
    return [{ width }, heightStyle];
  }, [screenWidth, widthPct, maxWidth, aspectRatio]);

  return <Image {...rest} style={[{ resizeMode: 'contain' } as any, computed, style]} />;
};

export default ResponsiveImage;


