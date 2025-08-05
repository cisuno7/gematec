import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { ActivityDynamicField } from '../Models/ActivityDynamicField';
import { UploadFile } from '../Models/UploadFile';
import CustomPicker from './CustomPicker';
import { useLanguage } from '../Context/LanguageContext';

interface DynamicActivityQuestionnaireProps {
  fields: ActivityDynamicField[];
  onChange: (answers: { [key: string]: any }) => void;
  initialValues?: { [key: string]: any };
}

const DynamicActivityQuestionnaire: React.FC<DynamicActivityQuestionnaireProps> = ({
  fields,
  onChange,
  initialValues = {},
}) => {
  const { t } = useLanguage();
  const [answers, setAnswers] = useState<{ [key: string]: any }>(initialValues);
  const [uploads, setUploads] = useState<{ [key: string]: UploadFile[] }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    onChange({ ...answers, uploads });
  }, [answers, uploads]);

  // Validação de campo
  const validateField = (field: ActivityDynamicField, value: any, justification?: string, uploadList?: UploadFile[]) => {
    const { rules, type, justification_target, has_upload } = field;
    let error = '';
    if (rules?.required && (value === undefined || value === '' || value === null)) {
      error = t('validation.required');
    }
    if (type === 'text' && value) {
      if (rules?.min_length && value.length < rules.min_length) error = t('validation.minLength').replace('{min}', rules.min_length.toString());
      if (rules?.max_length && value.length > rules.max_length) error = t('validation.maxLength').replace('{max}', rules.max_length.toString());
    }
    if (type === 'measure' && value) {
      if (rules?.min_value && Number(value) < rules.min_value) error = t('validation.minValue').replace('{min}', rules.min_value.toString());
      if (rules?.max_value && Number(value) > rules.max_value) error = t('validation.maxValue').replace('{max}', rules.max_value.toString());
    }
    if (type === 'radio_with_justification' && value === justification_target) {
      if (!justification || justification === '') error = t('validation.requiredJustification');
      if (rules?.min_length && justification && justification.length < rules.min_length) error = `Justificativa: ${t('validation.minLength').replace('{min}', rules.min_length.toString())}`;
      if (rules?.max_length && justification && justification.length > rules.max_length) error = `Justificativa: ${t('validation.maxLength').replace('{max}', rules.max_length.toString())}`;
    }
    if (has_upload && (!uploadList || uploadList.length === 0)) {
      error = t('validation.requiredUpload');
    }
    return error;
  };

  // Handler para upload de imagem
  const handlePickImage = async (fieldKey: string) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const files: UploadFile[] = (result.assets || []).map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `upload_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
        size: asset.fileSize,
      }));
      setUploads((prev) => ({ ...prev, [fieldKey]: files }));
    }
  };

  // Renderização de cada campo
  const renderField = (field: ActivityDynamicField) => {
    const value = answers[field.key] || '';
    const fieldUploads = uploads[field.key] || [];
    const justification = answers[`${field.key}_justification`] || '';
    const error = errors[field.key];

    return (
      <View key={field.key} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          {field.label}
          {field.rules?.required && <Text style={styles.required}> *</Text>}
        </Text>
        {field.help_text && <Text style={styles.helpText}>{field.help_text}</Text>}
        {/* Campo principal */}
        {(() => {
          switch (field.type) {
            case 'text':
              return (
                <TextInput
                  style={[styles.input, error && styles.inputError]}
                  placeholder={field.label}
                  value={value}
                  onChangeText={(text) => {
                    setAnswers((prev) => ({ ...prev, [field.key]: text }));
                    setErrors((prev) => ({ ...prev, [field.key]: validateField(field, text) }));
                  }}
                />
              );
            case 'measure':
              return (
                <TextInput
                  style={[styles.input, error && styles.inputError]}
                  placeholder={field.label}
                  value={value.toString()}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    setAnswers((prev) => ({ ...prev, [field.key]: text }));
                    setErrors((prev) => ({ ...prev, [field.key]: validateField(field, text) }));
                  }}
                />
              );
            case 'select':
              return (
                <CustomPicker
                  selectedValue={value}
                  onValueChange={(itemValue) => {
                    setAnswers((prev) => ({ ...prev, [field.key]: itemValue }));
                    setErrors((prev) => ({ ...prev, [field.key]: validateField(field, itemValue) }));
                  }}
                  items={field.options?.map((option) => ({ label: option, value: option })) || []}
                  placeholder={`Selecione ${field.label}`}
                />
              );
            case 'radio':
              return (
                <View style={styles.radioGroup}>
                  {field.options?.map((option, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.radioOption, value === option && styles.radioOptionSelected]}
                      onPress={() => {
                        setAnswers((prev) => ({ ...prev, [field.key]: option }));
                        setErrors((prev) => ({ ...prev, [field.key]: validateField(field, option) }));
                      }}
                    >
                      <Text style={value === option ? styles.radioTextSelected : styles.radioText}>{option}</Text>
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
                        onPress={() => {
                          setAnswers((prev) => ({ ...prev, [field.key]: option }));
                          setErrors((prev) => ({ ...prev, [field.key]: validateField(field, option, justification) }));
                        }}
                      >
                        <Text style={value === option ? styles.radioTextSelected : styles.radioText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* Justificativa condicional */}
                  {value === field.justification_target && (
                    <TextInput
                      style={[styles.input, error && styles.inputError]}
                      placeholder="Justificativa"
                      value={justification}
                      onChangeText={(text) => {
                        setAnswers((prev) => ({ ...prev, [`${field.key}_justification`]: text }));
                        setErrors((prev) => ({ ...prev, [field.key]: validateField(field, value, text) }));
                      }}
                    />
                  )}
                </View>
              );
            default:
              return null;
          }
        })()}
        {/* Upload de arquivos */}
        {field.has_upload && (
          <View style={styles.uploadContainer}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handlePickImage(field.key)}
            >
              <Text style={styles.uploadButtonText}>Selecionar Foto(s)</Text>
            </TouchableOpacity>
            <View style={styles.uploadPreviewContainer}>
              {fieldUploads.map((file, idx) => (
                <Image
                  key={idx}
                  source={{ uri: file.uri }}
                  style={styles.uploadPreview}
                />
              ))}
            </View>
          </View>
        )}
        {/* Mensagem de erro */}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {fields.map(renderField)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  required: {
    color: '#dc3545',
  },
  helpText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  picker: {
    color: '#333',
    backgroundColor: '#fff',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  radioOption: {
    borderWidth: 1,
    borderColor: '#007BFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  radioOptionSelected: {
    backgroundColor: '#007BFF',
  },
  radioText: {
    color: '#007BFF',
  },
  radioTextSelected: {
    color: '#fff',
  },
  uploadContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  uploadButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  uploadPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  uploadPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 13,
    marginTop: 2,
  },
});

export default DynamicActivityQuestionnaire;