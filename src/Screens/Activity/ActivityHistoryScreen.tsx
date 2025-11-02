import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    RefreshControl,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import ActivityService from "../../Services/ActivityService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePermissions } from "../../Context/PermissionsContext";
import { MaterialIcons, Ionicons, FontAwesome } from "@expo/vector-icons";
import { useLanguage } from "../../Context/LanguageContext";

const { width } = Dimensions.get('window');

interface ActivityHistoryScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "ActivityHistoryScreen">;
    route: RouteProp<RootStackParamList, "ActivityHistoryScreen">;
}

const STATUS_OPTIONS = [
    { label: "Todos", value: "all", icon: "list" },
    { label: "Aberto", value: "open", icon: "play-circle" },
    { label: "Pendente", value: "pending", icon: "schedule" },
    { label: "Fechado", value: "closed", icon: "check-circle" },
    { label: "Aguardando Aprovação de Orçamento", value: "waiting_budget_approval", icon: "attach-money" },
];

const DEFAULT_ACTIVITY_TYPE_CHIP = { label: "Todos", value: "all", icon: "apps", color: "#6c757d" };

const ActivityHistoryScreen: React.FC<ActivityHistoryScreenProps> = ({ route, navigation }) => {
    const { t } = useLanguage();
    
    // Proteção contra route.params undefined
    const routeParams = route?.params || {};
    const { equipmentId, activityTypeSlug, status } = routeParams;
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string>(activityTypeSlug || "all");
    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string[]>(status || ["all"]);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(50);
    const [totalPages, setTotalPages] = useState(1);
    const { hasPermission } = usePermissions();
    const activityService = new ActivityService();

    // Informações de debug da última requisição
    const [lastRequestInfo, setLastRequestInfo] = useState<{ url?: string; method?: string; headers?: any; status?: number; payload?: any; requestPayload?: any; errorPayload?: any; errorPreview?: string } | null>(null);

    // Tipos de atividade dinâmicos vindos do backend
    const [activityTypes, setActivityTypes] = useState<any[]>([]);

    // Normalizar strings para comparar slugs/nomes de forma robusta
    // Versão robusta que nunca crasha
    const canonicalize = useCallback((s?: any): string => {
        try {
            if (s == null) return '';

            if (typeof s === 'object') {
                const candidate = s.name || s.slug || s.type;
                if (typeof candidate === 'string') s = candidate;
                else return '';
            }

            if (typeof s !== 'string') s = String(s);

            return s
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9_]+/g, '_')
                .replace(/^_+|_+$/g, '');
        } catch (err) {
            console.warn('[canonicalize] valor inesperado:', s, err);
            return '';
        }
    }, []);

    // Função utilitária para logar requisições de forma padronizada
    const safeLogRequest = useCallback((url: string, params?: any, response?: any) => {
        try {
            console.log('[ActivityHistoryScreen] ════════════════════════════════════════════');
            console.log('[ActivityHistoryScreen] API URL:', url);
            if (params) {
                console.log('[ActivityHistoryScreen] Payload (request params):', JSON.stringify(params, null, 2));
            }
            if (response !== undefined) {
                console.log('[ActivityHistoryScreen] Response payload:', JSON.stringify(response, null, 2));
            }
            console.log('[ActivityHistoryScreen] ════════════════════════════════════════════');
        } catch (err) {
            console.error('[ActivityHistoryScreen] Erro ao logar requisição:', err);
        }
    }, []);

    // Permissões
    const canViewPmoc = hasPermission("list_activities");
    const canViewServiceOrder = hasPermission("list_activities");
    const canViewTechnicalAssistance = hasPermission("list_activities");

    console.log('[ActivityHistoryScreen] Permissões carregadas:', {
        canViewPmoc,
        canViewServiceOrder,
        canViewTechnicalAssistance,
        hasPermissionResult: hasPermission("list_activities")
    });

    if (!canViewPmoc && !canViewServiceOrder && !canViewTechnicalAssistance) {
        console.log('[ActivityHistoryScreen] Usuário sem permissões, mostrando tela de erro');
        return (
            <View style={styles.container}>
                <View style={styles.errorContainer}>
                    <MaterialIcons name="security" size={64} color="#dc3545" />
                    <Text style={styles.errorText}>{t('activity.noPermission')}</Text>
                </View>
            </View>
        );
    }

    useEffect(() => {
        fetchActivities();
    }, [currentPage, selectedType, selectedStatus]);

    // Sempre atualizar quando voltar para a tela
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            // Reaplicar seleção com base nos params vindos da Home
            const params = route?.params || {};
            if (params.activityTypeSlug) {
                setSelectedType(params.activityTypeSlug);
            }
            if (params.status && Array.isArray(params.status)) {
                setSelectedStatus(params.status);
            }
            setCurrentPage(1);
            fetchActivities();
        });
        return unsubscribe;
    }, [navigation, selectedType, selectedStatus]);

    // Carregar tipos de atividade do backend (dinâmico)
    useEffect(() => {
        const loadTypes = async () => {
            try {
                const token = await AsyncStorage.getItem("access_token");
                if (!token) {
                    console.warn('[ActivityHistoryScreen] Token não encontrado em loadTypes');
                    return;
                }

                // Montar URL completa
                const accountName = await AsyncStorage.getItem("account") || "";
                const tenantSubdomain = await AsyncStorage.getItem("tenant_subdomain") || accountName;
                const hostRoot = "keosstg001.xyz";
                const apiUrl = tenantSubdomain ? `https://${tenantSubdomain}.${hostRoot}/api/activity_types` : `https://${hostRoot}/api/activity_types`;
                
                const params = { token };
                safeLogRequest(apiUrl, params);

                const types = await activityService.fetchActivityTypes(token);
                
                safeLogRequest(apiUrl, params, types);
                
                setActivityTypes(types || []);

                // Se veio slug pré-selecionado, tentar definir o ID correspondente já no carregamento
                if ((activityTypeSlug || selectedType) && types && types.length) {
                    try {
                        const canonWanted = canonicalize(activityTypeSlug || selectedType);
                        const found = types.find((t: any) => {
                            if (!t) return false;
                            try {
                                const slugOrName = t.slug || t.name || '';
                                return canonicalize(slugOrName) === canonWanted;
                            } catch (err) {
                                console.error('[ActivityHistoryScreen] Erro ao canonizar tipo em loadTypes:', err);
                                return false;
                            }
                        });
                        setSelectedTypeId(found ? Number(found.id) : null);
                    } catch (err) {
                        console.error('[ActivityHistoryScreen] Erro ao processar tipos pré-selecionados:', err);
                    }
                }
            } catch (e: any) {
                console.error('[ActivityHistoryScreen] Erro ao carregar tipos de atividade:', e);
                console.error('[ActivityHistoryScreen] Detalhes do erro loadTypes:', {
                    message: e?.message,
                    stack: e?.stack,
                    name: e?.name
                });
                setActivityTypes([]);
            }
        };
        loadTypes();
    }, [safeLogRequest, canonicalize, activityTypeSlug, selectedType]);

    // Sincronizar quando os params mudarem (ex.: reentrada via outro atalho da Home)
    useEffect(() => {
        if (activityTypeSlug) {
            setSelectedType(activityTypeSlug);
            // Atualizar ID se já temos a lista de tipos carregada
            if (activityTypes && activityTypes.length) {
                const canonWanted = canonicalize(activityTypeSlug);
                const found = activityTypes.find((t: any) => {
                    if (!t) return false;
                    // Garantir que slug/name seja string antes de canonizar
                    const slugOrName = t.slug || t.name || '';
                    return canonicalize(slugOrName) === canonWanted;
                });
                setSelectedTypeId(found ? Number(found.id) : null);
            }
        }
        if (status && Array.isArray(status)) {
            setSelectedStatus(status);
        }
        // não chama fetch aqui para evitar dupla chamada; o listener de focus já trata
    }, [activityTypeSlug, status, activityTypes]);

    const fetchActivities = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) {
                console.warn('[ActivityHistoryScreen] Token não encontrado');
                setError("Sessão expirada. Por favor, faça login novamente.");
                setActivities([]);
                return;
            }

            // Montar URL base
            const accountName = await AsyncStorage.getItem("account") || "";
            const tenantSubdomain = await AsyncStorage.getItem("tenant_subdomain") || accountName;
            const hostRoot = "keosstg001.xyz";
            const baseUrl = tenantSubdomain ? `https://${tenantSubdomain}.${hostRoot}/api` : `https://${hostRoot}/api`;

            if (equipmentId) {
                // Histórico de atividades de um equipamento específico
                const params = {
                    page: currentPage,
                    per_page: perPage,
                    activity_type: selectedType !== "all" ? selectedType : undefined,
                    token: token,
                };
                
                const fullUrl = `${baseUrl}/equipments/${equipmentId}/activities`;
                safeLogRequest(fullUrl, params);

                try {
                    const response = await activityService.fetchActivities(equipmentId, params);
                    safeLogRequest(fullUrl, params, response);

                    // Capturar informações do request para exibição
                    try {
                        setLastRequestInfo({
                            url: fullUrl,
                            method: 'GET',
                            status: 200,
                            requestPayload: params,
                            payload: response
                        });
                    } catch (infoErr) {
                        console.error('[ActivityHistoryScreen] Erro ao salvar info do request:', infoErr);
                    }

                    // Validar resposta antes de usar
                    if (response && typeof response === 'object') {
                        try {
                            const results = response.results || [];
                            const count = response.count || 0;
                            setActivities(Array.isArray(results) ? results : []);
                            setTotalPages(Math.ceil(count / perPage) || 1);
                        } catch (processErr) {
                            console.error('[ActivityHistoryScreen] Erro ao processar resposta:', processErr);
                            setActivities([]);
                            setTotalPages(1);
                        }
                    } else {
                        console.warn('[ActivityHistoryScreen] Resposta inválida recebida');
                        setActivities([]);
                        setTotalPages(1);
                    }
                } catch (error: any) {
                    console.error('[ActivityHistoryScreen] Erro ao buscar atividades do equipamento:', error);
                    console.error('[ActivityHistoryScreen] Detalhes:', {
                        message: error?.message,
                        status: error?.response?.status,
                        data: error?.response?.data
                    });
                    
                    try {
                        safeLogRequest(fullUrl, params, {
                            error: error?.message,
                            status: error?.response?.status,
                            data: error?.response?.data
                        });
                        
                        setLastRequestInfo({
                            url: fullUrl,
                            method: 'GET',
                            headers: {},
                            status: error?.response?.status,
                            requestPayload: params,
                            errorPayload: error?.response?.data,
                            errorPreview: typeof error?.response?.data === 'string' 
                                ? error.response.data.slice(0, 500) 
                                : JSON.stringify(error?.response?.data || {}, null, 2).slice(0, 500)
                        });
                    } catch (logErr) {
                        console.error('[ActivityHistoryScreen] Erro ao logar erro:', logErr);
                    }
                    
                    setActivities([]);
                    setTotalPages(1);
                    setError("Erro ao carregar atividades do equipamento. Tente novamente.");
                }
            } else {
                // Listagem geral de atividades
                const params = {
                    page: currentPage,
                    per_page: perPage,
                    activity_type_slug: selectedType !== "all" ? selectedType : undefined,
                    activity_type_id: selectedTypeId || undefined,
                    status: selectedStatus.includes("all") ? undefined : selectedStatus,
                    token: token,
                };
                
                const fullUrl = `${baseUrl}/activities`;
                safeLogRequest(fullUrl, params);

                try {
                    const response = await ActivityService.fetchAllActivities(params);
                    safeLogRequest(fullUrl, params, response);
                    
                    // Capturar informações do request para exibição
                    try {
                        setLastRequestInfo({
                            url: fullUrl,
                            method: 'GET',
                            status: 200,
                            requestPayload: params,
                            payload: response
                        });
                    } catch (infoErr) {
                        console.error('[ActivityHistoryScreen] Erro ao salvar info do request:', infoErr);
                    }
                    
                    // Validar resposta antes de processar
                    if (!response || typeof response !== 'object') {
                        console.warn('[ActivityHistoryScreen] Resposta inválida ou vazia');
                        setActivities([]);
                        setTotalPages(1);
                    } else {
                        try {
                            const results = response.results || [];
                            const count = response.count || 0;
                            
                            if (Array.isArray(results) && results.length > 0) {
                                // Verificar se as atividades têm os campos necessários
                                const validActivities = results.map((activity: any) => {
                                    try {
                                        return {
                                            ...activity,
                                            id: activity?.id || Math.random(),
                                            name: activity?.name || activity?.title || 'Atividade sem nome',
                                            type: activity?.activity_type?.name || activity?.type || 'unknown',
                                            status: activity?.status || 'pending',
                                            created_at: activity?.start_date || activity?.created_at || new Date().toISOString(),
                                            end_date: activity?.end_date || null
                                        };
                                    } catch (activityErr) {
                                        console.error('[ActivityHistoryScreen] Erro ao processar atividade:', activityErr);
                                        return {
                                            id: Math.random(),
                                            name: 'Atividade (erro ao processar)',
                                            type: 'unknown',
                                            status: 'pending',
                                            created_at: new Date().toISOString(),
                                            end_date: null
                                        };
                                    }
                                });
                                setActivities(validActivities);
                            } else {
                                setActivities([]);
                            }

                            setTotalPages(Math.ceil(count / perPage) || 1);
                        } catch (processErr) {
                            console.error('[ActivityHistoryScreen] Erro ao processar resultados:', processErr);
                            setActivities([]);
                            setTotalPages(1);
                        }
                    }
                } catch (error: any) {
                    console.error('[ActivityHistoryScreen] Erro ao buscar atividades gerais:', error);
                    console.error('[ActivityHistoryScreen] Detalhes:', {
                        message: error?.message,
                        status: error?.response?.status,
                        data: error?.response?.data
                    });
                    
                    try {
                        safeLogRequest(fullUrl, params, {
                            error: error?.message,
                            status: error?.response?.status,
                            data: error?.response?.data
                        });
                        
                        setLastRequestInfo({
                            url: fullUrl,
                            method: 'GET',
                            headers: {},
                            status: error?.response?.status,
                            requestPayload: params,
                            errorPayload: error?.response?.data,
                            errorPreview: typeof error?.response?.data === 'string' 
                                ? error.response.data.slice(0, 500) 
                                : JSON.stringify(error?.response?.data || {}, null, 2).slice(0, 500)
                        });
                    } catch (logErr) {
                        console.error('[ActivityHistoryScreen] Erro ao logar erro:', logErr);
                    }
                    
                    setActivities([]);
                    setTotalPages(1);
                    setError("Erro ao carregar atividades. Tente novamente.");
                }
            }
        } catch (error: any) {
            console.error('[ActivityHistoryScreen] Erro crítico em fetchActivities:', error);
            console.error('[ActivityHistoryScreen] Detalhes do erro:', {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
                stack: error?.stack,
                name: error?.name
            });

            let errorMessage = "Falha ao buscar atividades.";

            try {
                if (error?.response?.status === 404) {
                    errorMessage = "Endpoint de atividades não encontrado. Verifique se o backend está configurado corretamente.";
                } else if (error?.response?.status === 500) {
                    errorMessage = "Erro interno no servidor ao buscar atividades. Tente novamente ou contate o suporte.";
                } else if (error?.response?.status === 401) {
                    errorMessage = "Token de acesso inválido ou expirado.";
                } else if (error?.response?.status === 403) {
                    errorMessage = "Sem permissão para acessar atividades.";
                } else if (error?.message) {
                    errorMessage = error.message;
                }
            } catch (msgErr) {
                console.error('[ActivityHistoryScreen] Erro ao construir mensagem:', msgErr);
            }

            setError(errorMessage);
            setActivities([]);
        } finally {
            setLoading(false);
        }
    }, [equipmentId, currentPage, perPage, selectedType, selectedTypeId, selectedStatus, activityService, safeLogRequest]);

    const onRefresh = async () => {
        setRefreshing(true);
        setCurrentPage(1);
        await fetchActivities();
        setRefreshing(false);
    };

    const statusTranslations: { [key: string]: string } = {
        open: "Aberto",
        closed: "Fechado",
        pending: "Pendente",
        waiting_budget_approval: "Aguardando Aprovação de Orçamento",
        budget_not_approved: "Orçamento não aprovado",
    };

    const statusColors: { [key: string]: string } = {
        open: "#007bff", // Azul
        pending: "#ffc107", // Amarelo
        closed: "#6c757d", // Cinza
        waiting_budget_approval: "#6f42c1", // Roxo
        budget_not_approved: "#dc3545", // Vermelho
    };

    const statusIcons: { [key: string]: string } = {
        open: "play-circle",
        closed: "check-circle",
        pending: "schedule",
        waiting_budget_approval: "attach-money",
        budget_not_approved: "close-circle",
    };

    const getActivityTypeInfo = (type: string | any) => {
        // Proteção contra valores inválidos
        if (!type) {
            return {
                label: 'Atividade',
                value: 'unknown',
                icon: 'assignment',
                color: '#6c757d',
            };
        }

        const canon = canonicalize(type);
        const known: Record<string, { icon: string; color: string; label: string }> = {
            pmoc: { icon: 'build', color: '#007bff', label: 'PMOC' },
            service_order: { icon: 'assignment', color: '#28a745', label: 'Ordem de Serviço' },
            technical_assistance: { icon: 'support-agent', color: '#ffc107', label: 'Assistência Técnica' },
            instalation: { icon: 'settings', color: '#dc3545', label: 'Instalação' },
        };

        // Tentar casar com o que veio do backend
        const fromApi = activityTypes.find((t) => {
            if (!t) return false;
            const slugOrName = t.slug || t.name || '';
            return canonicalize(slugOrName) === canon;
        });
        
        if (fromApi) {
            const slugOrName = fromApi.slug || fromApi.name || '';
            const k = known[canonicalize(slugOrName)];
            return {
                label: fromApi.name || 'Atividade',
                value: canonicalize(slugOrName),
                icon: k?.icon || 'assignment',
                color: k?.color || '#6c757d',
            };
        }

        // Se não achou, usar mapeamento conhecido ou fallback genérico
        const k = known[canon];
        
        // Garantir que type seja string para exibição
        const typeStr = typeof type === 'string' ? type : 'Atividade';
        
        return {
            label: k?.label || typeStr,
            value: canon || 'unknown',
            icon: k?.icon || 'assignment',
            color: k?.color || '#6c757d',
        };
    };

    // Função para formatar data em DD/MM/YYYY de forma robusta
    const formatDate = (dateString: string | null | undefined): string => {
        if (!dateString) return '';

        try {
            // Já está em DD/MM/YYYY
            if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
                return dateString;
            }

            // ISO: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ssZ
            const isoMatch = typeof dateString === 'string' && dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) {
                const [, y, m, d] = isoMatch as unknown as [string, string, string, string];
                return `${d}/${m}/${y}`;
            }

            // Fallback com Date
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                console.warn('[ActivityHistoryScreen] Data inválida:', dateString);
                return '';
            }
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = String(date.getFullYear());
            return `${d}/${m}/${y}`;
        } catch (error) {
            console.warn('[ActivityHistoryScreen] Erro ao formatar data:', dateString, error);
            return '';
        }
    };

    const renderActivityCard = ({ item }: { item: any }) => {
        try {
            // Verificar se o item é válido
            if (!item || typeof item !== 'object') {
                console.warn('[ActivityHistoryScreen] Item inválido no renderActivityCard:', item);
                return (
                    <View style={[styles.activityCard, { padding: 16, alignItems: 'center' }]}>
                        <MaterialIcons name="error-outline" size={24} color="#dc3545" />
                        <Text style={[styles.errorText, { marginTop: 8, textAlign: 'center' }]}>
                            Item inválido
                        </Text>
                    </View>
                );
            }

            // Verificar se o usuário tem permissão geral para listar atividades
            const hasGeneralPermission = canViewPmoc || canViewServiceOrder || canViewTechnicalAssistance;

            if (!hasGeneralPermission) {
                return null;
            }

            const navigateToDetails = () => {
                try {
                    // Navegar para a tela de equipamentos vinculados da atividade
                    navigation.navigate("ActivityEquipmentListScreen", {
                        activityId: item?.id,
                        activityName: item?.name || item?.title || "Atividade",
                        clientId: item?.client?.id || item?.equipment?.client?.id,
                        clientName: item?.client?.name || item?.equipment?.client?.name,
                    });
                } catch (navError) {
                    console.error('[ActivityHistoryScreen] Erro ao navegar para detalhes:', navError);
                    console.error('[ActivityHistoryScreen] Stack trace:', navError instanceof Error ? navError.stack : 'N/A');
                }
            };

            // Verificar se o tipo da atividade existe, caso contrário usar um tipo padrão
            let activityType = 'unknown';
            try {
                // Tentar extrair o tipo de diferentes formas
                if (item?.activity_type) {
                    // Se activity_type é objeto, pega o name
                    activityType = typeof item.activity_type === 'object' 
                        ? (item.activity_type?.name || 'unknown')
                        : String(item.activity_type || 'unknown');
                } else if (item?.type) {
                    // Se type é objeto, pega o name
                    activityType = typeof item.type === 'object'
                        ? (item.type?.name || 'unknown')
                        : String(item.type || 'unknown');
                }
            } catch (typeError) {
                console.error('[ActivityHistoryScreen] Erro ao extrair tipo da atividade:', typeError);
                activityType = 'unknown';
            }
            
            let activityTypeInfo;
            try {
                activityTypeInfo = getActivityTypeInfo(activityType);
            } catch (infoError) {
                console.error('[ActivityHistoryScreen] Erro ao obter info do tipo:', infoError);
                activityTypeInfo = { label: 'Atividade', value: 'unknown', icon: 'assignment', color: '#6c757d' };
            }

            const statusColor = statusColors[item?.status] || "#6c757d";
            const statusIcon = statusIcons[item?.status] || "help-circle";

            return (
                <TouchableOpacity style={styles.activityCard} onPress={navigateToDetails}>
                    <View style={styles.cardHeader}>
                        <View style={styles.activityTypeContainer}>
                            <MaterialIcons
                                name={activityTypeInfo.icon as any}
                                size={20}
                                color={activityTypeInfo.color}
                            />
                            <Text style={[styles.activityTypeText, { color: activityTypeInfo.color }]}>
                                {activityTypeInfo.label}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                            <Ionicons name={statusIcon as any} size={16} color={statusColor} />
                            <Text style={[styles.statusText, { color: statusColor }]}>
                                {statusTranslations[item?.status] || item?.status || 'Desconhecido'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.cardContent}>
                        {/* Título da Atividade */}
                        <View style={styles.infoRow}>
                            <MaterialIcons name="title" size={16} color="#666" />
                            <Text style={[styles.infoText, styles.activityTitle]}>
                                {item?.name || item?.title || `${t('activity.title')} ${item?.id || ''}`}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <MaterialIcons name="business" size={16} color="#666" />
                            <Text style={styles.infoText}>
                                {item?.client?.name || item?.equipment?.tag || "N/A"}
                            </Text>
                        </View>

                        {/* Data de Início e Fim */}
                        <View style={styles.infoRow}>
                            <MaterialIcons name="event" size={16} color="#666" />
                            <Text style={styles.infoText}>
                                {t('activityHistory.start')}: {formatDate(item?.start_date || item?.created_at)}
                                {(item?.end_date || item?.closed_at) && ` | ${t('activityHistory.end')}: ${formatDate(item?.end_date || item?.closed_at)}`}
                            </Text>
                        </View>

                        {item?.deadline && formatDate(item.deadline) && (
                            <View style={styles.infoRow}>
                                <MaterialIcons name="schedule" size={16} color="#666" />
                                <Text style={styles.infoText}>
                                    {t('activityHistory.deadline')}: {formatDate(item.deadline)}
                                </Text>
                            </View>
                        )}

                        {item?.equipment && (
                            <View style={styles.infoRow}>
                                <MaterialIcons name="build" size={16} color="#666" />
                                <Text style={styles.infoText}>
                                    {item.equipment?.equipment_type?.name || t('equipment.title')}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.cardFooter}>
                        <TouchableOpacity style={styles.detailsButton} onPress={navigateToDetails}>
                            <Text style={styles.detailsButtonText}>{t('activityHistory.viewDetails')}</Text>
                            <MaterialIcons name="arrow-forward" size={16} color="#007bff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.detailsButton}
                            onPress={() => {
                                try {
                                    navigation.navigate("WorkListScreen", { 
                                        activityId: item?.id, 
                                        activityName: item?.name || item?.title || "Atividade" 
                                    });
                                } catch (navError) {
                                    console.error('[ActivityHistoryScreen] Erro ao navegar para WorkListScreen:', navError);
                                }
                            }}
                        >
                            <Text style={styles.detailsButtonText}>{t('activityHistory.viewWork')}</Text>
                            <MaterialIcons name="assignment" size={16} color="#007bff" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            );
        } catch (renderError) {
            console.error('[ActivityHistoryScreen] Erro crítico ao renderizar card de atividade:', renderError);
            console.error('[ActivityHistoryScreen] Stack trace do erro:', renderError instanceof Error ? renderError.stack : 'N/A');
            console.error('[ActivityHistoryScreen] Item que causou o erro:', JSON.stringify(item || {}, null, 2).substring(0, 500));
            
            // Fallback UI robusto
            return (
                <View style={[styles.activityCard, { padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 100 }]}>
                    <MaterialIcons name="error-outline" size={32} color="#dc3545" />
                    <Text style={[styles.errorText, { marginTop: 8, textAlign: 'center' }]}>
                        Erro ao exibir esta atividade
                    </Text>
                    <Text style={[styles.errorText, { marginTop: 4, fontSize: 12, opacity: 0.7 }]}>
                        ID: {item?.id || 'N/A'}
                    </Text>
                </View>
            );
        }
    };

    // Filtro de status (múltipla seleção)
    const handleStatusChange = (value: string) => {
        if (value === "all") {
            setSelectedStatus(["all"]);
        } else {
            setSelectedStatus((prev) => {
                // Se "all" estava selecionado, remove ele
                if (prev.includes("all")) {
                    return [value];
                }
                // Toggle do status específico
                const newStatus = prev.includes(value)
                    ? prev.filter((s) => s !== value)
                    : [...prev, value];
                return newStatus.length === 0 ? ["all"] : newStatus;
            });
        }
        setCurrentPage(1);
    };

    const renderFilterChip = (option: any, isSelected: boolean, onPress: () => void) => (
        <TouchableOpacity
            key={option.value}
            style={[styles.filterChip, isSelected && styles.filterChipSelected]}
            onPress={onPress}
        >
            <MaterialIcons
                name={option.icon as any}
                size={16}
                color={isSelected ? "#fff" : "#007bff"}
            />
            <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                {option.label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Painel de debug - sempre visível no topo */}
            <View style={{ backgroundColor: '#fff', margin: 16, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' }}>
                <Text style={{ fontWeight: '600', marginBottom: 8 }}>Última Requisição</Text>
                {lastRequestInfo ? (
                    <>
                        <Text style={{ fontSize: 11 }}>URL: {lastRequestInfo.url || 'N/A'}</Text>
                        <Text style={{ fontSize: 11, marginTop: 4 }}>Método: {lastRequestInfo.method || 'N/A'} | Status: {String(lastRequestInfo.status || 'N/A')}</Text>
                        
                        {/* Payload Enviado */}
                        {lastRequestInfo.requestPayload && (
                            <>
                                <Text style={{ fontSize: 11, marginTop: 8, fontWeight: '600' }}>Payload Enviado:</Text>
                                <ScrollView style={{ maxHeight: 150, marginTop: 4, backgroundColor: '#e3f2fd', padding: 8, borderRadius: 4 }} nestedScrollEnabled>
                                    <Text selectable style={{ fontSize: 10 }}>
                                        {JSON.stringify(lastRequestInfo.requestPayload, null, 2)}
                                    </Text>
                                </ScrollView>
                            </>
                        )}

                        {/* Payload Retorno (sucesso ou erro) */}
                        {(lastRequestInfo.payload || lastRequestInfo.errorPayload) && (
                            <>
                                <Text style={{ fontSize: 11, marginTop: 8, fontWeight: '600', color: lastRequestInfo.errorPayload ? '#dc3545' : '#28a745' }}>
                                    Payload Retorno {lastRequestInfo.errorPayload ? '(Erro)' : '(Sucesso)'}:
                                </Text>
                                <ScrollView style={{ maxHeight: 200, marginTop: 4, backgroundColor: lastRequestInfo.errorPayload ? '#ffebee' : '#e8f5e9', padding: 8, borderRadius: 4 }} nestedScrollEnabled>
                                    <Text selectable style={{ fontSize: 10 }}>
                                        {lastRequestInfo.errorPayload 
                                            ? JSON.stringify(lastRequestInfo.errorPayload, null, 2)
                                            : JSON.stringify(lastRequestInfo.payload, null, 2)
                                        }
                                    </Text>
                                </ScrollView>
                            </>
                        )}

                        {/* Fallback para errorPreview (quando errorPayload não está disponível) */}
                        {!lastRequestInfo.payload && !lastRequestInfo.errorPayload && lastRequestInfo.errorPreview && (
                            <>
                                <Text style={{ fontSize: 11, marginTop: 8, fontWeight: '600', color: '#dc3545' }}>Erro (Preview):</Text>
                                <ScrollView style={{ maxHeight: 150, marginTop: 4, backgroundColor: '#ffebee', padding: 8, borderRadius: 4 }} nestedScrollEnabled>
                                    <Text selectable style={{ fontSize: 10 }}>
                                        {lastRequestInfo.errorPreview}
                                    </Text>
                                </ScrollView>
                            </>
                        )}
                    </>
                ) : (
                    <Text style={{ fontSize: 12 }}>Sem logs ainda</Text>
                )}
            </View>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>
                        {equipmentId ? t('activityHistory.title') : t('activity.title')}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {equipmentId ? t('activityHistory.headerSubtitleEquipment') : t('activityHistory.headerSubtitleAll')}
                    </Text>
                </View>
            </View>

            {/* Botão Nova Atividade */}
            <TouchableOpacity
                style={styles.newActivityButton}
                onPress={() => {
                    const typeToPass = selectedType !== 'all' ? selectedType : undefined;
                    navigation.navigate("NewActivityModal" as any, { preselectedActivityTypeSlug: typeToPass });
                }}
            >
                <MaterialIcons name="add" size={24} color="#fff" />
                <Text style={styles.newActivityButtonText}>{t('activity.newActivity')}</Text>
            </TouchableOpacity>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Filtros */}
                <View style={styles.filtersSection}>
                    <Text style={styles.sectionTitle}>{t('activityHistory.filters')}</Text>

                    {/* Filtro de Tipo */}
                    <Text style={styles.filterLabel}>{t('activityHistory.activityType')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                        {[
                            DEFAULT_ACTIVITY_TYPE_CHIP,
                            ...activityTypes
                                .filter((t) => t && (t.name || t.slug)) // Filtrar tipos inválidos
                                .map((t) => {
                                    // Garantir que slug/name seja string antes de canonizar
                                    const slugOrName = t.slug || t.name || '';
                                    return {
                                        label: t.name || 'Atividade',
                                        value: canonicalize(slugOrName),
                                        id: t.id,
                                        icon: 'assignment',
                                        color: '#007bff',
                                    };
                                }),
                        ].map((type) => (
                            renderFilterChip(
                                type,
                                selectedType === type.value,
                                () => {
                                    setSelectedType(type.value);
                                    setSelectedTypeId((type as any).id ? Number((type as any).id) : null);
                                    setCurrentPage(1);
                                }
                            )
                        ))}
                    </ScrollView>

                    {/* Filtro de Status */}
                    <Text style={styles.filterLabel}>{t('activityHistory.status')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                        {STATUS_OPTIONS.map((status) => (
                            renderFilterChip(
                                status,
                                selectedStatus.includes(status.value),
                                () => handleStatusChange(status.value)
                            )
                        ))}
                    </ScrollView>
                </View>

                {/* Lista de Atividades */}
                <View style={styles.activitiesSection}>
                    <Text style={styles.sectionTitle}>
                        {t('activity.title')} ({activities.length})
                    </Text>

                    {loading && !refreshing ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#007bff" />
                            <Text style={styles.loadingText}>{t('activityHistory.loading')}</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <MaterialIcons name="error-outline" size={48} color="#dc3545" />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity style={styles.retryButton} onPress={fetchActivities}>
                                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : activities.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="assignment" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>{t('activityHistory.noneFound')}</Text>
                            <Text style={styles.emptySubtext}>
                                {t('activityHistory.tryAdjustFilters')}
                            </Text>

                        </View>
                    ) : (
                        <FlatList
                            data={activities}
                            keyExtractor={(item) => `${item.id}`}
                            renderItem={renderActivityCard}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>Nenhuma atividade encontrada</Text>
                                </View>
                            )}
                        />
                    )}
                </View>

                {/* Paginação */}
                {totalPages > 1 && (
                    <View style={styles.paginationContainer}>
                        <TouchableOpacity
                            style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                            onPress={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? "#ccc" : "#007bff"} />
                            <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                                Anterior
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.pageInfo}>
                            <Text style={styles.pageText}>
                                Página {currentPage} de {totalPages}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                            onPress={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
                            disabled={currentPage === totalPages}
                        >
                            <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
                                Próxima
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? "#ccc" : "#007bff"} />
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    header: {
        backgroundColor: "#667eea",
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
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
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 4,
        backgroundColor: "transparent",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "rgba(255,255,255,0.8)",
        backgroundColor: "transparent",
    },
    content: {
        flex: 1,
    },
    filtersSection: {
        backgroundColor: "#fff",
        margin: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 16,
        backgroundColor: "transparent",
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginBottom: 8,
        marginTop: 16,
        backgroundColor: "transparent",
    },
    filterScroll: {
        marginBottom: 8,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        borderWidth: 1,
        borderColor: "#007bff",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
    },
    filterChipSelected: {
        backgroundColor: "#007bff",
    },
    filterChipText: {
        fontSize: 12,
        color: "#007bff",
        marginLeft: 4,
        fontWeight: "500",
        backgroundColor: "transparent",
    },
    filterChipTextSelected: {
        color: "#fff",
        backgroundColor: "transparent",
    },
    activitiesSection: {
        margin: 16,
        marginTop: 0,
    },
    loadingContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#666",
        backgroundColor: "transparent",
    },
    errorContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    errorText: {
        fontSize: 16,
        color: "#dc3545",
        textAlign: "center",
        marginTop: 16,
        marginBottom: 16,
        backgroundColor: "transparent",
    },
    retryButton: {
        backgroundColor: "#007bff",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
        backgroundColor: "transparent",
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 18,
        color: "#666",
        marginTop: 16,
        fontWeight: "600",
        backgroundColor: "transparent",
    },
    emptySubtext: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
        marginTop: 8,
        paddingHorizontal: 32,
        backgroundColor: "transparent",
    },
    activityCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    activityTypeContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    activityTypeText: {
        fontSize: 14,
        fontWeight: "600",
        marginLeft: 8,
        color: "#333",
        backgroundColor: "transparent",
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "500",
        marginLeft: 4,
        backgroundColor: "transparent",
    },
    cardContent: {
        padding: 16,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: "#333",
        marginLeft: 8,
        flex: 1,
        backgroundColor: "transparent",
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    activityText: {
        fontSize: 14,
        color: "#333",
        backgroundColor: "transparent",
    },
    cardFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
    },
    detailsButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
    },
    detailsButtonText: {
        fontSize: 14,
        color: "#007bff",
        fontWeight: "600",
        marginRight: 4,
        backgroundColor: "transparent",
    },
    paginationContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff",
        margin: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    paginationButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#f8f9fa",
    },
    paginationButtonDisabled: {
        backgroundColor: "#f8f9fa",
    },
    paginationButtonText: {
        fontSize: 14,
        color: "#007bff",
        fontWeight: "500",
        backgroundColor: "transparent",
    },
    paginationButtonTextDisabled: {
        color: "#ccc",
        backgroundColor: "transparent",
    },
    pageInfo: {
        alignItems: "center",
    },
    pageText: {
        fontSize: 14,
        color: "#666",
        fontWeight: "500",
        backgroundColor: "transparent",
    },
    newActivityButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#007bff",
        marginHorizontal: 16,
        marginTop: 16,
        paddingVertical: 14,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    newActivityButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
    },

});

export default ActivityHistoryScreen;