import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

interface DateMaskInputProps extends Omit<TextInputProps, 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

const DateMaskInput: React.FC<DateMaskInputProps> = ({ 
  value, 
  onChangeText, 
  placeholder = "AAAA-MM-DD",
  ...props 
}) => {
  
  const formatDate = (text: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = text.replace(/\D/g, '');
    
    // Aplica a máscara AAAA-MM-DD
    let formatted = '';
    
    if (numbers.length >= 1) {
      formatted += numbers.substring(0, 4);
    }
    
    if (numbers.length >= 5) {
      formatted += '-' + numbers.substring(4, 6);
    }
    
    if (numbers.length >= 7) {
      formatted += '-' + numbers.substring(6, 8);
    }
    
    return formatted;
  };

  const handleChangeText = (text: string) => {
    const formatted = formatDate(text);
    onChangeText(formatted);
  };

  return (
    <TextInput
      {...props}
      value={value}
      onChangeText={handleChangeText}
      placeholder={placeholder}
      keyboardType="numeric"
      maxLength={10} // AAAA-MM-DD = 10 caracteres
    />
  );
};

export default DateMaskInput; 