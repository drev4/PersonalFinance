import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Landmark,
  ChartPie,
  Target,
  TrendingDown,
  Repeat2,
  FileText,
  Calculator,
  Search,
  Bell,
  Settings,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useUnreadCount } from '@/api/notifications';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';

type MenuItem = {
  label: string;
  icon: React.ElementType;
  route: string;
  iconColor: string;
  iconBg: string;
  badge?: number;
};

type Section = {
  title: string;
  items: MenuItem[];
};

export default function MoreScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const shadow = useMemo(() => getShadow(colors), [isDark]);
  const styles = useMemo(() => createStyles(colors), [isDark]);

  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;

  const orange = isDark ? '#FF9F0A' : '#FF9500';
  const orangeBg = isDark ? '#2A1A00' : '#FFF3E0';
  const grayBg = colors.inputBg;

  const sections: Section[] = [
    {
      title: 'Finanzas',
      items: [
        {
          label: 'Cuentas',
          icon: Landmark,
          route: '/accounts',
          iconColor: colors.primary,
          iconBg: colors.primaryLight,
        },
        {
          label: 'Presupuestos',
          icon: ChartPie,
          route: '/budgets',
          iconColor: orange,
          iconBg: orangeBg,
        },
        {
          label: 'Metas',
          icon: Target,
          route: '/goals',
          iconColor: colors.income,
          iconBg: colors.incomeLight,
        },
        {
          label: 'Deudas',
          icon: TrendingDown,
          route: '/debts',
          iconColor: colors.expense,
          iconBg: colors.expenseLight,
        },
        {
          label: 'Recurrentes',
          icon: Repeat2,
          route: '/recurring',
          iconColor: colors.transfer,
          iconBg: colors.transferLight,
        },
      ],
    },
    {
      title: 'Análisis',
      items: [
        {
          label: 'Informes',
          icon: FileText,
          route: '/reports',
          iconColor: colors.expense,
          iconBg: colors.expenseLight,
        },
        {
          label: 'Simuladores',
          icon: Calculator,
          route: '/simulators',
          iconColor: colors.secondary,
          iconBg: isDark ? '#1E1B4B' : '#EEF2FF',
        },
        {
          label: 'Buscar',
          icon: Search,
          route: '/search',
          iconColor: colors.textSecondary,
          iconBg: grayBg,
        },
      ],
    },
    {
      title: 'Aplicación',
      items: [
        {
          label: 'Notificaciones',
          icon: Bell,
          route: '/notifications',
          iconColor: orange,
          iconBg: orangeBg,
          badge: unreadCount > 0 ? unreadCount : undefined,
        },
        {
          label: 'Ajustes',
          icon: Settings,
          route: '/settings',
          iconColor: colors.textSecondary,
          iconBg: grayBg,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Más</Text>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            <View style={[styles.card, shadow.sm]}>
              {section.items.map((item, index) => {
                const Icon = item.icon;
                const isLast = index === section.items.length - 1;
                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[styles.row, !isLast && styles.rowBorder]}
                    onPress={() => router.navigate(item.route as never)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
                      <Icon size={18} color={item.iconColor} strokeWidth={1.8} />
                    </View>

                    <Text style={styles.rowLabel}>{item.label}</Text>

                    {item.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                      </View>
                    ) : null}

                    <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scroll: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: spacing.xl,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      gap: spacing.md,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    badge: {
      backgroundColor: colors.expense,
      borderRadius: radius.full,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },
  });
}
