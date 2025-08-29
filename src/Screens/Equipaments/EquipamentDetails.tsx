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
// import { Picker } from "@react-native-picker/picker";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import TechnicalAssistanceService from "../../Services/TechnicalAssistanceService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePermissions } from "../../Context/PermissionsContext";
import ActivityService from "../../Services/ActivityService";
import EquipmentService from "../../Services/EquipamentService";
import { FontAwesome, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { EquipmentTemplate } from "../../Models/EquipmentTemplate";
import DateMaskInput from "../../Components/DateMaskInput";
import DatePickerInput from "../../Components/DatePickerInput";
import CustomPicker from "../../Components/CustomPicker";

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
    start_date: new Date().toISOString().slice(0, 10), // Hoje
    end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Amanhã
  });

  // Função para gerar nome da atividade: <nome_atividade> - <tag>
  const generateUniqueActivityName = (baseName: string, equipmentTag?: string) => {
    const equipmentSuffix = equipmentTag ? ` - ${equipmentTag}` : '';
    return `${baseName}${equipmentSuffix}`;
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
      const activityService = new ActivityService();
      const types = await activityService.fetchActivityTypes(token);
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

      // Validação: data final não pode ser menor que data inicial
      const startDate = new Date(activityForm.start_date);
      const endDate = new Date(activityForm.end_date);

      if (endDate < startDate) {
        Alert.alert("Erro", "A data final não pode ser anterior à data de início.");
        return;
      }

      setCreatingActivity(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");

      console.log('[EquipamentDetails] Criando atividade com dados:', {
        name: activityForm.name,
        activity_type_id: activityForm.activity_type_id,
        start_date: activityForm.start_date,
        end_date: activityForm.end_date,
      });

      // 1. Criar atividade com nome único
      const uniqueActivityName = generateUniqueActivityName(activityForm.name, equipment?.tag);

      const activity = await ActivityService.createActivity({
        name: uniqueActivityName,
        activity_type_id: activityForm.activity_type_id,
        equipment_id: parsedEquipmentId, // Passar equipment_id para obter client_id
        start_date: activityForm.start_date,
        end_date: activityForm.end_date,
      }, token);

      console.log('[EquipamentDetails] Atividade criada:', activity);
      console.log('[EquipamentDetails] Status da atividade criada:', activity.status);
      console.log('[EquipamentDetails] Tipo de atividade:', activity.activity_type);

      // 2. Vincular equipamento à atividade
      // TODAS as atividades devem vincular equipamento (não apenas Ordem de Serviço)
      console.log('[EquipamentDetails] === INICIANDO VÍNCULO DE EQUIPAMENTO ===');
      console.log('[EquipamentDetails] Equipment ID a ser vinculado:', parsedEquipmentId);
      console.log('[EquipamentDetails] Activity ID:', activity.id);

      await ActivityService.linkEquipmentToActivity(activity.id, { equipment_id: parsedEquipmentId }, token);
      console.log('[EquipamentDetails] Equipamento vinculado com sucesso');

      setShowCreateActivity(false);
      Alert.alert("Sucesso", "Atividade criada e equipamento vinculado com sucesso!");
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
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
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
        </LinearGradient>

        {/* Informações principais */}
        <View style={styles.content}>
          <InfoCard title="Informações Básicas" icon="info">
            <InfoRow label="Tag" value={equipment.tag || "N/A"} icon="pricetag" />
            <InfoRow label="Fabricante" value={equipment.brand?.name || "N/A"} icon="business" />
            <InfoRow label="Tipo de Equipamento" value={equipment.equipment_type?.name || "N/A"} icon="settings" />
          </InfoCard>

          <InfoCard title="Localização" icon="location-on">
            <InfoRow label="Cliente" value={equipment.client?.name || "N/A"} icon="business" />
            <InfoRow label="Setor" value={equipment.sector?.complete_name || equipment.sector?.name || "N/A"} icon="location" />
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

                    // Buscar valor nos campos dinâmicos (additional_fields) primeiro, com fallback por label, depois no equipamento
                    let value = equipment.additional_fields?.[fieldKey];
                    if (value === undefined || value === null) {
                      // Fallback: procurar por entrada cujo label (ou sublabel) corresponda ao do template (com normalização)
                      const af = equipment.additional_fields;
                      if (af && typeof af === 'object') {
                        const normalizeText = (text: any) =>
                          (text || '')
                            .toString()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '') // remove acentos
                            .replace(/[^a-z0-9]/gi, '')
                            .toLowerCase();
                        const target = normalizeText(fieldLabel);
                        const match = Object.values(af as any).find((entry: any) => {
                          try {
                            const candidates = [
                              entry?.label,
                              entry?.value?.label,
                              entry?.name,
                              entry?.value?.name,
                            ];
                            return candidates.some((c) => {
                              const norm = normalizeText(c);
                              return norm && (norm === target || norm.includes(target) || target.includes(norm));
                            });
                          } catch {
                            return false;
                          }
                        });
                        if (match) value = match as any;
                      }
                    }
                    if (value === undefined || value === null) {
                      value = equipment[fieldKey];
                    }

                    console.log(`[EquipamentDetails] Campo ${fieldKey}:`, value, 'Tipo:', field.type);
                    let displayValue = "N/A";
                    let icon = "settings";

                    const extractPrimitive = (val: any): any => {
                      if (val === undefined || val === null) return null;
                      if (typeof val !== 'object') return val;
                      if (Array.isArray(val)) {
                        const mapped = val.map((item) => extractPrimitive(item)).filter((v) => v !== null && v !== undefined && v !== '');
                        return mapped.join(', ');
                      }
                      // Preferir sempre o 'value' e descer recursivamente
                      if (Object.prototype.hasOwnProperty.call(val, 'value')) {
                        return extractPrimitive((val as any).value);
                      }
                      if (Object.prototype.hasOwnProperty.call(val, 'label')) {
                        return (val as any).label;
                      }
                      if (Object.prototype.hasOwnProperty.call(val, 'name')) {
                        return (val as any).name;
                      }
                      if (Object.prototype.hasOwnProperty.call(val, 'id')) {
                        return (val as any).id;
                      }
                      try { return JSON.stringify(val); } catch { return String(val); }
                    };

                    if (value !== undefined && value !== null && value !== "") {
                      let actualValue = extractPrimitive(value);

                      if (field.type === 'boolean') {
                        const boolVal = Boolean(actualValue);
                        displayValue = boolVal ? "Sim" : "Não";
                        icon = boolVal ? "check-circle" : "cancel";
                      } else if (field.type === 'number') {
                        displayValue = actualValue !== null && actualValue !== undefined ? String(actualValue) : "N/A";
                        icon = "calculate";
                      } else {
                        // Para selects/radios (com ou sem justificativa), priorizar o valor efetivo extraído (ex.: "A"/"B")
                        displayValue = actualValue !== null && actualValue !== undefined ? String(actualValue) : "N/A";
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
                  placeholderTextColor="#999"
                  value={activityForm.name}
                  onChangeText={text => setActivityForm(f => ({ ...f, name: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo de Atividade</Text>
                <CustomPicker
                  selectedValue={activityForm.activity_type_id !== undefined ? String(activityForm.activity_type_id) : ''}
                  onValueChange={(v: string) => {
                    const parsed = parseInt(v, 10);
                    setActivityForm(f => ({ ...f, activity_type_id: Number.isNaN(parsed) ? undefined : parsed }));
                  }}
                  items={activityTypes.map((t: any) => ({ label: t.name, value: String(t.id) }))}
                  placeholder="Selecione um tipo..."
                  style={styles.picker}
                />
              </View>

              <View style={styles.inputGroup}>
                <DatePickerInput
                  label="Data de Início *"
                  value={activityForm.start_date}
                  onChangeText={text => setActivityForm(f => ({ ...f, start_date: text }))}
                  placeholder="Selecione a data de início"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <DatePickerInput
                  label="Data Final *"
                  value={activityForm.end_date}
                  onChangeText={text => setActivityForm(f => ({ ...f, end_date: text }))}
                  placeholder="Selecione a data final"
                  style={styles.textInput}
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
    backgroundColor: "#667eea",
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
    backgroundColor: "#fff",
    color: "#333",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
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