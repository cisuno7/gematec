import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  RefreshControl,
} from "react-native";
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PmocService from "../../Services/PmocService";
import { EquipmentDetails, Question } from "../../Models/Pmoc_Model/EquipmentDetails";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { UploadedImage } from "../../Models/ServiceOrder";
import NetInfo from '@react-native-community/netinfo';
import OfflineService from '../../Services/OfflineService';

const { width } = Dimensions.get('window');

interface PmocEquipmentScreenProps {
  route: RouteProp<RootStackParamList, "PmocEquipmentScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "PmocEquipmentScreen">;
}

const PmocEquipmentScreen: React.FC<PmocEquipmentScreenProps> = ({ route, navigation }) => {
  const { pmocId, equipmentId } = route.params;
  const [equipment, setEquipment] = useState<EquipmentDetails | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [uploads, setUploads] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [answers, setAnswers] = useState<{ [key: number]: { value: string; meta?: any } }>({});
  const [savedAnswers, setSavedAnswers] = useState<{ [key: number]: { value: string; meta?: any } }>({});

  const fetchEquipmentDetails = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      const data = await PmocService.fetchEquipmentDetails(token, pmocId, equipmentId);
      const equipmentData = { ...data.equipment, status: data.equipment.status || "pending" };
      setEquipment(equipmentData);
      setQuestions(data.questions || []);
      const uploadedImages = (data.uploads || []).map((item) =>
        typeof item === "string" ? { id: 0, url: item, uploaded_at: "" } : item
      );
      setUploads(uploadedImages);
    } catch (error: any) {
      console.error("[PmocEquipmentScreen] Erro ao buscar detalhes do equipamento:", error.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSavedAnswers = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      const response = await PmocService.fetchSavedAnswers(token, pmocId, equipmentId);
      const answersMap = response.results.reduce((acc, answer) => {
        acc[answer.question_id] = { value: answer.value, meta: answer.meta || {} };
        return acc;
      }, {} as { [key: number]: { value: string; meta?: any } });
      setSavedAnswers(answersMap);
      setAnswers(answersMap);
    } catch (error: any) {
      console.error("[PmocEquipmentScreen] Erro ao buscar respostas salvas:", error.message || error);
    }
  };

  useEffect(() => {
    fetchEquipmentDetails();
    fetchSavedAnswers();
  }, []);

  const onRefresh = () => {
    fetchEquipmentDetails(true);
    fetchSavedAnswers();
  };

  const handleAnswerChange = (questionId: number, value: string, meta?: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { value, meta: meta || {} },
    }));
  };

  const handleSave = async (status: "open" | "pending" | "closed") => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      const formattedAnswers = Object.keys(answers).map((key) => ({
        question_id: parseInt(key),
        value: answers[parseInt(key)].value,
        meta: answers[parseInt(key)].meta || {},
      }));

      await PmocService.submitAnswers(token, pmocId, equipmentId, {
        status,
        answers: formattedAnswers,
      });

      Alert.alert(
        "Sucesso",
        status === "open" ? "PMOC salvo com sucesso!" : "Rascunho salvo com sucesso!",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error("[PmocEquipmentScreen] Erro ao salvar respostas:", error.message || error);
      Alert.alert("Erro", "Falha ao salvar as respostas. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Erro", "Permissão para acessar a galeria negada.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled) {
        const token = await AsyncStorage.getItem("access_token");
        if (!token) throw new Error("Token de acesso não encontrado.");

        const formData = new FormData();
        result.assets.forEach((asset, index) => {
          formData.append(`images[${index}]`, {
            uri: asset.uri,
            type: "image/jpeg",
            name: `upload_${index}.jpg`,
          } as any);
        });

        const uploadedImages = await PmocService.uploadImages(token, pmocId, equipmentId, formData);
        setUploads((prev) => [...prev, ...uploadedImages]);
        Alert.alert("Sucesso", "Imagens enviadas com sucesso!");
      }
    } catch (error: any) {
      console.error("[PmocEquipmentScreen] Erro no upload:", error.message || error);
      Alert.alert("Erro", "Falha ao fazer upload das imagens.");
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'open':
        return { color: '#28a745', icon: 'checkmark-circle', label: 'Aberto' };
      case 'pending':
        return { color: '#ffc107', icon: 'time', label: 'Pendente' };
      case 'closed':
        return { color: '#6c757d', icon: 'close-circle', label: 'Fechado' };
      default:
        return { color: '#6c757d', icon: 'help-circle', label: status };
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Equipamento PMOC</Text>
        <Text style={styles.headerSubtitle}>#{equipmentId}</Text>
      </View>
      {equipment && (
        <View style={[styles.statusBadge, { backgroundColor: getStatusInfo(equipment.status).color }]}>
          <Ionicons name={getStatusInfo(equipment.status).icon as any} size={16} color="#fff" />
          <Text style={styles.statusText}>{getStatusInfo(equipment.status).label}</Text>
        </View>
      )}
    </View>
  );

  const renderEquipmentInfo = () => {
    if (!equipment) return null;

    return (
      <View style={styles.equipmentCard}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.cardHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name="build" size={24} color="#fff" />
          <Text style={styles.cardTitle}>Informações do Equipamento</Text>
        </LinearGradient>

        <View style={styles.cardContent}>
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Identificação</Text>
            <View style={styles.infoRow}>
              <Ionicons name="business" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Cliente:</Text>
              <Text style={styles.infoValue}>{equipment.client_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Setor:</Text>
              <Text style={styles.infoValue}>{equipment.sector_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="qr-code" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Tag:</Text>
              <Text style={styles.infoValue}>{equipment.tag}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="inventory" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Patrimônio:</Text>
              <Text style={styles.infoValue}>{equipment.patrimony}</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Especificações</Text>
            <View style={styles.infoRow}>
              <MaterialIcons name="memory" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Nº Série:</Text>
              <Text style={styles.infoValue}>{equipment.serial_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="business" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Fabricante:</Text>
              <Text style={styles.infoValue}>{equipment.brand_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="category" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Tipo:</Text>
              <Text style={styles.infoValue}>{equipment.equipment_type_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="memory" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Tecnologia:</Text>
              <Text style={styles.infoValue}>{equipment.technology}</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Capacidade</Text>
            <View style={styles.infoRow}>
              <MaterialIcons name="speed" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Capacidade:</Text>
              <Text style={styles.infoValue}>{equipment.capacity}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="flash-on" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Voltagem:</Text>
              <Text style={styles.infoValue}>{equipment.voltage}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="bolt" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Corrente:</Text>
              <Text style={styles.infoValue}>{equipment.electric_current}</Text>
            </View>
          </View>

          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={20} color="#ffc107" />
            <Text style={styles.warningText}>
              Os dados são de quando o PMOC foi criado, não reflete mudanças posteriores.
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderQuestion = (question: Question, index: number) => {
    const savedAnswer = savedAnswers[question.id];
    const currentAnswer = answers[question.id] || { value: savedAnswer?.value || "", meta: savedAnswer?.meta || {} };

    return (
      <View key={question.id} style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <View style={styles.questionNumber}>
            <Text style={styles.questionNumberText}>{index + 1}</Text>
          </View>
          <Text style={styles.questionTitle}>{question.title}</Text>
        </View>

        {question.description && (
          <Text style={styles.questionDescription}>{question.description}</Text>
        )}

        <View style={styles.questionContent}>
          {(() => {
            switch (question.answer_type) {
              case "select":
                return (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Selecione uma opção:</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Selecione uma opção"
                      value={currentAnswer.value}
                      editable={false}
                    />
                  </View>
                );
              case "radio":
                return (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Escolha uma opção:</Text>
                    {question.meta?.options?.map((option: string, optionIndex: number) => (
                      <TouchableOpacity
                        key={optionIndex}
                        style={[styles.radioOption, currentAnswer.value === option && styles.radioOptionSelected]}
                        onPress={() => handleAnswerChange(question.id, option)}
                      >
                        <View style={styles.radioCircle}>
                          {currentAnswer.value === option && <View style={styles.radioCircleSelected} />}
                        </View>
                        <Text style={[styles.radioText, currentAnswer.value === option && styles.radioTextSelected]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              case "radio_with_justification":
                const showJustification = currentAnswer.value === question.meta?.justification_target;
                return (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Escolha uma opção:</Text>
                    {question.meta?.options?.map((option: string, optionIndex: number) => (
                      <TouchableOpacity
                        key={optionIndex}
                        style={[styles.radioOption, currentAnswer.value === option && styles.radioOptionSelected]}
                        onPress={() => {
                          handleAnswerChange(question.id, option);
                          if (option === question.meta.justification_target) {
                            handleAnswerChange(question.id, option, { justification: currentAnswer.meta?.justification || "" });
                          } else {
                            handleAnswerChange(question.id, option, { justification: undefined });
                          }
                        }}
                      >
                        <View style={styles.radioCircle}>
                          {currentAnswer.value === option && <View style={styles.radioCircleSelected} />}
                        </View>
                        <Text style={[styles.radioText, currentAnswer.value === option && styles.radioTextSelected]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {showJustification && (
                      <View style={styles.justificationContainer}>
                        <Text style={styles.inputLabel}>Justificativa:</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Digite sua justificativa..."
                          value={currentAnswer.meta?.justification || ""}
                          onChangeText={(text) => handleAnswerChange(question.id, currentAnswer.value, { justification: text.slice(0, 300) })}
                          maxLength={300}
                          multiline
                          numberOfLines={3}
                        />
                        <Text style={styles.charCount}>
                          {(currentAnswer.meta?.justification?.length || 0)}/300 caracteres
                        </Text>
                      </View>
                    )}
                  </View>
                );
              case "measure":
                return (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Insira o valor:</Text>
                    <View style={styles.measureContainer}>
                      <TextInput
                        style={styles.measureInput}
                        placeholder="0"
                        value={currentAnswer.value}
                        keyboardType="numeric"
                        onChangeText={(text) => handleAnswerChange(question.id, text)}
                      />
                      <Text style={styles.measureUnit}>{question.meta?.unit}</Text>
                    </View>
                  </View>
                );
              case "text":
                return (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Sua resposta:</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Digite sua resposta..."
                      value={currentAnswer.value}
                      multiline
                      maxLength={300}
                      onChangeText={(text) => handleAnswerChange(question.id, text.slice(0, 300))}
                      numberOfLines={4}
                    />
                    <Text style={styles.charCount}>
                      {currentAnswer.value.length}/300 caracteres
                    </Text>
                  </View>
                );
              default:
                return null;
            }
          })()}
        </View>
      </View>
    );
  };

  const renderQuestionsSection = () => (
    <View style={styles.questionsCard}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.cardHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <MaterialIcons name="quiz" size={24} color="#fff" />
        <Text style={styles.cardTitle}>Plano de Atividade</Text>
      </LinearGradient>

      <View style={styles.cardContent}>
        {questions.length > 0 ? (
          questions.map((question, index) => renderQuestion(question, index))
        ) : (
          <View style={styles.emptyQuestions}>
            <MaterialIcons name="quiz" size={48} color="#ccc" />
            <Text style={styles.emptyQuestionsText}>Nenhuma pergunta disponível</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderUploadsSection = () => (
    <View style={styles.uploadsCard}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.cardHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <MaterialIcons name="photo-library" size={24} color="#fff" />
        <Text style={styles.cardTitle}>Imagens</Text>
      </LinearGradient>

      <View style={styles.cardContent}>
        <TouchableOpacity style={styles.uploadButton} onPress={handleImageUpload}>
          <Ionicons name="add" size={24} color="#667eea" />
          <Text style={styles.uploadButtonText}>Adicionar Imagens</Text>
        </TouchableOpacity>

        {uploads.length > 0 ? (
          <View style={styles.imagesGrid}>
            {uploads.map((upload, index) => (
              <TouchableOpacity key={index} style={styles.imageContainer}>
                <Image source={{ uri: upload.url }} style={styles.uploadImage} />
                <View style={styles.imageOverlay}>
                  <Ionicons name="eye" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyUploads}>
            <MaterialIcons name="photo-library" size={48} color="#ccc" />
            <Text style={styles.emptyUploadsText}>Nenhuma imagem disponível</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderActionButtons = () => {
    const isOpen = equipment?.status === "open";

    return (
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.draftButton, isOpen && styles.disabledButton]}
          onPress={() => handleSave("pending")}
          disabled={isOpen || saving}
        >
          <MaterialIcons name="save" size={20} color="#ffc107" />
          <Text style={[styles.actionButtonText, styles.draftButtonText]}>
            {saving ? "Salvando..." : "Salvar Rascunho"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.saveButton, isOpen && styles.disabledButton]}
          onPress={() => handleSave("open")}
          disabled={isOpen || saving}
        >
          <MaterialIcons name="check-circle" size={20} color="#fff" />
          <Text style={[styles.actionButtonText, styles.saveButtonText]}>
            {saving ? "Salvando..." : "Salvar PMOC"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Carregando equipamento...</Text>
      </View>
    );
  }

  if (!equipment) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={80} color="#dc3545" />
        <Text style={styles.errorTitle}>Erro ao carregar</Text>
        <Text style={styles.errorSubtitle}>Nenhum dado encontrado para este equipamento</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
          />
        }
      >
        {renderEquipmentInfo()}
        {renderQuestionsSection()}
        {renderUploadsSection()}
      </ScrollView>

      {renderActionButtons()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#667eea',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  equipmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  cardContent: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  questionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  questionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questionNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  questionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    lineHeight: 20,
  },
  questionContent: {
    // Content styles will be defined in specific question types
  },
  inputContainer: {
    // Common input container styles
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#fff',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  radioOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#667eea',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#667eea',
  },
  radioText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  radioTextSelected: {
    fontWeight: '600',
  },
  justificationContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  measureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  measureInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  measureUnit: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  charCount: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
    marginTop: 4,
  },
  emptyQuestions: {
    alignItems: 'center',
    padding: 40,
  },
  emptyQuestionsText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
    textAlign: 'center',
  },
  uploadsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 8,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageContainer: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  uploadImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyUploads: {
    alignItems: 'center',
    padding: 40,
  },
  emptyUploadsText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  draftButton: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  saveButton: {
    backgroundColor: '#667eea',
  },
  disabledButton: {
    backgroundColor: '#f1f3f4',
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  draftButtonText: {
    color: '#856404',
  },
  saveButtonText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default PmocEquipmentScreen;