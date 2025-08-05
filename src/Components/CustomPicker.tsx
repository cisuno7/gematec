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
    return (
        <View style={[styles.container, style]}>
            <Picker
                selectedValue={selectedValue}
                onValueChange={onValueChange}
                style={styles.picker}
                itemStyle={styles.pickerItem}
            >
                <Picker.Item
                    label={placeholder}
                    value=""
                    style={styles.pickerItem}
                    color="#666"
                />
                {items.map((item, index) => (
                    <Picker.Item
                        key={index}
                        label={item.label}
                        value={item.value}
                        style={styles.pickerItem}
                        color="#333"
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
        color: '#333',
    },
    pickerItem: {
        backgroundColor: '#fff',
        color: '#333',
        fontSize: 16,
    },
});

export default CustomPicker; 