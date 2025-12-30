import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import EquipmentService from "../../Services/EquipamentService";
import ClientService from "../../Services/ClientService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { DynamicField, EquipmentTemplate } from "../../Models/EquipmentTemplate";
import { Equipment } from "../../Models/Equipament";
import { setDynamicApiUrl } from "../../config/apiConfig";
import apiClient from "../../Context/ApiClient";
import CustomPicker from "../../Components/CustomPicker";
import DynamicEquipmentFields from "../../Components/DynamicEquipmentFields";
import ResponsiveContainer from "../../Components/ResponsiveContainer";
import AppTextInput from "../../Components/AppTextInput";

interface CreateEquipmentScreenProps {
  route: RouteProp<RootStackParamList, "CreateEquipmentScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "CreateEquipmentScreen">;
}

interface CreateEquipmentScreenParams {
  clientId?: number;
  sectorId?: number;
}

const CreateEquipmentScreen: React.FC<CreateEquipmentScreenProps> = ({
  route,
  navigation,
}) => {
  // Obter parâmetros da rota para pré-seleção
  const params = route.params as any;
  const preSelectedClientId = params?.clientId;
  const preSelectedSectorId = params?.sectorId;

  console.log("[CreateEquipmentScreen] Parâmetros recebidos:", {
    preSelectedClientId,
    preSelectedSectorId,
    params
  });

  // Estados para campos fixos
  const [clientId, setClientId] = useState<string>(preSelectedClientId?.toString() || "");
  const [sectorId, setSectorId] = useState<string>(preSelectedSectorId?.toString() || "");
  const [brandId, setBrandId] = useState<string>("");
  const [equipmentTypeId, setEquipmentTypeId] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  // Estados para dados do template
  const [equipmentTemplate, setEquipmentTemplate] = useState<EquipmentTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados para dados dos selects
  const [clients, setClients] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);

  // Estados para campos dinâmicos
  const [dynamicFields, setDynamicFields] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const accessToken = await AsyncStorage.getItem("access_token");
        if (!accessToken) throw new Error("Token de acesso não encontrado.");

        // Buscar dados dos selects (clientes, setores, fabricantes, tipos)
        await fetchSelectData(accessToken);

        // Não buscar template ao abrir a tela (conforme tarefas.md)
        setEquipmentTemplate(null);
        setDynamicFields({});
      } catch (error: any) {
        console.error("[CreateEquipmentScreen] Erro ao buscar dados:", error);
        Alert.alert("Erro", error.message || "Falha ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Ao selecionar um Tipo de Equipamento, buscar o template específico e renderizar campos dinâmicos
  useEffect(() => {
    const fetchTemplateByType = async () => {
      try {
        const accessToken = await AsyncStorage.getItem("access_token");
        if (!accessToken) return;
        if (!equipmentTypeId) {
          setEquipmentTemplate(null);
          setDynamicFields({});
          return;
        }

        const typeId = parseInt(equipmentTypeId);
        if (!Number.isFinite(typeId)) return;

        const template = await EquipmentService.getEquipmentTemplateByEquipmentType(typeId, accessToken);
        setEquipmentTemplate(template);

        // Inicializar campos dinâmicos com valores padrão do template
        const dynamicData: { [key: string]: any } = {};
        if (template && Array.isArray((template as any).fields)) {
          (template as any).fields.forEach((field: any) => {
            const fieldKey = field.key || field.name || '';
            if (fieldKey) {
              dynamicData[fieldKey] = field.default_value || "";
            }
          });
        }
        setDynamicFields(dynamicData);
      } catch (error: any) {
        console.error('[CreateEquipmentScreen] Erro ao carregar template por tipo:', error);
        Alert.alert('Erro', error.message || 'Falha ao carregar template do tipo de equipamento.');
        setEquipmentTemplate(null);
        setDynamicFields({});
      }
    };

    fetchTemplateByType();
  }, [equipmentTypeId]);

  // Buscar setores quando o cliente mudar
  useEffect(() => {
    const fetchSectors = async () => {
      if (!clientId) {
        setSectors([]);
        return;
      }

      try {
        console.log("[CreateEquipmentScreen] Buscando setores para cliente:", clientId);
        const accessToken = await AsyncStorage.getItem("access_token");
        if (!accessToken) return;

        const sectorsResponse = await ClientService.getClientSectors(clientId, accessToken);
        console.log("[CreateEquipmentScreen] Setores recebidos:", sectorsResponse.results);
        setSectors(sectorsResponse.results || []);

        // Verificar se o setor pré-selecionado está na lista
        if (preSelectedSectorId) {
          const selectedSector = sectorsResponse.results?.find((s: any) => s.id === preSelectedSectorId);
          console.log("[CreateEquipmentScreen] Setor pré-selecionado encontrado na lista:", selectedSector);
        }
      } catch (error) {
        console.error("Erro ao buscar setores:", error);
        setSectors([]);
      }
    };

    fetchSectors();
  }, [clientId]);

  // Carregar setores automaticamente se cliente foi pré-selecionado
  useEffect(() => {
    if (preSelectedClientId && preSelectedClientId.toString() !== clientId) {
      console.log("[CreateEquipmentScreen] Cliente pré-selecionado detectado:", preSelectedClientId);
      setClientId(preSelectedClientId.toString());
    }
  }, [preSelectedClientId]);

  // Carregar setor automaticamente se foi pré-selecionado (após os setores serem carregados)
  useEffect(() => {
    if (preSelectedSectorId && preSelectedSectorId.toString() !== sectorId && sectors.length > 0) {
      console.log("[CreateEquipmentScreen] Setor pré-selecionado detectado:", preSelectedSectorId);
      setSectorId(preSelectedSectorId.toString());
    }
  }, [preSelectedSectorId, sectors]);

  // Log para verificar se há contexto ou não
  useEffect(() => {
    if (preSelectedClientId && preSelectedSectorId) {
      console.log("[CreateEquipmentScreen] ✅ Modo com contexto: Cliente e Setor pré-selecionados");
    } else {
      console.log("[CreateEquipmentScreen] ❌ Modo sem contexto: Usuário deve selecionar manualmente");
    }
  }, [preSelectedClientId, preSelectedSectorId]);

  const fetchSelectData = async (token: string) => {
    try {
      // Buscar clientes
      let allClients: any[] = [];

      if (preSelectedClientId) {
        // Se há um cliente pré-selecionado, buscar todos os clientes (com e sem contrato)
        console.log("[CreateEquipmentScreen] Buscando todos os clientes (com e sem contrato)");

        try {
          // Buscar clientes com contrato
          const clientsWithContract = await ClientService.getClients(true, 1, token, "");
          allClients.push(...clientsWithContract.results);
          console.log("[CreateEquipmentScreen] Clientes com contrato encontrados:", clientsWithContract.results.length);
        } catch (error) {
          console.log("[CreateEquipmentScreen] Erro ao buscar clientes com contrato:", error);
        }

        try {
          // Buscar clientes sem contrato
          const clientsWithoutContract = await ClientService.getClients(false, 1, token, "");
          allClients.push(...clientsWithoutContract.results);
          console.log("[CreateEquipmentScreen] Clientes sem contrato encontrados:", clientsWithoutContract.results.length);
        } catch (error) {
          console.log("[CreateEquipmentScreen] Erro ao buscar clientes sem contrato:", error);
        }

        setClients(allClients);

        // Verificar se o cliente pré-selecionado está na lista
        const selectedClient = allClients.find(c => c.id === preSelectedClientId);
        console.log("[CreateEquipmentScreen] Cliente pré-selecionado encontrado na lista:", selectedClient);
      } else {
        // Sem cliente pré-selecionado: buscar clientes com e sem contrato
        console.log("[CreateEquipmentScreen] Buscando clientes (com e sem contrato)");
        const all: any[] = [];
        try {
          const withContract = await ClientService.getClients(true, 1, token, "");
          all.push(...(withContract.results || []));
          console.log("[CreateEquipmentScreen] Clientes com contrato:", withContract.results?.length || 0);
        } catch (err) {
          console.log("[CreateEquipmentScreen] Erro ao buscar clientes com contrato:", err);
        }

        try {
          const withoutContract = await ClientService.getClients(false, 1, token, "");
          all.push(...(withoutContract.results || []));
          console.log("[CreateEquipmentScreen] Clientes sem contrato:", withoutContract.results?.length || 0);
        } catch (err) {
          console.log("[CreateEquipmentScreen] Erro ao buscar clientes sem contrato:", err);
        }

        // Remover duplicados por id
        const dedup = Array.from(new Map(all.map((c: any) => [c.id, c])).values());
        // Ordenar por nome
        dedup.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        setClients(dedup);
      }

      // Buscar fabricantes
      try {
        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await setDynamicApiUrl(accountName);
        const brandsResponse = await apiClient.get(`${dynamicBaseUrl}/brands`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBrands(brandsResponse.data.results || []);
      } catch (error) {
        console.error("Erro ao buscar fabricantes:", error);
        setBrands([]);
      }

      // Buscar tipos de equipamento
      try {
        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await setDynamicApiUrl(accountName);
        const equipmentTypesResponse = await apiClient.get(`${dynamicBaseUrl}/equipment_types`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEquipmentTypes(equipmentTypesResponse.data.results || []);
      } catch (error) {
        console.error("Erro ao buscar tipos de equipamento:", error);
        setEquipmentTypes([]);
      }
    } catch (error) {
      console.error("Erro ao buscar dados dos selects:", error);
    }
  };

  const handleCreateEquipment = async () => {
    console.log("[CreateEquipmentScreen] Iniciando validação para criação de equipamento");

    // Validar campos obrigatórios fixos
    const requiredFixedFields = [];
    if (!clientId) requiredFixedFields.push("Cliente");
    if (!sectorId) requiredFixedFields.push("Setor");
    if (!brandId) requiredFixedFields.push("Fabricante");
    if (!equipmentTypeId) requiredFixedFields.push("Tipo de Equipamento");
    // Tag removida da validação - é opcional (não deve ser validada como obrigatória)

    if (requiredFixedFields.length > 0) {
      Alert.alert("Erro", `Campos obrigatórios não preenchidos: ${requiredFixedFields.join(", ")}`);
      return;
    }

    // Validar campos dinâmicos obrigatórios baseados no template
    if (equipmentTemplate) {
      console.log("[CreateEquipmentScreen] Validando campos dinâmicos do template");
      const requiredFields = equipmentTemplate.fields.filter(field => field.required);
      const missingFields = requiredFields.filter((field: DynamicField) => {
        const fieldKey = field.key || field.name || '';
        if (!fieldKey) return false;

        const value = dynamicFields[fieldKey];
        console.log(`[CreateEquipmentScreen] Campo ${fieldKey}:`, value, "Tipo:", typeof value);

        // Validação específica por tipo
        if (field.type === 'number') {
          return value === undefined || value === null || value === "" || isNaN(Number(value));
        } else if (field.type === 'boolean') {
          return value === undefined || value === null;
        } else {
          return !value || value === "" || value === "undefined" || value === "null";
        }
      });

      if (missingFields.length > 0) {
        const fieldNames = missingFields.map((f: DynamicField) => f.label || f.name || f.key).join(", ");
        Alert.alert("Erro", `Campos obrigatórios não preenchidos: ${fieldNames}`);
        return;
      }
    }

    try {
      setSaving(true);
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) throw new Error("Token de acesso não encontrado.");

      // Preparar payload com validação de tipos
      // Tag é opcional - só incluir se tiver valor
      const payload: any = {
        client_id: parseInt(clientId),
        sector_id: parseInt(sectorId),
        brand_id: parseInt(brandId),
        equipment_type_id: parseInt(equipmentTypeId),
        ...(tag && tag.trim() ? { tag: tag.trim() } : {}), // Tag opcional - só inclui se tiver valor
        is_active: isActive,
      };

      // Adicionar campos dinâmicos como additional_fields
      if (equipmentTemplate) {
        const additionalFields: { [key: string]: any } = {};

        equipmentTemplate.fields.forEach((field: DynamicField) => {
          const fieldKey = field.key || field.name || '';
          if (!fieldKey) return;

          const rawValue = dynamicFields[fieldKey];
          if (rawValue === undefined) return;

          // radio_with_justification deve seguir o formato do backend
          if (field.type === 'radio_with_justification') {
            const justification = dynamicFields[`${fieldKey}_justification`] || '';
            additionalFields[fieldKey] = {
              label: field.label || field.name || fieldKey,
              value: {
                label: field.label || field.name || fieldKey,
                value: String(rawValue),
                justification: String(justification || ''),
              },
            };
            return;
          }

          // Demais tipos seguem como primitivo convertido
          let value: any = rawValue;
          if (field.type === 'number') {
            value = parseFloat(value);
            if (Number.isNaN(value)) value = null;
          } else if (field.type === 'boolean') {
            value = Boolean(value);
          } else if (field.type === 'measure') {
            // Enviar no formato { label, value, justification }
            const parsed = parseFloat(value);
            additionalFields[fieldKey] = {
              label: field.label || field.name || fieldKey,
              value: Number.isNaN(parsed) ? null : parsed,
              justification: null
            };
            return;
          } else if (field.type === 'radio') {
            // Para radio, enviar no formato esperado pelo backend
            additionalFields[fieldKey] = {
              label: field.label || field.name || fieldKey,
              value: String(value).trim(),
              justification: null
            };
            return;
          } else if (field.type === 'text' || field.type === 'select' || field.type === 'date') {
            // Todos os campos devem usar a estrutura { label, value, justification }
            additionalFields[fieldKey] = {
              label: field.label || field.name || fieldKey,
              value: value !== null && value !== undefined ? String(value).trim() : '',
              justification: null
            };
            return;
          } else if (field.type === 'number') {
            const parsed = parseFloat(value);
            additionalFields[fieldKey] = {
              label: field.label || field.name || fieldKey,
              value: Number.isNaN(parsed) ? null : parsed,
              justification: null
            };
            return;
          } else if (field.type === 'boolean') {
            additionalFields[fieldKey] = {
              label: field.label || field.name || fieldKey,
              value: Boolean(value),
              justification: null
            };
            return;
          }

          // Fallback - usar estrutura padrão
          additionalFields[fieldKey] = {
            label: field.label || field.name || fieldKey,
            value: value,
            justification: null
          };
        });

        // Adicionar additional_fields ao payload
        payload.additional_fields = additionalFields;
      } else {
        // Se não há template, enviar additional_fields vazio
        payload.additional_fields = {};
      }

      console.log("[CreateEquipmentScreen] Payload para criação:", payload);

      await EquipmentService.createEquipment(accessToken, payload);

      Alert.alert("Sucesso", "Equipamento criado com sucesso!");
      navigation.goBack();
    } catch (error: any) {
      console.error("[CreateEquipmentScreen] Erro ao criar equipamento:", error);
      Alert.alert("Erro", error.message || "Falha ao criar equipamento.");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: DynamicField) => {
    const fieldKey = field.key || field.name || '';
    const fieldLabel = field.label || field.name || fieldKey;
    const value = dynamicFields[fieldKey] || "";
    const justification = dynamicFields[`${fieldKey}_justification`] || "";

    switch (field.type) {
      case 'text':
        return (
          <AppTextInput
            style={styles.textInput}
            placeholder={`Digite ${fieldLabel?.toLowerCase() || 'valor'}`}
            placeholderTextColor="#999"
            value={value}
            onChangeText={(text) => setDynamicFields(prev => ({ ...prev, [fieldKey]: text }))}
          />
        );

      case 'number':
        return (
          <AppTextInput
            style={styles.textInput}
            placeholder={`Digite ${fieldLabel?.toLowerCase() || 'valor'}`}
            placeholderTextColor="#999"
            value={value.toString()}
            onChangeText={(text) => setDynamicFields(prev => ({ ...prev, [fieldKey]: parseFloat(text) || 0 }))}
            keyboardType="numeric"
          />
        );

      case 'measure':
        return (
          <View style={styles.measureContainer}>
            <AppTextInput
              style={styles.measureInput}
              placeholder={`Digite ${fieldLabel?.toLowerCase() || 'valor'}`}
              placeholderTextColor="#999"
              value={value.toString()}
              onChangeText={(text) => setDynamicFields(prev => ({ ...prev, [fieldKey]: text }))}
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
            onValueChange={(itemValue) => setDynamicFields(prev => ({ ...prev, [fieldKey]: itemValue }))}
            items={[
              { label: `Selecione ${fieldLabel?.toLowerCase() || 'opção'}`, value: "" },
              ...(field.options || []).map((option, index) => ({ label: option, value: option })),
            ]}
            placeholder={`Selecione ${fieldLabel?.toLowerCase() || 'opção'}`}
            style={styles.pickerContainer}
            searchable={true}
          />
        );

      case 'radio':
        return (
          <View style={styles.radioGroup}>
            {field.options?.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.radioOption, value === option && styles.radioOptionSelected]}
                onPress={() => setDynamicFields(prev => ({ ...prev, [fieldKey]: option }))}
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
                  onPress={() => setDynamicFields(prev => ({ ...prev, [fieldKey]: option }))}
                >
                  <Text style={value === option ? styles.radioTextSelected : styles.radioText}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Justificativa condicional */}
            {value === field.justification_target && (
              <AppTextInput
                style={styles.justificationInput}
                placeholder="Justificativa"
                placeholderTextColor="#999"
                value={justification}
                onChangeText={(text) => setDynamicFields(prev => ({ ...prev, [`${fieldKey}_justification`]: text }))}
              />
            )}
          </View>
        );

      case 'boolean':
        return (
          <View style={styles.switchContainer}>
            <Switch
              value={value}
              onValueChange={(newValue) => setDynamicFields(prev => ({ ...prev, [fieldKey]: newValue }))}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={value ? "#007BFF" : "#f4f3f4"}
            />
            <Text style={styles.switchLabel}>{value ? "Sim" : "Não"}</Text>
          </View>
        );

      default:
        return (
          <AppTextInput
            style={styles.textInput}
            placeholder={`Digite ${fieldLabel?.toLowerCase() || 'valor'}`}
            placeholderTextColor="#999"
            value={value}
            onChangeText={(text) => setDynamicFields(prev => ({ ...prev, [fieldKey]: text }))}
          />
        );
    }
  };

  const renderSelectField = (label: string, value: string, onValueChange: (value: string) => void, options: any[], placeholder: string) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}*</Text>
      <CustomPicker
        selectedValue={value}
        onValueChange={onValueChange}
        items={options.map((option) => ({ label: option.complete_name || option.name, value: option.id.toString() }))}
        placeholder={placeholder}
        style={styles.picker}
        searchable={true}
      />
    </View>
  );

  if (loading) {
    return (
      <ResponsiveContainer withPadding={false} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer withPadding={false} style={styles.container}>
      {/* Header */}
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
            <Text style={styles.headerTitle}>Criar Equipamento</Text>
            <Text style={styles.headerSubtitle}>Adicione um novo equipamento</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Campos Fixos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="settings" size={20} color="#007BFF" />
              <Text style={styles.sectionTitle}>Informações Básicas</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tag*</Text>
              <AppTextInput
                style={styles.textInput}
                placeholder="Digite a tag do equipamento"
                placeholderTextColor="#999"
                value={tag}
                onChangeText={setTag}
              />
            </View>

            {renderSelectField("Cliente", clientId, setClientId, clients, "Selecione o cliente")}
            {renderSelectField("Setor", sectorId, setSectorId, sectors, "Selecione o setor")}
            {renderSelectField("Fabricante", brandId, setBrandId, brands, "Selecione o fabricante")}
            {renderSelectField("Tipo de Equipamento", equipmentTypeId, setEquipmentTypeId, equipmentTypes, "Selecione o tipo")}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Status Ativo</Text>
              <View style={styles.switchContainer}>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={isActive ? "#007BFF" : "#f4f3f4"}
                />
                <Text style={styles.switchLabel}>{isActive ? "Ativo" : "Inativo"}</Text>
              </View>
            </View>
          </View>

          {/* Campos Dinâmicos */}
          {equipmentTemplate && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="dynamic-feed" size={20} color="#007BFF" />
                <Text style={styles.sectionTitle}>Especificações Técnicas</Text>
              </View>

              {(equipmentTemplate?.fields || [])
                .filter((field: DynamicField) => (field.key || field.name) && (field.key || field.name)?.trim() !== '')
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((field: DynamicField) => (
                  <View key={(field.id || field.key || field.name) as any} style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {field.label || field.name || field.key}
                      {field.required && <Text style={styles.required}>*</Text>}
                    </Text>
                    {renderField(field)}
                  </View>
                ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Botão de Criar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, saving && styles.createButtonDisabled]}
          onPress={handleCreateEquipment}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Criar Equipamento</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ResponsiveContainer>
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
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  inputGroup: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f9fa",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#FF6B6B",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: "#333",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  picker: {
    height: 50,
    color: "#333",
    backgroundColor: "#fff",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  footer: {
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
  createButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#28a745",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    backgroundColor: "#ccc",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  // Estilos para campos dinâmicos
  measureContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  measureInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: "#333",
  },
  measureUnit: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    minWidth: 40,
  },
  radioGroup: {
    gap: 8,
  },
  radioOption: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f8f9fa",
  },
  radioOptionSelected: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  radioText: {
    fontSize: 16,
    color: "#333",
  },
  radioTextSelected: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  justificationInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#007BFF",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: "#333",
  },
});

export default CreateEquipmentScreen;