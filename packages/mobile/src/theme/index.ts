export const lightColors = {
  bg: '#F5F5F7',
  card: '#FFFFFF',
  primary: '#0052CC',
  primaryLight: '#E8F0FF',
  secondary: '#6366F1',
  income: '#00C896',
  incomeLight: '#E6FBF5',
  expense: '#FF4757',
  expenseLight: '#FFF0F1',
  transfer: '#8B5CF6',
  transferLight: '#F3F0FF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#F0F0F5',
  inputBg: '#F5F5F7',
  white: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.08)',
};

export const darkColors = {
  bg: '#0F0F10',
  card: '#1C1C1E',
  primary: '#4A8FFF',
  primaryLight: '#1A2640',
  secondary: '#818CF8',
  income: '#30D158',
  incomeLight: '#0B2A1C',
  expense: '#FF453A',
  expenseLight: '#2A0E0D',
  transfer: '#BF5AF2',
  transferLight: '#1F0A2C',
  text: '#F2F2F7',
  textSecondary: '#8E8E93',
  textTertiary: '#6C6C70',
  border: '#2C2C2E',
  inputBg: '#2C2C2E',
  white: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.5)',
};

// Backward-compat static export (light theme)
export const colors = lightColors;

export type ThemeColors = typeof lightColors;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 100,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export function getTypography(c: ThemeColors) {
  return {
    largeTitle: { fontSize: 34, fontWeight: '800' as const, color: c.text, letterSpacing: -0.5 },
    title: { fontSize: 28, fontWeight: '700' as const, color: c.text, letterSpacing: -0.3 },
    heading: { fontSize: 20, fontWeight: '700' as const, color: c.text },
    subheading: { fontSize: 17, fontWeight: '600' as const, color: c.text },
    body: { fontSize: 15, fontWeight: '400' as const, color: c.text },
    bodyMedium: { fontSize: 15, fontWeight: '500' as const, color: c.text },
    caption: { fontSize: 13, fontWeight: '500' as const, color: c.textSecondary },
    micro: { fontSize: 11, fontWeight: '600' as const, color: c.textTertiary },
  };
}

export function getShadow(c: ThemeColors) {
  return {
    sm: {
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 4,
    },
  };
}

// Backward-compat static exports (light mode only)
export const typography = getTypography(lightColors);
export const shadow = getShadow(lightColors);
