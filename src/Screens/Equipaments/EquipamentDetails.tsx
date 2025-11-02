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
    activity_type_id: undefined as number | undefined,
  });
  const [observation, setObservation] = useState<string>('');

  // Função para gerar nome único da atividade: <nome_atividade> - <tag> #<timestamp>
  const generateUniqueActivityName = (baseName: string, equipmentTag?: string) => {
    const equipmentSuffix = equipmentTag ? ` - ${equipmentTag}` : '';
    const timestamp = new Date().getTime();
    const uniqueSuffix = timestamp.toString().slice(-6); // Últimos 6 dígitos do timestamp
    return `${baseName}${equipmentSuffix} #${uniqueSuffix}`;
  };
  const [creatingActivity, setCreatingActivity] = useState(false);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const token = await AsyncStorage.getItem("access_token");
        if (!token) throw new Error("Token não encontrado");

        // Buscar detalhes do equipamento primeiro
        const equipmentData = await EquipmentService.fetchEquipmentDetails(equipmentId, token);
        console.log("[EquipamentDetails] Dados do equipamento:", equipmentData);
        setEquipment(equipmentData);

        // Buscar template por tipo (conforme tarefas.md)
        try {
          const typeId = equipmentData?.equipment_type?.id || equipmentData?.equipment_type_id;
          if (typeId) {
            const templateByType = await EquipmentService.getEquipmentTemplateByEquipmentType(Number(typeId), token);
            console.log("[EquipamentDetails] Template por tipo carregado:", templateByType);
            setEquipmentTemplate(templateByType as any);
          } else {
            console.log("[EquipamentDetails] equipment_type.id não encontrado; pulando carga de template");
            setEquipmentTemplate(null);
          }
        } catch (tplErr) {
          console.warn("[EquipamentDetails] Falha ao carregar template por tipo:", (tplErr as any)?.message || tplErr);
          setEquipmentTemplate(null);
          // Não bloquear a tela se o template falhar
        }
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
      // Validar apenas tipo (cliente/equipamento já definidos no contexto)
      if (!activityForm.activity_type_id) {
        Alert.alert("Erro", "Tipo de atividade é obrigatório.");
        return;
      }

      setCreatingActivity(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");

      // Montar dados conforme novo fluxo (nome e datas automáticos)
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const formatDateBR = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      };
      const typeName = activityTypes.find((t: any) => t.id === activityForm.activity_type_id)?.name || 'Atividade';
      const clientName = equipment?.client?.name || '';
      const dateTime = new Date().toLocaleString('pt-BR');
      const autoName = `${typeName} ${clientName} ${dateTime}`.trim();

      console.log('[EquipamentDetails] Criando atividade (novo fluxo):', {
        name: autoName,
        activity_type_id: activityForm.activity_type_id,
        client_id: equipment?.client?.id,
      });

      // 1) Criar atividade
      const activityService = new ActivityService();
      const activity = await activityService.createActivity({
        name: autoName,
        activity_type_id: activityForm.activity_type_id,
        client_id: equipment?.client?.id,
        observation: observation ?? "",

      }, token);


      console.log('[EquipamentDetails] Atividade criada:', activity);
      console.log('[EquipamentDetails] budget_policy da atividade:', activity?.budget_policy);

      // 2) Vincular equipamento existente à atividade
      // TODAS as atividades devem vincular equipamento (não apenas Ordem de Serviço)
      console.log('[EquipamentDetails] === INICIANDO VÍNCULO DE EQUIPAMENTO ===');
      console.log('[EquipamentDetails] Equipment ID a ser vinculado:', parsedEquipmentId);
      console.log('[EquipamentDetails] Activity ID:', activity.id);

      await activityService.addEquipmentToActivity(activity.id, { equipments_ids: [parsedEquipmentId] }, token);
      console.log('[EquipamentDetails] Equipamento vinculado com sucesso');

      // 3) Confirmar ID do vínculo e navegar ao questionário
      const equipmentsPayload = await ActivityService.fetchActivityEquipments(activity.id, { token });
      const equipmentsList = Array.isArray(equipmentsPayload) ? equipmentsPayload : (equipmentsPayload?.results || []);
      const linked = equipmentsList.find((ev: any) => ev?.equipment?.id === parsedEquipmentId || ev?.equipment_id === parsedEquipmentId);
      const activityEquipmentId = linked?.id;

      if (!activityEquipmentId) {
        Alert.alert('Atenção', 'Atividade criada, mas não foi possível confirmar o vínculo do equipamento. Tente abrir o questionário a partir do histórico.');
      } else {
        // ✅ Buscar budgetPolicy da atividade criada (conforme plano)
        const budgetPolicy = activity?.budget_policy || 'on_request';
        console.log('[EquipamentDetails] ✅ budgetPolicy para navegação:', budgetPolicy);

        setShowCreateActivity(false);
        navigation.navigate('ActivityQuestionnaireScreen', {
          activityId: activity.id,
          activityEquipmentId,
          equipmentId: parsedEquipmentId,
          equipmentTag: equipment?.tag || 'SEM_TAG',
          activityName: autoName,
          budgetPolicy: budgetPolicy, // ✅ ADICIONADO conforme plano
          fromNewActivityFlow: true,
        });
      }
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

                const normalizeText = (text: any) =>
                  (text || '')
                    .toString()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]/gi, '')
                    .toLowerCase();

                const getFromArray = (arr: any[], targetKey: string, targetLabel: string) => {
                  const byKey = arr.find((e: any) => e?.key === targetKey || normalizeText(e?.key) === normalizeText(targetKey));
                  if (byKey) return byKey?.value ?? byKey;
                  const tgt = normalizeText(targetLabel);
                  const byLabel = arr.find((e: any) => {
                    try {
                      const candidates = [e?.label, e?.name, e?.value?.label, e?.value?.name];
                      return candidates.some((c) => {
                        const norm = normalizeText(c);
                        return norm && (norm === tgt || norm.includes(tgt) || tgt.includes(norm));
                      });
                    } catch {
                      return false;
                    }
                  });
                  if (byLabel) return byLabel?.value ?? byLabel;
                  return undefined;
                };

                const getFromObject = (obj: any, targetKey: string, targetLabel: string) => {
                  if (!obj) return undefined;
                  if (Object.prototype.hasOwnProperty.call(obj, targetKey)) return obj[targetKey];
                  // tenta normalizar keys do objeto (para additional_fields simples no GET)
                  try {
                    const normKey = normalizeText(targetKey);
                    for (const k of Object.keys(obj)) {
                      if (normalizeText(k) === normKey) return (obj as any)[k];
                    }
                  } catch { }
                  const tgt = normalizeText(targetLabel);
                  const values = Object.values(obj);
                  const match = values.find((entry: any) => {
                    try {
                      const candidates = [entry?.label, entry?.name, entry?.value?.label, entry?.value?.name];
                      return candidates.some((c) => {
                        const norm = normalizeText(c);
                        return norm && (norm === tgt || norm.includes(tgt) || tgt.includes(norm));
                      });
                    } catch { return false; }
                  });
                  if (match) return (match as any).value ?? match;
                  return undefined;
                };

                const getDynamicValue = (fieldKey: string, fieldLabel: string) => {
                  console.log('[EquipamentDetails] Buscando valor para:', { fieldKey, fieldLabel });
                  console.log('[EquipamentDetails] Additional fields:', equipment?.additional_fields);

                  // Adicionar busca específica para 'especificações técnicas'
                  const specTecKey = normalizeText('especificacoes tecnicas');
                  if (normalizeText(fieldKey) === specTecKey || normalizeText(fieldLabel) === specTecKey) {
                    const specVal = equipment?.especificacoes_tecnicas || equipment?.specs ||
                      equipment?.additional_fields?.especificacoes_tecnicas ||
                      equipment?.additional_fields?.['especificações técnicas'] || '';
                    console.log('[EquipamentDetails] Valor de especificações técnicas:', specVal);
                    if (specVal) return specVal;
                  }

                  // Fontes possíveis usadas pelo backend
                  const sources = [
                    equipment?.additional_fields,
                    equipment?.dynamic_fields,
                    equipment?.fields,
                    equipment?.attributes,
                    equipment?.custom_fields,
                  ];
                  for (const src of sources) {
                    if (!src) continue;
                    try {
                      if (Array.isArray(src)) {
                        const val = getFromArray(src, fieldKey, fieldLabel);
                        if (val !== undefined && val !== null) return val;
                      } else if (typeof src === 'object') {
                        const val = getFromObject(src, fieldKey, fieldLabel);
                        if (val !== undefined && val !== null) return val;
                      } else if (typeof src === 'string') { // Caso raro de string serializada
                        try { const parsed = JSON.parse(src); return getDynamicValue(fieldKey, fieldLabel); } catch { }
                      }
                    } catch (e) {
                      console.warn('[EquipamentDetails] Falha ao ler fonte dinâmica', e);
                    }
                  }
                  // Fallback: tenta propriedade direta no equipamento
                  return equipment[fieldKey] || '';
                };

                return validFields
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((field) => {
                    const fieldKey = field.key || field.name || '';
                    const fieldLabel = field.label || field.name || fieldKey;
                    let value: any = getDynamicValue(fieldKey, fieldLabel);

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
                      } else if (field.type === 'measure') {
                        // Pode vir { value, unit } ou somente número. Usa unit do template se necessário
                        let numeric = actualValue;
                        let unit = (value && typeof value === 'object' && (value as any).unit) ? (value as any).unit : (field as any).unit;
                        if (typeof numeric === 'object' && numeric !== null && 'value' in (numeric as any)) {
                          numeric = (numeric as any).value;
                        }
                        displayValue = (numeric !== null && numeric !== undefined && numeric !== '') ? `${numeric} ${unit || ''}`.trim() : 'N/A';
                        icon = 'speedometer';
                      } else if (field.type === 'radio' || field.type === 'radio_with_justification' || field.type === 'select') {
                        const v = String(actualValue).toLowerCase();
                        if (["true", "1", "sim", "yes"].includes(v)) displayValue = 'Sim';
                        else if (["false", "0", "nao", "não", "no"].includes(v)) displayValue = 'Não';
                        else displayValue = actualValue !== null && actualValue !== undefined ? String(actualValue) : 'N/A';
                        icon = 'info';
                      } else {
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
          onPress={() => {
            if (!parsedEquipmentId || parsedEquipmentId <= 0) {
              Alert.alert('Erro', 'ID do equipamento inválido');
              return;
            }
            navigation.navigate("ActivityHistoryScreen", { equipmentId: parsedEquipmentId });
          }}
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
                <Text style={styles.inputLabel}>Observação (opcional)</Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }]}
                  placeholder="Digite uma observação (opcional)"
                  placeholderTextColor="#999"
                  value={observation}
                  onChangeText={setObservation}
                  multiline
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