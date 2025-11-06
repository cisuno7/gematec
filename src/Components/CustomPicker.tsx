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
    const validItems = items.filter(item => item.value !== "");

    const { width: SCREEN_WIDTH, fontScale } = useWindowDimensions();
    const isTablet = SCREEN_WIDTH >= 768;
    const isLargeScreen = SCREEN_WIDTH >= 1024;

    // Limitar escala
    const maxFontScale = 1.3;
    const effectiveFontScale = Math.min(fontScale, maxFontScale);

    const baseFontSize = 14;
    const scaledFontSize = baseFontSize * effectiveFontScale;

    // CHAVE: Altura precisa ser MAIOR para acomodar line-height
    const baseHeight = 50;
    // Multiplicar por 3.5 ao invés de 3 para dar mais espaço vertical
    const minHeight = Math.max(baseHeight, Math.ceil(scaledFontSize * 3.5));

    const pickerPaddingRight = Platform.OS === 'android'
        ? (isLargeScreen ? 70 : isTablet ? 60 : 50)
        : (isLargeScreen ? 60 : isTablet ? 50 : 40);

    const pickerPaddingLeft = 16;

    const itemPaddingRight = isLargeScreen ? 70 : isTablet ? 65 : 60;

    const truncateLabel = (label: string, maxLength: number = 50): string => {
        if (label.length <= maxLength) return label;
        return label.substring(0, maxLength - 3) + '...';
    };

    // IMPORTANTE: line-height precisa ser proporcional ao fontSize
    const lineHeight = Math.ceil(scaledFontSize * 1.5); // 1.5x o tamanho da fonte

    const dynamicPickerStyle = {
        ...styles.picker,
        height: minHeight,
        paddingRight: pickerPaddingRight,
        paddingLeft: pickerPaddingLeft,
        paddingVertical: Math.max(8, Math.ceil(scaledFontSize * 0.5)), // Padding vertical proporcional
        fontSize: scaledFontSize,
        lineHeight: lineHeight, // CRÍTICO para não cortar letras
    };

    const itemFontSize = Math.min(16 * effectiveFontScale, 20);
    const itemLineHeight = Math.ceil(itemFontSize * 1.5);

    const dynamicAndroidItemStyle = {
        ...styles.pickerItemAndroid,
        paddingRight: itemPaddingRight,
        fontSize: itemFontSize,
        lineHeight: itemLineHeight,
        // Padding vertical proporcional
        paddingTop: Math.max(12, Math.ceil(itemFontSize * 0.75)),
        paddingBottom: Math.max(12, Math.ceil(itemFontSize * 0.75)),
        minHeight: Math.ceil(itemFontSize * 3), // Altura mínima proporcional
    };

    const dynamicPlaceholderAndroidStyle = {
        ...styles.placeholderItemAndroid,
        paddingRight: itemPaddingRight,
        fontSize: itemFontSize,
        lineHeight: itemLineHeight,
        paddingTop: Math.max(12, Math.ceil(itemFontSize * 0.75)),
        paddingBottom: Math.max(12, Math.ceil(itemFontSize * 0.75)),
        minHeight: Math.ceil(itemFontSize * 3),
    };

    const dynamicIOSItemStyle = {
        ...styles.pickerItemIOS,
        fontSize: itemFontSize,
        lineHeight: itemLineHeight,
        height: Math.max(44, Math.ceil(itemFontSize * 3)),
    };

    const dynamicIOSPlaceholderStyle = {
        ...styles.placeholderItemIOS,
        fontSize: itemFontSize,
        lineHeight: itemLineHeight,
        height: Math.max(44, Math.ceil(itemFontSize * 3)),
    };

    return (
        <View style={[styles.container, style, { minHeight }]}>
            <Picker
                selectedValue={selectedValue || ""}
                onValueChange={onValueChange}
                style={dynamicPickerStyle}
                itemStyle={Platform.OS === 'ios' ? dynamicIOSItemStyle : undefined}
                mode="dialog"
                dropdownIconColor="#000"
                dropdownIconRippleColor="#f0f0f0"
            >
                <Picker.Item
                    label={placeholder}
                    value=""
                    style={Platform.OS === 'ios' ? dynamicIOSPlaceholderStyle : dynamicPlaceholderAndroidStyle}
                    color="#666"
                    fontFamily={Platform.OS === 'android' ? 'Roboto' : 'System'}
                />
                {validItems.map((item, index) => (
                    <Picker.Item
                        key={index}
                        label={truncateLabel(item.label)}
                        value={item.value}
                        style={Platform.OS === 'ios' ? dynamicIOSItemStyle : dynamicAndroidItemStyle}
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
        minHeight: 50,
        justifyContent: 'center', // IMPORTANTE: centraliza verticalmente
    },
    picker: {
        backgroundColor: '#fff',
        color: '#000',
        // Não definir lineHeight fixo aqui, será dinâmico
    },
    pickerItemIOS: {
        backgroundColor: '#fff',
        color: '#000',
        textAlign: 'center',
        fontWeight: '400',
        // height será dinâmica
    },
    placeholderItemIOS: {
        backgroundColor: '#fff',
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    pickerItemAndroid: {
        backgroundColor: '#fff',
        color: '#000',
        textAlign: 'left',
        fontWeight: '400',
        paddingLeft: 20,
        // paddingTop e paddingBottom serão dinâmicos
        borderRadius: 0,
        marginVertical: 0,
        // minHeight será dinâmica
    },
    placeholderItemAndroid: {
        backgroundColor: '#fff',
        color: '#666',
        textAlign: 'left',
        fontStyle: 'italic',
        paddingLeft: 20,
        borderRadius: 0,
        marginVertical: 0,
    },
});

export default CustomPicker;
