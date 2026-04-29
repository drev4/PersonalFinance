import { useMemo } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { lightColors, darkColors, radius, spacing, getTypography, getShadow } from './index';

export function useTheme() {
  const isDark = useConfigStore((state) => state.isDark);
  return useMemo(() => {
    const colors = isDark ? darkColors : lightColors;
    const typography = getTypography(colors);
    const shadow = getShadow(colors);
    return { colors, isDark, typography, shadow, radius, spacing };
  }, [isDark]);
}
