import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Switch,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
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

const { width } = Dimensions.get('window');

interface EditEquipmentScreenProps {
  route: RouteProp<RootStackParamList, "EditEquipmentScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "EditEquipmentScreen">;
}

const EditEquipmentScreen: React.FC<EditEquipmentScreenProps> = ({
  route,
  navigation,
}) => {
  const { equipmentId } = route.params;

  // Estados para campos fixos
  const [clientId, setClientId] = useState<string>("");
  const [sectorId, setSectorId] = useState<string>("");
  const [brandId, setBrandId] = useState<string>("");
  const [equipmentTypeId, setEquipmentTypeId] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  // Estados para dados do template e equipamento
  const [equipmentTemplate, setEquipmentTemplate] = useState<EquipmentTemplate | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
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

        // Buscar template de equipamento
        const template = await EquipmentService.getEquipmentTemplate(accessToken);
        setEquipmentTemplate(template);

        // Buscar detalhes do equipamento
        const equipmentDetails = await EquipmentService.fetchEquipmentDetails(equipmentId, accessToken);
        setEquipment(equipmentDetails);

        // Preencher campos fixos (fallback para objetos quando *_id não vierem)
        setClientId(
          (equipmentDetails.client_id ?? equipmentDetails.client?.id)?.toString() || ""
        );
        setSectorId(
          (equipmentDetails.sector_id ?? equipmentDetails.sector?.id)?.toString() || ""
        );
        setBrandId(
          (equipmentDetails.brand_id ?? equipmentDetails.brand?.id)?.toString() || ""
        );
        setEquipmentTypeId(
          (equipmentDetails.equipment_type_id ?? equipmentDetails.equipment_type?.id)?.toString() || ""
        );
        setTag(equipmentDetails.tag || "");
        setIsActive(equipmentDetails.is_active !== false);

        // Preencher campos dinâmicos (extraindo value/label quando vier objeto). Fallback por label quando key não bater
        const dynamicData: { [key: string]: any } = {};
        template.fields.forEach(field => {
          const fieldKey = field.key || field.name || '';
          if (!fieldKey) return;
          let value = (equipmentDetails as any)?.additional_fields?.[fieldKey];
          if (value === undefined || value === null) {
            // Fallback por label
            const af = (equipmentDetails as any)?.additional_fields;
            if (af && typeof af === 'object') {
              const fieldLabel = field.label || field.name || fieldKey;
              const match = Object.values(af as any).find((entry: any) => {
                try {
                  const lbl = (entry?.label || '').toString().trim().toLowerCase();
                  const fld = (fieldLabel || '').toString().trim().toLowerCase();
                  return lbl && fld && lbl === fld;
                } catch { return false; }
              });
              if (match) value = match as any;
            }
          }
          if (value === undefined || value === null) {
            value = (equipmentDetails as any)[fieldKey];
          }
          // Se o valor vier como objeto { value, label } ou { id, name }, extrair o representativo
          if (value && typeof value === 'object') {
            if ('value' in value) {
              value = (value as any).value;
            } else if ('name' in value) {
              value = (value as any).name;
            } else if ('id' in value) {
              value = (value as any).id;
            }
          }
          dynamicData[fieldKey] = value !== undefined && value !== null ? value : (field.default_value || "");
        });
        setDynamicFields(dynamicData);

        // Buscar dados dos selects, garantindo inclusão dos valores atuais do equipamento
        await fetchSelectData(accessToken, equipmentDetails);

      } catch (error: any) {
        console.error("[EditEquipmentScreen] Erro ao buscar dados:", error);
        Alert.alert("Erro", error.message || "Falha ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [equipmentId]);

  // Buscar setores quando o cliente mudar
  useEffect(() => {
    const fetchSectors = async () => {
      if (!clientId) {
        setSectors([]);
        return;
      }

      try {
        const accessToken = await AsyncStorage.getItem("access_token");
        if (!accessToken) return;

        const sectorsResponse = await ClientService.getClientSectors(clientId, accessToken);
        setSectors(sectorsResponse.results || []);
      } catch (error) {
        console.error("Erro ao buscar setores:", error);
        setSectors([]);
      }
    };

    fetchSectors();
  }, [clientId]);

  const fetchSelectData = async (token: string, currentEquipment?: any) => {
    try {
      // Buscar clientes (com e sem contrato) e mesclar
      const mergedClientsMap: Record<string, any> = {};
      try {
        const withContract = await ClientService.getClients(true, 1, token, "");
        (withContract.results || []).forEach((c: any) => { mergedClientsMap[c.id] = c; });
      } catch (e) {
        console.log("[EditEquipmentScreen] Falha ao buscar clientes com contrato:", e);
      }
      try {
        const withoutContract = await ClientService.getClients(false, 1, token, "");
        (withoutContract.results || []).forEach((c: any) => { mergedClientsMap[c.id] = c; });
      } catch (e) {
        console.log("[EditEquipmentScreen] Falha ao buscar clientes sem contrato:", e);
      }
      let mergedClients = Object.values(mergedClientsMap) as any[];
      // Garantir inclusão do cliente atual do equipamento
      if (currentEquipment?.client) {
        const exists = mergedClients.some((c: any) => c.id === currentEquipment.client.id);
        if (!exists) mergedClients = [...mergedClients, currentEquipment.client];
      }
      setClients(mergedClients);

      // Buscar fabricantes
      try {
        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await setDynamicApiUrl(accountName);
        const brandsResponse = await apiClient.get(`${dynamicBaseUrl}/brands`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        let brandsData = brandsResponse.data.results || [];
        // Garantir inclusão do fabricante atual
        if (currentEquipment?.brand) {
          const exists = brandsData.some((b: any) => b.id === currentEquipment.brand.id);
          if (!exists) brandsData = [...brandsData, currentEquipment.brand];
        }
        setBrands(brandsData);
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
        let typesData = equipmentTypesResponse.data.results || [];
        // Garantir inclusão do tipo atual
        if (currentEquipment?.equipment_type) {
          const exists = typesData.some((t: any) => t.id === currentEquipment.equipment_type.id);
          if (!exists) typesData = [...typesData, currentEquipment.equipment_type];
        }
        setEquipmentTypes(typesData);
      } catch (error) {
        console.error("Erro ao buscar tipos de equipamento:", error);
        setEquipmentTypes([]);
      }
    } catch (error) {
      console.error("Erro ao buscar dados dos selects:", error);
    }
  };

  const handleUpdateEquipment = async () => {
    // Validar campos obrigatórios fixos
    if (!clientId || !sectorId || !brandId || !equipmentTypeId || !tag) {
      Alert.alert("Erro", "Preencha todos os campos obrigatórios.");
      return;
    }

    // Validar campos dinâmicos obrigatórios
    if (equipmentTemplate) {
      const requiredFields = equipmentTemplate.fields.filter(field => field.required);
      const missingFields = requiredFields.filter((field: DynamicField) => {
        const fieldKey = field.key || field.name || '';
        const value = dynamicFields[fieldKey];
        return fieldKey && (value === undefined || value === null || value === "");
      });

      if (missingFields.length > 0) {
        Alert.alert("Erro", `Campos obrigatórios não preenchidos: ${missingFields.map((f: DynamicField) => f.label || f.name || f.key).join(", ")}`);
        return;
      }
    }

    try {
      setSaving(true);
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) throw new Error("Token de acesso não encontrado.");

      const payload: any = {
        client_id: parseInt(clientId),
        sector_id: parseInt(sectorId),
        brand_id: parseInt(brandId),
        equipment_type_id: parseInt(equipmentTypeId),
        tag,
        is_active: isActive,
      };

      // Montar additional_fields a partir do template e dos valores atuais
      if (equipmentTemplate) {
        const additionalFields: { [key: string]: any } = {};
        equipmentTemplate.fields.forEach((field: DynamicField) => {
          const fieldKey = field.key || field.name || '';
          if (!fieldKey) return;

          const rawValue = dynamicFields[fieldKey];
          if (rawValue === undefined) return;

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

          let value: any = rawValue;
          if (field.type === 'number') {
            const parsed = parseFloat(value);
            value = Number.isNaN(parsed) ? null : parsed;
          } else if (field.type === 'boolean') {
            value = Boolean(value);
          } else if (field.type === 'text' || field.type === 'measure' || field.type === 'select' || field.type === 'radio' || field.type === 'date') {
            value = value !== null && value !== undefined ? String(value).trim() : '';
          }
          additionalFields[fieldKey] = value;
        });
        payload.additional_fields = additionalFields;
      } else {
        payload.additional_fields = {};
      }

      await EquipmentService.updateEquipment(accessToken, equipmentId, payload);

      Alert.alert("Sucesso", "Equipamento atualizado com sucesso!");
      navigation.goBack();
    } catch (error: any) {
      console.error("[EditEquipmentScreen] Erro ao atualizar equipamento:", error);
      Alert.alert("Erro", error.message || "Falha ao atualizar equipamento.");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: DynamicField) => {
    const fieldKey = field.key || field.name || '';
    const fieldLabel = field.label || field.name || fieldKey;
    const value = dynamicFields[fieldKey] ?? "";
    const justification = dynamicFields[`${fieldKey}_justification`] || "";

    switch (field.type) {
      case 'text':
        return (
          <TextInput
            style={styles.textInput}
            placeholder={`Digite ${fieldLabel?.toLowerCase() || 'valor'}`}
            placeholderTextColor="#999"
            value={String(value)}
            onChangeText={(text) => setDynamicFields(prev => ({ ...prev, [fieldKey]: text }))}
          />
        );

      case 'number':
        return (
          <TextInput
            style={styles.textInput}
            placeholder={`Digite ${fieldLabel?.toLowerCase() || 'valor'}`}
            placeholderTextColor="#999"
            value={value !== "" && value !== null && value !== undefined ? String(value) : ""}
            onChangeText={(text) => setDynamicFields(prev => ({ ...prev, [fieldKey]: text }))}
            keyboardType="numeric"
          />
        );

      case 'measure':
        return (
          <View style={styles.measureContainer}>
            <TextInput
              style={styles.measureInput}
              placeholder={`Digite ${fieldLabel?.toLowerCase() || 'valor'}`}
              placeholderTextColor="#999"
              value={value !== "" && value !== null && value !== undefined ? String(value) : ""}
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
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={value}
              onValueChange={(itemValue) => setDynamicFields(prev => ({ ...prev, [fieldKey]: itemValue }))}
              style={styles.picker}
            >
              <Picker.Item label={`Selecione ${fieldLabel?.toLowerCase() || 'opção'}`} value="" />
              {field.options?.map((option, index) => (
                <Picker.Item key={index} label={option} value={option} />
              ))}
            </Picker>
          </View>
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
            {value === field.justification_target && (
              <TextInput
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
              value={Boolean(value)}
              onValueChange={(newValue) => setDynamicFields(prev => ({ ...prev, [fieldKey]: newValue }))}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={value ? "#007BFF" : "#f4f3f4"}
            />
            <Text style={styles.switchLabel}>{value ? "Sim" : "Não"}</Text>
          </View>
        );

      default:
        return (
          <TextInput
            style={styles.textInput}
            placeholder={`Digite ${fieldLabel?.toLowerCase() || 'valor'}`}
            placeholderTextColor="#999"
            value={String(value)}
            onChangeText={(text) => setDynamicFields(prev => ({ ...prev, [fieldKey]: text }))}
          />
        );
    }
  };

  const renderSelectField = (label: string, value: string, onValueChange: (value: string) => void, options: any[], placeholder: string) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}*</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          style={styles.picker}
        >
          <Picker.Item label={placeholder} value="" />
          {options.map((option) => (
            <Picker.Item key={option.id} label={(option.complete_name || option.name)} value={option.id.toString()} />
          ))}
        </Picker>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando dados do equipamento...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            <Text style={styles.headerTitle}>Editar Equipamento</Text>
            <Text style={styles.headerSubtitle}>{equipment?.tag || "Carregando..."}</Text>
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
              <TextInput
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

              {equipmentTemplate.fields
                .filter((field: DynamicField) => (field.key || field.name) && (field.key || field.name)?.trim() !== '')
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((field: DynamicField) => (
                  <View key={field.id || field.key} style={styles.inputGroup}>
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

      {/* Botão de Salvar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleUpdateEquipment}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Salvar Alterações</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  saveButton: {
    backgroundColor: "#007BFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#007BFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
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

export default EditEquipmentScreen;
