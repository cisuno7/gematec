import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface CustomPickerProps {
    selectedValue: any;
    onValueChange: (value: any) => void;
    items: Array<{ label: string; value: any }>;
    placeholder?: string;
    style?: any;
}

const CustomPicker: React.FC<CustomPickerProps> = ({
    selectedValue,
    onValueChange,
    items,
    placeholder = "Selecione uma opção",
    style
}) => {
    // Filtrar o placeholder dos items para evitar duplicação
    const validItems = items.filter(item => item.value !== "");

    return (
        <View style={[styles.container, style]}>
            <Picker
                selectedValue={selectedValue}
                onValueChange={onValueChange}
                style={styles.picker}
                itemStyle={styles.pickerItem}
                mode="dropdown"
            >
                <Picker.Item
                    label={placeholder}
                    value=""
                    style={styles.pickerItem}
                    color="#333"
                />
                {validItems.map((item, index) => (
                    <Picker.Item
                        key={index}
                        label={item.label}
                        value={item.value}
                        style={styles.pickerItem}
                        color="#000"
                    />
                ))}
            </Picker>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        backgroundColor: '#fff',
        color: '#000',
        fontSize: 14,
    },
    pickerItem: {
        backgroundColor: '#fff',
        color: '#000',
        fontSize: 14,
    },
});

export default CustomPicker; 