export const colors = {
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

export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.5 },
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.3 },
  heading: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  subheading: { fontSize: 17, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.text },
  bodyMedium: { fontSize: 15, fontWeight: '500' as const, color: colors.text },
  caption: { fontSize: 13, fontWeight: '500' as const, color: colors.textSecondary },
  micro: { fontSize: 11, fontWeight: '600' as const, color: colors.textTertiary },
};

export const shadow = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
};
