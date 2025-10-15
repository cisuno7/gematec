import React, { useState, useEffect, useRef } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setDynamicApiUrl } from '../config/apiConfig';
import { ActivityDynamicField } from '../Models/ActivityDynamicField';
import { UploadFile } from '../Models/UploadFile';
import CustomPicker from './CustomPicker';
import { useLanguage } from '../Context/LanguageContext';

interface DynamicActivityQuestionnaireProps {
  fields: ActivityDynamicField[];
  onChange: (answers: { [key: string]: any }) => void;
  onSaveAnswer?: (questionId: string, answer: any) => void;
  savedAnswers?: { [key: string]: boolean };
  initialValues?: { [key: string]: any };
  initialUploads?: { [key: string]: UploadFile[] };
  questionIdField?: string;
  activityId?: number;
  activityEquipmentId?: number;
  readOnly?: boolean;
}

const DynamicActivityQuestionnaire: React.FC<DynamicActivityQuestionnaireProps> = ({
  fields,
  onChange,
  onSaveAnswer,
  savedAnswers = {},
  initialValues = {},
  initialUploads = {},
  questionIdField = 'key',
  activityId,
  activityEquipmentId,
  readOnly = false,
}) => {
  const { t } = useLanguage();
  const [answers, setAnswers] = useState<{ [key: string]: any }>(initialValues);
  const [uploads, setUploads] = useState<{ [key: string]: UploadFile[] }>(initialUploads || {});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [savingStatus, setSavingStatus] = useState<{ [key: string]: 'saving' | 'saved' | 'error' | undefined }>({});
  const saveTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const [imageHeaders, setImageHeaders] = useState<any | undefined>(undefined);
  const [baseUrl, setBaseUrl] = useState<string | undefined>(undefined);

  // Carregar token para exibir imagens protegidas com Authorization
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        const account = await AsyncStorage.getItem('account') || undefined;
        const apiBase = await setDynamicApiUrl(account as any);
        if (token) setImageHeaders({ Authorization: `Bearer ${token}` });
        setBaseUrl(apiBase);
      } catch { }
    })();
  }, []);

  const resolveUri = (uri?: string): string | undefined => {
    if (!uri) return undefined;
    if (/^https?:\/\//i.test(uri) || uri.startsWith('file://') || uri.startsWith('data:')) return uri;
    if (uri.startsWith('/') && baseUrl) {
      // garantir que não tenha dupla barra
      return `${baseUrl}${uri}`.replace(/([^:]\/)\/+/, '$1/');
    }
    return uri;
  };

  // Log para debug de uploads
  useEffect(() => {
    console.log('[DynamicActivityQuestionnaire] initialUploads recebidos:', initialUploads);
    console.log('[DynamicActivityQuestionnaire] readOnly:', readOnly);
    if (initialUploads) {
      Object.keys(initialUploads).forEach(key => {
        console.log(`[DynamicActivityQuestionnaire] Uploads para campo ${key}:`, initialUploads[key]);
      });
    }
  }, [initialUploads, readOnly]);

  // Chave para persistência local
  const getStorageKey = (questionId: string) => {
    if (activityId && activityEquipmentId) {
      return `activity_questionnaire_${activityId}_${activityEquipmentId}_${questionId}`;
    }
    return `questionnaire_${questionId}`;
  };

  // Carregar dados salvos localmente
  const loadSavedData = async () => {
    try {
      console.log('[DynamicActivityQuestionnaire] Carregando dados salvos localmente...');
      const loadedAnswers: { [key: string]: any } = {};
      const loadedUploads: { [key: string]: UploadFile[] } = {};

      for (const field of fields) {
        const storageKey = getStorageKey(field.key);
        const savedData = await AsyncStorage.getItem(storageKey);

        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (parsedData.value !== undefined) {
            loadedAnswers[field.key] = parsedData.value;
          }
          if (parsedData.justification !== undefined) {
            loadedAnswers[`${field.key}_justification`] = parsedData.justification;
          }
          if (parsedData.uploads) {
            loadedUploads[field.key] = parsedData.uploads;
          }
          console.log(`[DynamicActivityQuestionnaire] Dados carregados para ${field.key}:`, parsedData);
        }
      }

      setAnswers(prev => ({ ...prev, ...loadedAnswers }));
      setUploads(prev => ({ ...prev, ...loadedUploads }));
      console.log('[DynamicActivityQuestionnaire] Dados carregados com sucesso');
    } catch (error) {
      console.error('[DynamicActivityQuestionnaire] Erro ao carregar dados salvos:', error);
    }
  };

  // Salvar dados localmente
  const saveDataLocally = async (questionId: string, value: any, justification?: string, uploadList?: UploadFile[]) => {
    try {
      const storageKey = getStorageKey(questionId);
      const dataToSave = {
        value,
        justification,
        uploads: uploadList || [],
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(storageKey, JSON.stringify(dataToSave));
      console.log(`[DynamicActivityQuestionnaire] Dados salvos localmente para ${questionId}:`, dataToSave);
    } catch (error) {
      console.error(`[DynamicActivityQuestionnaire] Erro ao salvar dados localmente para ${questionId}:`, error);
    }
  };

  // Função de salvamento automático com debounce
  const scheduleAutoSave = (questionId: string, value: any, justification?: string, uploadList?: UploadFile[]) => {
    console.log(`[DynamicActivityQuestionnaire] 🕐 Agendando auto-save para ${questionId}...`);

    // Cancelar timeout anterior se existir
    if (saveTimeouts.current[questionId]) {
      console.log(`[DynamicActivityQuestionnaire] ⏹️ Cancelando timeout anterior para ${questionId}`);
      clearTimeout(saveTimeouts.current[questionId]);
    }

    // Marcar como salvando
    setSavingStatus(prev => ({ ...prev, [questionId]: 'saving' }));
    console.log(`[DynamicActivityQuestionnaire] 💾 Status: SALVANDO para ${questionId}`);

    // Agendar novo salvamento
    saveTimeouts.current[questionId] = setTimeout(async () => {
      try {
        console.log(`[DynamicActivityQuestionnaire] ⏰ Timeout atingido - iniciando salvamento de ${questionId}`);
        console.log(`[DynamicActivityQuestionnaire] 📦 Dados a salvar:`, {
          questionId,
          hasValue: value !== undefined && value !== null,
          valueType: typeof value,
          hasJustification: !!justification,
          uploadsCount: uploadList?.length || 0
        });

        // Salvar localmente primeiro
        console.log(`[DynamicActivityQuestionnaire] 💾 Salvando localmente primeiro...`);
        await saveDataLocally(questionId, value, justification, uploadList);
        console.log(`[DynamicActivityQuestionnaire] ✅ Salvo localmente com sucesso`);

        // Salvar no servidor se a função estiver disponível
        if (onSaveAnswer) {
          console.log(`[DynamicActivityQuestionnaire] 🌐 onSaveAnswer callback disponível - preparando envio ao servidor`);

          const targetField = fields.find(f => f.key === questionId);
          const fieldIndex = fields.findIndex(f => f.key === questionId);
          const questionIdNumber = (targetField && typeof targetField.id === 'number') ? (targetField.id as number) : (fieldIndex + 1);

          console.log(`[DynamicActivityQuestionnaire] 🔢 Question ID numérico calculado:`, {
            questionIdNumber,
            fromFieldId: targetField?.id,
            fromIndex: fieldIndex,
            fieldKey: targetField?.key
          });

          const answer = {
            question_id: questionIdNumber,
            value: value,
            justification: justification,
            uploads: uploadList || []
          };

          console.log(`[DynamicActivityQuestionnaire] 🚀 Chamando onSaveAnswer para enviar ao servidor...`);
          await onSaveAnswer(questionId, answer);
          console.log(`[DynamicActivityQuestionnaire] ✅ onSaveAnswer executado com sucesso`);
        } else {
          console.warn(`[DynamicActivityQuestionnaire] ⚠️ onSaveAnswer callback NÃO disponível - dados salvos apenas localmente`);
        }

        // Marcar como salvo
        setSavingStatus(prev => ({ ...prev, [questionId]: 'saved' }));
        console.log(`[DynamicActivityQuestionnaire] ✅ ${questionId} salvo com sucesso - status: SAVED`);

        // Limpar status de salvo após 3 segundos
        setTimeout(() => {
          setSavingStatus(prev => ({ ...prev, [questionId]: undefined }));
          console.log(`[DynamicActivityQuestionnaire] 🧹 Status de salvamento limpo para ${questionId}`);
        }, 3000);

      } catch (error: any) {
        console.error(`[DynamicActivityQuestionnaire] ❌❌❌ ERRO ao salvar ${questionId} ❌❌❌`);
        console.error(`[DynamicActivityQuestionnaire] 🔴 Tipo do erro:`, error?.constructor?.name || typeof error);
        console.error(`[DynamicActivityQuestionnaire] 🔴 Mensagem:`, error?.message);
        console.error(`[DynamicActivityQuestionnaire] 🔴 Stack:`, error?.stack);
        console.error(`[DynamicActivityQuestionnaire] 🔴 Erro completo:`, error);

        setSavingStatus(prev => ({ ...prev, [questionId]: 'error' }));
        console.log(`[DynamicActivityQuestionnaire] ⚠️ Status atualizado para ERROR para ${questionId}`);
      }
    }, 1000); // 1 segundo de debounce

    console.log(`[DynamicActivityQuestionnaire] ✅ Timeout agendado para ${questionId} (1 segundo)`);
  };

  // Carregar dados salvos ao montar o componente
  useEffect(() => {
    loadSavedData();
  }, []);

  // Atualizar estados quando valores iniciais mudarem (apenas uma vez)
  const initialValuesRef = useRef(initialValues);
  const initialUploadsRef = useRef(initialUploads);

  useEffect(() => {
    if (JSON.stringify(initialValues) !== JSON.stringify(initialValuesRef.current)) {
      setAnswers(prev => ({ ...prev, ...initialValues }));
      initialValuesRef.current = initialValues;
    }
  }, [initialValues]);

  useEffect(() => {
    if (JSON.stringify(initialUploads) !== JSON.stringify(initialUploadsRef.current)) {
      setUploads(prev => ({ ...prev, ...initialUploads }));
      initialUploadsRef.current = initialUploads;
    }
  }, [initialUploads]);

  // Limpar timeouts ao desmontar
  useEffect(() => {
    return () => {
      Object.values(saveTimeouts.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Notificar mudanças apenas quando houver mudanças reais, não durante a inicialização
  const isInitialized = useRef(false);
  const prevAnswersRef = useRef<{ [key: string]: any }>({});
  const prevUploadsRef = useRef<{ [key: string]: UploadFile[] }>({});

  useEffect(() => {
    // Só notificar após a inicialização estar completa e se houve mudanças reais
    if (isInitialized.current) {
      const answersChanged = JSON.stringify(answers) !== JSON.stringify(prevAnswersRef.current);
      const uploadsChanged = JSON.stringify(uploads) !== JSON.stringify(prevUploadsRef.current);

      if (answersChanged || uploadsChanged) {
        prevAnswersRef.current = { ...answers };
        prevUploadsRef.current = { ...uploads };
        onChange({ ...answers, uploads });
      }
    }
  }, [answers, uploads]);

  // Marcar como inicializado após o primeiro carregamento
  useEffect(() => {
    if (Object.keys(answers).length > 0 || Object.keys(uploads).length > 0) {
      isInitialized.current = true;
      prevAnswersRef.current = { ...answers };
      prevUploadsRef.current = { ...uploads };
    }
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

      console.log('[DynamicActivityQuestionnaire] Fotos selecionadas para', fieldKey, ':', files);

      setUploads((prev) => ({ ...prev, [fieldKey]: files }));

      // Salvar automaticamente após upload
      const currentValue = answers[fieldKey];
      const currentJustification = answers[`${fieldKey}_justification`];

      // Aguardar um pouco para garantir que o estado foi atualizado
      setTimeout(() => {
        scheduleAutoSave(fieldKey, currentValue, currentJustification, files);
      }, 100);
    }
  };

  // Renderização de cada campo
  const renderField = (field: ActivityDynamicField) => {
    const value = answers[field.key] || '';
    const fieldUploads = uploads[field.key] || [];
    const justification = answers[`${field.key}_justification`] || '';
    const error = errors[field.key];
    const currentSavingStatus = savingStatus[field.key];
    const isSaved = savedAnswers[field.key];

    if (readOnly) {
      // Renderização somente leitura
      return (
        <View key={field.key} style={styles.fieldContainer}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
          </View>
          {field.type === 'radio_with_justification' && value === field.justification_target && justification ? (
            <View>
              <Text style={styles.readonlyValue}>{String(value || '')}</Text>
              <Text style={styles.readonlyJustification}>Justificativa: {String(justification || '')}</Text>
            </View>
          ) : field.type === 'measure' ? (
            <Text style={styles.readonlyValue}>
              {value !== undefined && value !== null && value !== '' ? String(value) : '-'}{field.unit ? ` ${field.unit}` : ''}
            </Text>
          ) : (
            <Text style={styles.readonlyValue}>{value !== undefined && value !== null && value !== '' ? String(value) : '-'}</Text>
          )}
          {field.has_upload && (
            <View style={styles.uploadPreviewContainer}>
              {fieldUploads.length > 0 ? (
                fieldUploads.map((file, idx) => {
                  const fullUri = resolveUri(file.uri);
                  return (
                    <TouchableOpacity key={idx} onPress={() => console.log('[DynamicActivityQuestionnaire] Imagem clicada:', fullUri)}>
                      <Image
                        source={{ uri: fullUri as string, headers: imageHeaders }}
                        style={styles.uploadPreview}
                        resizeMode="cover"
                        onError={(e) => console.log('[DynamicActivityQuestionnaire] Erro ao carregar imagem:', e.nativeEvent.error)}
                      />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.uploadErrorText}>Foto obrigatória não adicionada</Text>
              )}
            </View>
          )}
        </View>
      );
    }

    return (
      <View key={field.key} style={styles.fieldContainer}>
        <View style={styles.fieldHeader}>
          <Text style={styles.fieldLabel}>
            {field.label}
            {field.rules?.required && <Text style={styles.required}> *</Text>}
            {field.has_upload && <Text style={styles.required}> 📷</Text>}
          </Text>
          <View style={styles.statusContainer}>
            {currentSavingStatus === 'saving' && (
              <View style={styles.savingIndicator}>
                <Text style={styles.savingText}>💾 Salvando...</Text>
              </View>
            )}
            {currentSavingStatus === 'saved' && (
              <View style={styles.savedIndicator}>
                <Text style={styles.savedText}>✓ Salvo</Text>
              </View>
            )}
            {currentSavingStatus === 'error' && (
              <View style={styles.errorIndicator}>
                <Text style={styles.errorIndicatorText}>❌ Erro</Text>
              </View>
            )}
            {isSaved && !currentSavingStatus && (
              <View style={styles.savedIndicator}>
                <Text style={styles.savedText}>✓ Salvo</Text>
              </View>
            )}
          </View>
        </View>
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
                    scheduleAutoSave(field.key, text, justification, fieldUploads);
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
                    scheduleAutoSave(field.key, text, justification, fieldUploads);
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
                    scheduleAutoSave(field.key, itemValue, justification, fieldUploads);
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
                        scheduleAutoSave(field.key, option, justification, fieldUploads);
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
                          scheduleAutoSave(field.key, option, justification, fieldUploads);
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
                        scheduleAutoSave(field.key, value, text, fieldUploads);
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
              style={[
                styles.uploadButton,
                fieldUploads.length === 0 && styles.uploadButtonRequired,
                fieldUploads.length > 0 && styles.uploadButtonSuccess
              ]}
              onPress={() => handlePickImage(field.key)}
            >
              <Text style={[
                styles.uploadButtonText,
                fieldUploads.length === 0 && styles.uploadButtonTextRequired,
                fieldUploads.length > 0 && styles.uploadButtonTextSuccess
              ]}>
                {fieldUploads.length > 0
                  ? `✓ ${fieldUploads.length} foto${fieldUploads.length > 1 ? 's' : ''} enviada${fieldUploads.length > 1 ? 's' : ''}`
                  : 'Adicionar foto (obrigatório)'
                }
              </Text>
            </TouchableOpacity>
            <View style={styles.uploadPreviewContainer}>
              {fieldUploads.map((file, idx) => {
                const fullUri = resolveUri(file.uri);
                return (
                  <Image
                    key={idx}
                    source={{ uri: fullUri as string, headers: imageHeaders }}
                    style={styles.uploadPreview}
                  />
                );
              })}
            </View>
            {/* Mensagem específica para upload obrigatório */}
            {fieldUploads.length === 0 && (
              <Text style={styles.uploadErrorText}>
                ⚠️ Foto obrigatória não foi adicionada
              </Text>
            )}
            {/* Mensagem de sucesso para upload */}
            {fieldUploads.length > 0 && (
              <Text style={styles.uploadSuccessText}>
                ✅ Fotos enviadas com sucesso
              </Text>
            )}
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
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  required: {
    color: '#dc3545',
    marginLeft: 4,
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
    color: '#333',
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
    color: '#007BFF',
    fontWeight: 'bold',
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
  uploadButtonRequired: {
    backgroundColor: '#dc3545',
  },
  uploadButtonSuccess: {
    backgroundColor: '#28a745',
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  uploadButtonTextRequired: {
    color: '#fff',
    fontWeight: 'bold',
  },
  uploadButtonTextSuccess: {
    color: '#fff',
    fontWeight: 'bold',
  },
  uploadPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  uploadPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 13,
    marginTop: 2,
  },
  uploadErrorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  uploadSuccessText: {
    color: '#28a745',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingIndicator: {
    backgroundColor: '#007BFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    marginLeft: 8,
  },
  savingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  savedIndicator: {
    backgroundColor: '#28a745',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    marginLeft: 8,
  },
  savedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorIndicator: {
    backgroundColor: '#dc3545',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    marginLeft: 8,
  },
  errorIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  readonlyValue: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
  },
  readonlyJustification: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
});

export default DynamicActivityQuestionnaire;