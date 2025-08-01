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
  Image, // Adicionado para visualização
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import PmocService from "../../Services/PmocService";
import { EquipmentDetails, Question } from "../../Models/Pmoc_Model/EquipmentDetails";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { UploadedImage } from "../../Models/ServiceOrder";
import NetInfo from '@react-native-community/netinfo';
import { OfflineService } from '../../Services/OfflineService';

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
  const [answers, setAnswers] = useState<{ [key: number]: { value: string; meta?: any } }>({});
  const [savedAnswers, setSavedAnswers] = useState<{ [key: number]: { value: string; meta?: any } }>({});

  const fetchEquipmentDetails = async () => {
    try {
      setLoading(true);
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

  const handleAnswerChange = (questionId: number, value: string, meta?: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { value, meta: meta || {} },
    }));
  };

  const handleSave = async (status: "open" | "pending" | "closed") => {
    try {
      setLoading(true);
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

      navigation.goBack();
    } catch (error: any) {
      console.error("[PmocEquipmentScreen] Erro ao salvar respostas:", error.message || error);
    } finally {
      setLoading(false);
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
        setUploads((prev) => [...prev, ...uploadedImages]); // Adiciona UploadedImage[]
      }
    } catch (error: any) {
      console.error("[PmocEquipmentScreen] Erro no upload:", error.message || error);
      Alert.alert("Erro", "Falha ao fazer upload das imagens.");
    }
  };

  // Função para visualizar imagem
  const handleImagePreview = (uri: string) => {
    Alert.alert("Visualizar Imagem", "Imagem selecionada:", [
      { text: "OK" },
    ]);
    // Para uma visualização real, considere usar react-native-image-viewer ou similar
  };

  const renderQuestion = (question: Question) => {
    const savedAnswer = savedAnswers[question.id];
    const currentAnswer = answers[question.id] || { value: savedAnswer?.value || "", meta: savedAnswer?.meta || {} };

    switch (question.answer_type) {
      case "select":
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionTitle}>{question.title}</Text>
            <Text style={styles.questionDescription}>{question.description}</Text>
            <TextInput
              style={styles.input}
              placeholder="Selecione uma opção"
              value={currentAnswer.value}
              editable={false} // Select deve ser Picker, mas mantido como placeholder
            />
          </View>
        );
      case "radio":
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionTitle}>{question.title}</Text>
            <Text style={styles.questionDescription}>{question.description}</Text>
            {question.meta?.options?.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.radioOption,
                  currentAnswer.value === option && styles.selectedRadioOption,
                ]}
                onPress={() => handleAnswerChange(question.id, option)}
              >
                <Text>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case "radio_with_justification":
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionTitle}>{question.title}</Text>
            <Text style={styles.questionDescription}>{question.description}</Text>
            {question.meta?.options?.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.radioOption,
                  currentAnswer.value === option && styles.selectedRadioOption,
                ]}
                onPress={() => handleAnswerChange(question.id, option)}
              >
                <Text>{option}</Text>
              </TouchableOpacity>
            ))}
            {currentAnswer.value === question.meta?.justification_target && (
              <TextInput
                style={styles.input}
                placeholder="Justifique"
                value={currentAnswer.meta.justification || ""}
                multiline
                maxLength={300}
                onChangeText={(text) =>
                  handleAnswerChange(question.id, currentAnswer.value, { justification: text })
                }
              />
            )}
          </View>
        );
      case "measure":
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionTitle}>{question.title}</Text>
            <Text style={styles.questionDescription}>{question.description}</Text>
            <TextInput
              style={styles.input}
              placeholder="Insira o valor"
              value={currentAnswer.value}
              keyboardType="numeric"
              onChangeText={(text) => handleAnswerChange(question.id, text)}
            />
            <Text>{question.meta?.unit}</Text>
          </View>
        );
      case "text":
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionTitle}>{question.title}</Text>
            <Text style={styles.questionDescription}>{question.description}</Text>
            <TextInput
              style={styles.input}
              placeholder="Insira sua resposta"
              value={currentAnswer.value}
              multiline
              maxLength={300}
              onChangeText={(text) => handleAnswerChange(question.id, text)}
            />
          </View>
        );
      default:
        return null;
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#007BFF" />;
  if (!equipment) return <Text>Nenhum dado encontrado.</Text>;
  // Verificação do status para desabilitar botões
  const isOpen = equipment.status === "open";
  return (
    <ScrollView style={styles.container}>
      {/* Informações do Equipamento */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações do Equipamento</Text>
        <Text>Cliente: {equipment.client_name}</Text>
        <Text>Setor: {equipment.sector_name}</Text>
        <Text>Tag: {equipment.tag}</Text>
        <Text>Patrimônio: {equipment.patrimony}</Text>
        <Text>Número de Série: {equipment.serial_number}</Text>
        <Text>Fabricante: {equipment.brand_name}</Text>
        <Text>Tecnologia: {equipment.technology}</Text>
        <Text>Tipo de Equipamento: {equipment.equipment_type_name}</Text>
        <Text>Tipo de Evaporadora: {equipment.evaporator_type_name}</Text>
        <Text>Tipo de Serpentina: {equipment.coil_type_name}</Text>
        <Text>Tipo de Coifa: {equipment.condenser_type_name}</Text>
        <Text>Capacidade: {equipment.capacity}</Text>
        <Text>Voltagem: {equipment.voltage}</Text>
        <Text>Corrente Elétrica: {equipment.electric_current}</Text>
        <Text>Status: {equipment.status}</Text>
        <Text style={styles.warning}>Os dados são de quando o PMOC foi criado, não reflete mudanças posteriores.</Text>
      </View>

      {/* Plano de Atividade */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plano de Atividade</Text>
        {questions?.map((question, index) => (
          <View key={index}>{renderQuestion(question)}</View>
        ))}
      </View>

      {/* Seção de Uploads */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Uploads</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={handleImageUpload}>
          <Text style={styles.uploadButtonText}>Adicionar Imagens</Text>
        </TouchableOpacity>
        {uploads.length > 0 ? (
          uploads.map((upload, index) => (
            <Image key={index} source={{ uri: upload.url }} style={styles.uploadImage} />
          ))
        ) : (
          <Text>Nenhuma imagem disponível.</Text>
        )}
      </View>

      {/* Botões */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, isOpen && styles.disabledButton]} onPress={() => handleSave("pending")}>
          <Text style={styles.buttonText}>Salvar como Rascunho</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, isOpen && styles.disabledButton]} onPress={() => handleSave("open")} disabled={isOpen}>
          <Text style={styles.buttonText}>Salvar</Text>

        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  questionContainer: {
    marginBottom: 15,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  questionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  radioOption: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 5,
  },
  selectedRadioOption: {
    backgroundColor: "#e0e0e0",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  disabledText: {
    color: "#999",
  },
  uploadButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 10,
  },
  uploadButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  uploadItem: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  uploadImage: {
    width: 50,
    height: 50,
    marginRight: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  warning: {
    fontSize: 12,
    color: "red",
    marginTop: 10,
  },
});

export default PmocEquipmentScreen;