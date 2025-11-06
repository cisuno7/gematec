import React from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
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
    
    // Calcular valores responsivos baseados no tamanho da tela (dinâmico)
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const isTablet = SCREEN_WIDTH >= 768; // Considera tablet a partir de 768px
    const isLargeScreen = SCREEN_WIDTH >= 1024; // Telas grandes (tablets grandes)
    
    // Padding direito adaptativo: maior em tablets, adequado em celulares
    const pickerPaddingRight = Platform.OS === 'android' 
        ? (isLargeScreen ? 60 : isTablet ? 50 : 45)
        : (isLargeScreen ? 50 : isTablet ? 40 : 35);
    
    // Padding dos itens no dropdown (Android)
    const itemPaddingRight = isLargeScreen ? 60 : isTablet ? 55 : 50;

    // Criar estilos dinâmicos com valores responsivos
    const dynamicPickerStyle = {
        ...styles.picker,
        paddingRight: pickerPaddingRight
    };
    
    const dynamicAndroidItemStyle = {
        ...styles.pickerItemAndroid,
        paddingRight: itemPaddingRight
    };
    
    const dynamicPlaceholderAndroidStyle = {
        ...styles.placeholderItemAndroid,
        paddingRight: itemPaddingRight
    };

    return (
        <View style={[styles.container, style]}>
            <Picker
                selectedValue={selectedValue || ""}
                onValueChange={onValueChange}
                style={dynamicPickerStyle}
                itemStyle={Platform.OS === 'ios' ? styles.pickerItemIOS : undefined}
                mode="dialog"
                dropdownIconColor="#000"
                dropdownIconRippleColor="#f0f0f0"
            >
                <Picker.Item
                    label={placeholder}
                    value=""
                    style={Platform.OS === 'ios' ? styles.placeholderItemIOS : dynamicPlaceholderAndroidStyle}
                    color="#666"
                    fontFamily={Platform.OS === 'android' ? 'Roboto' : 'System'}
                />
                {validItems.map((item, index) => (
                    <Picker.Item
                        key={index}
                        label={item.label}
                        value={item.value}
                        style={Platform.OS === 'ios' ? styles.pickerItemIOS : dynamicAndroidItemStyle}
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
        // paddingRight será aplicado dinamicamente com base no tamanho da tela
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
        // paddingRight será aplicado dinamicamente com base no tamanho da tela
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
        // paddingRight será aplicado dinamicamente com base no tamanho da tela
        paddingTop: 15,
        paddingBottom: 15,
        borderRadius: 0,
        marginVertical: 0,
    },
});

export default CustomPicker; 