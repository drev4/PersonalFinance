import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useConfigStore } from '@/stores/configStore';
import { lightColors, darkColors, radius, spacing, getTypography, getShadow } from './index';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const { isDark: manualIsDark, themeFollowsSystem } = useConfigStore();

  const isDark = themeFollowsSystem ? systemColorScheme === 'dark' : manualIsDark;

  return useMemo(() => {
    const colors = isDark ? darkColors : lightColors;
    const typography = getTypography(colors);
    const shadow = getShadow(colors);
    return { colors, isDark, typography, shadow, radius, spacing };
  }, [isDark]);
}
