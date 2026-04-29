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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react-native';
import { useUpdateTransaction, useCategories, useAccounts } from '@/api/transactions';
import { formatCurrency } from '@/lib/formatters';
import { DatePickerCalendar } from './DatePickerCalendar';
import * as Haptics from 'expo-haptics';

interface EditTransactionModalProps {
  visible: boolean;
  transaction: any;
  onClose: () => void;
}

type TransactionType = 'income' | 'expense';

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  visible,
  transaction,
  onClose,
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const { data: categories = [] } = useCategories();
  const { mutate: updateTransaction, isPending } = useUpdateTransaction();

  useEffect(() => {
    if (transaction && visible) {
      setAmount(String(transaction.amount / 100));
      setDescription(transaction.description);
      setNotes(transaction.notes || '');
      setDate(transaction.date);
      setSelectedCategoryId(transaction.categoryId || '');
    }
  }, [transaction, visible]);

  const filteredCategories = categories.filter(
    (cat) =>
      cat.type === transaction?.type && cat.isActive !== false,
  );

  const selectedCategory = categories.find((cat) => cat._id === selectedCategoryId);

  const handleSubmit = async () => {
    if (!amount || !description) {
      Alert.alert('Error', 'Por favor completa cantidad y descripción');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Error', 'Por favor selecciona una categoría');
      return;
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);

    updateTransaction(
      {
        id: transaction._id,
        data: {
          amount: amountInCents,
          date,
          description,
          categoryId: selectedCategoryId,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          handleClose();
        },
        onError: () => {
          Alert.alert('Error', 'No se pudo actualizar la transacción');
        },
      },
    );
  };

  const isValid = amount && description && selectedCategoryId;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.statusBarSpace} />
        <View style={styles.header}>
          <Text style={styles.title}>Editar</Text>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView scrollEnabled={true} keyboardShouldPersistTaps="handled" style={styles.scrollView}>
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
              />
            </View>
          </View>

          {/* Category Selector */}
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

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Descripción</Text>
            <TextInput
              style={styles.input}
              placeholder="Descripción"
              placeholderTextColor="#ccc"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Date Picker */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Fecha</Text>
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
              <Text style={styles.submitButtonText}>Guardar cambios</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  statusBarSpace: {
    height: 12,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  scrollView: {
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  amountSection: {
    marginBottom: 24,
    marginTop: 16,
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
  },
  selectorButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
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
