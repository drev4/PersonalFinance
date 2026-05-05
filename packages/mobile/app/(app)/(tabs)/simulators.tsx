import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import type React from 'react';
import { Calculator, Home, TrendingUp } from 'lucide-react-native';
import {
  useCalculateMortgage,
  useCalculateInvestment,
  type MortgageResult,
  type InvestmentResult,
  type AmortizationRow,
  type YearlyProjection,
} from '@/api/simulators';
import { formatCurrency } from '@/lib/formatters';
import { colors, radius, spacing } from '@/theme';
import { useTheme } from '@/theme/useTheme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(val: string): number {
  return parseFloat(val.replace(',', '.')) || 0;
}

function fmtEur(cents: number): string {
  return formatCurrency(cents, 'EUR');
}

function buildYearlySummary(schedule: AmortizationRow[]) {
  const rows: { year: number; interest: number; principal: number; balance: number }[] = [];
  let yearInterest = 0;
  let yearPrincipal = 0;
  for (const row of schedule) {
    yearInterest += row.interest;
    yearPrincipal += row.principal;
    if (row.month % 12 === 0) {
      rows.push({
        year: row.month / 12,
        interest: yearInterest,
        principal: yearPrincipal,
        balance: row.balance,
      });
      yearInterest = 0;
      yearPrincipal = 0;
    }
  }
  // partial last year
  if (schedule.length > 0 && schedule[schedule.length - 1].month % 12 !== 0) {
    const last = schedule[schedule.length - 1];
    const y = Math.ceil(last.month / 12);
    rows.push({ year: y, interest: yearInterest, principal: yearPrincipal, balance: last.balance });
  }
  return rows;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

interface NumericFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  decimal?: boolean;
}

function NumericField({
  label,
  value,
  onChange,
  placeholder = '0',
  suffix,
  decimal = true,
}: NumericFieldProps): React.ReactElement {
  const { colors: c } = useTheme();
  return (
    <View style={fieldStyles.wrap}>
      <Text style={[fieldStyles.label, { color: c.textSecondary }]}>{label}</Text>
      <View style={[fieldStyles.row, { backgroundColor: c.inputBg, borderColor: c.border }]}>
        <TextInput
          style={[fieldStyles.input, { color: c.text }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={c.textTertiary}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          returnKeyType="done"
        />
        {suffix && <Text style={[fieldStyles.suffix, { color: c.textTertiary }]}>{suffix}</Text>}
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xs,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  suffix: { fontSize: 14, marginLeft: spacing.xs },
});

interface SumRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}

function SumRow({ label, value, highlight, color }: SumRowProps): React.ReactElement {
  const { colors: c } = useTheme();
  return (
    <View style={sumStyles.row}>
      <Text style={[sumStyles.label, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[sumStyles.value, highlight && sumStyles.big, { color: color ?? c.text }]}>
        {value}
      </Text>
    </View>
  );
}

const sumStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '600' },
  big: { fontSize: 18 },
});

// ─── Mortgage calculator ───────────────────────────────────────────────────────

