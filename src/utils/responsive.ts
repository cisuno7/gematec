import { Dimensions, PixelRatio, ScaledSize, useWindowDimensions } from 'react-native';

/**
 * Responsividade global do app (Expo SDK 54 / RN 0.81).
 *
 * Guideline de design: iPhone 11 (414 x 896).
 *
 * Importante:
 * - NÃO usamos `Dimensions.get()` como constante de módulo (isso "congela" valores e falha em rotação).
 * - Preferir sempre passar `width/height` (ou consumir via `useResponsive()`), para reagir a portrait/landscape.
 */
const GUIDELINE_BASE_WIDTH = 414;
const GUIDELINE_BASE_HEIGHT = 896;

type Dims = { width: number; height: number };

export type ResponsiveFontOptions = {
  /**
   * Clamps evitam textos absurdos em tablets e/ou layouts muito compactos.
   * Observação: o scaling de acessibilidade do sistema é controlado via `maxFontSizeMultiplier`
   * no componente de texto; aqui a gente só trata responsividade por tamanho físico de tela.
   */
  min?: number;
  max?: number;
  /**
   * Fator do `moderateScale` aplicado na tipografia.
   * 0 = sem interpolação (usa size "cru"), 1 = igual ao `scale` total.
   */
  factor?: number;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getWindowDimsFallback(): Dims {
  // Evitar "const {width,height} = Dimensions.get()" no topo do arquivo.
  // Proteção adicional: garantir que width e height existem antes de desestruturar
  try {
    const windowDims = Dimensions.get('window');
    const w = windowDims?.width;
    const h = windowDims?.height;
    return {
      width: (typeof w === 'number' && w > 0) ? w : 414,
      height: (typeof h === 'number' && h > 0) ? h : 896
    };
  } catch {
    // Fallback seguro se Dimensions.get() falhar durante inicialização
    return { width: 414, height: 896 };
  }
}

/**
 * Detecta tablet usando o menor lado (estável em rotação).
 * Breakpoint: >= 768px.
 */
export function isTablet(width: number, height: number): boolean {
  return Math.min(width, height) >= 768;
}

/**
 * Escala horizontal baseada no guideline.
 */
export function scale(size: number, width?: number): number {
  const w = width ?? getWindowDimsFallback().width;
  return PixelRatio.roundToNearestPixel((w / GUIDELINE_BASE_WIDTH) * size);
}

/**
 * Escala vertical baseada no guideline.
 */
export function verticalScale(size: number, height?: number): number {
  const h = height ?? getWindowDimsFallback().height;
  return PixelRatio.roundToNearestPixel((h / GUIDELINE_BASE_HEIGHT) * size);
}

/**
 * Escala moderada (interpolação entre size "cru" e `scale(size)`).
 */
export function moderateScale(size: number, width?: number, factor: number = 0.5): number {
  const scaled = scale(size, width);
  return PixelRatio.roundToNearestPixel(size + (scaled - size) * factor);
}

/**
 * Fonte responsiva por tamanho de tela (não confundir com acessibilidade do sistema).
 * - Em geral, usamos `moderateScale` com um fator menor (ex.: 0.25~0.35) para tipografia.
 * - O scaling de acessibilidade do sistema continua habilitado e pode ser controlado por componente
 *   via `maxFontSizeMultiplier` (recomendado).
 */
export function responsiveFontSize(
  fontSize: number,
  width?: number,
  height?: number,
  options: ResponsiveFontOptions = {},
): number {
  const fallback = getWindowDimsFallback();
  const w = width ?? fallback.width;
  const h = height ?? fallback.height;
  const factor = options.factor ?? 0.3;
  const next = moderateScale(fontSize, w, factor);

  // Defaults pragmáticos: evitam fonte gigante em tablets, sem “achatar” demais no celular.
  const min = options.min ?? Math.max(10, fontSize * 0.9);
  const max = options.max ?? fontSize * (isTablet(w, h) ? 1.35 : 1.2);
  return PixelRatio.roundToNearestPixel(clamp(next, min, max));
}

/**
 * Espaçamento responsivo (padding/margin/gap) com clamp para manter consistência visual.
 * Padrão: base = 2% da largura, clamp entre 8 e 28.
 */
export function spacing(multiplier: number = 1, width?: number, min: number = 8, max: number = 28): number {
  const w = width ?? getWindowDimsFallback().width;
  const base = w * 0.02;
  return clamp(PixelRatio.roundToNearestPixel(base * multiplier), min, max);
}

export function percentageWidth(pct: number, width?: number): number {
  const w = width ?? getWindowDimsFallback().width;
  return PixelRatio.roundToNearestPixel((w * pct) / 100);
}

export function percentageHeight(pct: number, height?: number): number {
  const h = height ?? getWindowDimsFallback().height;
  return PixelRatio.roundToNearestPixel((h * pct) / 100);
}

/**
 * Hook utilitário (baixo nível) para dimensões reativas.
 * Preferir usar `useResponsive()` (hook global) nas telas/componentes do app.
 */
export function useScreenDims(): ScaledSize & {
  isPortrait: boolean;
  isLandscape: boolean;
  isTablet: boolean;
  shortestSide: number;
} {
  const dims = useWindowDimensions();
  const isPortrait = dims.height >= dims.width;
  const shortestSide = Math.min(dims.width, dims.height);
  return Object.assign({}, dims, {
    isPortrait,
    isLandscape: !isPortrait,
    isTablet: shortestSide >= 768,
    shortestSide,
  });
}

/**
 * Padding padrão de tela (útil para wrappers/containers).
 */
export function useResponsivePadding(): { horizontal: number; vertical: number } {
  const dims = useScreenDims();
  const horizontal = Math.max(12, Math.min(24, Math.round(dims.width * 0.04)));
  const vertical = Math.max(8, Math.min(20, Math.round(dims.height * 0.02)));
  return { horizontal, vertical };
}
