import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Switch,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { useLogout } from '@/api/auth';
import { useMe, useUpdateProfile, useChangePassword } from '@/api/user';
import {
  useIntegrations,
  useConnectBinance,
  useDisconnectIntegration,
  useSyncIntegration,
} from '@/api/integrations';
import { useAuthStore } from '@/stores/authStore';
import { useConfigStore } from '@/stores/configStore';
import { useTheme } from '@/theme/useTheme';
import { updateClientBaseURL } from '@/api/client';
import {
  LogOut, Server, Moon, User, Lock, Bell, Zap, Download,
  ChevronRight, Check, X, RefreshCw, AlertCircle,
} from 'lucide-react-native';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';

const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY',
  'SEK', 'NZD', 'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY',
  'INR', 'BRL', 'ZAR',
];

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label, colors }: { label: string; colors: ThemeColors }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginLeft: 4 }}>
      {label}
    </Text>
  );
}

function SettingsRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  onPress,
  rightNode,
  colors,
  styles,
  isLast = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightNode?: React.ReactNode;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  isLast?: boolean;
}) {
  const inner = (
    <View style={[styles.row, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {rightNode ?? (onPress ? <ChevronRight size={16} color={colors.textTertiary} /> : null)}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

// ─── Picker modal ─────────────────────────────────────────────────────────────

function PickerModal<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  colors,
  styles,
}: {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  selected: T | undefined;
  onSelect: (v: T) => void;
  onClose: () => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => { onSelect(item.value); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerLabel, item.value === selected && { color: colors.primary, fontWeight: '700' }]}>
                  {item.label}
                </Text>
                {item.value === selected && <Check size={16} color={colors.primary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Text edit modal ──────────────────────────────────────────────────────────

function TextEditModal({
  visible,
  title,
  value,
  onChange,
  onSave,
  onClose,
  placeholder,
  isPending,
  colors,
  styles,
}: {
  visible: boolean;
  title: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
  placeholder?: string;
  isPending: boolean;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            autoFocus
          />
          <TouchableOpacity style={[styles.btn, isPending && styles.btnDisabled]} onPress={onSave} disabled={isPending} activeOpacity={0.85}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Guardar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Password modal ───────────────────────────────────────────────────────────

function PasswordModal({
  visible,
  onClose,
  isPending,
  colors,
  styles,
}: {
  visible: boolean;
  onClose: () => void;
  isPending: boolean;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const { mutate: changePassword } = useChangePassword();
  const { clearAuth } = useAuthStore();
  const router = useRouter();

  const handleSave = () => {
    if (!current || !next || !confirm) return Alert.alert('Error', 'Completa todos los campos.');
    if (next !== confirm) return Alert.alert('Error', 'Las contraseñas nuevas no coinciden.');
    if (next.length < 8) return Alert.alert('Error', 'La nueva contraseña debe tener al menos 8 caracteres.');

    changePassword(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Contraseña cambiada', 'Por seguridad, vuelve a iniciar sesión.', [
            {
              text: 'OK',
              onPress: async () => {
                await clearAuth();
                router.replace('/(auth)/login');
              },
            },
          ]);
          onClose();
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error?.message ?? 'Error al cambiar la contraseña.';
          Alert.alert('Error', msg);
        },
      },
    );
  };

  const handleClose = () => {
    setCurrent(''); setNext(''); setConfirm('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={styles.overlay} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Cambiar contraseña</Text>
            <TouchableOpacity onPress={handleClose}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <Text style={styles.inputLabel}>Contraseña actual</Text>
          <TextInput style={styles.input} value={current} onChangeText={setCurrent} secureTextEntry placeholder="••••••••" placeholderTextColor={colors.textTertiary} />
          <Text style={styles.inputLabel}>Nueva contraseña</Text>
          <TextInput style={styles.input} value={next} onChangeText={setNext} secureTextEntry placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número" placeholderTextColor={colors.textTertiary} />
          <Text style={styles.inputLabel}>Confirmar contraseña</Text>
          <TextInput style={[styles.input, { marginBottom: spacing.xl }]} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="••••••••" placeholderTextColor={colors.textTertiary} />
          <TouchableOpacity style={[styles.btn, isPending && styles.btnDisabled]} onPress={handleSave} disabled={isPending} activeOpacity={0.85}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Cambiar contraseña</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Binance modal ────────────────────────────────────────────────────────────

function BinanceModal({
  visible,
  onClose,
  isPending,
  colors,
  styles,
}: {
  visible: boolean;
  onClose: () => void;
  isPending: boolean;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const { mutate: connect } = useConnectBinance();

  const handleConnect = () => {
    if (!apiKey.trim() || !apiSecret.trim()) return Alert.alert('Error', 'Introduce API Key y Secret.');
    connect(
      { apiKey: apiKey.trim(), apiSecret: apiSecret.trim() },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setApiKey(''); setApiSecret('');
          onClose();
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error?.message ?? 'Error al conectar Binance.';
          Alert.alert('Error', msg);
        },
      },
    );
  };

  const handleClose = () => {
    setApiKey(''); setApiSecret('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={styles.overlay} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Conectar Binance</Text>
            <TouchableOpacity onPress={handleClose}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <Text style={[styles.inputLabel, { marginBottom: spacing.sm }]}>
            Solo necesitas permisos de lectura. Nunca se envían órdenes.
          </Text>
          <Text style={styles.inputLabel}>API Key</Text>
          <TextInput style={styles.input} value={apiKey} onChangeText={setApiKey} autoCapitalize="none" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" placeholderTextColor={colors.textTertiary} />
          <Text style={styles.inputLabel}>API Secret</Text>
          <TextInput style={[styles.input, { marginBottom: spacing.xl }]} value={apiSecret} onChangeText={setApiSecret} secureTextEntry autoCapitalize="none" placeholder="••••••••••••••••••••••••••••••••••••••••" placeholderTextColor={colors.textTertiary} />
          <TouchableOpacity style={[styles.btn, isPending && styles.btnDisabled]} onPress={handleConnect} disabled={isPending} activeOpacity={0.85}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Conectar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors]);

  const { mutate: logout } = useLogout();
  const { apiUrl, setApiUrl, isDark, setIsDark, budgetAlertsEnabled, setBudgetAlertsEnabled } = useConfigStore();
  const user = useAuthStore((s) => s.user);

  const { data: profile } = useMe();
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();
  const { data: integrations } = useIntegrations();
  const { mutate: disconnect } = useDisconnectIntegration();
  const { mutate: syncIntegration, isPending: isSyncing } = useSyncIntegration();
  const { isPending: isChangingPwd } = useChangePassword();

  const [tempUrl, setTempUrl] = useState(apiUrl);
  const [showDebug, setShowDebug] = useState(false);

  // Modal states
  const [nameModal, setNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [currencyModal, setCurrencyModal] = useState(false);
  const [languageModal, setLanguageModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [binanceModal, setBinanceModal] = useState(false);

  // Optimistic values so la UI actualiza antes de que el servidor confirme
  const [optimisticCurrency, setOptimisticCurrency] = useState<string | null>(null);
  const [optimisticLocale, setOptimisticLocale] = useState<string | null>(null);

  const displayName = profile?.name ?? user?.name ?? '';
  const displayCurrency = optimisticCurrency ?? profile?.baseCurrency ?? user?.baseCurrency ?? 'EUR';
  const displayLocale = optimisticLocale ?? profile?.preferences?.locale ?? 'es';
  const currentLanguage = LANGUAGES.find((l) => l.code === displayLocale)?.label ?? 'Español';

  const binance = integrations?.find((i) => i.provider === 'binance');

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => logout(undefined, { onSuccess: () => router.replace('/(auth)/login') }),
      },
    ]);
  };

  const openNameModal = () => {
    setNameInput(displayName);
    setNameModal(true);
  };

  const saveName = () => {
    if (!nameInput.trim()) return;
    updateProfile(
      { name: nameInput.trim() },
      {
        onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setNameModal(false); },
        onError: () => Alert.alert('Error', 'No se pudo actualizar el nombre.'),
      },
    );
  };

  const saveCurrency = (currency: string) => {
    setOptimisticCurrency(currency);
    updateProfile(
      { baseCurrency: currency },
      {
        onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        onError: () => {
          setOptimisticCurrency(null);
          Alert.alert('Error', 'No se pudo actualizar la moneda.');
        },
      },
    );
  };

  const saveLanguage = (locale: string) => {
    setOptimisticLocale(locale);
    updateProfile(
      { preferences: { locale } },
      {
        onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        onError: () => {
          setOptimisticLocale(null);
          Alert.alert('Error', 'No se pudo actualizar el idioma.');
        },
      },
    );
  };

  const handleDisconnectBinance = () => {
    Alert.alert('Desconectar Binance', '¿Eliminar la integración con Binance?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desconectar',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          disconnect('binance');
        },
      },
    ]);
  };

  const handleSaveUrl = async () => {
    await setApiUrl(tempUrl);
    updateClientBaseURL(tempUrl);
  };

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Ajustes</Text>

        {/* User card */}
        <View style={[styles.userCard, shadow.sm]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{displayName || '—'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>

        {/* ── Perfil ── */}
        <SectionHeader label="Perfil" colors={colors} />
        <View style={[styles.section, shadow.sm]}>
          <SettingsRow
            icon={<User size={18} color={colors.primary} />}
            iconBg={colors.primaryLight}
            iconColor={colors.primary}
            label="Nombre"
            value={displayName || '—'}
            onPress={openNameModal}
            colors={colors}
            styles={styles}
          />
          <SettingsRow
            icon={<Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>$</Text>}
            iconBg={colors.primaryLight}
            iconColor={colors.primary}
            label="Moneda base"
            value={displayCurrency}
            onPress={() => setCurrencyModal(true)}
            colors={colors}
            styles={styles}
          />
          <SettingsRow
            icon={<Text style={{ fontSize: 14, color: colors.secondary }}>🌐</Text>}
            iconBg={colors.transferLight}
            iconColor={colors.secondary}
            label="Idioma"
            value={currentLanguage}
            onPress={() => setLanguageModal(true)}
            colors={colors}
            styles={styles}
            isLast
          />
        </View>

        {/* ── Seguridad ── */}
        <SectionHeader label="Seguridad" colors={colors} />
        <View style={[styles.section, shadow.sm]}>
          <SettingsRow
            icon={<Lock size={18} color={colors.expense} />}
            iconBg={colors.expenseLight}
            iconColor={colors.expense}
            label="Cambiar contraseña"
            onPress={() => setPasswordModal(true)}
            colors={colors}
            styles={styles}
            isLast
          />
        </View>

        {/* ── Notificaciones ── */}
        <SectionHeader label="Notificaciones" colors={colors} />
        <View style={[styles.section, shadow.sm]}>
          <SettingsRow
            icon={<Bell size={18} color={colors.secondary} />}
            iconBg={colors.transferLight}
            iconColor={colors.secondary}
            label="Alertas de presupuesto"
            colors={colors}
            styles={styles}
            isLast
            rightNode={
              <Switch
                value={budgetAlertsEnabled}
                onValueChange={setBudgetAlertsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            }
          />
        </View>

        {/* ── Integraciones ── */}
        <SectionHeader label="Integraciones" colors={colors} />
        <View style={[styles.section, shadow.sm]}>
          {binance ? (
            <View style={[styles.row, { flexWrap: 'wrap', gap: spacing.sm }]}>
              <View style={[styles.rowIcon, { backgroundColor: '#FFF3E0' }]}>
                <Zap size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Binance</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={[styles.statusDot, { backgroundColor: binance.status === 'active' ? colors.income : binance.status === 'error' ? colors.expense : colors.textTertiary }]} />
                  <Text style={styles.rowValue}>
                    {binance.status === 'active' ? 'Conectado' : binance.status === 'error' ? 'Error' : 'Sincronizando'}
                  </Text>
                </View>
                {binance.error ? <Text style={[styles.rowValue, { color: colors.expense }]}>{binance.error}</Text> : null}
              </View>
              <TouchableOpacity style={styles.iconBtn} onPress={() => syncIntegration('binance')} disabled={isSyncing}>
                {isSyncing ? <ActivityIndicator size="small" color={colors.primary} /> : <RefreshCw size={16} color={colors.primary} />}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.expenseLight }]} onPress={handleDisconnectBinance}>
                <X size={16} color={colors.expense} />
              </TouchableOpacity>
            </View>
          ) : (
            <SettingsRow
              icon={<Zap size={18} color="#F59E0B" />}
              iconBg="#FFF3E0"
              iconColor="#F59E0B"
              label="Binance"
              value="No conectado"
              onPress={() => setBinanceModal(true)}
              colors={colors}
              styles={styles}
              isLast
            />
          )}
        </View>

        {/* ── Datos ── */}
        <SectionHeader label="Datos" colors={colors} />
        <View style={[styles.section, shadow.sm]}>
          <SettingsRow
            icon={<Download size={18} color={colors.income} />}
            iconBg={colors.incomeLight}
            iconColor={colors.income}
            label="Exportar transacciones CSV"
            value="Disponible en la app web"
            onPress={() => Alert.alert('Exportar CSV', 'Accede desde la aplicación web para descargar tus transacciones en formato CSV.')}
            colors={colors}
            styles={styles}
            isLast
          />
        </View>

        {/* ── Apariencia ── */}
        <SectionHeader label="Apariencia" colors={colors} />
        <View style={[styles.section, shadow.sm]}>
          <SettingsRow
            icon={<Moon size={18} color={colors.primary} />}
            iconBg={colors.primaryLight}
            iconColor={colors.primary}
            label="Modo oscuro"
            colors={colors}
            styles={styles}
            isLast
            rightNode={
              <Switch
                value={isDark}
                onValueChange={setIsDark}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            }
          />
        </View>

        {/* ── Cuenta ── */}
        <SectionHeader label="Cuenta" colors={colors} />
        <View style={[styles.section, shadow.sm]}>
          <SettingsRow
            icon={<LogOut size={18} color={colors.expense} />}
            iconBg={colors.expenseLight}
            iconColor={colors.expense}
            label="Cerrar sesión"
            onPress={handleLogout}
            colors={colors}
            styles={styles}
            isLast
          />
        </View>

        {/* Debug (hidden) */}
        <TouchableOpacity onLongPress={() => setShowDebug(!showDebug)} activeOpacity={1}>
          <Text style={styles.debugHint}>Mantén presionado para opciones de debug</Text>
        </TouchableOpacity>
        {showDebug && (
          <View style={[styles.debugCard, shadow.sm]}>
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

      {/* ── Modals ── */}
      <TextEditModal
        visible={nameModal}
        title="Editar nombre"
        value={nameInput}
        onChange={setNameInput}
        onSave={saveName}
        onClose={() => setNameModal(false)}
        placeholder="Tu nombre completo"
        isPending={isUpdating}
        colors={colors}
        styles={styles}
      />

      <PickerModal
        visible={currencyModal}
        title="Moneda base"
        options={CURRENCIES.map((c) => ({ value: c, label: c }))}
        selected={displayCurrency as any}
        onSelect={saveCurrency}
        onClose={() => setCurrencyModal(false)}
        colors={colors}
        styles={styles}
      />

      <PickerModal
        visible={languageModal}
        title="Idioma"
        options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
        selected={displayLocale as any}
        onSelect={saveLanguage}
        onClose={() => setLanguageModal(false)}
        colors={colors}
        styles={styles}
      />

      <PasswordModal
        visible={passwordModal}
        onClose={() => setPasswordModal(false)}
        isPending={isChangingPwd}
        colors={colors}
        styles={styles}
      />

      <BinanceModal
        visible={binanceModal}
        onClose={() => setBinanceModal(false)}
        isPending={false}
        colors={colors}
        styles={styles}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: 100 },
    title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, color: colors.text, marginBottom: spacing.xxl },

    // User card
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.xxl, gap: spacing.md },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
    userName: { fontSize: 16, fontWeight: '700', color: colors.text },
    userEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

    // Sections
    section: { backgroundColor: colors.card, borderRadius: radius.xl, marginBottom: spacing.xl, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowIcon: { width: 36, height: 36, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
    rowLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
    rowValue: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },

    // Status
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    iconBtn: { width: 32, height: 32, borderRadius: radius.xs, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },

    // Modal sheet
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: 40 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

    // Form
    inputLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: spacing.xs },
    input: { backgroundColor: colors.inputBg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.text, marginBottom: spacing.lg },
    btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: colors.white, fontSize: 15, fontWeight: '700' },

    // Picker
    pickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    pickerLabel: { fontSize: 15, color: colors.text },

    // Debug
    debugHint: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.md },
    debugCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, marginTop: spacing.md },
    debugHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
    debugTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    debugLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: spacing.sm },
    debugInput: { backgroundColor: colors.inputBg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 13, color: colors.text, marginBottom: spacing.md, fontFamily: 'Courier New' },
    debugBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginBottom: spacing.sm },
    debugBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },
    debugInfo: { fontSize: 11, color: colors.textTertiary, fontStyle: 'italic' },
  });
}