function MortgageCalculator(): React.ReactElement {
  const { colors: c } = useTheme();
  const mutation = useCalculateMortgage();

  const [capital, setCapital] = useState('200000');
  const [rate, setRate] = useState('3.5');
  const [years, setYears] = useState('30');

  const result: MortgageResult | undefined = mutation.data;

  function handleCalculate(): void {
    const inputs = {
      principal: parseNum(capital),
      annualRate: parseNum(rate),
      years: parseInt(years, 10) || 30,
    };
    mutation.mutate(inputs);
  }

  const yearlySummary = result ? buildYearlySummary(result.schedule) : [];

  return (
    <View>
      {/* Form */}
      <View style={[sectionBox, { backgroundColor: c.card }]}>
        <NumericField
          label="Capital del préstamo"
          value={capital}
          onChange={setCapital}
          placeholder="200000"
          suffix="€"
        />
        <NumericField
          label="Tipo de interés anual"
          value={rate}
          onChange={setRate}
          placeholder="3.5"
          suffix="%"
        />
        <NumericField
          label="Plazo"
          value={years}
          onChange={setYears}
          placeholder="30"
          suffix="años"
          decimal={false}
        />

        <TouchableOpacity
          style={[calcBtn, { backgroundColor: c.primary, opacity: mutation.isPending ? 0.7 : 1 }]}
          onPress={handleCalculate}
          disabled={mutation.isPending}
          activeOpacity={0.85}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={calcBtnText}>Calcular</Text>
          )}
        </TouchableOpacity>

        {mutation.isError && (
          <Text
            style={{
              color: colors.expense,
              fontSize: 13,
              marginTop: spacing.sm,
              textAlign: 'center',
            }}
          >
            Error al calcular. Verifica los datos.
          </Text>
        )}
      </View>

      {/* Results */}
      {result && (
        <>
          <View style={[sectionBox, { backgroundColor: c.card, marginTop: spacing.md }]}>
            <Text style={[sectionTitle, { color: c.text }]}>Resumen</Text>
            <SumRow
              label="Cuota mensual"
              value={fmtEur(result.monthlyPayment)}
              highlight
              color={c.primary}
            />
            <View style={[divider, { backgroundColor: c.border }]} />
            <SumRow label="Total pagado" value={fmtEur(result.totalPayment)} />
            <SumRow
              label="Total intereses"
              value={fmtEur(result.totalInterest)}
              color={colors.expense}
            />
            <SumRow label="TIN efectivo" value={`${result.effectiveRate.toFixed(3)}%`} />
            {result.fixedPhasePayment && (
              <SumRow label="Cuota fase fija" value={fmtEur(result.fixedPhasePayment)} />
            )}
            {result.variablePhasePayment && (
              <SumRow label="Cuota fase variable" value={fmtEur(result.variablePhasePayment)} />
            )}
          </View>

          {/* Amortization table */}
          <View style={[sectionBox, { backgroundColor: c.card, marginTop: spacing.md }]}>
            <Text style={[sectionTitle, { color: c.text }]}>Amortización anual</Text>
            {/* Header */}
            <View style={tableStyles.header}>
              <Text style={[tableStyles.hcell, tableStyles.yearCol, { color: c.textTertiary }]}>
                Año
              </Text>
              <Text style={[tableStyles.hcell, tableStyles.numCol, { color: c.textTertiary }]}>
                Intereses
              </Text>
              <Text style={[tableStyles.hcell, tableStyles.numCol, { color: c.textTertiary }]}>
                Capital
              </Text>
              <Text style={[tableStyles.hcell, tableStyles.numCol, { color: c.textTertiary }]}>
                Pendiente
              </Text>
            </View>
            {yearlySummary.map((row) => (
              <View key={row.year} style={[tableStyles.row, { borderTopColor: c.border }]}>
                <Text style={[tableStyles.cell, tableStyles.yearCol, { color: c.text }]}>
                  {row.year}
                </Text>
                <Text style={[tableStyles.cell, tableStyles.numCol, { color: colors.expense }]}>
                  {formatCurrency(row.interest, 'EUR')}
                </Text>
                <Text style={[tableStyles.cell, tableStyles.numCol, { color: c.text }]}>
                  {formatCurrency(row.principal, 'EUR')}
                </Text>
                <Text style={[tableStyles.cell, tableStyles.numCol, { color: c.textSecondary }]}>
                  {formatCurrency(row.balance, 'EUR')}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ─── Investment calculator ─────────────────────────────────────────────────────

function InvestmentCalculator(): React.ReactElement {
  const { colors: c } = useTheme();
  const mutation = useCalculateInvestment();

  const [initial, setInitial] = useState('10000');
  const [monthly, setMonthly] = useState('300');
  const [annualReturn, setAnnualReturn] = useState('7');
  const [years, setYears] = useState('20');
  const [inflation, setInflation] = useState('2');

  const result: InvestmentResult | undefined = mutation.data;

  function handleCalculate(): void {
    mutation.mutate({
      initialAmount: parseNum(initial),
      monthlyContribution: parseNum(monthly),
      annualReturn: parseNum(annualReturn),
      years: parseInt(years, 10) || 20,
      inflationRate: parseNum(inflation) || undefined,
    });
  }

  const projection: YearlyProjection[] = result?.annualProjection ?? [];
  const pnl = result ? result.finalValue - result.totalContributed : 0;

  return (
    <View>
      {/* Form */}
      <View style={[sectionBox, { backgroundColor: c.card }]}>
        <NumericField label="Inversión inicial" value={initial} onChange={setInitial} suffix="€" />
        <NumericField label="Aportación mensual" value={monthly} onChange={setMonthly} suffix="€" />
        <NumericField
          label="Rentabilidad anual esperada"
          value={annualReturn}
          onChange={setAnnualReturn}
          suffix="%"
        />
        <NumericField
          label="Plazo"
          value={years}
          onChange={setYears}
          suffix="años"
          decimal={false}
        />
        <NumericField
          label="Inflación anual (opcional)"
          value={inflation}
          onChange={setInflation}
          suffix="%"
        />

        <TouchableOpacity
          style={[calcBtn, { backgroundColor: c.primary, opacity: mutation.isPending ? 0.7 : 1 }]}
          onPress={handleCalculate}
          disabled={mutation.isPending}
          activeOpacity={0.85}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={calcBtnText}>Calcular</Text>
          )}
        </TouchableOpacity>

        {mutation.isError && (
          <Text
            style={{
              color: colors.expense,
              fontSize: 13,
              marginTop: spacing.sm,
              textAlign: 'center',
            }}
          >
            Error al calcular. Verifica los datos.
          </Text>
        )}
      </View>

      {/* Results */}
      {result && (
        <>
          <View style={[sectionBox, { backgroundColor: c.card, marginTop: spacing.md }]}>
            <Text style={[sectionTitle, { color: c.text }]}>Resumen</Text>
            <SumRow
              label="Valor final"
              value={fmtEur(result.finalValue)}
              highlight
              color={c.primary}
            />
            <View style={[divider, { backgroundColor: c.border }]} />
            <SumRow label="Total aportado" value={fmtEur(result.totalContributed)} />
            <SumRow
              label="Beneficio total"
              value={fmtEur(pnl)}
              color={pnl >= 0 ? colors.income : colors.expense}
            />
            {result.realFinalValue !== undefined && (
              <SumRow
                label="Valor real (inflación)"
                value={fmtEur(result.realFinalValue)}
                color={c.textSecondary}
              />
            )}
          </View>

          {/* Yearly projection */}
          <View style={[sectionBox, { backgroundColor: c.card, marginTop: spacing.md }]}>
            <Text style={[sectionTitle, { color: c.text }]}>Proyección anual</Text>
            <View style={tableStyles.header}>
              <Text style={[tableStyles.hcell, tableStyles.yearCol, { color: c.textTertiary }]}>
                Año
              </Text>
              <Text style={[tableStyles.hcell, tableStyles.numCol, { color: c.textTertiary }]}>
                Aportado
              </Text>
              <Text style={[tableStyles.hcell, tableStyles.numCol, { color: c.textTertiary }]}>
                Beneficio
              </Text>
              <Text style={[tableStyles.hcell, tableStyles.numCol, { color: c.textTertiary }]}>
                Total
              </Text>
            </View>
            {projection.map((row) => (
              <View key={row.year} style={[tableStyles.row, { borderTopColor: c.border }]}>
                <Text style={[tableStyles.cell, tableStyles.yearCol, { color: c.text }]}>
                  {row.year}
                </Text>
                <Text style={[tableStyles.cell, tableStyles.numCol, { color: c.textSecondary }]}>
                  {formatCurrency(row.contributed, 'EUR')}
                </Text>
                <Text style={[tableStyles.cell, tableStyles.numCol, { color: colors.income }]}>
                  {formatCurrency(row.returns, 'EUR')}
                </Text>
                <Text style={[tableStyles.cell, tableStyles.numCol, { color: c.primary }]}>
                  {formatCurrency(row.total, 'EUR')}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const sectionBox: object = {
  borderRadius: radius.md,
  padding: spacing.lg,
  marginHorizontal: spacing.lg,
};

const sectionTitle: object = {
  fontSize: 15,
  fontWeight: '700',
  marginBottom: spacing.md,
};

const divider: object = {
  height: 1,
  marginVertical: spacing.sm,
};

const calcBtn: object = {
  borderRadius: radius.sm,
  paddingVertical: spacing.md,
  alignItems: 'center',
  marginTop: spacing.md,
};

const calcBtnText: object = {
  color: '#fff',
  fontSize: 15,
  fontWeight: '600',
};

const tableStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hcell: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cell: {
    fontSize: 12,
    fontWeight: '500',
  },
  yearCol: {
    width: 36,
    textAlign: 'center',
  },
  numCol: {
    flex: 1,
    textAlign: 'right',
    paddingRight: 4,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

type CalcType = 'mortgage' | 'investment';

const CALCULATORS: {
  id: CalcType;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  description: string;
}[] = [
  { id: 'mortgage', label: 'Hipoteca', icon: Home, description: 'Cuota mensual y amortización' },
  {
    id: 'investment',
    label: 'Inversión',
    icon: TrendingUp,
    description: 'Proyección de cartera con interés compuesto',
  },
];

export default function SimulatorsScreen(): React.ReactElement {
  const { colors: c } = useTheme();
  const [active, setActive] = useState<CalcType>('mortgage');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        {/* Header */}
        <View
          style={[screenStyles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}
        >
          <View style={screenStyles.titleRow}>
            <View style={[screenStyles.iconWrap, { backgroundColor: c.primaryLight }]}>
              <Calculator size={20} color={c.primary} strokeWidth={1.8} />
            </View>
            <View>
              <Text style={[screenStyles.title, { color: c.text }]}>Simuladores</Text>
              <Text style={[screenStyles.subtitle, { color: c.textTertiary }]}>
                Calculadoras financieras
              </Text>
            </View>
          </View>

          {/* Tab switcher */}
          <View style={[screenStyles.tabs, { backgroundColor: c.inputBg }]}>
            {CALCULATORS.map((calc) => {
              const isActive = active === calc.id;
              const Icon = calc.icon;
              return (
                <TouchableOpacity
                  key={calc.id}
                  style={[
                    screenStyles.tab,
                    isActive && {
                      backgroundColor: c.card,
                      shadowColor: c.shadow,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.8,
                      shadowRadius: 4,
                      elevation: 2,
                    },
                  ]}
                  onPress={() => setActive(calc.id)}
                  activeOpacity={0.8}
                >
                  <Icon size={14} color={isActive ? c.primary : c.textTertiary} strokeWidth={2} />
                  <Text
                    style={[
                      screenStyles.tabLabel,
                      { color: isActive ? c.primary : c.textTertiary },
                    ]}
                  >
                    {calc.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: 40 }}
        >
          {active === 'mortgage' ? <MortgageCalculator /> : <InvestmentCalculator />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const screenStyles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.xs,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
