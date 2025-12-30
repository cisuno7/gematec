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
import apiClient, { getRequestStats, addRequestListener, removeRequestListener, addResponseListener, removeResponseListener, resetRequestStats, EquipmentLock } from "../../Context/ApiClient";
import ResponsiveContainer from "../../Components/ResponsiveContainer";
import AppTextInput from "../../Components/AppTextInput";
import CustomPicker from "../../Components/CustomPicker";

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
  const [hasUserChangedType, setHasUserChangedType] = useState<boolean>(false);

  useEffect(() => {
    // Monitor de requisições específico desta tela (menos frequente para reduzir logs)
    resetRequestStats();
    const reqLogger = (ev: any) => {
      // Só loga requisições importantes desta tela
      if (ev.url?.includes('/equipments') || ev.url?.includes('/brands') || ev.url?.includes('/equipment_types')) {
        console.log('[EditEquipmentScreen][REQ]', ev.method?.toUpperCase(), ev.url);
      }
    };
    const resLogger = (ev: any) => {
      // Só loga respostas de erro ou requisições importantes
      if (ev.status >= 400 || ev.url?.includes('/equipments') || ev.url?.includes('/brands') || ev.url?.includes('/equipment_types')) {
        console.log('[EditEquipmentScreen][RES]', ev.method?.toUpperCase(), ev.url, ev.status);
      }
    };
    addRequestListener(reqLogger);
    addResponseListener(resLogger);

    // Estatísticas a cada 10 segundos (menos frequente)
    const interval = setInterval(() => {
      const stats = getRequestStats();
      console.log('[EditEquipmentScreen][STATS/min]', {
        totalInWindow: stats.totalInWindow,
        byUrl: stats.byUrl,
      });
    }, 10000);

    return () => {
      clearInterval(interval);
      removeRequestListener(reqLogger);
      removeResponseListener(resLogger);
    };
  }, []);

  useEffect(() => {
    console.log('[EditEquipmentScreen] UseEffect executado! Equipment ID:', equipmentId);

    const fetchData = async () => {
      console.log('[EditEquipmentScreen] FetchData iniciado');
      try {
        console.log('[EditEquipmentScreen] Definindo loading como true');
        setLoading(true);

        console.log('[EditEquipmentScreen] Buscando token do AsyncStorage');
        const accessToken = await AsyncStorage.getItem("access_token");

        console.log('[EditEquipmentScreen] Token encontrado?', !!accessToken);
        if (!accessToken) throw new Error("Token de acesso não encontrado.");

        console.log('[EditEquipmentScreen] ===== INICIANDO CARREGAMENTO =====');
        console.log('[EditEquipmentScreen] Equipment ID:', equipmentId);

        // Buscar detalhes do equipamento
        console.log('[EditEquipmentScreen] Buscando detalhes do equipamento...');
        const equipmentDetails = await EquipmentService.fetchEquipmentDetails(equipmentId, accessToken);
        console.log('[EditEquipmentScreen] ===== DADOS DO EQUIPAMENTO RECEBIDOS =====');
        console.log('[EditEquipmentScreen] Equipment details completo:', JSON.stringify(equipmentDetails, null, 2));
        console.log('[EditEquipmentScreen] Additional fields do backend:', equipmentDetails?.additional_fields);
        console.log('[EditEquipmentScreen] Tipo de additional_fields:', typeof equipmentDetails?.additional_fields);
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

        // Buscar template vinculado ao tipo do equipamento (conforme tarefas.md)
        let currentTemplate: EquipmentTemplate | null = null;
        if (equipmentDetails?.equipment_type?.id || equipmentDetails?.equipment_type_id) {
          const typeId = Number(equipmentDetails.equipment_type?.id || equipmentDetails.equipment_type_id);
          console.log('[EditEquipmentScreen] Buscando template por tipo de equipamento:', typeId);
          try {
            const templateByType = await EquipmentService.getEquipmentTemplateByEquipmentType(typeId, accessToken);
            setEquipmentTemplate(templateByType);
            currentTemplate = templateByType;
          } catch (e) {
            console.error('[EditEquipmentScreen] Falha ao buscar template por tipo, seguindo sem template:', e);
            setEquipmentTemplate(null);
            currentTemplate = null;
          }
        } else {
          console.warn('[EditEquipmentScreen] Tipo de equipamento não encontrado no equipamento, sem template');
          setEquipmentTemplate(null);
          currentTemplate = null;
        }

        // Preencher campos dinâmicos com fallback robusto (rastreia label/value/name/arrays e justificativa)
        const normalizeText = (text: any) =>
          (text || '')
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/gi, '')
            .toLowerCase();

        const extractPrimitive = (val: any): any => {
          if (val === undefined || val === null) return null;
          if (typeof val !== 'object') return val;
          if (Array.isArray(val)) {
            const mapped = val
              .map((item) => extractPrimitive(item))
              .filter((v) => v !== null && v !== undefined && v !== '');
            return mapped.join(', ');
          }
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

        const dynamicData: { [key: string]: any } = {};
        const sources = [
          (equipmentDetails as any)?.additional_fields,
          (equipmentDetails as any)?.dynamic_fields,
          (equipmentDetails as any)?.fields,
          (equipmentDetails as any)?.attributes,
          (equipmentDetails as any)?.custom_fields,
        ];

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
            } catch { return false; }
          });
          if (byLabel) return byLabel?.value ?? byLabel;
          return undefined;
        };

        const getFromObject = (obj: any, targetKey: string, targetLabel: string) => {
          if (!obj) return undefined;
          if (Object.prototype.hasOwnProperty.call(obj, targetKey)) return obj[targetKey];
          // tenta normalizar keys simples (quando additional_fields é { key: valor })
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
          // Adicionar busca específica para 'especificações técnicas'
          const specTecKey = normalizeText('especificacoes tecnicas');
          if (normalizeText(fieldKey) === specTecKey || normalizeText(fieldLabel) === specTecKey) {
            const specVal = (equipmentDetails as any)?.especificacoes_tecnicas || (equipmentDetails as any)?.specs || '';
            if (specVal) return specVal;
          }
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
            } catch { }
          }
          return (equipmentDetails as any)[fieldKey] || '';
        };

        console.log('[EditEquipmentScreen] ===== PROCESSANDO CAMPOS DINÂMICOS =====');
        if (currentTemplate) {
          console.log('[EditEquipmentScreen] Template fields:', currentTemplate.fields.length);
          try {
            console.log('[EditEquipmentScreen] Template completo:', JSON.stringify(currentTemplate, null, 2));
          } catch (e) {
            console.error('[EditEquipmentScreen] Erro ao serializar template:', e);
            console.log('[EditEquipmentScreen] Template (básico):', { id: currentTemplate.id, fields: currentTemplate.fields?.length || 0 });
          }
        } else {
          console.log('[EditEquipmentScreen] Sem template disponível para processamento de campos dinâmicos.');
        }

        console.log('[EditEquipmentScreen] Sources para busca de dados:', sources.map((s, i) => ({ index: i, hasData: !!s, type: typeof s })));

        try {
          const totalFields = (currentTemplate?.fields || []).length;
          (currentTemplate?.fields || []).forEach((field: DynamicField, index: number) => {
            console.log(`[EditEquipmentScreen] ===== PROCESSANDO CAMPO ${index + 1}/${totalFields} =====`);
            const fieldKey = field.key || field.name || '';
            if (!fieldKey) {
              console.warn('[EditEquipmentScreen] Campo sem key/name:', field);
              return;
            }
            const fieldLabel = field.label || field.name || fieldKey;

            console.log(`[EditEquipmentScreen] Processando campo: ${fieldKey} (${fieldLabel})`);

            const raw = getDynamicValue(fieldKey, fieldLabel);
            console.log(`[EditEquipmentScreen] Valor raw para ${fieldKey}:`, raw);

            // Pré-preencher justificativa quando aplicável
            if (field.type === 'radio_with_justification') {
              const af = (equipmentDetails as any)?.additional_fields || {};
              const just = (af[fieldKey]?.value?.justification) || (af[fieldKey]?.justification) || '';
              if (just) {
                dynamicData[`${fieldKey}_justification`] = String(just);
              }
            }

            let value = extractPrimitive(raw);
            if (value === null || value === undefined || value === '') {
              value = field.default_value || '';
            }
            // Medida: garantir string/número amigável para o input
            if (field.type === 'measure' && typeof value === 'object' && value !== null) {
              const num = (value as any).value ?? '';
              value = num;
            }

            // Mapear selects/radios para opções do template (case-insensitive)
            if ((field.type === 'select' || field.type === 'radio' || field.type === 'radio_with_justification') && Array.isArray(field.options) && field.options.length > 0) {
              const norm = (s: any) => normalizeText(String(s));
              // normalizar booleans comuns
              const boolMap: Record<string, string> = { 'true': 'Sim', '1': 'Sim', 'sim': 'Sim', 'yes': 'Sim', 'false': 'Não', '0': 'Não', 'nao': 'Não', 'não': 'Não', 'no': 'Não' };
              const normalizedValue = boolMap[norm(value)] ?? value;
              const matched = field.options.find((opt: any) => norm(opt) === norm(normalizedValue));
              if (matched) value = matched;
            }

            console.log(`[EditEquipmentScreen] Valor final para ${fieldKey}:`, value);
            dynamicData[fieldKey] = value;
          });

          console.log('[EditEquipmentScreen] ===== RESULTADO FINAL DO PROCESSAMENTO =====');
          console.log('[EditEquipmentScreen] DynamicData keys:', Object.keys(dynamicData));
          console.log('[EditEquipmentScreen] DynamicData com valores:', Object.entries(dynamicData).filter(([k, v]) => v !== '' && v !== null && v !== undefined));
          console.log('[EditEquipmentScreen] DynamicData final completo:', dynamicData);
          console.log('[EditEquipmentScreen] ===== FIM PROCESSAMENTO =====');
        } catch (fieldError: any) {
          console.error('[EditEquipmentScreen] ERRO ao processar campos dinâmicos:', fieldError);
          console.error('[EditEquipmentScreen] Stack trace:', fieldError.stack);
        }

        setDynamicFields(dynamicData);

        // Buscar dados dos selects, garantindo inclusão dos valores atuais do equipamento
        await fetchSelectData(accessToken, equipmentDetails);

      } catch (error: any) {
        console.error("[EditEquipmentScreen] ===== ERRO GERAL NO CARREGAMENTO =====");
        console.error("[EditEquipmentScreen] Erro ao buscar dados:", error);
        console.error("[EditEquipmentScreen] Stack trace completo:", error.stack);
        console.error("[EditEquipmentScreen] Tipo do erro:", typeof error);
        console.error("[EditEquipmentScreen] ===== FIM ERRO GERAL =====");
        Alert.alert("Erro", error.message || "Falha ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    console.log('[EditEquipmentScreen] Chamando fetchData()...');
    fetchData();
    console.log('[EditEquipmentScreen] fetchData() chamado!');
  }, [equipmentId]);

  // Buscar template somente quando o usuário alterar o tipo de equipamento
  useEffect(() => {
    const loadTemplateOnTypeChange = async () => {
      try {
        if (!hasUserChangedType) return;
        if (!equipmentTypeId) {
          setEquipmentTemplate(null);
          setDynamicFields({});
          return;
        }
        const accessToken = await AsyncStorage.getItem("access_token");
        if (!accessToken) return;

        const typeIdNum = Number(equipmentTypeId);
        if (!Number.isFinite(typeIdNum)) return;

        const templateByType = await EquipmentService.getEquipmentTemplateByEquipmentType(typeIdNum, accessToken);
        setEquipmentTemplate(templateByType);

        // Inicializar dynamicFields com defaults do template
        const defaults: { [key: string]: any } = {};
        (templateByType?.fields || []).forEach((field: DynamicField) => {
          const fieldKey = field.key || field.name || '';
          if (fieldKey) defaults[fieldKey] = field.default_value || '';
        });
        setDynamicFields(defaults);
      } catch (e: any) {
        console.error('[EditEquipmentScreen] Erro ao carregar template por tipo:', e);
        setEquipmentTemplate(null);
        setDynamicFields({});
      }
    };
    loadTemplateOnTypeChange();
  }, [equipmentTypeId, hasUserChangedType]);

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
    console.log("[EditEquipmentScreen] ===== INICIANDO ATUALIZAÇÃO =====");
    console.log("[EditEquipmentScreen] Equipment template presente?:", !!equipmentTemplate);
    console.log("[EditEquipmentScreen] Dynamic fields atual:", dynamicFields);
    console.log("[EditEquipmentScreen] Template fields:", equipmentTemplate?.fields?.length || 0);

    // Verifica se o equipamento já está sendo modificado por outra tela
    console.log("[EditEquipmentScreen] Verificando lock para equipamento:", equipmentId);
    console.log("[EditEquipmentScreen] Status do lock:", EquipmentLock.isLocked(equipmentId));

    if (EquipmentLock.isLocked(equipmentId)) {
      console.warn("[EditEquipmentScreen] ❌ BLOQUEADO: Equipamento já está bloqueado por outra operação:", equipmentId);
      Alert.alert("Aguarde", "Este equipamento está sendo modificado por outra tela. Aguarde a operação terminar.");
      return;
    }

    console.log("[EditEquipmentScreen] ✅ Lock liberado, prosseguindo com operação");

    console.log("[EditEquipmentScreen] Valores atuais:", {
      clientId, sectorId, brandId, equipmentTypeId, tag, isActive
    });

    // Validar campos obrigatórios fixos
    // Tag é opcional - não deve ser validada como obrigatória
    if (!clientId || !sectorId || !brandId || !equipmentTypeId) {
      console.log("[EditEquipmentScreen] Campos obrigatórios faltando:", {
        clientId: !!clientId,
        sectorId: !!sectorId,
        brandId: !!brandId,
        equipmentTypeId: !!equipmentTypeId,
        tag: !!tag // Tag é opcional, apenas para log
      });
      Alert.alert("Erro", "Preencha todos os campos obrigatórios.");
      return;
    }

    console.log("[EditEquipmentScreen] Campos obrigatórios validados com sucesso");

    // Validar campos dinâmicos obrigatórios
    if (equipmentTemplate) {
      console.log("[EditEquipmentScreen] Validando campos dinâmicos obrigatórios");
      const requiredFields = equipmentTemplate.fields.filter(field => field.required);
      console.log("[EditEquipmentScreen] Campos obrigatórios dinâmicos:", requiredFields.map(f => ({ key: f.key, label: f.label })));

      const missingFields = requiredFields.filter((field: DynamicField) => {
        const fieldKey = field.key || field.name || '';
        const value = dynamicFields[fieldKey];
        console.log(`[EditEquipmentScreen] Campo ${fieldKey}:`, { value, required: field.required });
        return fieldKey && (value === undefined || value === null || value === "");
      });

      if (missingFields.length > 0) {
        console.log("[EditEquipmentScreen] Campos obrigatórios faltando:", missingFields.map(f => f.key || f.label));
        Alert.alert("Erro", `Campos obrigatórios não preenchidos: ${missingFields.map((f: DynamicField) => f.label || f.name || f.key).join(", ")}`);
        return;
      }
      console.log("[EditEquipmentScreen] Campos dinâmicos validados com sucesso");
    }

    try {
      console.log("[EditEquipmentScreen] Iniciando construção do payload");
      setSaving(true);
      const accessToken = await AsyncStorage.getItem("access_token");
      console.log("[EditEquipmentScreen] Token obtido:", !!accessToken);
      if (!accessToken) throw new Error("Token de acesso não encontrado.");

      // Tag é opcional - só incluir se tiver valor
      const payload: any = {
        client_id: parseInt(clientId),
        sector_id: parseInt(sectorId),
        brand_id: parseInt(brandId),
        equipment_type_id: parseInt(equipmentTypeId),
        ...(tag && tag.trim() ? { tag: tag.trim() } : {}), // Tag opcional - só inclui se tiver valor
      };

      console.log("[EditEquipmentScreen] Payload base construído:", payload);
      console.log("[EditEquipmentScreen] DynamicFields no momento da construção:", dynamicFields);
      console.log("[EditEquipmentScreen] Número de campos no template:", equipmentTemplate?.fields?.length || 0);

      // Montar additional_fields a partir do template e dos valores atuais
      if (equipmentTemplate) {
        const additionalFields: { [key: string]: { value: any; justification?: string | null } } = {};
        console.log("[EditEquipmentScreen] ===== MONTANDO ADDITIONAL_FIELDS =====");

        equipmentTemplate.fields.forEach((field: DynamicField) => {
          const fieldKey = field.key || field.name || '';

          console.log(`[EditEquipmentScreen] Verificando campo: ${fieldKey}`);

          // Validar que temos uma chave válida
          if (!fieldKey || fieldKey.trim() === '') {
            console.warn(`[EditEquipment] Campo sem chave válida:`, field);
            return;
          }

          const rawValue = dynamicFields[fieldKey];
          console.log(`[EditEquipmentScreen] Valor de dynamicFields[${fieldKey}]:`, rawValue);

          if (rawValue === undefined || rawValue === null || rawValue === '') {
            console.log(`[EditEquipmentScreen] Campo ${fieldKey} ignorado: valor vazio`);
            return;
          }

          console.log(`[EditEquipment] Processando campo ${fieldKey} (${field.type}): valor =`, rawValue);

          // Estrutura conforme exemplo do backend: { value: X, justification: Y }
          let fieldValue: any = rawValue;
          let justification: string | null = null;

          if (field.type === 'radio_with_justification') {
            justification = dynamicFields[`${fieldKey}_justification`] || null;
          }

          // Converter números para number, strings para string
          if (field.type === 'number' || field.type === 'measure') {
            fieldValue = parseFloat(rawValue) || 0;
          } else {
            fieldValue = String(rawValue);
          }

          console.log(`[EditEquipmentScreen] Adicionando ${fieldKey} = {value: ${fieldValue}, justification: ${justification}} em additional_fields`);
          additionalFields[fieldKey] = {
            value: fieldValue,
            justification: justification
          };
        });

        console.log("[EditEquipmentScreen] ===== RESULTADO ADDITIONAL_FIELDS =====");
        console.log("[EditEquipmentScreen] Additional fields keys:", Object.keys(additionalFields));
        console.log("[EditEquipment] Additional fields construído:", JSON.stringify(additionalFields, null, 2));
        payload.additional_fields = additionalFields;
      } else {
        console.log("[EditEquipment] Nenhum template encontrado, enviando additional_fields vazio");
        payload.additional_fields = {};
      }

      // Garantir que additional_fields sempre existe no payload
      if (!payload.additional_fields) {
        console.warn("[EditEquipment] additional_fields estava undefined, definindo como objeto vazio");
        payload.additional_fields = {};
      }

      console.log("[EditEquipmentScreen] Payload final antes da API:", JSON.stringify(payload, null, 2));

      // Log detalhado do payload antes de enviar
      try {
        console.log("[EditEquipmentScreen] Payload UPDATE (resumo):", {
          client_id: payload.client_id,
          sector_id: payload.sector_id,
          brand_id: payload.brand_id,
          equipment_type_id: payload.equipment_type_id,
          tag: payload.tag,
          additional_fields_keys: payload.additional_fields ? Object.keys(payload.additional_fields) : [],
        });
        // Opcional: log completo (cuidado com tamanho)
        console.log("[EditEquipmentScreen] Payload UPDATE (completo):", payload);
      } catch { }

      console.log("[EditEquipmentScreen] ===== CHAMANDO EQUIPMENT SERVICE =====");
      console.log("[EditEquipmentScreen] Payload tem additional_fields?:", !!payload?.additional_fields);
      console.log("[EditEquipmentScreen] Payload keys:", Object.keys(payload));
      console.log("[EditEquipmentScreen] Additional fields content:", payload?.additional_fields);

      try {
        await EquipmentService.updateEquipment(accessToken, equipmentId, payload);
      } catch (apiError: any) {
        if (apiError.response?.status === 500) {
          console.error("[EditEquipmentScreen] Erro 500 no servidor. Detalhes:", apiError.response.data);
          console.error("[EditEquipmentScreen] Tentando fallback sem additional_fields...");
          const fallbackPayload = { ...payload };
          delete fallbackPayload.additional_fields;
          await EquipmentService.updateEquipment(accessToken, equipmentId, fallbackPayload);
          Alert.alert("Sucesso Parcial", "Atualizado sem campos adicionais devido a erro no servidor.");
        } else if (apiError.message.includes('activities')) {
          Alert.alert("Aviso", "Falha ao carregar histórico de atividades, mas atualização prosseguiu.");
        } else {
          throw apiError;
        }
      }

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
          <AppTextInput
            style={styles.textInput}
            placeholder={`Digite ${fieldLabel?.toLowerCase() || 'valor'}`}
            placeholderTextColor="#999"
            value={String(value)}
            onChangeText={(text) => setDynamicFields(prev => ({ ...prev, [fieldKey]: text }))}
          />
        );

      case 'number':
        return (
          <AppTextInput
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
            <AppTextInput
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
          <AppTextInput
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
      <CustomPicker
        selectedValue={value}
        onValueChange={onValueChange}
        items={(options || []).map((option: any) => ({
          label: option.complete_name || option.name,
          value: option.id?.toString?.() || String(option.id),
        }))}
        placeholder={placeholder}
        style={styles.pickerContainer}
        searchable={true}
      />
    </View>
  );

  if (loading) {
    return (
      <ResponsiveContainer withPadding={false} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando dados do equipamento...</Text>
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
            {renderSelectField("Tipo de Equipamento", equipmentTypeId, (val: string) => { setEquipmentTypeId(val); setHasUserChangedType(true); }, equipmentTypes, "Selecione o tipo")}

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
                .map((field: DynamicField) => {
                  console.log('[EditEquipmentScreen] Renderizando campo:', {
                    key: field.key,
                    label: field.label,
                    name: field.name,
                    type: field.type
                  });
                  return (
                    <View key={field.id || field.key} style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { backgroundColor: '#f0f0f0' }]}>
                        {field.label || field.name || field.key || 'SEM LABEL'}
                        {field.required && <Text style={styles.required}>*</Text>}
                      </Text>
                      {renderField(field)}
                    </View>
                  );
                })}
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
