import { Dimensions, PixelRatio, ScaledSize, useWindowDimensions } from 'react-native';

// Base sizes (iPhone X)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function scale(size: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH / BASE_WIDTH) * size);
}

export function verticalScale(size: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / BASE_HEIGHT) * size);
}

export function moderateScale(size: number, factor: number = 0.5): number {
  const scaled = scale(size);
  return PixelRatio.roundToNearestPixel(size + (scaled - size) * factor);
}

export function useScreenDims(): ScaledSize & { isPortrait: boolean; isLandscape: boolean } {
  const dims = useWindowDimensions();
  const isPortrait = dims.height >= dims.width;
  return Object.assign({}, dims, { isPortrait, isLandscape: !isPortrait });
}

export function useResponsivePadding(): { horizontal: number; vertical: number } {
  const dims = useScreenDims();
  const horizontal = Math.max(12, Math.min(24, Math.round(dims.width * 0.04)));
  const vertical = Math.max(8, Math.min(20, Math.round(dims.height * 0.02)));
  return { horizontal, vertical };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function percentageWidth(pct: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * pct) / 100);
}

export function percentageHeight(pct: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * pct) / 100);
}


