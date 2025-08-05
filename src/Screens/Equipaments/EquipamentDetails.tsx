import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import TechnicalAssistanceService from "../../Services/TechnicalAssistanceService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePermissions } from "../../Context/PermissionsContext";
import ActivityService from "../../Services/ActivityService";
import EquipmentService from "../../Services/EquipamentService";
import { FontAwesome, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { EquipmentTemplate } from "../../Models/EquipmentTemplate";
import DateMaskInput from "../../Components/DateMaskInput";

const { width } = Dimensions.get('window');

interface EquipmentDetailsScreenProps {
  route: RouteProp<RootStackParamList, "EquipmentDetailsScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "EquipmentDetailsScreen">;
}

const EquipmentDetailsScreen: React.FC<EquipmentDetailsScreenProps> = ({ route, navigation }) => {
  const { equipmentId } = route.params;
  const { hasPermission, permissions } = usePermissions();
  const [equipment, setEquipment] = useState<any>(null);
  const [equipmentTemplate, setEquipmentTemplate] = useState<EquipmentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const parsedEquipmentId = parseInt(equipmentId as unknown as string);
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [activityForm, setActivityForm] = useState({
    name: "",
    activity_type_id: undefined as number | undefined,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10), // Valor padrão igual à data de início
  });

  // Função para gerar nome único para atividade
  const generateUniqueActivityName = (baseName: string, equipmentTag?: string) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const equipmentSuffix = equipmentTag ? ` - ${equipmentTag}` : '';
    return `${baseName} ${timestamp}${equipmentSuffix}`;
  };
  const [creatingActivity, setCreatingActivity] = useState(false);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const token = await AsyncStorage.getItem("access_token");
        if (!token) throw new Error("Token não encontrado");

        // Buscar template de equipamento
        const template = await EquipmentService.getEquipmentTemplate(token);
        console.log("[EquipamentDetails] Template carregado:", template);
        setEquipmentTemplate(template);

        // Buscar detalhes do equipamento
        const equipmentData = await EquipmentService.fetchEquipmentDetails(equipmentId, token);
        console.log("[EquipamentDetails] Dados do equipamento:", equipmentData);
        setEquipment(equipmentData);
      } catch (error) {
        console.error("Erro ao buscar equipamento:", error);
        Alert.alert("Erro", "Não foi possível carregar os detalhes do equipamento.");
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, [equipmentId]);



  const openCreateActivityModal = async () => {
    setShowCreateActivity(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");

      console.log('[EquipamentDetails] Carregando tipos de atividade...');
      const types = await ActivityService.fetchActivityTypes(token);
      console.log('[EquipamentDetails] Tipos carregados:', types);
      setActivityTypes(types);
    } catch (err: any) {
      console.error('[EquipamentDetails] Erro ao carregar tipos de atividade:', err);

      let errorMessage = "Não foi possível carregar tipos de atividade.";

      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      Alert.alert("Erro", errorMessage);
      setShowCreateActivity(false); // Fechar modal em caso de erro
    }
  };

  const handleCreateActivity = async () => {
    try {
      // Validação dos campos obrigatórios
      if (!activityForm.name.trim()) {
        Alert.alert("Erro", "Nome da atividade é obrigatório.");
        return;
      }

      if (!activityForm.activity_type_id) {
        Alert.alert("Erro", "Tipo de atividade é obrigatório.");
        return;
      }

      if (!activityForm.start_date) {
        Alert.alert("Erro", "Data de início é obrigatória.");
        return;
      }

      if (!activityForm.end_date) {
        Alert.alert("Erro", "Data final é obrigatória.");
        return;
      }

      setCreatingActivity(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");

      console.log('[EquipamentDetails] Criando atividade com dados:', {
        name: activityForm.name,
        activity_type_id: activityForm.activity_type_id,
        start_date: activityForm.start_date,
        end_date: activityForm.end_date || null,
      });

      // 1. Criar atividade com nome único
      const uniqueActivityName = generateUniqueActivityName(activityForm.name, equipment?.tag);

      const activity = await ActivityService.createActivity({
        name: uniqueActivityName,
        activity_type_id: activityForm.activity_type_id,
        equipment_id: parsedEquipmentId, // Passar equipment_id para obter client_id
        start_date: activityForm.start_date,
        end_date: activityForm.end_date || null,
      }, token);

      console.log('[EquipamentDetails] Atividade criada:', activity);

      // 2. Vincular equipamento
      await ActivityService.linkEquipmentToActivity(activity.id, { equipment_id: parsedEquipmentId }, token);

      setShowCreateActivity(false);
      Alert.alert("Sucesso", "Atividade criada e equipamento vinculado!");
      navigation.navigate("ActivityHistoryScreen", { equipmentId: parsedEquipmentId });
    } catch (err: any) {
      console.error('[EquipamentDetails] Erro ao criar atividade:', err);

      let errorMessage = "Não foi possível criar a atividade.";

      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      Alert.alert("Erro", errorMessage);
    } finally {
      setCreatingActivity(false);
    }
  };

  const InfoCard = ({ title, children, icon }: { title: string; children: React.ReactNode; icon: string }) => (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <MaterialIcons name={icon as any} size={20} color="#007BFF" />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardContent}>
        {children}
      </View>
    </View>
  );

  const InfoRow = ({ label, value, icon }: { label: string; value: string; icon?: string }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelContainer}>
        {icon && <Ionicons name={icon as any} size={16} color="#666" style={styles.infoIcon} />}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando detalhes do equipamento...</Text>
      </View>
    );
  }

  if (!equipment) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>Equipamento não encontrado</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header com gradiente */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Detalhes do Equipamento</Text>
              <Text style={styles.headerSubtitle}>{equipment.tag || "Sem identificação"}</Text>
            </View>
          </View>
        </View>

        {/* Informações principais */}
        <View style={styles.content}>
          <InfoCard title="Informações Básicas" icon="info">
            <InfoRow label="Tag" value={equipment.tag || "N/A"} icon="pricetag" />
            <InfoRow label="Patrimônio" value={equipment.patrimony || "N/A"} icon="card" />
            <InfoRow label="Número de Série" value={equipment.serial_number || "N/A"} icon="barcode" />
            <InfoRow label="Fabricante" value={equipment.brand?.name || "N/A"} icon="business" />
            <InfoRow label="Tipo de Equipamento" value={equipment.equipment_type?.name || "N/A"} icon="settings" />
          </InfoCard>

          <InfoCard title="Localização" icon="location-on">
            <InfoRow label="Cliente" value={equipment.client?.name || "N/A"} icon="business" />
            <InfoRow label="Setor" value={equipment.sector?.name || "N/A"} icon="location" />
            <InfoRow
              label="Status"
              value={equipment.is_active !== false ? "Ativo" : "Inativo"}
              icon={equipment.is_active !== false ? "check-circle" : "cancel"}
            />
          </InfoCard>

          <InfoCard title="Especificações Técnicas" icon="build">
            {equipmentTemplate && equipmentTemplate.fields && equipmentTemplate.fields.length > 0 ? (
              (() => {
                console.log("[EquipamentDetails] Todos os campos do template:", equipmentTemplate.fields);
                const validFields = equipmentTemplate.fields
                  .filter((field) => (field.key || field.name) && (field.key || field.name)?.trim() !== '');
                console.log("[EquipamentDetails] Campos válidos:", validFields);

                if (validFields.length === 0) {
                  console.log("[EquipamentDetails] Nenhum campo válido encontrado, usando campos padrão");
                  return (
                    <InfoRow
                      label="Nenhuma especificação técnica configurada"
                      value="Configure o template de equipamento"
                      icon="info"
                    />
                  );
                }

                return validFields
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((field) => {
                    const fieldKey = field.key || field.name || '';
                    const fieldLabel = field.label || field.name || fieldKey;
                    const value = equipment[fieldKey];
                    console.log(`[EquipamentDetails] Campo ${fieldKey}:`, value, 'Tipo:', field.type);
                    let displayValue = "N/A";
                    let icon = "settings";

                    if (value !== undefined && value !== null && value !== "") {
                      if (field.type === 'boolean') {
                        displayValue = value ? "Sim" : "Não";
                        icon = value ? "check-circle" : "cancel";
                      } else if (field.type === 'number') {
                        displayValue = value.toString();
                        icon = "calculate";
                      } else {
                        displayValue = value.toString();
                        icon = "info";
                      }
                    }

                    return (
                      <InfoRow
                        key={field.id || fieldKey}
                        label={fieldLabel}
                        value={displayValue}
                        icon={icon}
                      />
                    );
                  });
              })()
            ) : (
              <>
                <InfoRow label="Tecnologia" value={equipment.technology || "N/A"} icon="flash" />
                <InfoRow label="Tipo de Evaporadora" value={equipment.evaporator_type?.name || "N/A"} icon="thermometer" />
                <InfoRow label="Tipo de Serpentina" value={equipment.coil_type?.name || "N/A"} icon="sync" />
                <InfoRow label="Tipo de Coifa" value={equipment.condenser_type?.name || "N/A"} icon="air" />
                <InfoRow label="Capacidade" value={equipment.capacity || "N/A"} icon="speedometer" />
                <InfoRow label="Voltagem" value={equipment.voltage || "N/A"} icon="flash" />
                <InfoRow label="Corrente Elétrica" value={equipment.electric_current || "N/A"} icon="pulse" />
              </>
            )}
          </InfoCard>
        </View>
      </ScrollView>

      {/* Botões de ação flutuantes */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => navigation.navigate("ActivityHistoryScreen", { equipmentId: parsedEquipmentId })}
        >
          <FontAwesome name="history" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Atividades</Text>
        </TouchableOpacity>



        <TouchableOpacity
          style={[styles.actionButton, styles.accentButton]}
          onPress={openCreateActivityModal}
        >
          <MaterialIcons name="add-task" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Nova Atividade</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de criação de atividade */}
      <Modal
        visible={showCreateActivity}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateActivity(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Criar Nova Atividade</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCreateActivity(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome da Atividade</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Digite o nome da atividade (será único automaticamente)"
                  value={activityForm.name}
                  onChangeText={text => setActivityForm(f => ({ ...f, name: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo de Atividade</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={activityForm.activity_type_id}
                    onValueChange={(v: number) => setActivityForm(f => ({ ...f, activity_type_id: v }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Selecione um tipo..." value={undefined} />
                    {activityTypes.map((t: any) => (
                      <Picker.Item key={t.id} label={t.name} value={t.id} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Data de Início</Text>
                <DateMaskInput
                  style={styles.textInput}
                  placeholder="AAAA-MM-DD"
                  value={activityForm.start_date}
                  onChangeText={text => setActivityForm(f => ({ ...f, start_date: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Data Final *</Text>
                <DateMaskInput
                  style={styles.textInput}
                  placeholder="AAAA-MM-DD"
                  value={activityForm.end_date}
                  onChangeText={text => setActivityForm(f => ({ ...f, end_date: text }))}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateActivity(false)}
                disabled={creatingActivity}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCreateActivity}
                disabled={creatingActivity}
              >
                {creatingActivity ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Criar Atividade</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#FF6B6B",
    marginTop: 16,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#007BFF",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  cardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f9fa",
  },
  infoLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: "#007BFF",
  },
  secondaryButton: {
    backgroundColor: "#28a745",
  },
  accentButton: {
    backgroundColor: "#ffc107",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  picker: {
    height: 50,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  confirmButton: {
    backgroundColor: "#007BFF",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EquipmentDetailsScreen;