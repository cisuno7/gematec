import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
} from 'react-native';
import EquipmentTemplateModel, { DynamicField } from '../Models/EquipmentTemplate';
import EquipmentService from '../Services/EquipamentService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomPicker from './CustomPicker';
import DatePickerInput from './DatePickerInput';

interface DynamicEquipmentFieldsProps {
    onFieldsChange: (fields: { [key: string]: any }) => void;
    initialValues?: { [key: string]: any };
    equipmentTypeId?: number | string; // opcional: quando fornecido, carrega template por tipo
}

// Constante para evitar criar novo objeto em cada render
const DEFAULT_INITIAL_VALUES = {};

const DynamicEquipmentFields: React.FC<DynamicEquipmentFieldsProps> = React.memo(({
    onFieldsChange,
    initialValues = DEFAULT_INITIAL_VALUES,
    equipmentTypeId,
}) => {
    const [template, setTemplate] = useState<EquipmentTemplateModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [fieldValues, setFieldValues] = useState<{ [key: string]: any }>(() => initialValues || DEFAULT_INITIAL_VALUES);

    useEffect(() => {
        const fetchTemplateByType = async (equipmentTypeId: number | string) => {
            try {
                setLoading(true);
                const token = await AsyncStorage.getItem('access_token');
                if (!token) throw new Error('Token de acesso não encontrado.');

                const typeId = Number(equipmentTypeId);
                if (!Number.isFinite(typeId)) {
                    setTemplate(null);
                    return;
                }

                const templateData = await EquipmentService.getEquipmentTemplateByEquipmentType(typeId, token);
                setTemplate(templateData);
            } catch (error: any) {
                console.error('[DynamicEquipmentFields] Erro ao buscar template por tipo:', error);
                Alert.alert('Erro', 'Não foi possível carregar o template para o tipo selecionado.');
                setTemplate(null);
            } finally {
                setLoading(false);
            }
        };

        // Não buscar template ao abrir sem tipo selecionado (tarefas.md)
        if (equipmentTypeId) {
            fetchTemplateByType(equipmentTypeId);
        } else {
            setTemplate(null);
            setLoading(false);
        }
    }, [equipmentTypeId]);

    useEffect(() => {
        onFieldsChange(fieldValues);
    }, [fieldValues, onFieldsChange]);

    // Sincronizar fieldValues quando initialValues mudar (usando ref para evitar loop)
    const prevInitialValuesRef = useRef(initialValues);
    useEffect(() => {
        if (initialValues && initialValues !== DEFAULT_INITIAL_VALUES && initialValues !== prevInitialValuesRef.current) {
            setFieldValues(initialValues);
            prevInitialValuesRef.current = initialValues;
        }
    }, [initialValues]);

    const handleFieldChange = (fieldName: string, value: any) => {
        setFieldValues(prev => ({
            ...prev,
            [fieldName]: value,
        }));
    };

    const renderField = (field: DynamicField) => {
        const fieldKey = field.key || field.name || '';
        const fieldLabel = field.label || field.name || fieldKey;
        const value = fieldValues[fieldKey] || field.default_value || '';
        const justification = fieldValues[`${fieldKey}_justification`] || '';

        switch (field.type) {
            case 'text':
                return (
                    <TextInput
                        style={[styles.input, field.required && styles.requiredInput]}
                        placeholder={fieldLabel}
                        placeholderTextColor="#999"
                        value={value}
                        onChangeText={(text) => handleFieldChange(fieldKey, text)}
                    />
                );

            case 'number':
                return (
                    <TextInput
                        style={[styles.input, field.required && styles.requiredInput]}
                        placeholder={fieldLabel}
                        placeholderTextColor="#999"
                        value={value.toString()}
                        onChangeText={(text) => handleFieldChange(fieldKey, parseFloat(text) || 0)}
                        keyboardType="numeric"
                    />
                );

            case 'measure':
                return (
                    <View style={styles.measureContainer}>
                        <TextInput
                            style={[styles.measureInput, field.required && styles.requiredInput]}
                            placeholder={fieldLabel}
                            placeholderTextColor="#999"
                            value={value.toString()}
                            onChangeText={(text) => handleFieldChange(fieldKey, text)}
                            keyboardType="numeric"
                        />
                        {field.unit && (
                            <Text style={styles.measureUnit}>{field.unit}</Text>
                        )}
                    </View>
                );

            case 'select':
                return (
                    <CustomPicker
                        selectedValue={value}
                        onValueChange={(itemValue) => handleFieldChange(fieldKey, itemValue)}
                        items={field.options?.map((option) => ({ label: option, value: option })) || []}
                        placeholder={`Selecione ${fieldLabel}`}
                        style={[styles.picker, field.required && styles.requiredInput]}
                    />
                );

            case 'radio':
                return (
                    <View style={styles.radioGroup}>
                        {field.options?.map((option, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.radioOption, value === option && styles.radioOptionSelected]}
                                onPress={() => handleFieldChange(fieldKey, option)}
                            >
                                <Text style={value === option ? styles.radioTextSelected : styles.radioText}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );

            case 'radio_with_justification':
                return (
                    <View>
                        <View style={styles.radioGroup}>
                            {field.options?.map((option, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.radioOption, value === option && styles.radioOptionSelected]}
                                    onPress={() => handleFieldChange(fieldKey, option)}
                                >
                                    <Text style={value === option ? styles.radioTextSelected : styles.radioText}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {/* Justificativa condicional */}
                        {value === field.justification_target && (
                            <TextInput
                                style={[styles.input, styles.justificationInput]}
                                placeholder="Justificativa"
                                value={justification}
                                onChangeText={(text) => handleFieldChange(`${fieldKey}_justification`, text)}
                            />
                        )}
                    </View>
                );

            case 'date':
                return (
                    <DatePickerInput
                        value={value}
                        onChangeText={(text) => handleFieldChange(fieldKey, text)}
                        placeholder={`Selecione ${fieldLabel}`}
                        style={[styles.input, field.required && styles.requiredInput]}
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
                            onPress={() => handleFieldChange(fieldKey, true)}
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
                            onPress={() => handleFieldChange(fieldKey, false)}
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
                        placeholder={fieldLabel}
                        placeholderTextColor="#999"
                        value={value}
                        onChangeText={(text) => handleFieldChange(fieldKey, text)}
                    />
                );
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Carregando campos adicionais...</Text>
            </View>
        );
    }

    if (!equipmentTypeId) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Selecione um tipo de equipamento para carregar os campos.</Text>
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
        <ScrollView
            style={styles.container}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
        >
            <Text style={styles.sectionTitle}>Campos Adicionais</Text>
            {template.getOrderedFields().map((field: DynamicField, index: number) => (
                <View key={`${field.id ?? field.key ?? field.name ?? index}`} style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>
                        {String(field.label || field.name || field.key).replace(/_/g, ' ')}
                        {field.required && <Text style={styles.required}> *</Text>}
                    </Text>
                    {renderField(field)}
                </View>
            ))}
        </ScrollView>
    );
}, (prevProps, nextProps) => {
    // Comparação customizada para evitar re-renders desnecessários
    return (
        prevProps.equipmentTypeId === nextProps.equipmentTypeId &&
        prevProps.initialValues === nextProps.initialValues &&
        prevProps.onFieldsChange === nextProps.onFieldsChange
    );
});

DynamicEquipmentFields.displayName = 'DynamicEquipmentFields';

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
    measureContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    measureInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#333',
    },
    measureUnit: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
        minWidth: 40,
    },
    radioGroup: {
        gap: 8,
    },
    radioOption: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
    },
    radioOptionSelected: {
        backgroundColor: '#007BFF',
        borderColor: '#007BFF',
    },
    radioText: {
        fontSize: 16,
        color: '#333',
    },
    radioTextSelected: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    justificationInput: {
        marginTop: 8,
        borderColor: '#007BFF',
    },
    picker: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
        height: 50,
    },
});

export default DynamicEquipmentFields; 