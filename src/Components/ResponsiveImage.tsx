import React, { useMemo } from 'react';
import { Image, ImageProps, ImageStyle, StyleProp, useWindowDimensions } from 'react-native';

type Props = ImageProps & {
  widthPct?: number; // 0..1 da largura da tela
  maxWidth?: number;
  aspectRatio?: number; // largura/altura
  style?: StyleProp<ImageStyle>;
};

const ResponsiveImage: React.FC<Props> = ({ widthPct = 0.8, maxWidth = 480, aspectRatio, style, ...rest }) => {
  const { width: screenWidth } = useWindowDimensions();
  const computed = useMemo(() => {
    const width = Math.min(screenWidth * widthPct, maxWidth);
    const heightStyle = aspectRatio ? { height: width / aspectRatio } : undefined;
    return [{ width }, heightStyle];
  }, [screenWidth, widthPct, maxWidth, aspectRatio]);

  return <Image {...rest} style={[{ resizeMode: 'contain' } as any, computed, style]} />;
};

export default ResponsiveImage;


