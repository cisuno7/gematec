import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { DynamicField, EquipmentTemplate } from '../Models/EquipmentTemplate';
import EquipmentService from '../Services/EquipamentService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomPicker from './CustomPicker';

interface DynamicEquipmentFieldsProps {
    onFieldsChange: (fields: { [key: string]: any }) => void;
    initialValues?: { [key: string]: any };
}

const DynamicEquipmentFields: React.FC<DynamicEquipmentFieldsProps> = ({
    onFieldsChange,
    initialValues = {},
}) => {
    const [template, setTemplate] = useState<EquipmentTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [fieldValues, setFieldValues] = useState<{ [key: string]: any }>(initialValues);

    useEffect(() => {
        fetchTemplate();
    }, []);

    useEffect(() => {
        onFieldsChange(fieldValues);
    }, [fieldValues]);

    const fetchTemplate = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            if (!token) throw new Error('Token de acesso não encontrado.');

            const templateData = await EquipmentService.getEquipmentTemplate(token);
            setTemplate(templateData);
        } catch (error: any) {
            console.error('[DynamicEquipmentFields] Erro ao buscar template:', error);
            Alert.alert('Erro', 'Não foi possível carregar o template de equipamentos.');
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (fieldName: string, value: any) => {
        setFieldValues(prev => ({
            ...prev,
            [fieldName]: value,
        }));
    };

    const renderField = (field: DynamicField) => {
        const value = fieldValues[field.name] || field.default_value || '';

        switch (field.type) {
            case 'text':
                return (
                    <TextInput
                        style={[styles.input, field.required && styles.requiredInput]}
                        placeholder={field.name}
                        value={value}
                        onChangeText={(text) => handleFieldChange(field.name, text)}
                    />
                );

            case 'number':
                return (
                    <TextInput
                        style={[styles.input, field.required && styles.requiredInput]}
                        placeholder={field.name}
                        value={value.toString()}
                        onChangeText={(text) => handleFieldChange(field.name, parseFloat(text) || 0)}
                        keyboardType="numeric"
                    />
                );

            case 'select':
                return (
                    <CustomPicker
                        selectedValue={value}
                        onValueChange={(itemValue) => handleFieldChange(field.name, itemValue)}
                        items={field.options?.map((option) => ({ label: option, value: option })) || []}
                        placeholder={`Selecione ${field.name}`}
                        style={field.required && styles.requiredInput}
                    />
                );

            case 'date':
                return (
                    <TextInput
                        style={[styles.input, field.required && styles.requiredInput]}
                        placeholder={`${field.name} (DD/MM/AAAA)`}
                        value={value}
                        onChangeText={(text) => handleFieldChange(field.name, text)}
                    />
                );

            case 'boolean':
                return (
                    <View style={styles.booleanContainer}>
                        <TouchableOpacity
                            style={[
                                styles.booleanButton,
                                value === true && styles.booleanButtonActive,
                                field.required && styles.requiredInput,
                            ]}
                            onPress={() => handleFieldChange(field.name, true)}
                        >
                            <Text style={[styles.booleanButtonText, value === true && styles.booleanButtonTextActive]}>
                                Sim
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.booleanButton,
                                value === false && styles.booleanButtonActive,
                                field.required && styles.requiredInput,
                            ]}
                            onPress={() => handleFieldChange(field.name, false)}
                        >
                            <Text style={[styles.booleanButtonText, value === false && styles.booleanButtonTextActive]}>
                                Não
                            </Text>
                        </TouchableOpacity>
                    </View>
                );

            default:
                return (
                    <TextInput
                        style={[styles.input, field.required && styles.requiredInput]}
                        placeholder={field.name}
                        value={value}
                        onChangeText={(text) => handleFieldChange(field.name, text)}
                    />
                );
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Carregando campos dinâmicos...</Text>
            </View>
        );
    }

    if (!template) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Template de equipamentos não encontrado.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.sectionTitle}>Campos Dinâmicos</Text>
            {template.getOrderedFields().map((field) => (
                <View key={field.id} style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>
                        {field.name}
                        {field.required && <Text style={styles.required}> *</Text>}
                    </Text>
                    {renderField(field)}
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    fieldContainer: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#555',
    },
    required: {
        color: '#dc3545',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#333',
    },
    requiredInput: {
        borderColor: '#dc3545',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    picker: {
        height: 50,
        color: '#333',
        backgroundColor: '#fff',
    },
    booleanContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    booleanButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    booleanButtonActive: {
        backgroundColor: '#007BFF',
        borderColor: '#007BFF',
    },
    booleanButtonText: {
        fontSize: 16,
        color: '#333',
    },
    booleanButtonTextActive: {
        color: '#fff',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginVertical: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#dc3545',
        textAlign: 'center',
        marginVertical: 20,
    },
});

export default DynamicEquipmentFields; 