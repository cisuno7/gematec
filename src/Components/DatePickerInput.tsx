import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
  editable?: boolean;
  label?: string;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChangeText,
  placeholder = "Selecione uma data",
  style,
  editable = true,
  label,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState('01');
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Sincroniza o estado interno ao abrir com o valor atual
  const syncFromValue = () => {
    try {
      if (!value) return;
      const v = value.includes('/')
        ? value.split('/').reverse().join('-')
        : value;
      const [y, m, d] = v.split('-');
      if (y && m && d) {
        setSelectedYear(y);
        setSelectedMonth(m.padStart(2, '0'));
        setSelectedDay(d.padStart(2, '0'));
      }
    } catch { }
  };

  // Gerar arrays para dias, meses e anos
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const years = Array.from({ length: 50 }, (_, i) => String(new Date().getFullYear() - 25 + i));

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handleConfirm = () => {
    // Retornar no formato YYYY-MM-DD para compatibilidade com o backend
    const formattedDate = `${selectedYear}-${selectedMonth}-${selectedDay}`;
    onChangeText(formattedDate);
    setIsVisible(false);
  };

  const handleCancel = () => {
    setIsVisible(false);
  };

  const formatDisplayValue = (dateString: string) => {
    if (!dateString) return '';

    // Se já estiver no formato DD/MM/YYYY, retornar como está
    if (dateString.includes('/')) {
      return dateString;
    }

    // Se estiver no formato YYYY-MM-DD, converter
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    return dateString;
  };

  const displayValue = formatDisplayValue(value);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, style, !editable && styles.disabledInput]}
        onPress={() => {
          if (!editable) return;
          syncFromValue();
          setIsVisible(true);
        }}
        disabled={!editable}
      >
        <Text style={[styles.inputText, !displayValue && styles.placeholderText]}>
          {displayValue || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Data</Text>
              <TouchableOpacity onPress={handleCancel}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <View style={styles.pickerGroup}>
                <Text style={styles.pickerLabel}>Dia</Text>
                <Picker
                  selectedValue={selectedDay}
                  onValueChange={setSelectedDay}
                  style={styles.picker}
                  dropdownIconColor={Platform.OS === 'android' ? '#333' : undefined}
                  mode={Platform.OS === 'android' ? 'dropdown' : undefined}
                >
                  {days.map((day) => (
                    <Picker.Item key={day} label={day} value={day} color="#333" />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerGroup}>
                <Text style={styles.pickerLabel}>Mês</Text>
                <Picker
                  selectedValue={selectedMonth}
                  onValueChange={setSelectedMonth}
                  style={styles.picker}
                  dropdownIconColor={Platform.OS === 'android' ? '#333' : undefined}
                  mode={Platform.OS === 'android' ? 'dropdown' : undefined}
                >
                  {months.map((month, index) => (
                    <Picker.Item
                      key={month}
                      label={monthNames[index]}
                      value={month}
                      color="#333"
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerGroup}>
                <Text style={styles.pickerLabel}>Ano</Text>
                <Picker
                  selectedValue={selectedYear}
                  onValueChange={setSelectedYear}
                  style={styles.picker}
                  dropdownIconColor={Platform.OS === 'android' ? '#333' : undefined}
                  mode={Platform.OS === 'android' ? 'dropdown' : undefined}
                >
                  {years.map((year) => (
                    <Picker.Item key={year} label={year} value={year} color="#333" />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    minHeight: 50,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pickerGroup: {
    flex: 1,
    marginHorizontal: 5,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  picker: {
    height: 120,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    color: '#333',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 5,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    marginLeft: 5,
    borderRadius: 8,
    backgroundColor: '#007BFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DatePickerInput; 