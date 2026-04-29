import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { X, Calendar } from 'lucide-react-native';
import { useCreateTransaction, useCategories, useAccounts } from '@/api/transactions';
import { formatCurrency } from '@/lib/formatters';
import { DatePickerCalendar } from './DatePickerCalendar';
import * as Haptics from 'expo-haptics';

interface QuickAddModalProps {
  onClose: () => void;
}

type TransactionType = 'income' | 'expense' | 'transfer';

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ onClose }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedAccountIdTo, setSelectedAccountIdTo] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showAccountPickerTo, setShowAccountPickerTo] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { mutate: createTransaction, isPending } = useCreateTransaction();

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0]._id);
    }
    if (accounts.length > 1 && !selectedAccountIdTo) {
      setSelectedAccountIdTo(accounts[1]._id);
    }
  }, [accounts]);

  useEffect(() => {
    const filteredCategories = categories.filter((cat) => cat.type === type && cat.isActive !== false);
    if (filteredCategories.length > 0) {
      setSelectedCategoryId(filteredCategories[0]._id);
    }
  }, [type, categories]);

  const handleTypeSelect = (newType: TransactionType) => {
    setType(newType);
    setSelectedCategoryId('');
    setShowAccountPickerTo(false);
  };

  const filteredCategories = categories.filter(
    (cat) => cat.type === type && cat.isActive !== false,
  );

  const selectedAccount = accounts.find((acc) => acc._id === selectedAccountId);
  const selectedCategory = categories.find((cat) => cat._id === selectedCategoryId);

  const handleSubmit = async () => {
    if (!amount || !selectedAccountId || !description) {
      Alert.alert('Error', 'Por favor completa cantidad, cuenta y descripción');
      return;
    }

    if (type === 'transfer') {
      if (!selectedAccountIdTo) {
        Alert.alert('Error', 'Por favor selecciona una cuenta de destino');
        return;
      }
    } else {
      if (!selectedCategoryId) {
        Alert.alert('Error', 'Por favor selecciona una categoría');
        return;
      }
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);

    createTransaction(
      {
        accountId: selectedAccountId,
        type,
        amount: amountInCents,
        currency: selectedAccount?.currency || 'EUR',
        date,
        description,
        categoryId: type === 'transfer' ? selectedAccountIdTo : selectedCategoryId,
        notes: notes || undefined,
      },
      {
        onSuccess: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          handleClose();
        },
        onError: () => {
          Alert.alert('Error', 'No se pudo crear la transacción');
        },
      },
    );
  };

  const isValid =
    amount && selectedAccountId && description &&
    (type === 'transfer' ? selectedAccountIdTo : selectedCategoryId);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Add</Text>
        <TouchableOpacity onPress={handleClose}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollViewRef} scrollEnabled={true} keyboardShouldPersistTaps="handled">

      {/* Type Selector */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
          onPress={() => handleTypeSelect('expense')}
        >
          <Text
            style={[
              styles.typeButtonText,
              type === 'expense' && styles.typeButtonTextActive,
            ]}
          >
            Gasto
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
          onPress={() => handleTypeSelect('income')}
        >
          <Text
            style={[
              styles.typeButtonText,
              type === 'income' && styles.typeButtonTextActive,
            ]}
          >
            Ingreso
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, type === 'transfer' && styles.typeButtonActive]}
          onPress={() => handleTypeSelect('transfer')}
        >
          <Text
            style={[
              styles.typeButtonText,
              type === 'transfer' && styles.typeButtonTextActive,
            ]}
          >
            Transferencia
          </Text>
        </TouchableOpacity>
      </View>

      {/* Amount Input */}
      <View style={styles.amountSection}>
        <Text style={styles.sectionLabel}>Cantidad</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>€</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor="#ccc"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>
      </View>

      {/* Account Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Cuenta</Text>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowAccountPicker(!showAccountPicker)}
        >
          <Text style={styles.selectorButtonText}>
            {selectedAccount?.name || 'Seleccionar cuenta'}
          </Text>
          <Text style={styles.selectorButtonValue}>
            {selectedAccount && formatCurrency(selectedAccount.currentBalance)}
          </Text>
        </TouchableOpacity>

        {showAccountPicker && (
          <FlatList
            data={accounts}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  selectedAccountId === item._id && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setSelectedAccountId(item._id);
                  setShowAccountPicker(false);
                }}
              >
                <View>
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                  <Text style={styles.pickerItemSubtext}>
                    {formatCurrency(item.currentBalance)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Destination Account Selector (only for transfer) */}
      {type === 'transfer' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Cuenta Destino</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowAccountPickerTo(!showAccountPickerTo)}
          >
            <Text style={styles.selectorButtonText}>
              {accounts.find((acc) => acc._id === selectedAccountIdTo)?.name || 'Seleccionar cuenta'}
            </Text>
            <Text style={styles.selectorButtonValue}>
              {accounts.find((acc) => acc._id === selectedAccountIdTo) &&
                formatCurrency(accounts.find((acc) => acc._id === selectedAccountIdTo)?.currentBalance || 0)}
            </Text>
          </TouchableOpacity>

          {showAccountPickerTo && (
            <FlatList
              data={accounts.filter((acc) => acc._id !== selectedAccountId)}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    selectedAccountIdTo === item._id && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedAccountIdTo(item._id);
                    setShowAccountPickerTo(false);
                  }}
                >
                  <View>
                    <Text style={styles.pickerItemText}>{item.name}</Text>
                    <Text style={styles.pickerItemSubtext}>
                      {formatCurrency(item.currentBalance)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Category Selector (not for transfer) */}
      {type !== 'transfer' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Categoría</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text style={styles.selectorButtonText}>
              {selectedCategory?.name || 'Seleccionar categoría'}
            </Text>
          </TouchableOpacity>

          {showCategoryPicker && (
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    selectedCategoryId === item._id && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategoryId(item._id);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Description Input */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Descripción*</Text>
        <TextInput
          style={styles.input}
          placeholder="Descripción obligatoria"
          placeholderTextColor="#ccc"
          value={description}
          onChangeText={setDescription}
        />
      </View>

      {/* Date Picker Calendar */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Fecha*</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <Calendar size={18} color="#0066CC" />
          <Text style={styles.dateButtonText}>{date}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DatePickerCalendar
            selectedDate={date}
            onDateSelect={(newDate) => {
              setDate(newDate);
              setShowDatePicker(false);
            }}
          />
        )}
      </View>

      {/* Notes Input */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notas</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Notas adicionales (opcional)"
          placeholderTextColor="#ccc"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || isPending}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Guardar</Text>
        )}
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  amountSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066CC',
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  section: {
    marginBottom: 16,
  },
  selectorButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  selectorButtonValue: {
    fontSize: 12,
    color: '#666',
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  pickerItemSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    fontSize: 14,
    color: '#000',
  },
  notesInput: {
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    gap: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#000',
  },
  submitButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#0066CC',
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});
