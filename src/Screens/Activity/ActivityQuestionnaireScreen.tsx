import React, { useEffect, useMemo, useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import ActivityService from "../../Services/ActivityService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../Context/LanguageContext";
import DynamicActivityQuestionnaire from "../../Components/DynamicActivityQuestionnaire";
import { ActivityDynamicField } from "../../Models/ActivityDynamicField";
import { ActivityAnswer } from "../../Models/ActivityAnswer";
import NetInfo from '@react-native-community/netinfo';
import SendToBudgetModal from "../../Components/SendToBudgetModal";
import OfflineService from '../../Services/OfflineService';
import apiClient from "../../Context/ApiClient";
import ClientService from "../../Services/ClientService";
import ResponsiveContainer from '../../Components/ResponsiveContainer';
import { EquipmentStatus, getNextStatusForAction, canTransitionEquipmentStatus } from "../../constants/activityStatus";
import { usePermissions } from "../../Context/PermissionsContext";
import { useUser } from "../../Context/UserContext";

interface ActivityQuestionnaireScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "ActivityQuestionnaireScreen">;
    route: RouteProp<RootStackParamList, "ActivityQuestionnaireScreen">;
}

// Componente wrapper para validações (SEM HOOKS)
const ActivityQuestionnaireWrapper: React.FC<ActivityQuestionnaireScreenProps> = ({ route, navigation }) => {
    // Validação defensiva de parâmetros de rota - ETAPA 1
    console.log('[ActivityQuestionnaireScreen] ===== INICIANDO TELA =====');
    console.log('[ActivityQuestionnaireScreen] route.params recebidos:', route?.params);

    // Verificar se route e params existem
    if (!route) {
        console.error('[ActivityQuestionnaireScreen] ❌ ERRO CRÍTICO: route é undefined');
        return (
            <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={64} color="#dc3545" />
                <Text style={styles.errorText}>Erro interno: rota não encontrada</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.retryButtonText}>Voltar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!route.params) {
        console.error('[ActivityQuestionnaireScreen] ❌ ERRO CRÍTICO: route.params é undefined');
        return (
            <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={64} color="#dc3545" />
                <Text style={styles.errorText}>Erro interno: parâmetros de navegação não encontrados</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.retryButtonText}>Voltar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Validar parâmetros obrigatórios
    const {
        activityId,
        activityEquipmentId,
        equipmentId,
        equipmentTag,
        activityName,
        budgetPolicy,
        fromNewActivityFlow
    } = route.params;

    console.log('[ActivityQuestionnaireScreen] Validando parâmetros obrigatórios...');

    // Verificar parâmetros obrigatórios
    // equipmentTag é OPCIONAL - alguns equipamentos podem não ter tag
    const missingParams: string[] = [];
    if (!activityId || activityId <= 0) missingParams.push('activityId');
    if (!activityEquipmentId || activityEquipmentId <= 0) missingParams.push('activityEquipmentId');
    if (!equipmentId || equipmentId <= 0) missingParams.push('equipmentId');
    // equipmentTag removido da validação - é opcional
    if (!activityName || typeof activityName !== 'string') missingParams.push('activityName');

    if (missingParams.length > 0) {
        console.error('[ActivityQuestionnaireScreen] ❌ ERRO CRÍTICO: Parâmetros obrigatórios faltando:', missingParams);
        return (
            <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={64} color="#dc3545" />
                <Text style={styles.errorText}>
                    Erro de navegação: dados obrigatórios não fornecidos{'\n'}
                    Faltando: {missingParams.join(', ')}
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.retryButtonText}>Voltar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    console.log('[ActivityQuestionnaireScreen] ✅ Validação de parâmetros OK:', {
        activityId,
        activityEquipmentId,
        equipmentId,
        equipmentTag,
        activityName
    });

    // Só renderiza o componente principal se tudo estiver válido
    return <ActivityQuestionnaireScreen route={route} navigation={navigation} />;
};

// Componente principal (COM HOOKS - sem early returns)
const ActivityQuestionnaireScreen: React.FC<ActivityQuestionnaireScreenProps> = ({ route, navigation }) => {
    // Parâmetros já foram validados pelo wrapper
    const {
        activityId,
        activityEquipmentId,
        equipmentId,
        equipmentTag,
        activityName,
        budgetPolicy,
        fromNewActivityFlow
    } = route.params;

    // Hook useLanguage com tratamento defensivo
    let t: any;
    try {
        const languageContext = useLanguage();
        t = languageContext.t;
        if (!t || typeof t !== 'function') {
            console.warn('[ActivityQuestionnaireScreen] ⚠️ Hook useLanguage não retornou função t válida');
            t = (key: string) => key; // Fallback simples
        }
    } catch (error) {
        console.error('[ActivityQuestionnaireScreen] ❌ ERRO no hook useLanguage:', error);
        t = (key: string) => key; // Fallback simples
    }

    // Hooks para permissões e usuário
    const { hasPermission } = usePermissions();
    const { username } = useUser();

    const activityService = new ActivityService();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [equipmentData, setEquipmentData] = useState<any>(null);
    const [questions, setQuestions] = useState<ActivityDynamicField[]>([]);
    const [answers, setAnswers] = useState<{ [key: string]: any }>({});
    const [savedAnswers, setSavedAnswers] = useState<{ [key: string]: boolean }>({});
    const [savedAnswersData, setSavedAnswersData] = useState<any[]>([]);
    const [activityStarted, setActivityStarted] = useState(false);
    const [activityCompleted, setActivityCompleted] = useState(false);
    const [equipmentStatus, setEquipmentStatus] = useState<string>('created');
    const [questionsLoading, setQuestionsLoading] = useState<boolean>(false);
    const [noQuestions, setNoQuestions] = useState<boolean>(false);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const firstQuestionAnsweredRef = useRef<boolean>(false); // Rastrear se primeira questão foi respondida

    // Bloquear edição quando o orçamento foi aprovado OU quando está fechado/completado sem permissão
    const isQuestionnaireReadOnly = 
        equipmentStatus === EquipmentStatus.BUDGET_APPROVAL ||
        ((equipmentStatus === EquipmentStatus.CLOSED || equipmentStatus === EquipmentStatus.COMPLETED) && 
         !hasPermission("add_answer_in_completed_question"));

    // ETAPA 2: useEffects com tratamento robusto de erros
    useEffect(() => {
        console.log('[ActivityQuestionnaireScreen] useEffect inicial - chamando fetchEquipmentData');
        try {
            fetchEquipmentData();
        } catch (error) {
            console.error('[ActivityQuestionnaireScreen] ❌ ERRO CRÍTICO no useEffect inicial:', error);
            setError('Erro interno ao inicializar a tela. Tente novamente.');
        }
    }, []);

    useEffect(() => {
        console.log('[ActivityQuestionnaireScreen] useEffect questions - equipmentData:', !!equipmentData, 'questions.length:', questions.length);
        if (equipmentData && questions.length === 0) {
            try {
                console.log('[ActivityQuestionnaireScreen] Chamando fetchQuestions...');
                fetchQuestions();
            } catch (error) {
                console.error('[ActivityQuestionnaireScreen] ❌ ERRO CRÍTICO ao chamar fetchQuestions:', error);
                setError('Erro ao carregar questionário. Tente novamente.');
            }
        }
    }, [equipmentData]);

    // Enriquecer dados do equipamento (setor) caso o backend não retorne o objeto completo
    useEffect(() => {
        const enrichSectorIfNeeded = async () => {
            console.log('[ActivityQuestionnaireScreen] useEffect enrichSector - equipmentData:', !!equipmentData);
            try {
                if (!equipmentData) {
                    console.log('[ActivityQuestionnaireScreen] enrichSector: equipmentData não disponível');
                    return;
                }
                if (equipmentData.sector && (equipmentData.sector.name || equipmentData.sector.complete_name)) {
                    console.log('[ActivityQuestionnaireScreen] enrichSector: setor já preenchido');
                    return;
                }
                const sectorId = equipmentData.sector_id;
                const clientId = equipmentData.client_id || equipmentData.client?.id;
                console.log('[ActivityQuestionnaireScreen] enrichSector: sectorId:', sectorId, 'clientId:', clientId);
                if (!sectorId || !clientId) {
                    console.log('[ActivityQuestionnaireScreen] enrichSector: sectorId ou clientId não disponível');
                    return;
                }
                const token = await AsyncStorage.getItem("access_token");
                if (!token) {
                    console.warn('[ActivityQuestionnaireScreen] enrichSector: token não encontrado');
                    return;
                }
                console.log('[ActivityQuestionnaireScreen] enrichSector: buscando detalhes do setor...');
                const sectorDetails = await ClientService.getSectorDetails(String(clientId), Number(sectorId), token);
                console.log('[ActivityQuestionnaireScreen] enrichSector: detalhes obtidos:', sectorDetails);
                setEquipmentData((prev: any) => ({ ...prev, sector: sectorDetails }));
            } catch (e) {
                console.error('[ActivityQuestionnaireScreen] ❌ ERRO ao enriquecer setor:', (e as any)?.message);
                console.error('[ActivityQuestionnaireScreen] Stack trace:', (e as any)?.stack);
                // Não definir erro aqui pois é uma funcionalidade secundária
            }
        };

        if (equipmentData) {
            enrichSectorIfNeeded().catch(error => {
                console.error('[ActivityQuestionnaireScreen] ❌ ERRO não capturado em enrichSectorIfNeeded:', error);
            });
        }
    }, [equipmentData]);

    const fetchEquipmentData = async () => {
        console.log('[ActivityQuestionnaireScreen] ===== FETCH EQUIPMENT DATA =====');
        console.log('[ActivityQuestionnaireScreen] equipmentId:', equipmentId);
        try {
            setLoading(true);
            setError(null); // Limpar erro anterior

            console.log('[ActivityQuestionnaireScreen] Buscando token...');
            const token = await AsyncStorage.getItem("access_token");
            if (!token) {
                console.error('[ActivityQuestionnaireScreen] ❌ Token não encontrado no AsyncStorage');
                throw new Error("Token não encontrado");
            }
            console.log('[ActivityQuestionnaireScreen] ✅ Token encontrado');

            // Verificar conectividade
            console.log('[ActivityQuestionnaireScreen] Verificando conectividade...');
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);
            const cacheKey = `equipment_data_${equipmentId}`;
            console.log('[ActivityQuestionnaireScreen] Conectividade:', isConnected, 'CacheKey:', cacheKey);

            if (isConnected) {
                console.log('[ActivityQuestionnaireScreen] 🌐 MODO ONLINE - buscando dados do equipamento:', equipmentId);

                // Import estático para evitar problemas de bundling
                console.log('[ActivityQuestionnaireScreen] Fazendo requisição para equipamento...');
                const { default: apiClient } = require('../../Context/ApiClient');
                const response = await apiClient.get(`/equipments/${equipmentId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                console.log('[ActivityQuestionnaireScreen] ✅ Response recebida:', response.status);
                console.log('[ActivityQuestionnaireScreen] Dados do equipamento:', response.data);

                const data = response.data;
                if (!data) {
                    console.error('[ActivityQuestionnaireScreen] ❌ Dados do equipamento são undefined/null');
                    throw new Error("Dados do equipamento não encontrados");
                }

                setEquipmentData(data);
                console.log('[ActivityQuestionnaireScreen] ✅ Estado equipmentData atualizado');

                // Salvar no cache
                console.log('[ActivityQuestionnaireScreen] Salvando no cache...');
                await OfflineService.cacheData(cacheKey, data);
                console.log('[ActivityQuestionnaireScreen] ✅ Dados do equipamento salvos no cache');

                // Buscar status específico do equipamento na atividade (conforme Postman: objeto com "results")
                console.log('[ActivityQuestionnaireScreen] Buscando status do equipamento na atividade...');
                try {
                    const equipmentsResponse = await ActivityService.fetchActivityEquipments(activityId, { token });
                    console.log('[ActivityQuestionnaireScreen] Response equipments:', equipmentsResponse);

                    const list = Array.isArray(equipmentsResponse)
                        ? equipmentsResponse
                        : (equipmentsResponse?.results ?? equipmentsResponse?.data ?? []);
                    console.log('[ActivityQuestionnaireScreen] Lista de equipamentos processada:', list.length, 'itens');

                    const equipmentInActivity = list.find((eq: any) => eq.id === activityEquipmentId);
                    console.log('[ActivityQuestionnaireScreen] Equipamento encontrado na atividade:', !!equipmentInActivity);

                    if (equipmentInActivity) {
                        console.log('[ActivityQuestionnaireScreen] ✅ Status do equipamento na atividade:', equipmentInActivity.status);
                        setEquipmentStatus(equipmentInActivity.status);

                        console.log('[ActivityQuestionnaireScreen] Processando status para flags de atividade...');
                        const status = equipmentInActivity.status?.toLowerCase();
                        if (status === EquipmentStatus.OPEN || status === EquipmentStatus.PENDING || 
                            status === EquipmentStatus.WAITING_BUDGET_APPROVAL || 
                            status === EquipmentStatus.BUDGET_APPROVAL || 
                            status === EquipmentStatus.BUDGET_DISAPPROVAL ||
                            status === EquipmentStatus.COMPLETED ||
                            status === EquipmentStatus.WAITING_WORK_APPROVAL) {
                            console.log('[ActivityQuestionnaireScreen] ✅ Atividade iniciada (status:', status, ')');
                            setActivityStarted(true);
                        }
                        if (status === EquipmentStatus.CLOSED) {
                            console.log('[ActivityQuestionnaireScreen] ✅ Atividade completa (status closed)');
                            setActivityCompleted(true);
                        }
                        
                        // Resetar flag de primeira questão se status não for OPEN
                        if (status !== EquipmentStatus.OPEN) {
                            firstQuestionAnsweredRef.current = true; // Já passou da primeira questão
                        }
                    } else {
                        console.warn('[ActivityQuestionnaireScreen] ⚠️ Equipamento não encontrado na lista da atividade');
                    }
                } catch (activityError: any) {
                    console.error('[ActivityQuestionnaireScreen] ❌ Erro ao buscar status da atividade (via service):', activityError);
                    console.error('[ActivityQuestionnaireScreen] Stack trace:', activityError?.stack);
                    // Se falhar, usar status padrão
                    console.log('[ActivityQuestionnaireScreen] Usando status padrão: created');
                    setEquipmentStatus('created');
                }
            } else {
                console.log('[ActivityQuestionnaireScreen] 📱 MODO OFFLINE - buscando dados do equipamento do cache');
                const cachedEquipmentData = await OfflineService.getCachedData(cacheKey);
                if (cachedEquipmentData) {
                    console.log('[ActivityQuestionnaireScreen] ✅ Dados do equipamento carregados do cache:', cachedEquipmentData);
                    setEquipmentData(cachedEquipmentData);
                } else {
                    console.error('[ActivityQuestionnaireScreen] ❌ Dados não encontrados no cache para offline');
                    throw new Error("Dados do equipamento não disponíveis offline. Conecte-se à internet para carregar.");
                }
            }
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] ❌❌❌ ERRO CRÍTICO fetchEquipmentData:', error);
            console.error('[ActivityQuestionnaireScreen] Tipo do erro:', typeof error);
            console.error('[ActivityQuestionnaireScreen] Message:', error?.message);
            console.error('[ActivityQuestionnaireScreen] Stack trace:', error?.stack);
            setError(error.message || "Falha ao carregar dados do equipamento.");
        } finally {
            console.log('[ActivityQuestionnaireScreen] fetchEquipmentData finalizado');
            setLoading(false);
        }
    };

    const fetchQuestions = async () => {
        console.log('[ActivityQuestionnaireScreen] ===== FETCH QUESTIONS =====');
        console.log('[ActivityQuestionnaireScreen] equipmentData disponível:', !!equipmentData);
        console.log('[ActivityQuestionnaireScreen] equipmentData.equipment_type_id:', equipmentData?.equipment_type_id);
        try {
            setQuestionsLoading(true);
            setError(null);
            setNoQuestions(false);
            console.log('[ActivityQuestionnaireScreen] Buscando token...');
            const token = await AsyncStorage.getItem("access_token");
            if (!token) {
                console.error('[ActivityQuestionnaireScreen] ❌ Token não encontrado no AsyncStorage');
                throw new Error("Token não encontrado");
            }
            console.log('[ActivityQuestionnaireScreen] ✅ Token encontrado');

            console.log('[ActivityQuestionnaireScreen] Buscando questões para atividade:', activityId);

            // Buscar dados do equipamento na atividade para obter activity_plan_id e version_id
            console.log('[ActivityQuestionnaireScreen] Buscando equipamentos da atividade via ActivityService...');
            const activityEquipmentResponse = await ActivityService.fetchActivityEquipments(activityId, { token });

            console.log('[ActivityQuestionnaireScreen] ✅ Dados dos equipamentos da atividade recebidos:', activityEquipmentResponse);

            // Encontrar o equipamento específico
            console.log('[ActivityQuestionnaireScreen] Procurando equipamento com activityEquipmentId:', activityEquipmentId);
            const equipmentData = activityEquipmentResponse.results?.find((eq: any) => eq.id === activityEquipmentId);

            if (!equipmentData) {
                console.error('[ActivityQuestionnaireScreen] ❌ Equipamento não encontrado na atividade');
                console.error('[ActivityQuestionnaireScreen] Lista de equipamentos disponíveis:', activityEquipmentResponse.results?.map((eq: any) => ({ id: eq.id, tag: eq.tag })));
                setError("Equipamento não encontrado na atividade.");
                return;
            }

            console.log('[ActivityQuestionnaireScreen] ✅ Dados do equipamento na atividade:', equipmentData);

            // O activity_plan_version_id é o ID da versão do plano de atividade
            const versionId = equipmentData.activity_plan_version_id;
            console.log('[ActivityQuestionnaireScreen] activity_plan_version_id extraído:', versionId);

            if (!versionId) {
                console.error('[ActivityQuestionnaireScreen] ❌ Activity Plan Version ID não encontrado');
                setError("Plano de atividade não configurado para este equipamento.");
                return;
            }

            console.log('[ActivityQuestionnaireScreen] Buscando questões - Version ID:', versionId);

            // Buscar questões usando o endpoint correto especificado no tarefas.md
            console.log('[ActivityQuestionnaireScreen] Buscando questões usando endpoint correto...');

            try {
                // Usar o endpoint correto para buscar questões: GET /api/activity_plans/:activity_plan_id/versions/:version_id
                // Precisamos primeiro obter o activity_plan_id e version_id do equipamento na atividade

                if (!equipmentData.activity_plan_id || !equipmentData.activity_plan_version_id) {
                    console.error('[ActivityQuestionnaireScreen] Activity plan ID ou version ID não encontrado no equipamento');
                    setError("Dados do plano de atividade não encontrados para este equipamento.");
                    return;
                }

                const questionsResponse = await apiClient.get(`/activity_plans/${equipmentData.activity_plan_id}/versions/${equipmentData.activity_plan_version_id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                console.log('[ActivityQuestionnaireScreen] Questões recebidas:', questionsResponse.data);

                if (questionsResponse.data && questionsResponse.data.questions && questionsResponse.data.questions.length > 0) {
                    setQuestions(questionsResponse.data.questions);
                    console.log('[ActivityQuestionnaireScreen] ✅ Questões carregadas com sucesso');

                    // Carregar respostas salvas
                    try {
                        const savedAnswersResponse = await ActivityService.fetchActivityAnswers(
                            activityId,
                            activityEquipmentId,
                            token
                        );
                        console.log('[ActivityQuestionnaireScreen] Respostas salvas carregadas:', savedAnswersResponse);

                        // Verificar estrutura das respostas
                        const results = savedAnswersResponse.results || savedAnswersResponse || [];
                        console.log('[ActivityQuestionnaireScreen] Results extraídos:', results);

                        // Log detalhado de uploads para debug
                        results.forEach((answer: any, index: number) => {
                            console.log(`[ActivityQuestionnaireScreen] Resposta ${index}:`, {
                                question_id: answer.question_id,
                                value: answer.value,
                                tem_uploads_urls: !!answer.uploads_urls,
                                uploads_urls: answer.uploads_urls,
                                tem_uploads: !!answer.uploads,
                                uploads: answer.uploads
                            });

                            if (answer.uploads_urls && answer.uploads_urls.length > 0) {
                                console.log(`[ActivityQuestionnaireScreen] Resposta ${index} uploads_urls detalhado:`,
                                    answer.uploads_urls.map((url: any, i: number) => ({
                                        index: i,
                                        tipo: typeof url,
                                        valor: url
                                    }))
                                );
                            }
                        });

                        setSavedAnswersData(results);

                        // Marcar questões como salvas
                        const savedMap: { [key: string]: boolean } = {};
                        results.forEach((answer: any) => {
                            const field = questionsResponse.data.questions.find((q: any) => q.id === answer.question_id);
                            if (field) savedMap[field.key] = true;
                        });
                        setSavedAnswers(savedMap);
                    } catch (savedError) {
                        console.log('[ActivityQuestionnaireScreen] Nenhuma resposta salva encontrada:', savedError);
                    }
                } else {
                    console.log('[ActivityQuestionnaireScreen] Nenhuma questão encontrada para este equipamento');
                    setNoQuestions(true);
                }
            } catch (questionsError: any) {
                console.error('[ActivityQuestionnaireScreen] Erro ao buscar questões:', questionsError.response?.status, questionsError.response?.data);
                setError("Não foi possível carregar as questões para este equipamento.");
            }
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] Erro ao buscar questões:', error);
            setError("Falha ao carregar questões da atividade.");
        } finally {
            setQuestionsLoading(false);
        }
    };

    const startActivity = async () => {
        try {
            setSaving(true);
            setError(null);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            console.log('[ActivityQuestionnaireScreen] Iniciando atividade no equipamento:', {
                activityId,
                activityEquipmentId,
                equipmentId
            });

            // Se o status já é "pending" ou "open", não precisa alterar
            if (equipmentStatus === EquipmentStatus.PENDING || equipmentStatus === EquipmentStatus.OPEN) {
                console.log('[ActivityQuestionnaireScreen] Equipamento já está com status', equipmentStatus, ', não precisa alterar');
                setActivityStarted(true);
                Alert.alert("Sucesso", "Atividade já está disponível para questionário!");
                return;
            }

            const response = await ActivityService.patchActivityEquipment(
                activityId,
                activityEquipmentId,
                { status: EquipmentStatus.OPEN },
                token
            );

            console.log('[ActivityQuestionnaireScreen] Resposta da API:', response);

            // Verificar se foi salvo offline
            if (response.offline) {
                Alert.alert(
                    "📱 Modo Offline",
                    "A atividade foi marcada para início e será processada quando houver conexão com a internet.",
                    [{ text: "OK" }]
                );
            } else {
                Alert.alert("Sucesso", "Atividade iniciada com sucesso!");
            }

            // Atualizar o status local
            setEquipmentStatus(EquipmentStatus.OPEN);
            setActivityStarted(true);

            // Recarregar dados do equipamento para refletir o novo status
            await fetchEquipmentData();
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] Erro ao iniciar atividade:', error);

            let errorMessage = "Falha ao iniciar atividade. Tente novamente.";

            if (error.response?.status === 404) {
                errorMessage = "Atividade ou equipamento não encontrado.";
            } else if (error.response?.status === 400) {
                errorMessage = "Dados inválidos para iniciar a atividade.";
            } else if (error.response?.status === 403) {
                errorMessage = "Sem permissão para iniciar esta atividade.";
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            setError(errorMessage);
            Alert.alert("Erro", errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const saveIndividualAnswer = async (questionId: string, answer: any) => {
        // Bloquear salvamento se o questionário estiver em modo somente leitura
        if (isQuestionnaireReadOnly) {
            console.log('[ActivityQuestionnaireScreen] ⚠️ Tentativa de edição bloqueada - status BUDGET_APPROVAL');
            return;
        }

        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) {
                console.error('[ActivityQuestionnaireScreen] ❌ Token não encontrado');
                Alert.alert(
                    "Erro de Autenticação",
                    "Sessão expirada. Por favor, faça login novamente.",
                    [{ text: "OK" }]
                );
                throw new Error("Token não encontrado");
            }

            console.log('[ActivityQuestionnaireScreen] 💾 Iniciando salvamento de resposta individual...');
            console.log('[ActivityQuestionnaireScreen] 📝 Question ID:', questionId);
            console.log('[ActivityQuestionnaireScreen] 📦 Answer data:', answer);

            // Validar dados obrigatórios antes de enviar
            if (!answer.question_id || answer.question_id <= 0) {
                console.error('[ActivityQuestionnaireScreen] ❌ question_id inválido:', answer.question_id);
                Alert.alert(
                    "Erro de Validação",
                    "ID da questão inválido. Por favor, tente novamente.",
                    [{ text: "OK" }]
                );
                throw new Error('ID da questão inválido');
            }

            if (answer.value === undefined || answer.value === null) {
                console.warn('[ActivityQuestionnaireScreen] ⚠️ Valor vazio, pulando salvamento para:', questionId);
                return; // não salva valores vazios
            }

            // Converter para o formato esperado pela API
            const answerData: ActivityAnswer = {
                question_id: Number(answer.question_id),
                value: answer.value,
                justification: answer.justification || '',
                uploads: Array.isArray(answer.uploads) ? answer.uploads : []
            };

            // Se estiver editando após fechamento/completamento (CLOSED ou COMPLETED), adicionar campos de auditoria
            if ((equipmentStatus === EquipmentStatus.CLOSED || equipmentStatus === EquipmentStatus.COMPLETED) && 
                hasPermission("add_answer_in_completed_question")) {
                const now = new Date().toISOString();
                (answerData as any).completed_at = now;
                (answerData as any).completed_by = username || "Usuário";
                console.log('[ActivityQuestionnaireScreen] 📝 Edição após fechamento/completamento - registrando:', {
                    status: equipmentStatus,
                    completed_at: now,
                    completed_by: username
                });
            }

            console.log('[ActivityQuestionnaireScreen] ✅ Dados validados para envio:', {
                question_id: answerData.question_id,
                hasValue: !!answerData.value,
                hasJustification: !!answerData.justification,
                uploadsCount: answerData.uploads?.length || 0,
                completed_at: (answerData as any).completed_at,
                completed_by: (answerData as any).completed_by,
                activityId,
                activityEquipmentId
            });

            console.log('[ActivityQuestionnaireScreen] 🚀 Enviando para ActivityService...');
            const response = await ActivityService.postActivityAnswer(
                activityId,
                activityEquipmentId,
                answerData,
                token
            );

            console.log('[ActivityQuestionnaireScreen] 📬 Resposta recebida da API:', response);

            // Verificar flags de offline antes de mostrar alert
            console.log('[ActivityQuestionnaireScreen] 🔍 Verificando flags de offline:', {
                offline: response.offline,
                queued: response.queued,
                success: response.success
            });

            // Verificar se foi salvo offline ou online
            if (response.offline || response.queued) {
                console.warn('[ActivityQuestionnaireScreen] ⚠️ Resposta salva OFFLINE (será sincronizada quando houver conexão)');

                // Mostrar feedback ao usuário de que foi salvo offline
                Alert.alert(
                    "Salvo Localmente",
                    "Resposta salva no dispositivo e será enviada ao servidor quando houver conexão estável.",
                    [{ text: "Entendi" }]
                );
            } else {
                console.log('[ActivityQuestionnaireScreen] ✅ Resposta salva ONLINE no servidor com sucesso!');
            }

            // Marcar como salvo
            setSavedAnswers(prev => ({ ...prev, [questionId]: true }));
            console.log('[ActivityQuestionnaireScreen] ✅ Resposta marcada como salva:', questionId);

            // Detectar primeira questão preenchida e atualizar status para PENDING
            if (!firstQuestionAnsweredRef.current && equipmentStatus === EquipmentStatus.OPEN) {
                console.log('[ActivityQuestionnaireScreen] 🎯 Primeira questão respondida! Atualizando status para PENDING...');
                firstQuestionAnsweredRef.current = true;
                
                try {
                    // Atualizar status do equipamento para PENDING
                    const statusResponse = await ActivityService.patchActivityEquipment(
                        activityId,
                        activityEquipmentId,
                        { status: EquipmentStatus.PENDING },
                        token
                    );
                    
                    console.log('[ActivityQuestionnaireScreen] ✅ Status atualizado para PENDING:', statusResponse);
                    setEquipmentStatus(EquipmentStatus.PENDING);
                    
                    // Sincronizar status da atividade
                    try {
                        await ActivityService.syncActivityStatusFromEquipments(activityId, token);
                    } catch (syncError: any) {
                        console.warn('[ActivityQuestionnaireScreen] Erro ao sincronizar status da atividade:', syncError);
                    }
                    
                    // Recarregar dados do equipamento para refletir o novo status
                    await fetchEquipmentData();
                } catch (statusError: any) {
                    console.error('[ActivityQuestionnaireScreen] ⚠️ Erro ao atualizar status para PENDING:', statusError);
                    // Não bloquear o fluxo se falhar a atualização de status
                }
            }
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] ❌❌❌ ERRO ao salvar resposta individual ❌❌❌');
            console.error('[ActivityQuestionnaireScreen] 🔴 Tipo:', error?.constructor?.name);
            console.error('[ActivityQuestionnaireScreen] 🔴 Mensagem:', error?.message);
            console.error('[ActivityQuestionnaireScreen] 🔴 Detalhes completos:', {
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                data: error?.response?.data,
                questionId,
                activityId,
                activityEquipmentId
            });

            // Marcar como não salvo em caso de erro
            setSavedAnswers(prev => ({ ...prev, [questionId]: false }));

            // Mostrar mensagem de erro apropriada ao usuário
            let errorMessage = "Erro ao salvar resposta. ";

            if (error?.message?.includes('validação')) {
                errorMessage += "Verifique se todos os campos obrigatórios foram preenchidos corretamente.";
            } else if (error?.response?.status === 401) {
                errorMessage += "Sessão expirada. Por favor, faça login novamente.";
            } else if (error?.response?.status === 403) {
                errorMessage += "Você não tem permissão para realizar esta ação.";
            } else if (error?.response?.status === 404) {
                errorMessage += "Atividade ou equipamento não encontrado.";
            } else if (error?.response?.status >= 500) {
                errorMessage += "Erro no servidor. Tente novamente em alguns instantes.";
            } else if (!error?.response) {
                errorMessage += "Problema de conexão. Verifique sua internet.";
            } else {
                errorMessage += "Por favor, tente novamente.";
            }

            Alert.alert(
                "Erro ao Salvar",
                errorMessage,
                [
                    {
                        text: "Ver Detalhes",
                        onPress: () => {
                            const details = error?.response?.data
                                ? JSON.stringify(error.response.data, null, 2)
                                : error?.message || "Erro desconhecido";
                            Alert.alert("Detalhes do Erro", details);
                        }
                    },
                    { text: "OK" }
                ]
            );
        }
    };

    const clearLocalData = async () => {
        try {
            console.log('[ActivityQuestionnaireScreen] Limpando dados locais...');
            const keys = await AsyncStorage.getAllKeys();
            const activityKeys = keys.filter(key =>
                key.startsWith(`activity_questionnaire_${activityId}_${activityEquipmentId}_`)
            );

            if (activityKeys.length > 0) {
                await AsyncStorage.multiRemove(activityKeys);
                console.log('[ActivityQuestionnaireScreen] Dados locais limpos:', activityKeys.length, 'chaves removidas');
            }
        } catch (error) {
            console.error('[ActivityQuestionnaireScreen] Erro ao limpar dados locais:', error);
        }
    };

    const completeActivity = async () => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            // Se a política for spot, perguntar ao usuário sobre orçamento
            if (budgetPolicy === "spot") {
                Alert.alert(
                    t('common.confirm'),
                    t('activityQuestionnaire.questionnaire'),
                    [
                        {
                            text: t('activityQuestionnaire.sendToBudget'),
                            onPress: () => {
                                setShowBudgetModal(true);
                                setSaving(false);
                            }
                        },
                        {
                            text: t('activityQuestionnaire.continueExecution'),
                            onPress: async () => {
                                try {
                                    // Fluxo 2: Continuar para Execução - atualizar para COMPLETED
                                    const nextStatus = getNextStatusForAction(
                                        equipmentStatus,
                                        'continue_execution',
                                        budgetPolicy
                                    );
                                    
                                    if (!nextStatus) {
                                        throw new Error('Não é possível continuar execução no estado atual');
                                    }
                                    
                                    if (!canTransitionEquipmentStatus(equipmentStatus, nextStatus, budgetPolicy)) {
                                        throw new Error('Transição de status não permitida');
                                    }
                                    
                                    const response = await ActivityService.patchActivityEquipment(
                                        activityId,
                                        activityEquipmentId,
                                        { status: nextStatus },
                                        token
                                    );
                                    
                                    await clearLocalData();
                                    
                                    if (response.offline) {
                                        Alert.alert(
                                            "📱 Modo Offline",
                                            "A atividade foi marcada para execução e será processada quando houver conexão.",
                                            [{ text: "OK", onPress: () => navigation.navigate("ActivityHistoryScreen" as any) }]
                                        );
                                    } else {
                                        Alert.alert(
                                            "Sucesso",
                                            "Atividade marcada para execução",
                                            [{ text: "OK", onPress: () => navigation.navigate("ActivityHistoryScreen" as any) }]
                                        );
                                    }
                                } catch (error: any) {
                                    Alert.alert("Erro", error.message || "Falha ao continuar execução");
                                } finally {
                                    setSaving(false);
                                }
                            }
                        },
                        {
                            text: "Cancelar",
                            style: "cancel",
                            onPress: () => setSaving(false)
                        }
                    ]
                );
            } else {
                // Fluxo normal - para budget_policy diferente de "spot", sempre enviar para orçamento
                console.log('[ActivityQuestionnaireScreen] Budget policy:', budgetPolicy, '- redirecionando para orçamento');
                setShowBudgetModal(true);
                setSaving(false);
                return;
            }
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] Erro ao concluir atividade:', error);
            Alert.alert(t('common.error'), t('activityQuestionnaire.completeError'));
            setSaving(false);
        }
    };

    // Função auxiliar para concluir atividade (usada quando não há budget policy spot)
    const finalizeActivity = async () => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            // Para fluxos sem orçamento, marcar como COMPLETED
            const response = await ActivityService.patchActivityEquipment(
                activityId,
                activityEquipmentId,
                { status: EquipmentStatus.COMPLETED },
                token
            );
            
            console.log('[ActivityQuestionnaireScreen] Resposta da conclusão:', response);
            
            await clearLocalData();
            
            if (response.offline) {
                Alert.alert(
                    "📱 Modo Offline",
                    "A atividade foi marcada para conclusão e será processada quando houver conexão com a internet.",
                    [{ text: "OK", onPress: () => navigation.navigate("ActivityHistoryScreen" as any) }]
                );
            } else {
                Alert.alert(t('common.success'), t('activityQuestionnaire.completeSuccess'), [
                    { text: "OK", onPress: () => navigation.navigate("ActivityHistoryScreen" as any) }
                ]);
            }
            
            setActivityCompleted(true);
            setSaving(false);
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] Erro ao finalizar atividade:', error);
            Alert.alert(t('common.error'), error.message || t('activityQuestionnaire.completeError'));
            setSaving(false);
        }
    };

    const handleSendToBudget = () => {
        setShowBudgetModal(true);
    };

    const handleContinueExecution = async () => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            // Fluxo 2: Continuar para Execução - atualizar para COMPLETED
            const nextStatus = getNextStatusForAction(
                equipmentStatus,
                'continue_execution',
                budgetPolicy
            );
            
            if (!nextStatus) {
                throw new Error('Não é possível continuar execução no estado atual');
            }
            
            if (!canTransitionEquipmentStatus(equipmentStatus, nextStatus, budgetPolicy)) {
                throw new Error('Transição de status não permitida');
            }

            const response = await ActivityService.patchActivityEquipment(
                activityId,
                activityEquipmentId,
                { status: nextStatus },
                token
            );
            
            await clearLocalData();
            
            if (response.offline) {
                Alert.alert(
                    "📱 Modo Offline",
                    "A atividade foi marcada para execução e será processada quando houver conexão.",
                    [{ text: "OK", onPress: () => navigation.navigate("ActivityHistoryScreen" as any) }]
                );
            } else {
                Alert.alert(
                    t('common.success'),
                    "Atividade marcada para execução",
                    [{ text: "OK", onPress: () => navigation.navigate("ActivityHistoryScreen" as any) }]
                );
            }
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message || "Falha ao continuar execução");
        } finally {
            setSaving(false);
        }
    };

    const validateAnswers = () => {
        console.log('[ActivityQuestionnaireScreen] Validando respostas...');
        console.log('[ActivityQuestionnaireScreen] Respostas atuais:', answers);
        console.log('[ActivityQuestionnaireScreen] Respostas salvas:', savedAnswers);

        // Verificar se todas as questões obrigatórias foram respondidas
        for (const question of questions) {
            if (question.rules?.required) {
                const value = answers[question.key];
                console.log(`[ActivityQuestionnaireScreen] Validando questão ${question.key}:`, {
                    required: question.rules?.required,
                    value: value,
                    saved: savedAnswers[question.key]
                });

                const isEmpty = (
                    value === undefined ||
                    value === null ||
                    value === '' ||
                    (typeof value === 'string' && value.trim() === '') ||
                    (Array.isArray(value) && value.length === 0)
                );
                if (isEmpty) {
                    console.log(`[ActivityQuestionnaireScreen] ❌ Questão ${question.key} sem valor válido`);
                    return false;
                }

                // Validações específicas por tipo
                if (question.type === 'measure') {
                    const numValue = Number(value);
                    if (isNaN(numValue)) {
                        console.log(`[ActivityQuestionnaireScreen] ❌ Questão ${question.key} com valor numérico inválido`);
                        return false;
                    }
                }
                if ((question.type === 'select' || question.type === 'radio' || question.type === 'radio_with_justification') && (question as any).options) {
                    if (!((question as any).options as any[]).includes(value)) {
                        console.log(`[ActivityQuestionnaireScreen] ❌ Questão ${question.key} com opção inválida`);
                        return false;
                    }
                }

                // Verificar justificativa para radio_with_justification
                if (question.type === 'radio_with_justification' && value === (question as any).justification_target) {
                    const justification = answers[`${question.key}_justification`];
                    if (!justification || (typeof justification === 'string' && justification.trim() === '')) {
                        console.log(`[ActivityQuestionnaireScreen] ❌ Questão ${question.key} sem justificativa`);
                        return false;
                    }
                }

                // Verificar upload obrigatório
                if ((question as any).has_upload) {
                    const uploadsObj = answers.uploads || {};
                    const uploads = uploadsObj[question.key];
                    console.log(`[ActivityQuestionnaireScreen] Verificando uploads para ${question.key}:`, uploads);
                    if (!Array.isArray(uploads) || uploads.length === 0) {
                        console.log(`[ActivityQuestionnaireScreen] ❌ Questão ${question.key} sem upload obrigatório (recebido: ${typeof uploads})`);
                        return false;
                    }
                    const hasValidUploads = uploads.every((u: any) => u && typeof u === 'object' && typeof u.uri === 'string');
                    if (!hasValidUploads) {
                        console.log(`[ActivityQuestionnaireScreen] ❌ Questão ${question.key} com uploads inválidos`);
                        return false;
                    }
                    console.log(`[ActivityQuestionnaireScreen] ✅ Questão ${question.key} com uploads válidos:`, uploads.length);
                }

                // Informativo: não bloquear por não ter sido salvo ainda
                if (!savedAnswers[question.key]) {
                    console.log(`[ActivityQuestionnaireScreen] ⚠️ Questão ${question.key} não foi salva no servidor, mas tem valor local`);
                }
            }
        }

        console.log('[ActivityQuestionnaireScreen] ✅ Todas as validações passaram - Botão será habilitado');
        return true;
    };

    const getPendingQuestionsCount = (): { total: number; pending: string[] } => {
        const pending: string[] = [];
        for (const question of questions) {
            if (question.rules?.required) {
                const value = answers[question.key];
                const isEmpty = (
                    value === undefined ||
                    value === null ||
                    value === '' ||
                    (typeof value === 'string' && value.trim() === '')
                );
                if (isEmpty) {
                    pending.push((question as any).label || question.key);
                    continue;
                }
                if ((question as any).has_upload) {
                    const uploads = (answers.uploads || {})[question.key];
                    if (!Array.isArray(uploads) || uploads.length === 0) {
                        pending.push(`${(question as any).label || question.key} (falta foto)`);
                    }
                }
            }
        }
        return { total: pending.length, pending };
    };

    // ===================================================================
    // TODOS OS HOOKS DEVEM VIR ANTES DE QUALQUER RETURN CONDICIONAL
    // ===================================================================
    // Log para debug do botão (hooks precisam vir antes de qualquer return condicional)
    const pendingInfo = getPendingQuestionsCount();
    const isValid = pendingInfo.total === 0;
    const hasAllRequiredPhotos = useMemo(() => {
        // Verificação adicional explícita de uploads obrigatórios
        for (const question of questions) {
            if ((question as any).rules?.required && (question as any).has_upload) {
                const uploads = (answers.uploads || {})[question.key];
                if (!Array.isArray(uploads) || uploads.length === 0) return false;
            }
        }
        return true;
    }, [answers, questions]);
    const canSendBudget = useMemo(() => isValid && hasAllRequiredPhotos, [isValid, hasAllRequiredPhotos]);

    // ===================================================================
    // AGORA SIM PODEMOS TER RETURNS CONDICIONAIS
    // ===================================================================
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.loadingText}>{t('activityQuestionnaire.loading')}</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={64} color="#dc3545" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchEquipmentData}>
                    <Text style={styles.retryButtonText}>{t('activityQuestionnaire.retry')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Log de debug para verificar condições do botão de orçamento
    const shouldShowBudgetButton = fromNewActivityFlow || !budgetPolicy || budgetPolicy === 'always' || budgetPolicy === 'on_request' || budgetPolicy === 'spot';
    console.log('[ActivityQuestionnaireScreen] Renderizando tela. validateAnswers():', validateAnswers(), { 
        isValid, 
        hasAllRequiredPhotos, 
        canSendBudget,
        shouldShowBudgetButton,
        budgetPolicy,
        fromNewActivityFlow
    });

    return (
        <ResponsiveContainer scroll={false}>
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{activityName}</Text>
                    {equipmentTag && (
                        <Text style={styles.headerSubtitle}>{t('activityQuestionnaire.equipmentTag')}: {equipmentTag}</Text>
                    )}
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Informações do Equipamento */}
                <View style={styles.equipmentInfoSection}>
                    <Text style={styles.sectionTitle}>{t('activityQuestionnaire.equipmentInfo')}</Text>
                    {equipmentData && (
                        <View style={styles.equipmentCard}>
                            {equipmentData.tag && (
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="build" size={16} color="#666" />
                                    <Text style={styles.infoText}>{t('activityQuestionnaire.equipmentTag')}: {equipmentData.tag}</Text>
                                </View>
                            )}
                            <View style={styles.infoRow}>
                                <MaterialIcons name="business" size={16} color="#666" />
                                <Text style={styles.infoText}>
                                    {t('activityQuestionnaire.manufacturer')}: {equipmentData.brand?.name || equipmentData.manufacturer?.name || "N/A"}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <MaterialIcons name="category" size={16} color="#666" />
                                <Text style={styles.infoText}>
                                    {t('activityQuestionnaire.type')}: {equipmentData.equipment_type?.name || "N/A"}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <MaterialIcons name="location-on" size={16} color="#666" />
                                <Text style={styles.infoText}>
                                    {t('activityQuestionnaire.sector')}: {equipmentData.sector?.complete_name || equipmentData.sector?.name || (equipmentData.sector_id ? `#${equipmentData.sector_id}` : "N/A")}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Status da Atividade */}
                <View style={styles.statusSection}>
                    <Text style={styles.sectionTitle}>{t('activityQuestionnaire.activityStatus')}</Text>
                    <View style={styles.statusCard}>
                        <View style={styles.statusRow}>
                            <MaterialIcons
                                name={activityStarted ? "play-circle" : "add-circle"}
                                size={20}
                                color={activityStarted ? "#007bff" : "#6c757d"}
                            />
                            <Text style={styles.statusText}>
                                {activityStarted ? t('activityQuestionnaire.activityStarted') : t('activityQuestionnaire.activityNotStarted')}
                            </Text>
                        </View>
                        {activityCompleted && (
                            <View style={styles.statusRow}>
                                <MaterialIcons name="check-circle" size={20} color="#28a745" />
                                <Text style={styles.statusText}>{t('activityQuestionnaire.activityCompleted')}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Questionário */}
                <View style={styles.questionnaireSection}>
                    <Text style={styles.sectionTitle}>{t('activityQuestionnaire.questionnaire')}</Text>

                    {/* Mensagem informativa quando o questionário estiver bloqueado */}
                    {isQuestionnaireReadOnly && (
                        <View style={styles.infoBanner}>
                            <MaterialIcons name="info" size={20} color="#17a2b8" />
                            <Text style={styles.infoBannerText}>
                                {equipmentStatus === EquipmentStatus.BUDGET_APPROVAL 
                                    ? "O questionário está bloqueado para edição porque o orçamento foi aprovado. A gestão precisa liberar a edição alterando o status do equipamento para 'Pendente'."
                                    : (equipmentStatus === EquipmentStatus.CLOSED || equipmentStatus === EquipmentStatus.COMPLETED)
                                    ? "O questionário está finalizado. Você não tem permissão para editar questionários finalizados."
                                    : "O questionário está bloqueado para edição."}
                            </Text>
                        </View>
                    )}

                    {equipmentStatus === EquipmentStatus.CREATED ? (
                        <View style={styles.startActivitySection}>
                            <Text style={styles.startActivityText}>
                                Para responder o questionário, você precisa iniciar a atividade no equipamento.
                            </Text>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.startButton]}
                                onPress={startActivity}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <MaterialIcons name="play-arrow" size={20} color="#fff" />
                                        <Text style={styles.actionButtonText}>{t('activityQuestionnaire.startActivity')}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : equipmentStatus === EquipmentStatus.PENDING || equipmentStatus === EquipmentStatus.OPEN || 
                          equipmentStatus === EquipmentStatus.WAITING_BUDGET_APPROVAL || 
                          equipmentStatus === EquipmentStatus.BUDGET_APPROVAL || 
                          equipmentStatus === EquipmentStatus.BUDGET_DISAPPROVAL ? (
                        <>
                            {console.log('[ActivityQuestionnaireScreen] Renderizando questionário com status:', equipmentStatus)}
                            {console.log('[ActivityQuestionnaireScreen] Número de questões:', questions.length)}
                            {console.log('[ActivityQuestionnaireScreen] Questões:', questions)}

                            {questionsLoading ? (
                                <View style={styles.startActivitySection}>
                                    <ActivityIndicator size="small" color="#007bff" />
                                    <Text style={styles.startActivityText}>{t('activityQuestionnaire.loading')}</Text>
                                </View>
                            ) : noQuestions ? (
                                <View style={styles.startActivitySection}>
                                    <Text style={styles.startActivityText}>{t('activityQuestionnaire.noQuestions')}</Text>
                                </View>
                            ) : questions.length > 0 ? (
                                // ETAPA 3: Validação defensiva de props para DynamicActivityQuestionnaire
                                (() => {
                                    console.log('[ActivityQuestionnaireScreen] Validando props para DynamicActivityQuestionnaire...');
                                    console.log('[ActivityQuestionnaireScreen] questions:', questions?.length || 0, 'itens');
                                    console.log('[ActivityQuestionnaireScreen] savedAnswersData:', savedAnswersData?.length || 0, 'itens');
                                    console.log('[ActivityQuestionnaireScreen] savedAnswers:', Object.keys(savedAnswers || {}).length);

                                    // Validar props críticas
                                    if (!Array.isArray(questions) || questions.length === 0) {
                                        console.error('[ActivityQuestionnaireScreen] ❌ questions não é um array válido');
                                        return (
                                            <View style={styles.errorContainer}>
                                                <Text style={styles.errorText}>Erro: questionário não configurado corretamente</Text>
                                            </View>
                                        );
                                    }

                                    if (typeof setAnswers !== 'function') {
                                        console.error('[ActivityQuestionnaireScreen] ❌ setAnswers não é uma função válida');
                                        return (
                                            <View style={styles.errorContainer}>
                                                <Text style={styles.errorText}>Erro interno: callback de resposta inválido</Text>
                                            </View>
                                        );
                                    }

                                    if (typeof saveIndividualAnswer !== 'function') {
                                        console.error('[ActivityQuestionnaireScreen] ❌ saveIndividualAnswer não é uma função válida');
                                        return (
                                            <View style={styles.errorContainer}>
                                                <Text style={styles.errorText}>Erro interno: callback de salvamento inválido</Text>
                                            </View>
                                        );
                                    }

                                    // Preparar initialValues com validação defensiva
                                    let initialValues: { [key: string]: any } = {};
                                    try {
                                        const map: { [key: string]: any } = {};
                                        (savedAnswersData || []).forEach((ans: any) => {
                                            if (ans && typeof ans === 'object' && ans.question_id) {
                                                const field = questions.find(q => q && q.id === ans.question_id);
                                                if (field && field.key) {
                                                    map[field.key] = ans.value;
                                                    if (field.type === 'radio_with_justification' && ans.justification) {
                                                        map[`${field.key}_justification`] = ans.justification;
                                                    }
                                                }
                                            }
                                        });
                                        initialValues = map;
                                        console.log('[ActivityQuestionnaireScreen] ✅ initialValues preparados:', Object.keys(initialValues).length, 'campos');
                                    } catch (error) {
                                        console.error('[ActivityQuestionnaireScreen] ❌ Erro ao preparar initialValues:', error);
                                        initialValues = {};
                                    }

                                    console.log('[ActivityQuestionnaireScreen] ✅ Renderizando DynamicActivityQuestionnaire com props válidas');
                                    return (
                                        <DynamicActivityQuestionnaire
                                            fields={questions}
                                            onChange={setAnswers}
                                            onSaveAnswer={saveIndividualAnswer}
                                            savedAnswers={savedAnswers || {}}
                                            initialValues={initialValues}
                                            initialUploads={(() => {
                                                const getUri = (u: any): string | undefined => {
                                                    if (!u) return undefined;
                                                    if (typeof u === 'string') return u;
                                                    return (
                                                        u.uri ||
                                                        u.url ||
                                                        u.path ||
                                                        u.file_url ||
                                                        (u.file && (u.file.url || u.file.path)) ||
                                                        u.content_url ||
                                                        u.contentUrl
                                                    );
                                                };
                                                const map: { [key: string]: any[] } = {};
                                                console.log('[ActivityQuestionnaireScreen] Processando uploads - savedAnswersData:', savedAnswersData);

                                                (savedAnswersData || []).forEach((ans: any, index: number) => {
                                                    const field = questions.find(q => q.id === ans.question_id);
                                                    const uploadsList = Array.isArray(ans.uploads_urls) ? ans.uploads_urls : ans.uploads;

                                                    // Debug: verificar mapeamento de campo
                                                    console.log(`[ActivityQuestionnaireScreen] Mapeamento - question_id: ${ans.question_id}, field encontrado:`, field ? field.key : 'NÃO ENCONTRADO');

                                                    console.log(`[ActivityQuestionnaireScreen] Resposta ${index}:`, {
                                                        question_id: ans.question_id,
                                                        tem_uploads_urls: !!ans.uploads_urls,
                                                        tem_uploads: !!ans.uploads,
                                                        uploadsList: uploadsList,
                                                        field_key: field?.key
                                                    });

                                                    if (field && uploadsList && Array.isArray(uploadsList)) {
                                                        const items = uploadsList
                                                            .map((u: any) => {
                                                                // Se for uma string (URL), use diretamente
                                                                if (typeof u === 'string') {
                                                                    return { uri: u, name: 'arquivo', type: 'image/jpeg' };
                                                                }
                                                                // Se for um objeto, tente extrair a URI
                                                                const uri = getUri(u);
                                                                return uri ? { uri, name: 'arquivo', type: 'image/jpeg' } : null;
                                                            })
                                                            .filter((item: any) => item !== null);

                                                        console.log(`[ActivityQuestionnaireScreen] Items processados para ${field.key}:`, items);

                                                        if (items.length > 0) map[field.key] = items;
                                                    }
                                                });
                                                console.log('[ActivityQuestionnaireScreen] Mapa final de uploads:', map);
                                                return map;
                                            })()}
                                            questionIdField="key"
                                            activityId={activityId}
                                            activityEquipmentId={activityEquipmentId}
                                            readOnly={isQuestionnaireReadOnly}
                                        />
                                    );
                                })()
                            ) : (
                                <View style={styles.startActivitySection}>
                                    <Text style={styles.startActivityText}>{t('activityQuestionnaire.noQuestions')}</Text>
                                </View>
                            )}

                            {/* Botões de Ação - Mostrar "Enviar para Orçamento" sempre que aplicável */}
                            {/* Ocultar botões quando o questionário estiver bloqueado */}
                            {!isQuestionnaireReadOnly && (
                            <View style={styles.actionButtons}>
                                {/* Mostrar botão "Enviar para Orçamento" se: 
                                    1. budgetPolicy for 'always', 'on_request' ou 'spot'
                                    2. Ou fromNewActivityFlow for true 
                                    3. Ou se não houver budgetPolicy definido (default para mostrar) */}
                                {(fromNewActivityFlow || !budgetPolicy || budgetPolicy === 'always' || budgetPolicy === 'on_request' || budgetPolicy === 'spot') && (
                                    <TouchableOpacity
                                        style={[
                                            styles.actionButton,
                                            styles.saveButton,
                                            (!canSendBudget || saving) && styles.actionButtonDisabled
                                        ]}
                                        onPress={() => {
                                            if (!canSendBudget) {
                                                Alert.alert(
                                                    'Campos Obrigatórios Pendentes',
                                                    `Você precisa preencher ${pendingInfo.total} campo(s) obrigatório(s):\n\n${pendingInfo.pending.join('\n')}`,
                                                    [{ text: 'OK' }]
                                                );
                                            } else {
                                                console.log('[ActivityQuestionnaireScreen] Abrindo modal de orçamento');
                                                setShowBudgetModal(true);
                                            }
                                        }}
                                        disabled={saving || !canSendBudget}
                                    >
                                        {saving ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <>
                                                {!canSendBudget && (
                                                    <View style={styles.badgeContainer}>
                                                        <Text style={styles.badgeText}>{pendingInfo.total}</Text>
                                                    </View>
                                                )}
                                                <MaterialIcons name="attach-money" size={20} color="#fff" />
                                                <Text style={styles.actionButtonText}>{t('activityQuestionnaire.sendToBudget')}</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                )}

                                {/* Botão "Continuar Execução" ou "Concluir Atividade" */}
                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        styles.completeButton,
                                        !isValid && styles.actionButtonDisabled
                                    ]}
                                    onPress={() => {
                                        if (!isValid) {
                                            Alert.alert(
                                                'Campos Obrigatórios Pendentes',
                                                `Você precisa preencher ${pendingInfo.total} campo(s) obrigatório(s):\n\n${pendingInfo.pending.join('\n')}`,
                                                [{ text: 'OK' }]
                                            );
                                        } else {
                                            // Se for do fluxo novo ou tiver budgetPolicy 'spot', usar handleContinueExecution
                                            // Caso contrário, usar completeActivity
                                            if (fromNewActivityFlow || budgetPolicy === 'spot' || budgetPolicy === 'on_request') {
                                                handleContinueExecution();
                                            } else {
                                                completeActivity();
                                            }
                                        }
                                    }}
                                    disabled={saving || !isValid}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            {!isValid && (
                                                <View style={styles.badgeContainer}>
                                                    <Text style={styles.badgeText}>{pendingInfo.total}</Text>
                                                </View>
                                            )}
                                            <MaterialIcons name="check" size={20} color="#fff" />
                                            <Text style={styles.actionButtonText}>
                                                {fromNewActivityFlow || budgetPolicy === 'spot' || budgetPolicy === 'on_request' 
                                                    ? t('activityQuestionnaire.continueExecution')
                                                    : t('activityQuestionnaire.completeActivity')}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                            )}
                        </>
                    ) : (
                        // Exibir questionário em modo leitura para atividades finalizadas/fechadas (ou editável se tiver permissão)
                        <>
                            {/* Mensagem informativa quando o questionário estiver bloqueado (para status CLOSED ou COMPLETED) */}
                            {isQuestionnaireReadOnly && (equipmentStatus === EquipmentStatus.CLOSED || equipmentStatus === EquipmentStatus.COMPLETED) && (
                                <View style={styles.infoBanner}>
                                    <MaterialIcons name="info" size={20} color="#17a2b8" />
                                    <Text style={styles.infoBannerText}>
                                        O questionário está finalizado. Você não tem permissão para editar questionários finalizados.
                                    </Text>
                                </View>
                            )}
                            {questionsLoading ? (
                                <View style={styles.startActivitySection}>
                                    <ActivityIndicator size="small" color="#007bff" />
                                    <Text style={styles.startActivityText}>{t('activityQuestionnaire.loading')}</Text>
                                </View>
                            ) : questions.length > 0 ? (
                                // ETAPA 3: Validação defensiva de props para DynamicActivityQuestionnaire (segunda renderização)
                                (() => {
                                    console.log('[ActivityQuestionnaireScreen] Validando props para DynamicActivityQuestionnaire (readOnly)...');
                                    console.log('[ActivityQuestionnaireScreen] questions:', questions?.length || 0, 'itens');
                                    console.log('[ActivityQuestionnaireScreen] savedAnswersData:', savedAnswersData?.length || 0, 'itens');

                                    // Validar props críticas
                                    if (!Array.isArray(questions) || questions.length === 0) {
                                        console.error('[ActivityQuestionnaireScreen] ❌ questions não é um array válido (readOnly)');
                                        return (
                                            <View style={styles.errorContainer}>
                                                <Text style={styles.errorText}>Erro: questionário não configurado corretamente</Text>
                                            </View>
                                        );
                                    }

                                    if (typeof setAnswers !== 'function') {
                                        console.error('[ActivityQuestionnaireScreen] ❌ setAnswers não é uma função válida (readOnly)');
                                        return (
                                            <View style={styles.errorContainer}>
                                                <Text style={styles.errorText}>Erro interno: callback de resposta inválido</Text>
                                            </View>
                                        );
                                    }

                                    // Preparar initialValues com validação defensiva
                                    let initialValues: { [key: string]: any } = {};
                                    try {
                                        const map: { [key: string]: any } = {};
                                        (savedAnswersData || []).forEach((ans: any) => {
                                            if (ans && typeof ans === 'object' && ans.question_id) {
                                                const field = questions.find(q => q && q.id === ans.question_id);
                                                if (field && field.key) {
                                                    map[field.key] = ans.value;
                                                    if (field.type === 'radio_with_justification' && ans.justification) {
                                                        map[`${field.key}_justification`] = ans.justification;
                                                    }
                                                }
                                            }
                                        });
                                        initialValues = map;
                                        console.log('[ActivityQuestionnaireScreen] ✅ initialValues preparados (readOnly):', Object.keys(initialValues).length, 'campos');
                                    } catch (error) {
                                        console.error('[ActivityQuestionnaireScreen] ❌ Erro ao preparar initialValues (readOnly):', error);
                                        initialValues = {};
                                    }

                                    console.log('[ActivityQuestionnaireScreen] ✅ Renderizando DynamicActivityQuestionnaire (readOnly) com props válidas');
                                    return (
                                        <DynamicActivityQuestionnaire
                                            fields={questions}
                                            onChange={setAnswers}
                                            savedAnswers={savedAnswers || {}}
                                            initialValues={initialValues}
                                            initialUploads={(() => {
                                                const getUri = (u: any): string | undefined => {
                                                    if (!u) return undefined;
                                                    if (typeof u === 'string') return u;
                                                    return (
                                                        u.uri ||
                                                        u.url ||
                                                        u.path ||
                                                        u.file_url ||
                                                        (u.file && (u.file.url || u.file.path)) ||
                                                        u.content_url ||
                                                        u.contentUrl
                                                    );
                                                };
                                                const map: { [key: string]: any[] } = {};
                                                console.log('[ActivityQuestionnaireScreen] Processando uploads - savedAnswersData:', savedAnswersData);

                                                (savedAnswersData || []).forEach((ans: any, index: number) => {
                                                    const field = questions.find(q => q.id === ans.question_id);
                                                    const uploadsList = Array.isArray(ans.uploads_urls) ? ans.uploads_urls : ans.uploads;

                                                    // Debug: verificar mapeamento de campo
                                                    console.log(`[ActivityQuestionnaireScreen] Mapeamento - question_id: ${ans.question_id}, field encontrado:`, field ? field.key : 'NÃO ENCONTRADO');

                                                    console.log(`[ActivityQuestionnaireScreen] Resposta ${index}:`, {
                                                        question_id: ans.question_id,
                                                        tem_uploads_urls: !!ans.uploads_urls,
                                                        tem_uploads: !!ans.uploads,
                                                        uploadsList: uploadsList,
                                                        field_key: field?.key
                                                    });

                                                    if (field && uploadsList && Array.isArray(uploadsList)) {
                                                        const items = uploadsList
                                                            .map((u: any) => {
                                                                // Se for uma string (URL), use diretamente
                                                                if (typeof u === 'string') {
                                                                    return { uri: u, name: 'arquivo', type: 'image/jpeg' };
                                                                }
                                                                // Se for um objeto, tente extrair a URI
                                                                const uri = getUri(u);
                                                                return uri ? { uri, name: 'arquivo', type: 'image/jpeg' } : null;
                                                            })
                                                            .filter((item: any) => item !== null);

                                                        console.log(`[ActivityQuestionnaireScreen] Items processados para ${field.key}:`, items);

                                                        if (items.length > 0) map[field.key] = items;
                                                    }
                                                });
                                                console.log('[ActivityQuestionnaireScreen] Mapa final de uploads:', map);
                                                return map;
                                            })()}
                                            questionIdField="key"
                                            activityId={activityId}
                                            activityEquipmentId={activityEquipmentId}
                                            readOnly={isQuestionnaireReadOnly}
                                            onSaveAnswer={isQuestionnaireReadOnly ? undefined : saveIndividualAnswer}
                                        />
                                    );
                                })()
                            ) : (
                                <View style={styles.startActivitySection}>
                                    <Text style={styles.startActivityText}>{t('activityQuestionnaire.noQuestions')}</Text>
                                </View>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Modal de Enviar Orçamento */}
            <SendToBudgetModal
                visible={showBudgetModal}
                onClose={() => setShowBudgetModal(false)}
                onSuccess={async () => {
                    try {
                        const token = await AsyncStorage.getItem("access_token");
                        if (!token) throw new Error("Token não encontrado");

                        // Atualizar status do equipamento para WAITING_BUDGET_APPROVAL
                        const nextStatus = getNextStatusForAction(
                            equipmentStatus,
                            'send_to_budget',
                            budgetPolicy
                        );
                        
                        if (nextStatus && canTransitionEquipmentStatus(equipmentStatus, nextStatus, budgetPolicy)) {
                            const response = await ActivityService.patchActivityEquipment(
                                activityId,
                                activityEquipmentId,
                                { status: nextStatus },
                                token
                            );
                            
                            console.log('[ActivityQuestionnaireScreen] ✅ Status atualizado para WAITING_BUDGET_APPROVAL:', response);
                            setEquipmentStatus(nextStatus);
                            
                            // Sincronizar status da atividade
                            try {
                                await ActivityService.syncActivityStatusFromEquipments(activityId, token);
                            } catch (syncError: any) {
                                console.warn('[ActivityQuestionnaireScreen] Erro ao sincronizar status da atividade:', syncError);
                            }
                        }
                        
                        Alert.alert('Sucesso', 'Equipamento enviado para orçamento com sucesso!');
                        setShowBudgetModal(false);
                        await fetchEquipmentData();
                    } catch (error: any) {
                        console.error('[ActivityQuestionnaireScreen] Erro ao atualizar status após enviar orçamento:', error);
                        Alert.alert('Aviso', 'Equipamento enviado para orçamento, mas houve um problema ao atualizar o status.');
                        setShowBudgetModal(false);
                        await fetchEquipmentData();
                    }
                }}
                activityId={activityId}
                activityEquipmentId={activityEquipmentId}
            />
        </View>
        </ResponsiveContainer>
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
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: "rgba(255,255,255,0.8)",
    },
    content: {
        flex: 1,
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
    },
    errorText: {
        fontSize: 16,
        color: "#dc3545",
        textAlign: "center",
        marginTop: 16,
        marginBottom: 16,
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
    },
    equipmentInfoSection: {
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
    },
    equipmentCard: {
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        padding: 12,
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
    },
    statusSection: {
        backgroundColor: "#fff",
        margin: 16,
        marginTop: 0,
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    statusCard: {
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        padding: 12,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    statusText: {
        fontSize: 14,
        color: "#333",
        marginLeft: 8,
        fontWeight: "500",
    },
    questionnaireSection: {
        backgroundColor: "#fff",
        margin: 16,
        marginTop: 0,
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    startActivitySection: {
        alignItems: "center",
        paddingVertical: 20,
    },
    startActivityText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
        lineHeight: 24,
    },
    actionButtons: {
        marginTop: 20,
        gap: 12,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginBottom: 8,
    },
    startButton: {
        backgroundColor: "#007bff",
    },
    saveButton: {
        backgroundColor: "#28a745",
    },
    completeButton: {
        backgroundColor: "#dc3545",
    },
    budgetButton: {
        backgroundColor: "#ffc107",
        marginTop: 12,
    },
    actionButtonDisabled: {
        backgroundColor: "#6c757d",
        opacity: 0.6,
    },
    actionButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#e7f3ff',
        borderLeftWidth: 4,
        borderLeftColor: '#17a2b8',
        padding: 12,
        marginBottom: 16,
        borderRadius: 8,
    },
    infoBannerText: {
        flex: 1,
        marginLeft: 8,
        color: '#17a2b8',
        fontSize: 14,
        lineHeight: 20,
    },
    badgeContainer: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#dc3545',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default ActivityQuestionnaireWrapper; 