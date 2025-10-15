import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
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
                selectedValue={selectedValue || ""}
                onValueChange={onValueChange}
                style={styles.picker}
                itemStyle={Platform.OS === 'ios' ? styles.pickerItemIOS : styles.pickerItemAndroid}
                mode="dialog"
                dropdownIconColor="#000"
                dropdownIconRippleColor="#f0f0f0"
            >
                <Picker.Item
                    label={placeholder}
                    value=""
                    style={Platform.OS === 'ios' ? styles.placeholderItemIOS : styles.placeholderItemAndroid}
                    color="#666"
                    fontFamily={Platform.OS === 'android' ? 'Roboto' : 'System'}
                />
                {validItems.map((item, index) => (
                    <Picker.Item
                        key={index}
                        label={item.label}
                        value={item.value}
                        style={Platform.OS === 'ios' ? styles.pickerItemIOS : styles.pickerItemAndroid}
                        color="#000"
                        fontFamily={Platform.OS === 'android' ? 'Roboto' : 'System'}
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
    // Estilos específicos iOS
    pickerItemIOS: {
        backgroundColor: '#fff',
        color: '#000',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '400',
    },
    placeholderItemIOS: {
        backgroundColor: '#fff',
        color: '#666',
        fontSize: 16,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    // Estilos específicos Android - força tema claro sempre
    pickerItemAndroid: {
        backgroundColor: '#fff',
        color: '#000',
        fontSize: 16,
        textAlign: 'left',
        fontWeight: '400',
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 15,
        paddingBottom: 15,
        borderRadius: 0,
        marginVertical: 0,
    },
    placeholderItemAndroid: {
        backgroundColor: '#fff',
        color: '#666',
        fontSize: 16,
        textAlign: 'left',
        fontStyle: 'italic',
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 15,
        paddingBottom: 15,
        borderRadius: 0,
        marginVertical: 0,
    },
});

export default CustomPicker; 