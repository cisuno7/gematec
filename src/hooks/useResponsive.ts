import { useState, useEffect } from 'react';
import { Dimensions, PixelRatio } from 'react-native';
import {
  isTablet as isTabletFn,
  moderateScale as moderateScaleFn,
  percentageHeight as percentageHeightFn,
  percentageWidth as percentageWidthFn,
  responsiveFontSize as responsiveFontSizeFn,
  scale as scaleFn,
  spacing as spacingFn,
  verticalScale as verticalScaleFn,
} from '../utils/responsive';

/**
 * Hook global de responsividade.
 *
 * Retorna dimensões reativas (rotação), detecção de tablet, orientação, fontScale (acessibilidade)
 * e helpers já "bindados" com as dimensões atuais.
 *
 * Versão simplificada e robusta para evitar erros durante inicialização do runtime.
 */
export function useResponsive() {
  // Valores padrão seguros
  const DEFAULT_WIDTH = 414;
  const DEFAULT_HEIGHT = 896;

  // Estado para armazenar as dimensões atuais
  const [dimensions, setDimensions] = useState(() => {
    try {
      const windowDims = Dimensions.get('window');
      return {
        width: typeof windowDims?.width === 'number' && windowDims.width > 0 ? windowDims.width : DEFAULT_WIDTH,
        height: typeof windowDims?.height === 'number' && windowDims.height > 0 ? windowDims.height : DEFAULT_HEIGHT,
      };
    } catch {
      return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    }
  });

  // Listener para mudanças de dimensão (rotação)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({
        width: typeof window?.width === 'number' && window.width > 0 ? window.width : DEFAULT_WIDTH,
        height: typeof window?.height === 'number' && window.height > 0 ? window.height : DEFAULT_HEIGHT,
      });
    });

    return () => subscription?.remove();
  }, []);

  // Garantir que sempre retornamos valores válidos
  const width = dimensions.width;
  const height = dimensions.height;

  return {
    width,
    height,
    isTablet: isTabletFn(width, height),
    isLandscape: width > height,
    fontScale: PixelRatio.getFontScale(),
    scale: (size: number) => scaleFn(size, width),
    verticalScale: (size: number) => verticalScaleFn(size, height),
    moderateScale: (size: number, factor: number = 0.5) => moderateScaleFn(size, width, factor),
    responsiveFontSize: (size: number, opts?: Parameters<typeof responsiveFontSizeFn>[3]) =>
      responsiveFontSizeFn(size, width, height, opts),
    spacing: (multiplier: number = 1, min?: number, max?: number) =>
      spacingFn(multiplier, width, min, max),
    percentageWidth: (pct: number) => percentageWidthFn(pct, width),
    percentageHeight: (pct: number) => percentageHeightFn(pct, height),
  };
}


