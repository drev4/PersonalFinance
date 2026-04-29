import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { useLogout } from '@/api/auth';
import { useConfigStore } from '@/stores/configStore';
import { useTheme } from '@/theme/useTheme';
import { updateClientBaseURL } from '@/api/client';
import { LogOut, Server, Moon } from 'lucide-react-native';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { mutate: logout } = useLogout();
  const { apiUrl, setApiUrl, isDark, setIsDark } = useConfigStore();
  const [tempUrl, setTempUrl] = useState(apiUrl);
  const [showDebug, setShowDebug] = useState(false);

  const { colors, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => router.replace('/(auth)/login'),
    });
  };

  const handleSaveUrl = async () => {
    await setApiUrl(tempUrl);
    updateClientBaseURL(tempUrl);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Ajustes</Text>

        {/* Appearance */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.primaryLight }]}>
              <Moon size={18} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Modo oscuro</Text>
            <Switch
              value={isDark}
              onValueChange={setIsDark}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.row} onPress={handleLogout} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: colors.expenseLight }]}>
              <LogOut size={18} color={colors.expense} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.expense }]}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onLongPress={() => setShowDebug(!showDebug)} activeOpacity={1}>
          <Text style={styles.debugHint}>Mantén presionado para opciones de debug</Text>
        </TouchableOpacity>

        {showDebug && (
          <View style={styles.debugCard}>
            <View style={styles.debugHeader}>
              <Server size={16} color={colors.textSecondary} />
              <Text style={styles.debugTitle}>API Debug</Text>
            </View>
            <Text style={styles.debugLabel}>URL del Backend</Text>
            <TextInput
              style={styles.debugInput}
              value={tempUrl}
              onChangeText={setTempUrl}
              placeholder="http://192.168.x.x:3001"
              placeholderTextColor={colors.textTertiary}
            />
            <TouchableOpacity style={styles.debugBtn} onPress={handleSaveUrl} activeOpacity={0.85}>
              <Text style={styles.debugBtnText}>Guardar URL</Text>
            </TouchableOpacity>
            <Text style={styles.debugInfo}>Actual: {apiUrl}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: 100 },
    title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, color: colors.text, marginBottom: spacing.xxl },
    section: { backgroundColor: colors.card, borderRadius: radius.xl, marginBottom: spacing.lg, ...shadow.sm },
    row: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
    rowIcon: { width: 36, height: 36, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
    rowLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
    debugHint: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.md },
    debugCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, marginTop: spacing.md, ...shadow.sm },
    debugHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
    debugTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    debugLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: spacing.sm },
    debugInput: { backgroundColor: colors.inputBg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 13, color: colors.text, marginBottom: spacing.md, fontFamily: 'Courier New' },
    debugBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginBottom: spacing.sm },
    debugBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },
    debugInfo: { fontSize: 11, color: colors.textTertiary, fontStyle: 'italic' },
  });
}
