import React, { createContext, useContext, useMemo } from 'react';
import { PixelRatio } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

type Breakpoint = 'phone' | 'tablet' | 'desktop';

export type Theme = {
  spacing: (multiplier?: number) => number;
  radius: {
    sm: number;
    md: number;
    lg: number;
  };
  colors: {
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    primary: string;
    danger: string;
    border: string;
  };
  breakpoint: Breakpoint;
  fontScale: (size: number) => number;
};

const ThemeContext = createContext<Theme | undefined>(undefined);

function detectBreakpoint(width: number): Breakpoint {
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'phone';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const r = useResponsive();
  // `useResponsive()` já retorna width/height sempre válidos (com fallback interno seguro).
  const width = r.width;

  const theme = useMemo<Theme>(() => {
    const breakpoint = detectBreakpoint(width);

    const baseSpacing = width * 0.02; // 2% da largura
    const spacing = (multiplier: number = 1) => {
      const value = baseSpacing * multiplier;
      // clamp entre 8 e 28 px
      return Math.max(8, Math.min(28, Math.round(value)));
    };

    const baseFont = breakpoint === 'desktop' ? 18 : breakpoint === 'tablet' ? 16 : 14;
    const fontScale = (size: number) => {
      const scale = width / 375; // iPhone X base
      const scaled = size * scale;
      const adjusted = PixelRatio.roundToNearestPixel(scaled);
      // clamp para evitar textos exagerados
      return Math.max(baseFont - 2, Math.min(adjusted, baseFont + 12));
    };

    return {
      spacing,
      radius: { sm: 8, md: 12, lg: 16 },
      colors: {
        background: '#F8F9FA',
        surface: '#FFFFFF',
        textPrimary: '#2C3E50',
        textSecondary: '#6C757D',
        primary: '#007BFF',
        danger: '#E74C3C',
        border: '#E9ECEF',
      },
      breakpoint,
      fontScale,
    };
  }, [width]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}


