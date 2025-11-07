import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import { RouteProp, useRoute } from "@react-navigation/native";
import ActivityService from "../../Services/ActivityService";
import EquipamentService from "../../Services/EquipamentService";
import ClientService from "../../Services/ClientService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../../Context/LanguageContext";
import { Picker } from "@react-native-picker/picker";
import apiClient from "../../Context/ApiClient";
import DynamicEquipmentFields from "../../Components/DynamicEquipmentFields";
import CustomPicker from "../../Components/CustomPicker";
// Modal antigo substituído por tela dedicada AddMultipleEquipmentsScreen
import ScreenContainer from '../../Components/ScreenContainer';
import FormRow from '../../Components/FormRow';

interface NewActivityModalProps {
    navigation: DrawerNavigationProp<RootStackParamList, any>;
    route: RouteProp<RootStackParamList, any>;
}

interface ActivityType {
    id: number;
    name: string;
    slug?: string;
    creationPolicy?: string;
    equipmentInsertionPolicy?: string;
    closurePolicy?: string;
    budgetPolicy?: string;
}

interface Client {
    id: number;
    name: string;
}

interface Sector {
    id: number;
    name: string;
    client_id: number;
}

interface SubSector {
    id: number;
    name: string;
    sector_id: number;
}

interface Equipment {
    id: number;
    tag: string;
    name?: string;
    equipment_type?: {
        name: string;
    };
}

const NewActivityModal: React.FC<NewActivityModalProps> = ({ navigation, route }) => {
    const { t } = useLanguage();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1 - Tipo de Atividade e Opção de Cliente
    const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
    const [selectedActivityType, setSelectedActivityType] = useState<ActivityType | null>(null);
    const [clientOption, setClientOption] = useState<"existing" | "new" | null>(null);
    const routeHook = useRoute() as any;
    const preselectedActivityTypeSlug = routeHook?.params?.preselectedActivityTypeSlug as string | undefined;
    const [prefillSlug, setPrefillSlug] = useState<string | undefined>(preselectedActivityTypeSlug);

    // Utilidades para casar slugs de forma robusta
    const canonicalize = (s?: string): string => {
        if (!s) return '';
        return s
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // remover acentos
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    };

    const slugAliases: { [k: string]: string[] } = {
        service_order: ['service_order', 'order_service', 'ordem_de_servico', 'ordem_servico', 'service-order'],
        pmoc: ['pmoc'],
        technical_assistance: ['technical_assistance', 'assistencia_tecnica', 'technical-assistance'],
        instalation: ['instalation', 'installation', 'instalacao'],
    };

    const expandAliases = (slug?: string): string[] => {
        const c = canonicalize(slug);
        const base = slugAliases[c];
        return base ? base.map(canonicalize) : [c];
    };

    const findTypeBySlug = (slug?: string) => {
        const wanted = new Set(expandAliases(slug));
        return activityTypes.find(t => {
            const tSlug = canonicalize(t.slug || t.name);
            return wanted.has(tSlug);
        }) || null;
    };

    // Step 2 - Seleção de Cliente Existente
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
    const [subsectors, setSubsectors] = useState<SubSector[]>([]);
    const [selectedSubsector, setSelectedSubsector] = useState<SubSector | null>(null);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

    // Step 3 - Dados do Novo Cliente
    const [newClientName, setNewClientName] = useState("");
    const [newClientDocument, setNewClientDocument] = useState("");
    const [newClientPhone, setNewClientPhone] = useState("");
    const [newClientEmail, setNewClientEmail] = useState("");
    const [newClientContact, setNewClientContact] = useState("");
    const [newClientSector, setNewClientSector] = useState("");
    const [newClientSubsector, setNewClientSubsector] = useState("");

    // Step 2 (Novo Cliente) - Dados do Equipamento
    const [newEquipmentTag, setNewEquipmentTag] = useState("");
    const [newEquipmentBrandId, setNewEquipmentBrandId] = useState<string>("");
    const [newEquipmentTypeId, setNewEquipmentTypeId] = useState<string>("");
    const [brands, setBrands] = useState<any[]>([]);
    const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
    const [newEquipmentDynamicFields, setNewEquipmentDynamicFields] = useState<{ [key: string]: any }>({});
    const [newEquipments, setNewEquipments] = useState<Array<{
        tag?: string;
        brand_id?: string;
        equipment_type_id?: string;
        additional_fields?: { [key: string]: any };
    }>>([{}]);
    const [createNewEquipment, setCreateNewEquipment] = useState(false);
    const [equipmentTemplate, setEquipmentTemplate] = useState<any>(null);

    // Fluxo atual: navegar para AddMultipleEquipmentsScreen (sem modal)

    // Services
    const activityService = new ActivityService();

    useEffect(() => {
        fetchActivityTypes();
        fetchClients();
    }, []);

    // Pré-selecionar tipo vindo da navegação (ex.: atalho "Ordem de Serviço")
    useEffect(() => {
        if (!prefillSlug) return;
        if (!activityTypes || activityTypes.length === 0) return;
        const match = findTypeBySlug(prefillSlug);
        setSelectedActivityType(match || null);
    }, [activityTypes, prefillSlug]);

    const fetchActivityTypes = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const types = await activityService.fetchActivityTypes(token);
            setActivityTypes(types);
            // Pré-seleção imediata (caso tipos cheguem antes do effect rodar)
            if (prefillSlug && (!selectedActivityType)) {
                const matchNow = (types || []).find((t: any) => {
                    const wanted = new Set(expandAliases(prefillSlug));
                    const tSlug = canonicalize(t.slug || t.name);
                    return wanted.has(tSlug);
                });
                if (matchNow) setSelectedActivityType(matchNow);
            }
        } catch (error) {
            console.error("Erro ao buscar tipos de atividade:", error);
            Alert.alert("Erro", "Não foi possível carregar os tipos de atividade");
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            console.log('[NewActivityModal] Buscando clientes...');
            const response = await ClientService.getClients(
                'all', // listar todos os clientes (com e sem contrato) para Ordem de Serviço
                1, // page
                token, // accessToken
                "" // searchQuery
            );
            console.log('[NewActivityModal] Clientes recebidos:', response);
            setClients(response.results || []);
        } catch (error) {
            console.error("Erro ao buscar clientes:", error);
            // Em caso de erro, definir lista vazia para não quebrar a interface
            setClients([]);
        }
    };

    // Buscar dados auxiliares para criação de equipamento (marcas, tipos)
    const fetchAuxDataForNewEquipment = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            // Buscar marcas
            try {
                const resBrands = await apiClient.get(`/brands`, { headers: { Accept: "application/json" } });
                const payloadB = resBrands.data;
                const listB = Array.isArray(payloadB) ? payloadB : (payloadB?.results || []);
                setBrands(listB);
            } catch (e) {
                console.warn('[NewActivityModal] Falha ao carregar marcas:', (e as any)?.message);
                setBrands([]);
            }

            // Buscar tipos de equipamento
            try {
                const resTypes = await apiClient.get(`/equipment_types`, { headers: { Accept: "application/json" } });
                const payloadT = resTypes.data;
                const listT = Array.isArray(payloadT) ? payloadT : (payloadT?.results || []);
                setEquipmentTypes(listT);
            } catch (e) {
                console.warn('[NewActivityModal] Falha ao carregar tipos de equipamento:', (e as any)?.message);
                setEquipmentTypes([]);
            }

            // Não buscar template aqui (conforme tarefas.md). Template é carregado ao selecionar o tipo.
            setEquipmentTemplate(null);
        } catch (error) {
            console.error('[NewActivityModal] Erro ao carregar dados auxiliares de equipamento:', error);
        }
    };

    // Buscar template por tipo ao selecionar o Tipo de Equipamento (conforme tarefas.md)
    useEffect(() => {
        const fetchTemplateByType = async () => {
            try {
                // Apenas no passo 2 e quando for criar equipamento (cliente novo) ou (cliente existente + criando novo equipamento)
                const isStep2 = currentStep === 2;
                const isCreating = (clientOption === 'new') || (clientOption === 'existing' && createNewEquipment);
                if (!isStep2 || !isCreating) {
                    return;
                }

                if (!newEquipmentTypeId) {
                    setEquipmentTemplate(null);
                    return;
                }

                const token = await AsyncStorage.getItem('access_token');
                if (!token) return;

                const typeId = Number(newEquipmentTypeId);
                if (!Number.isFinite(typeId)) {
                    setEquipmentTemplate(null);
                    return;
                }

                const template = await EquipamentService.getEquipmentTemplateByEquipmentType(typeId, token);
                setEquipmentTemplate(template);
            } catch (e: any) {
                console.warn('[NewActivityModal] Falha ao carregar template por tipo:', e?.message || e);
                setEquipmentTemplate(null);
            }
        };

        fetchTemplateByType();
    }, [currentStep, clientOption, createNewEquipment, newEquipmentTypeId]);

    const fetchSectors = async (clientId: number) => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            // Buscar apenas setores pais (level=0)
            const response = await ClientService.getClientSectors(
                clientId.toString(),
                token,
                0 // level=0 para buscar apenas setores pais
            );
            setSectors(response.results || response || []);
        } catch (error) {
            console.error("Erro ao buscar setores:", error);
        }
    };

    const fetchSubsectors = async (sectorId: number) => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            // Buscar subsetores com parent_id = sectorId
            if (selectedClient) {
                const response = await ClientService.getClientSectors(
                    selectedClient.id.toString(),
                    token,
                    undefined, // não passar level
                    sectorId // parentId - buscar apenas setores filhos deste setor
                );
                setSubsectors(response.results || response || []);
            }
        } catch (error) {
            console.error("Erro ao buscar subsetores:", error);
        }
    };

    const fetchEquipments = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const filters: any = {
                page: 1,
                per_page: 100,
            };

            if (selectedClient) filters.client_id = selectedClient.id;
            if (selectedSubsector) {
                filters.subsector_id = selectedSubsector.id; // se houver subsetor, filtra por subsetor
            } else if (selectedSector) {
                filters.sector_id = selectedSector.id; // caso contrário, filtra por setor
            }

            const response = await EquipamentService.fetchEquipments(token, filters);
            setEquipments(response.results || []);
        } catch (error) {
            console.error("Erro ao buscar equipamentos:", error);
        }
    };

    useEffect(() => {
        if (selectedClient) {
            fetchSectors(selectedClient.id);
            setSelectedSector(null);
            setSelectedSubsector(null);
            setSectors([]);
            setSubsectors([]);
        }
    }, [selectedClient]);

    useEffect(() => {
        if (selectedSector) {
            fetchSubsectors(selectedSector.id);
            setSelectedSubsector(null);
            setSubsectors([]);
        }
    }, [selectedSector]);

    useEffect(() => {
        if (selectedClient) {
            fetchEquipments();
            setSelectedEquipment(null); // resetar seleção quando escopo muda
        }
    }, [selectedClient, selectedSector, selectedSubsector]);

    // Carregar marcas/tipos/template quando entrar no passo 2 com "Novo Cliente" ou ao criar novo equipamento
    useEffect(() => {
        if (currentStep === 2 && (clientOption === "new" || (clientOption === "existing" && createNewEquipment))) {
            fetchAuxDataForNewEquipment();
        }
    }, [currentStep, clientOption, createNewEquipment]);

    // Limpar dados quando mudar entre criar/selecionar equipamento
    useEffect(() => {
        if (!createNewEquipment) {
            setNewEquipmentTag("");
            setNewEquipmentBrandId("");
            setNewEquipmentTypeId("");
            setNewEquipmentDynamicFields({});
        }
    }, [createNewEquipment]);

    const validateNewClientData = () => {
        if (!newClientName.trim()) {
            Alert.alert("Atenção", "Nome do cliente é obrigatório");
            return false;
        }
        if (!newClientEmail.trim()) {
            Alert.alert("Atenção", "Email do cliente é obrigatório");
            return false;
        }
        if (!newClientContact.trim()) {
            Alert.alert("Atenção", "Contato é obrigatório");
            return false;
        }
        if (!newClientSector.trim()) {
            Alert.alert("Atenção", "Nome do setor é obrigatório");
            return false;
        }
        // Equipamentos serão criados no modal após criar a atividade
        return true;
    };

    // Máscaras: manter apenas para telefone; documento sem máscara

    const applyPhoneMask = (text: string) => {
        // Remove tudo que não é dígito
        const numbers = text.replace(/\D/g, '');
        // Limita a 11 dígitos (DDD + 9 dígitos)
        const limitedNumbers = numbers.slice(0, 11);
        // Aplica máscara telefone: (00) 00000-0000 (máximo 14 caracteres)
        if (limitedNumbers.length <= 2) return `(${limitedNumbers}`;
        if (limitedNumbers.length <= 7) return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2)}`;
        return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 7)}-${limitedNumbers.slice(7, 11)}`;
    };

    const handleDocumentChange = (text: string) => {
        setNewClientDocument(text);
    };

    const handlePhoneChange = (text: string) => {
        const maskedText = applyPhoneMask(text);
        setNewClientPhone(maskedText);
    };

    // Função para limpar máscaras antes de enviar para o backend
    const cleanPhoneNumber = (phone: string) => {
        // Remove todos os caracteres não numéricos
        return phone.replace(/\D/g, '');
    };

    const cleanDocument = (document: string) => {
        // Enviar exatamente como digitado (sem máscara)
        return document;
    };

    // Resolve o setor correto (ou subsetor) criado junto com o cliente novo
    const resolveSectorIdForNewClient = async (clientId: number, token: string): Promise<number> => {
        console.log('[NewActivityModal] Resolvendo setor do novo cliente...');

        const normalize = (s: string) => (s || '').trim().toLowerCase();
        const wantedSectorNameRaw = newClientSector;
        const wantedSubsectorNameRaw = newClientSubsector;
        const wantedSectorName = normalize(wantedSectorNameRaw);
        const wantedSubsectorName = normalize(wantedSubsectorNameRaw);

        // helper: cria setor (pai ou filho) via endpoint correto
        const createSector = async (name: string, parentId?: number) => {
            console.log('[NewActivityModal] Criando setor via /clients/:id/sectors', { name, parentId });
            const payload: any = {
                name: name.trim(),
                parent_id: parentId ?? null,
                ignores_auto_activity_mapping: false,
            };
            const resp = await apiClient.post(`/clients/${clientId}/sectors`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return resp.data;
        };

        // 1) Buscar setores existentes do cliente
        const listAllSectors = async () => {
            const r = await ClientService.getClientSectors(clientId.toString(), token);
            return (r.results || r || []) as any[];
        };

        let sectors = await listAllSectors();

        // Se não há nenhum setor, criar o setor pai imediatamente
        let parentSector = sectors.find((s: any) => normalize(s.name) === wantedSectorName && (s.level === 1 || s.level === 0))
            || sectors.find((s: any) => normalize(s.name) === wantedSectorName);

        if (!parentSector) {
            if (!wantedSectorName) {
                throw new Error('Nome do setor é obrigatório e não foi informado.');
            }
            parentSector = await createSector(wantedSectorNameRaw);
            // Recarregar lista para manter consistência
            sectors = await listAllSectors();
        }

        // Se não houver subsetor solicitado, retornar o setor pai
        if (!wantedSubsectorName) {
            return parentSector.id;
        }

        // 2) Buscar subsetores do setor pai e localizar pelo nome
        const childrenResp = await ClientService.getClientSectors(clientId.toString(), token, undefined, parentSector.id);
        const children: any[] = childrenResp.results || childrenResp || [];
        let child = children.find((s: any) => normalize(s.name) === wantedSubsectorName);

        if (!child) {
            // Criar subsetor vinculado ao pai
            child = await createSector(wantedSubsectorNameRaw, parentSector.id);
        }

        return child.id;
    };

    // Criar equipamento a partir do formulário, usando o setor resolvido
    const createFormEquipment = async (clientId: number, token: string) => {
        try {
            console.log('[NewActivityModal] Criando equipamento (formulário) para novo cliente...');

            // Resolver setor_id obrigatório a partir dos setores do cliente
            const sectorId = await resolveSectorIdForNewClient(clientId, token);
            console.log('[NewActivityModal] sector_id resolvido:', sectorId);

            // Preparar tag (opcional)
            const providedTag = (newEquipmentTag || '').trim();

            // Mapear campos dinâmicos conforme template
            let additionalFields: { [key: string]: any } = {};
            try {
                if (equipmentTemplate && Array.isArray((equipmentTemplate as any).fields)) {
                    (equipmentTemplate as any).fields.forEach((field: any) => {
                        const fieldKey = field.key || field.name || '';
                        if (!fieldKey) return;
                        let rawValue = newEquipmentDynamicFields[fieldKey];
                        if (rawValue === undefined) return;
                        if (field.type === 'radio_with_justification') {
                            const justification = newEquipmentDynamicFields[`${fieldKey}_justification`] || '';
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
                        } else {
                            value = value !== null && value !== undefined ? String(value).trim() : '';
                        }
                        additionalFields[fieldKey] = value;
                    });
                } else {
                    additionalFields = { ...newEquipmentDynamicFields };
                }
            } catch (e) {
                console.warn('[NewActivityModal] Falha ao processar campos dinâmicos:', (e as any)?.message);
                additionalFields = { ...newEquipmentDynamicFields };
            }

            const equipmentData: any = {
                client_id: clientId,
                sector_id: sectorId,
                brand_id: parseInt(newEquipmentBrandId, 10),
                equipment_type_id: parseInt(newEquipmentTypeId, 10),
                name: `Equipamento ${newClientName}`,
                additional_fields: additionalFields
            };
            if (providedTag) equipmentData.tag = providedTag;

            console.log('[NewActivityModal] Dados do equipamento:', equipmentData);
            const createdEquipment = await EquipamentService.createEquipment(token, equipmentData);
            console.log('[NewActivityModal] Equipamento criado:', createdEquipment);

            return createdEquipment;
        } catch (error: any) {
            console.error('[NewActivityModal] Erro ao criar equipamento:', error);
            throw new Error(`Falha ao criar equipamento: ${error.message}`);
        }
    };

    const handleNextStep = async () => {
        if (currentStep === 1) {
            if (!selectedActivityType) {
                Alert.alert("Atenção", "Selecione um tipo de atividade");
                return;
            }
            if (!clientOption) {
                Alert.alert("Atenção", "Selecione uma opção de cliente");
                return;
            }
            setCurrentStep(2);
        } else if (currentStep === 2) {
            console.log('[NewActivityModal] ▶️ Entrou no Step 2 (validação antes do envio)', {
                clientOption,
                selectedActivityTypeId: selectedActivityType?.id,
                selectedClientId: selectedClient?.id,
                selectedSectorId: selectedSector?.id,
                selectedSubsectorId: selectedSubsector?.id,
                createNewEquipment,
                selectedEquipmentId: selectedEquipment?.id,
            });
            if (clientOption === "existing") {
                if (!selectedSector) {
                    Alert.alert("Atenção", "Selecione um setor");
                    return;
                }
                // Equipamentos serão selecionados no modal após criar a atividade
            } else if (clientOption === "new") {
                if (!validateNewClientData()) {
                    return;
                }
            }

            // Executar o fluxo de criação de atividade
            try {
                console.log('[NewActivityModal] 🚀 === INICIANDO FLUXO DE CRIAÇÃO DE ATIVIDADE ===');
                console.log('[NewActivityModal] 📋 Configuração:', {
                    activityType: selectedActivityType?.name,
                    activityTypeId: selectedActivityType?.id,
                    clientOption,
                    createNewEquipment,
                    hasSelectedClient: !!selectedClient,
                    hasSelectedSector: !!selectedSector,
                    hasSelectedEquipment: !!selectedEquipment
                });

                setLoading(true);

                console.log('[NewActivityModal] 🔑 Verificando token de autenticação...');
                const token = await AsyncStorage.getItem("access_token");
                if (!token) {
                    console.error('[NewActivityModal] ❌ Token não encontrado no AsyncStorage');
                    throw new Error("Token de autenticação não encontrado. Por favor, faça login novamente.");
                }
                console.log('[NewActivityModal] ✅ Token encontrado');

                let clientId: number;
                let equipmentId: number | undefined;

                // Se for novo cliente, criar primeiro
                if (clientOption === "new") {
                    console.log('[NewActivityModal] 👤 Criando novo cliente...');

                    const clientData = {
                        name: newClientName.trim(),
                        email: newClientEmail.trim(),
                        document: cleanDocument(newClientDocument.trim()) || "",
                        phone: cleanPhoneNumber(newClientPhone.trim()) || "",
                        company_name: "",
                        company_state_registration: "",
                        company_opening_at: null,
                        is_active: true,
                        additional_fields: {
                            sector_name: newClientSector.trim(),
                            subsector_name: newClientSubsector.trim() || "",
                            contact_name: newClientContact.trim()
                        }
                    };

                    const createdClient = await ClientService.createClient(clientData, token);
                    console.log('[NewActivityModal] Cliente criado:', createdClient);
                    clientId = createdClient.id;
                } else {
                    // Cliente existente - simplesmente criar a atividade
                    clientId = selectedClient!.id;
                }

                // Resolver sectorId para passar à tela de múltiplos equipamentos
                let sectorIdToPass: number | undefined = undefined;

                if (clientOption === 'existing') {
                    sectorIdToPass = selectedSubsector?.id || selectedSector?.id;
                } else {
                    // cliente novo: tentar descobrir o setor criado a partir do nome informado
                    try {
                        if (newClientSector.trim()) {
                            console.log('[NewActivityModal] Buscando setor recém-criado para cliente novo...');
                            // buscar setores pai (level 0)
                            const resp0 = await ClientService.getClientSectors(clientId.toString(), token, 0);
                            const list0 = resp0?.results || resp0 || [];
                            const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                            const wantedSector = norm(newClientSector);
                            const found0 = list0.find((s: any) => norm(s?.name || '') === wantedSector || norm(s?.complete_name || '') === wantedSector);
                            if (found0?.id) {
                                sectorIdToPass = found0.id;
                                console.log('[NewActivityModal] Setor pai encontrado:', found0.id, found0.name);
                            }

                            // opcional: se tiver subsector e não achou ainda, buscar nível 1
                            if (!sectorIdToPass && newClientSubsector.trim()) {
                                const resp1 = await ClientService.getClientSectors(clientId.toString(), token, 1);
                                const list1 = resp1?.results || resp1 || [];
                                const wantedSub = norm(newClientSubsector);
                                const found1 = list1.find((s: any) => norm(s?.name || '') === wantedSub || norm(s?.complete_name || '') === wantedSub);
                                if (found1?.id) {
                                    sectorIdToPass = found1.id;
                                    console.log('[NewActivityModal] Subsetor encontrado:', found1.id, found1.name);
                                }
                            }
                        }
                    } catch (e: any) {
                        console.warn('[NewActivityModal] Não foi possível resolver setor recém-criado:', e?.message || e);
                    }
                }

                // Criar a atividade
                const today = new Date();
                const timestamp = new Date().getTime();
                const uniqueSuffix = timestamp.toString().slice(-6);
                const activityName = `${selectedActivityType?.name} ${clientOption === "existing" ? selectedClient?.name : newClientName} ${today.toLocaleDateString('pt-BR')} #${uniqueSuffix}`;

                const activityData = {
                    name: activityName,
                    activity_type_id: selectedActivityType?.id,
                    client_id: clientId,
                    observation: "",
                };

                // NOVO FLUXO: não criar a atividade aqui.
                // Apenas navegar para a tela de múltiplos equipamentos com dados suficientes
                // para criar a atividade no confirmar (se necessário).
                console.log('[NewActivityModal] 🔄 Navegando para tela de múltiplos equipamentos (adiando criação da atividade)');
                console.log('[NewActivityModal] Params:', {
                    activityName,
                    activityTypeId: selectedActivityType!.id,
                    clientId,
                    clientName: clientOption === 'existing' ? selectedClient?.name : newClientName,
                    sectorId: sectorIdToPass,
                });
                setLoading(false);

                (navigation as any).navigate('AddMultipleEquipmentsScreen', {
                    // activityId indefinido: tela criará ao confirmar
                    activityName,
                    activityTypeId: selectedActivityType!.id,
                    clientId,
                    clientName: clientOption === 'existing' ? selectedClient?.name : newClientName,
                    sectorId: sectorIdToPass,
                });
                return;
            } catch (error: any) {
                console.error('[NewActivityModal] ❌❌❌ ERRO NO FLUXO DE CRIAÇÃO ❌❌❌');
                console.error('[NewActivityModal] 🔴 Tipo:', error?.constructor?.name || typeof error);
                console.error('[NewActivityModal] 🔴 Mensagem:', error?.message);
                console.error('[NewActivityModal] 🔴 Stack:', error?.stack);
                if (error?.response) {
                    try {
                        console.error('[NewActivityModal] 🔎 ERR RESPONSE status:', error.response.status);
                        console.error('[NewActivityModal] 🔎 ERR RESPONSE data:', typeof error.response.data === 'string' ? error.response.data.slice(0, 500) : JSON.stringify(error.response.data, null, 2));
                        console.error('[NewActivityModal] 🔎 ERR REQUEST:', {
                            method: error.config?.method,
                            url: (error.config?.baseURL || '') + (error.config?.url || ''),
                        });
                    } catch { }
                }

                // Determinar mensagem apropriada baseada no erro
                let errorTitle = "Erro ao Criar Atividade";
                let errorMessage = error.message || "Erro inesperado ao criar atividade. Por favor, tente novamente.";
                let showDetails = true;

                // Personalizar mensagens por tipo de erro
                if (error.message?.includes('conexão') || error.message?.includes('internet')) {
                    errorTitle = "Sem Conexão";
                    errorMessage = error.message;
                    showDetails = false;
                } else if (error.message?.includes('sessão expirou') || error.message?.includes('Token')) {
                    errorTitle = "Sessão Expirada";
                    errorMessage = error.message;
                    showDetails = false;
                } else if (error.message?.includes('nome duplicado') || error.message?.includes('Já existe')) {
                    errorTitle = "Nome Duplicado";
                    errorMessage = "Já existe uma atividade com este nome. Aguarde alguns segundos e tente novamente.";
                    showDetails = false;
                } else if (error.message?.includes('validação')) {
                    errorTitle = "Erro de Validação";
                    errorMessage = error.message;
                } else if (error.message?.includes('permissão')) {
                    errorTitle = "Sem Permissão";
                    errorMessage = error.message;
                    showDetails = false;
                } else if (error.message?.includes('Atividade ID') && error.message?.includes('não encontrada')) {
                    errorTitle = "Erro ao Vincular Equipamento";
                    errorMessage = "A atividade foi criada mas houve erro ao vincular o equipamento. " + error.message;
                } else if (error.message?.includes('Erro no servidor')) {
                    errorTitle = "Erro do Servidor";
                    errorMessage = error.message;
                }

                console.log('[NewActivityModal] 📢 Mostrando alerta:', { errorTitle, errorMessage });

                // Mostrar alerta com opção de ver detalhes se aplicável
                const buttons: any[] = [];

                if (showDetails) {
                    buttons.push({
                        text: "Ver Detalhes",
                        onPress: () => {
                            const details = `Tipo: ${error?.constructor?.name || 'Desconhecido'}\n\nMensagem:\n${error?.message || 'Sem mensagem'}\n\nStack:\n${error?.stack || 'Não disponível'}`;
                            Alert.alert("Detalhes do Erro", details, [{ text: "OK" }]);
                        }
                    });
                }

                buttons.push({ text: "OK", style: "cancel" });

                Alert.alert(errorTitle, errorMessage, buttons);
            } finally {
                setLoading(false);
                console.log('[NewActivityModal] === FINALIZANDO handleNextStep ===');
            }
        }
    };

    const handlePreviousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const renderStepIndicator = () => (
        <View style={styles.stepIndicator}>
            <View style={[styles.step, currentStep >= 1 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
                <Text style={styles.stepLabel}>Tipo de Atividade</Text>
            </View>
            <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
            <View style={[styles.step, currentStep >= 2 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
                <Text style={styles.stepLabel}>
                    {clientOption === "new" ? "Novo Cliente" : "Cliente e Setor"}
                </Text>
            </View>
        </View>
    );

    const renderStep1 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>{t('activity.selectActivityType')}</Text>
            <CustomPicker
                selectedValue={selectedActivityType?.id ? selectedActivityType.id.toString() : ""}
                onValueChange={(itemValue) => {
                    const type = activityTypes.find(t => t.id === Number(itemValue)) || null;
                    setSelectedActivityType(type);
                }}
                items={activityTypes.map(type => ({ label: type.name, value: type.id.toString() }))}
                placeholder="Selecione um tipo de atividade"
                style={styles.pickerContainer}
                searchable={true}
            />

            <Text style={styles.sectionTitle}>{t('activity.clientOption')}</Text>
            <TouchableOpacity
                style={[
                    styles.optionButton,
                    clientOption === "existing" && styles.optionButtonSelected,
                ]}
                onPress={() => setClientOption("existing")}
            >
                <MaterialIcons
                    name="business"
                    size={24}
                    color={clientOption === "existing" ? "#fff" : "#007bff"}
                />
                <Text style={[
                    styles.optionButtonText,
                    clientOption === "existing" && styles.optionButtonTextSelected,
                ]}>
                    {t('activity.existingClient')}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.optionButton,
                    clientOption === "new" && styles.optionButtonSelected,
                ]}
                onPress={() => setClientOption("new")}
            >
                <MaterialIcons
                    name="add-business"
                    size={24}
                    color={clientOption === "new" ? "#fff" : "#007bff"}
                />
                <Text style={[
                    styles.optionButtonText,
                    clientOption === "new" && styles.optionButtonTextSelected,
                ]}>
                    {t('activity.newClient')}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderStep2ExistingClient = () => (
        <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Dados do Cliente</Text>

            {/* Filtro Cliente */}
            <Text style={styles.filterLabel}>Cliente</Text>
            <CustomPicker
                selectedValue={selectedClient?.id ? selectedClient.id.toString() : ""}
                onValueChange={(itemValue) => {
                    const client = clients.find(c => c.id === Number(itemValue)) || null;
                    setSelectedClient(client);
                }}
                items={clients.map(client => ({ label: client.name, value: client.id.toString() }))}
                placeholder="Selecione um cliente"
                style={styles.pickerContainer}
                searchable={true}
            />

            {/* Filtro Setor (Obrigatório) */}
            <Text style={styles.filterLabel}>Setor *</Text>
            <CustomPicker
                selectedValue={selectedSector?.id ? selectedSector.id.toString() : ""}
                onValueChange={(itemValue) => {
                    const sector = sectors.find(s => s.id === Number(itemValue)) || null;
                    setSelectedSector(sector);
                }}
                items={sectors.map(sector => ({ label: sector.name, value: sector.id.toString() }))}
                placeholder="Selecione um setor"
                style={styles.pickerContainer}
                searchable={true}
            />

            {/* Filtro Subsetor (Opcional) - Mostrar quando houver setor selecionado */}
            {selectedSector && (
                <>
                    <Text style={styles.filterLabel}>Subsetor (opcional)</Text>
                    <CustomPicker
                        selectedValue={selectedSubsector?.id ? selectedSubsector.id.toString() : ""}
                        onValueChange={(itemValue) => {
                            const subsector = subsectors.find(s => s.id === Number(itemValue)) || null;
                            setSelectedSubsector(subsector);
                        }}
                        items={subsectors.map(subsector => ({ label: subsector.name, value: subsector.id.toString() }))}
                        placeholder="Selecione um subsetor (opcional)"
                        style={styles.pickerContainer}
                        searchable={true}
                    />
                </>
            )}

            {/* Mensagem informativa sobre seleção de equipamentos */}
            <View style={{
                backgroundColor: '#e7f3ff',
                padding: 16,
                borderRadius: 12,
                marginTop: 20,
                borderWidth: 1,
                borderColor: '#007bff',
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <MaterialIcons name="info" size={24} color="#007bff" />
                    <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#007bff',
                        marginLeft: 8
                    }}>
                        Próxima Etapa: Equipamentos
                    </Text>
                </View>
                <Text style={{
                    fontSize: 14,
                    color: '#333',
                    lineHeight: 20
                }}>
                    Após avançar, você poderá selecionar múltiplos equipamentos existentes ou criar novos equipamentos para esta atividade.
                </Text>
            </View>
        </View>
    );

    const renderStep2NewClient = () => (
        <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>{t('activity.newClientData')}</Text>

            <Text style={styles.inputLabel}>Nome do Cliente *</Text>
            <TextInput
                style={styles.input}
                value={newClientName}
                onChangeText={setNewClientName}
                placeholder="Digite o nome do cliente"
                placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Documento (Opcional)</Text>
            <TextInput
                style={styles.input}
                value={newClientDocument}
                onChangeText={handleDocumentChange}
                placeholder="Digite o documento"
                keyboardType="default"
                placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Telefone (Opcional)</Text>
            <TextInput
                style={styles.input}
                value={newClientPhone}
                onChangeText={handlePhoneChange}
                placeholder="Digite o telefone"
                keyboardType="phone-pad"
                maxLength={15}
                placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>E-mail *</Text>
            <TextInput
                style={styles.input}
                value={newClientEmail}
                onChangeText={setNewClientEmail}
                placeholder="Digite o e-mail"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Contato (Pessoa de Contato) *</Text>
            <TextInput
                style={styles.input}
                value={newClientContact}
                onChangeText={setNewClientContact}
                placeholder="Digite o nome do contato"
                placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Nome do Setor *</Text>
            <TextInput
                style={styles.input}
                value={newClientSector}
                onChangeText={setNewClientSector}
                placeholder="Digite o nome do setor"
                placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Nome do Sub Setor (Opcional)</Text>
            <TextInput
                style={styles.input}
                value={newClientSubsector}
                onChangeText={setNewClientSubsector}
                placeholder="Digite o nome do subsetor"
                placeholderTextColor="#999"
            />

            {/* Mensagem informativa sobre seleção de equipamentos */}
            <View style={{
                backgroundColor: '#e7f3ff',
                padding: 16,
                borderRadius: 12,
                marginTop: 20,
                borderWidth: 1,
                borderColor: '#007bff',
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <MaterialIcons name="info" size={24} color="#007bff" />
                    <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#007bff',
                        marginLeft: 8
                    }}>
                        Próxima Etapa: Equipamentos
                    </Text>
                </View>
                <Text style={{
                    fontSize: 14,
                    color: '#333',
                    lineHeight: 20
                }}>
                    Após criar o cliente, você poderá criar múltiplos equipamentos para esta atividade.
                </Text>
            </View>
        </View>
    );

    return (
        <ScreenContainer scroll={false}>
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nova Atividade</Text>
                <View style={{ width: 40 }} />
            </View>

            {renderStepIndicator()}

            <KeyboardAvoidingView 
                style={styles.keyboardView} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
            >
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007bff" />
                        <Text style={styles.loadingText}>Carregando...</Text>
                    </View>
                ) : (
                    <ScrollView 
                        style={styles.content}
                        contentContainerStyle={[styles.contentContainer, { paddingBottom: 24 }]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        bounces={false}
                    >
                        {currentStep === 1 && renderStep1()}
                        {currentStep === 2 && clientOption === "existing" && renderStep2ExistingClient()}
                        {currentStep === 2 && clientOption === "new" && renderStep2NewClient()}
                    </ScrollView>
                )}

                <View style={styles.footer}>
                    {currentStep > 1 && (
                        <TouchableOpacity
                            style={[styles.footerButton, styles.backButton]}
                            onPress={handlePreviousStep}
                        >
                            <Ionicons name="arrow-back" size={20} color="#666" />
                            <Text style={styles.backButtonText}>Voltar</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.footerButton, styles.nextButton]}
                        onPress={handleNextStep}
                    >
                        <Text style={styles.nextButtonText}>
                            {currentStep === 2 ? 'Criar Atividade' : t('common.advance')}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
        </ScreenContainer>
    );
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    keyboardView: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    header: {
        backgroundColor: "#667eea",
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
    },
    stepIndicator: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
        paddingHorizontal: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    step: {
        alignItems: "center",
    },
    stepActive: {
        opacity: 1,
    },
    stepNumber: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#e0e0e0",
        color: "#999",
        textAlign: "center",
        lineHeight: 30,
        fontSize: 14,
        fontWeight: "600",
    },
    stepNumberActive: {
        backgroundColor: "#007bff",
        color: "#fff",
    },
    stepLabel: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
        maxWidth: 100,
        textAlign: "center",
    },
    stepLine: {
        width: 50,
        height: 2,
        backgroundColor: "#e0e0e0",
        marginHorizontal: 10,
    },
    stepLineActive: {
        backgroundColor: "#007bff",
    },
    content: {
        flex: 1,
    },
    stepContent: {
        padding: Math.max(16, SCREEN_WIDTH * 0.04),
        minHeight: SCREEN_HEIGHT * 0.4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 16,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        marginBottom: Math.max(12, SCREEN_HEIGHT * 0.02),
        backgroundColor: "#fff",
        minHeight: 50,
    },
    picker: {
        height: 50,
        width: '100%',
    },
    optionButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: Math.max(12, SCREEN_HEIGHT * 0.018),
        borderWidth: 1,
        borderColor: "#007bff",
        borderRadius: 8,
        marginBottom: Math.max(10, SCREEN_HEIGHT * 0.015),
        backgroundColor: "#fff",
        minHeight: 50,
    },
    optionButtonSelected: {
        backgroundColor: "#007bff",
    },
    optionButtonText: {
        fontSize: 16,
        color: "#007bff",
        marginLeft: 12,
        fontWeight: "500",
    },
    optionButtonTextSelected: {
        color: "#fff",
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginBottom: 8,
        marginTop: 12,
    },
    equipmentList: {
        maxHeight: 300,
        marginTop: 8,
    },
    equipmentItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: "#fff",
    },
    equipmentItemSelected: {
        borderColor: "#007bff",
        backgroundColor: "#f0f8ff",
    },
    equipmentInfo: {
        flex: 1,
    },
    equipmentTag: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    equipmentTagSelected: {
        color: "#007bff",
    },
    equipmentType: {
        fontSize: 14,
        color: "#666",
        marginTop: 2,
    },
    equipmentTypeSelected: {
        color: "#007bff",
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: Math.max(10, SCREEN_HEIGHT * 0.014),
        fontSize: Math.max(14, SCREEN_WIDTH * 0.04),
        backgroundColor: "#fff",
        minHeight: 44,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#666",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: Math.max(12, SCREEN_WIDTH * 0.04),
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e0e0e0",
        paddingBottom: Platform.OS === 'ios' ? Math.max(20, SCREEN_HEIGHT * 0.02) : Math.max(12, SCREEN_HEIGHT * 0.015),
    },
    footerButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: Math.max(10, SCREEN_HEIGHT * 0.014),
        paddingHorizontal: Math.max(16, SCREEN_WIDTH * 0.04),
        borderRadius: 8,
        minHeight: 44,
        justifyContent: 'center',
    },
    backButton: {
        backgroundColor: "#f0f0f0",
    },
    backButtonText: {
        fontSize: 16,
        color: "#666",
        marginLeft: 8,
        fontWeight: "500",
    },
    nextButton: {
        backgroundColor: "#007bff",
        flex: 1,
        marginLeft: 12,
        justifyContent: "center",
    },
    nextButtonText: {
        fontSize: 16,
        color: "#fff",
        fontWeight: "600",
        marginRight: 8,
    },
});

export default NewActivityModal;
