import React, { useEffect, useState } from "react";
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
import OfflineService from '../../Services/OfflineService';

interface ActivityQuestionnaireScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "ActivityQuestionnaireScreen">;
    route: RouteProp<RootStackParamList, "ActivityQuestionnaireScreen">;
}

const ActivityQuestionnaireScreen: React.FC<ActivityQuestionnaireScreenProps> = ({ route, navigation }) => {
    const { t } = useLanguage();
    const { activityId, activityEquipmentId, equipmentId, equipmentTag, activityName } = route.params;

    console.log('[ActivityQuestionnaireScreen] Parâmetros recebidos:', {
        activityId,
        activityEquipmentId,
        equipmentId,
        equipmentTag,
        activityName
    });

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

    useEffect(() => {
        fetchEquipmentData();
    }, []);

    useEffect(() => {
        if (equipmentData && questions.length === 0) {
            fetchQuestions();
        }
    }, [equipmentData]);

    const fetchEquipmentData = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            // Verificar conectividade
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);
            const cacheKey = `equipment_data_${equipmentId}`;

            if (isConnected) {
                console.log('[ActivityQuestionnaireScreen] Modo online, buscando dados do equipamento:', equipmentId);

                const apiClient = await import('../../Context/ApiClient').then(m => m.default);
                const response = await apiClient.get(`/equipments/${equipmentId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = response.data;
                setEquipmentData(data);

                // Salvar no cache
                await OfflineService.cacheData(cacheKey, data);
                console.log('[ActivityQuestionnaireScreen] Dados do equipamento salvos no cache');

                // Buscar status específico do equipamento na atividade
                try {
                    const activityEquipmentResponse = await apiClient.get(`/activities/${activityId}/equipments`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    const equipmentInActivity = activityEquipmentResponse.data.results?.find(
                        (eq: any) => eq.id === activityEquipmentId
                    );

                    if (equipmentInActivity) {
                        console.log('[ActivityQuestionnaireScreen] Status do equipamento na atividade:', equipmentInActivity.status);
                        setEquipmentStatus(equipmentInActivity.status);

                        if (equipmentInActivity.status === 'open' || equipmentInActivity.status === 'pending') {
                            setActivityStarted(true);
                        } else if (equipmentInActivity.status === 'closed') {
                            setActivityStarted(true);
                            setActivityCompleted(true);
                        }
                    }
                } catch (activityError: any) {
                    console.error('[ActivityQuestionnaireScreen] Erro ao buscar status da atividade:', activityError);
                    // Se falhar, usar status padrão
                    setEquipmentStatus('created');
                }
            } else {
                console.log('[ActivityQuestionnaireScreen] Modo offline, buscando dados do equipamento do cache');
                const cachedEquipmentData = await OfflineService.getCachedData(cacheKey);
                if (cachedEquipmentData) {
                    console.log('[ActivityQuestionnaireScreen] Dados do equipamento carregados do cache');
                    setEquipmentData(cachedEquipmentData);
                } else {
                    throw new Error("Dados do equipamento não disponíveis offline. Conecte-se à internet para carregar.");
                }
            }
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] Erro ao buscar dados do equipamento:', error);
            setError(error.message || "Falha ao carregar dados do equipamento.");
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            console.log('[ActivityQuestionnaireScreen] Buscando questões para atividade:', activityId);

            // Buscar dados do equipamento na atividade para obter activity_plan_id e version_id
            const apiClient = await import('../../Context/ApiClient').then(m => m.default);
            const activityEquipmentResponse = await apiClient.get(`/activities/${activityId}/equipments`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('[ActivityQuestionnaireScreen] Dados dos equipamentos da atividade:', activityEquipmentResponse.data);

            // Encontrar o equipamento específico
            const equipmentData = activityEquipmentResponse.data.results?.find((eq: any) => eq.id === activityEquipmentId);

            if (!equipmentData) {
                console.error('[ActivityQuestionnaireScreen] Equipamento não encontrado na atividade');
                setError("Equipamento não encontrado na atividade.");
                return;
            }

            console.log('[ActivityQuestionnaireScreen] Dados do equipamento na atividade:', equipmentData);

            // O activity_plan_version_id é o ID da versão do plano de atividade
            const versionId = equipmentData.activity_plan_version_id;

            if (!versionId) {
                console.error('[ActivityQuestionnaireScreen] Activity Plan Version ID não encontrado');
                setError("Plano de atividade não configurado para este equipamento.");
                return;
            }

            console.log('[ActivityQuestionnaireScreen] Buscando questões - Version ID:', versionId);

            // Tentar múltiplas abordagens para encontrar as questões
            let questionsFound = false;

            // Abordagem 2: Tentar buscar activity plans com parâmetros expandidos
            if (!questionsFound) {
                try {
                    console.log('[ActivityQuestionnaireScreen] Abordagem 2: Buscando activity plans com versões expandidas...');

                    const plansResponse = await apiClient.get('/activity_plans', {
                        headers: { Authorization: `Bearer ${token}` },
                        params: {
                            include_versions: true,
                            expand: 'versions'
                        }
                    });

                    console.log('[ActivityQuestionnaireScreen] Activity plans com detalhes:', plansResponse.data);

                    // Procurar por uma versão que corresponda ao versionId
                    let foundPlan = null;
                    let foundVersion = null;

                    for (const plan of plansResponse.data.results || []) {
                        if (plan.versions && plan.versions.length > 0) {
                            for (const version of plan.versions) {
                                if (version.id === versionId) {
                                    foundPlan = plan;
                                    foundVersion = version;
                                    console.log('[ActivityQuestionnaireScreen] ENCONTROU! Plan ID:', plan.id, 'Version ID:', version.id);
                                    break;
                                }
                            }
                            if (foundPlan) break;
                        }
                    }

                    if (foundPlan && foundVersion) {
                        const finalResponse = await ActivityService.fetchActivityQuestions(
                            foundPlan.id,
                            foundVersion.id,
                            token
                        );

                        if (finalResponse && finalResponse.length > 0) {
                            setQuestions(finalResponse);
                            questionsFound = true;
                            console.log('[ActivityQuestionnaireScreen] ✅ Questões encontradas com abordagem 2');

                            // Carregar respostas salvas após encontrar as questões
                            try {
                                const savedAnswersResponse = await ActivityService.fetchActivityAnswers(
                                    activityId,
                                    activityEquipmentId,
                                    token
                                );
                                console.log('[ActivityQuestionnaireScreen] Respostas salvas carregadas (abordagem 2):', savedAnswersResponse);
                                setSavedAnswersData(savedAnswersResponse.results || []);

                                // Marcar questões como salvas
                                const savedMap: { [key: string]: boolean } = {};
                                (savedAnswersResponse.results || []).forEach((answer: any) => {
                                    // map by field key when we know questions
                                    const field = finalResponse.find((q: any) => q.id === answer.question_id);
                                    if (field) savedMap[field.key] = true;
                                });
                                setSavedAnswers(savedMap);
                            } catch (savedError) {
                                console.log('[ActivityQuestionnaireScreen] Nenhuma resposta salva encontrada ou erro (abordagem 2):', savedError);
                            }
                        }
                    }

                } catch (error2: any) {
                    console.error('[ActivityQuestionnaireScreen] ❌ Erro na abordagem 2:', error2.response?.status, error2.response?.data);
                }
            }



            // Abordagem 4: Tentar buscar todas as versões de todos os activity plans
            if (!questionsFound) {
                try {
                    console.log('[ActivityQuestionnaireScreen] Abordagem 4: Buscando todas as versões de todos os plans...');

                    const plansResponse = await apiClient.get('/activity_plans', {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    // Para cada activity plan, tentar buscar suas versões
                    for (const plan of plansResponse.data.results || []) {
                        try {
                            console.log('[ActivityQuestionnaireScreen] Tentando buscar versões do plan ID:', plan.id);

                            const versionsResponse = await apiClient.get(`/activity_plans/${plan.id}/versions`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });

                            console.log('[ActivityQuestionnaireScreen] Versões do plan', plan.id, ':', versionsResponse.data);

                            if (versionsResponse.data && versionsResponse.data.results) {
                                for (const version of versionsResponse.data.results) {
                                    if (version.id === versionId) {
                                        console.log('[ActivityQuestionnaireScreen] ENCONTROU! Plan ID:', plan.id, 'Version ID:', version.id);

                                        const finalResponse = await ActivityService.fetchActivityQuestions(
                                            plan.id,
                                            version.id,
                                            token
                                        );

                                        if (finalResponse && finalResponse.length > 0) {
                                            setQuestions(finalResponse);
                                            questionsFound = true;
                                            console.log('[ActivityQuestionnaireScreen] ✅ Questões encontradas com abordagem 4');

                                            // Carregar respostas salvas após encontrar as questões
                                            try {
                                                const savedAnswersResponse = await ActivityService.fetchActivityAnswers(
                                                    activityId,
                                                    activityEquipmentId,
                                                    token
                                                );
                                                console.log('[ActivityQuestionnaireScreen] Respostas salvas carregadas:', savedAnswersResponse);
                                                setSavedAnswersData(savedAnswersResponse.results || []);

                                                // Marcar questões como salvas
                                                const savedMap: { [key: string]: boolean } = {};
                                                (savedAnswersResponse.results || []).forEach((answer: any) => {
                                                    savedMap[answer.question_id] = true;
                                                });
                                                setSavedAnswers(savedMap);
                                            } catch (savedError) {
                                                console.log('[ActivityQuestionnaireScreen] Nenhuma resposta salva encontrada ou erro:', savedError);
                                            }

                                            break;
                                        }
                                    }
                                }
                                if (questionsFound) break;
                            }
                        } catch (versionError: any) {
                            console.log('[ActivityQuestionnaireScreen] Plan', plan.id, 'não tem endpoint de versões ou erro:', versionError.response?.status);
                        }
                    }

                } catch (error4: any) {
                    console.error('[ActivityQuestionnaireScreen] ❌ Erro na abordagem 4:', error4.response?.status, error4.response?.data);
                }
            }

            // Se nenhuma abordagem funcionou
            if (!questionsFound) {
                console.error('[ActivityQuestionnaireScreen] ❌ Nenhuma abordagem funcionou para encontrar as questões');
                console.error('[ActivityQuestionnaireScreen] Version ID procurado:', versionId);
                setError("Não foi possível encontrar as questões para este equipamento. O plano de atividade pode ter sido removido ou não está configurado corretamente.");
            }

        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] Erro ao buscar questões:', error);
            setError("Falha ao carregar questões da atividade.");
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
            if (equipmentStatus === 'pending' || equipmentStatus === 'open') {
                console.log('[ActivityQuestionnaireScreen] Equipamento já está com status', equipmentStatus, ', não precisa alterar');
                setActivityStarted(true);
                Alert.alert("Sucesso", "Atividade já está disponível para questionário!");
                return;
            }

            const response = await ActivityService.patchActivityEquipment(
                activityId,
                activityEquipmentId,
                { status: "open" },
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
            setEquipmentStatus('open');
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
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            console.log('[ActivityQuestionnaireScreen] Salvando resposta individual:', questionId, answer);

            // Converter para o formato esperado pela API
            const answerData: ActivityAnswer = {
                question_id: answer.question_id, // Já convertido no DynamicActivityQuestionnaire
                value: answer.value,
                justification: answer.justification,
                uploads: answer.uploads || []
            };

            console.log('[ActivityQuestionnaireScreen] Uploads na resposta:', answer.uploads);
            console.log('[ActivityQuestionnaireScreen] Uploads no answerData:', answerData.uploads);

            console.log('[ActivityQuestionnaireScreen] Dados da resposta a serem enviados:', answerData);

            const response = await ActivityService.postActivityAnswers(
                activityId,
                activityEquipmentId,
                [answerData],
                token
            );

            console.log('[ActivityQuestionnaireScreen] Resposta da API:', response);

            // Verificar se foi salvo offline
            if (response.offline) {
                console.log('[ActivityQuestionnaireScreen] Resposta salva offline');
            } else {
                console.log('[ActivityQuestionnaireScreen] Resposta salva online');
            }

            // Marcar como salvo
            setSavedAnswers(prev => ({ ...prev, [questionId]: true }));
            console.log('[ActivityQuestionnaireScreen] Resposta salva com sucesso:', questionId);
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] Erro ao salvar resposta individual:', error);
            // Marcar como não salvo em caso de erro
            setSavedAnswers(prev => ({ ...prev, [questionId]: false }));
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

            console.log('[ActivityQuestionnaireScreen] Concluindo atividade');

            const response = await ActivityService.patchActivityEquipment(
                activityId,
                activityEquipmentId,
                { status: "closed" },
                token
            );

            console.log('[ActivityQuestionnaireScreen] Resposta da conclusão:', response);

            // Limpar dados locais após conclusão bem-sucedida
            await clearLocalData();

            // Verificar se foi salvo offline
            if (response.offline) {
                Alert.alert(
                    "📱 Modo Offline",
                    "A atividade foi marcada para conclusão e será processada quando houver conexão com a internet.",
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert(t('common.success'), t('activityQuestionnaire.completeSuccess'), [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            }

            setActivityCompleted(true);
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] Erro ao concluir atividade:', error);
            Alert.alert(t('common.error'), t('activityQuestionnaire.completeError'));
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

                if (!value || value === '') {
                    console.log(`[ActivityQuestionnaireScreen] ❌ Questão ${question.key} sem valor`);
                    return false;
                }

                // Verificar justificativa para radio_with_justification
                if (question.type === 'radio_with_justification' &&
                    value === question.justification_target) {
                    const justification = answers[`${question.key}_justification`];
                    if (!justification || justification === '') {
                        console.log(`[ActivityQuestionnaireScreen] ❌ Questão ${question.key} sem justificativa`);
                        return false;
                    }
                }

                // Verificar upload obrigatório
                if (question.has_upload) {
                    const uploads = answers.uploads?.[question.key];
                    console.log(`[ActivityQuestionnaireScreen] Verificando uploads para ${question.key}:`, uploads);
                    if (!uploads || uploads.length === 0) {
                        console.log(`[ActivityQuestionnaireScreen] ❌ Questão ${question.key} sem upload obrigatório`);
                        return false;
                    }
                    console.log(`[ActivityQuestionnaireScreen] ✅ Questão ${question.key} com uploads válidos:`, uploads.length);
                }

                // Verificar se a resposta foi salva (opcional para validação)
                // Se tem valor, considerar válido mesmo se não foi salvo no servidor
                if (!savedAnswers[question.key]) {
                    console.log(`[ActivityQuestionnaireScreen] ⚠️ Questão ${question.key} não foi salva no servidor, mas tem valor local`);
                }
            }
        }

        console.log('[ActivityQuestionnaireScreen] ✅ Todas as validações passaram - Botão será habilitado');
        return true;
    };

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

    // Log para debug do botão
    console.log('[ActivityQuestionnaireScreen] Renderizando tela. validateAnswers():', validateAnswers());

    return (
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
                    <Text style={styles.headerSubtitle}>{t('activityQuestionnaire.equipmentTag')}: {equipmentTag}</Text>
                </View>
            </View>

            <ScrollView style={styles.content}>
                {/* Informações do Equipamento */}
                <View style={styles.equipmentInfoSection}>
                    <Text style={styles.sectionTitle}>{t('activityQuestionnaire.equipmentInfo')}</Text>
                    {equipmentData && (
                        <View style={styles.equipmentCard}>
                            <View style={styles.infoRow}>
                                <MaterialIcons name="build" size={16} color="#666" />
                                <Text style={styles.infoText}>{t('activityQuestionnaire.equipmentTag')}: {equipmentData.tag}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <MaterialIcons name="business" size={16} color="#666" />
                                <Text style={styles.infoText}>
                                    {t('activityQuestionnaire.manufacturer')}: {equipmentData.manufacturer?.name || "N/A"}
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
                                    {t('activityQuestionnaire.sector')}: {equipmentData.sector?.name || "N/A"}
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

                    {equipmentStatus === 'created' ? (
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
                    ) : equipmentStatus === 'pending' || equipmentStatus === 'open' ? (
                        <>
                            {console.log('[ActivityQuestionnaireScreen] Renderizando questionário com status:', equipmentStatus)}
                            {console.log('[ActivityQuestionnaireScreen] Número de questões:', questions.length)}
                            {console.log('[ActivityQuestionnaireScreen] Questões:', questions)}

                            {questions.length > 0 ? (
                                <DynamicActivityQuestionnaire
                                    fields={questions}
                                    onChange={setAnswers}
                                    onSaveAnswer={saveIndividualAnswer}
                                    savedAnswers={savedAnswers}
                                    initialValues={(() => {
                                        const map: { [key: string]: any } = {};
                                        (savedAnswersData || []).forEach((ans: any) => {
                                            const field = questions.find(q => q.id === ans.question_id);
                                            if (field) {
                                                map[field.key] = ans.value;
                                                if (field.type === 'radio_with_justification' && ans.justification) {
                                                    map[`${field.key}_justification`] = ans.justification;
                                                }
                                            }
                                        });
                                        return map;
                                    })()}
                                    initialUploads={(() => {
                                        const map: { [key: string]: any[] } = {};
                                        (savedAnswersData || []).forEach((ans: any) => {
                                            const field = questions.find(q => q.id === ans.question_id);
                                            if (field && ans.uploads && Array.isArray(ans.uploads)) {
                                                map[field.key] = ans.uploads.map((u: any) => ({ uri: u.uri || u.url || u.path, name: u.name || 'arquivo', type: u.type || 'image/jpeg' }));
                                            }
                                        });
                                        return map;
                                    })()}
                                    questionIdField="key"
                                    activityId={activityId}
                                    activityEquipmentId={activityEquipmentId}
                                />
                            ) : (
                                <View style={styles.startActivitySection}>
                                    <Text style={styles.startActivityText}>
                                        Carregando questões...
                                    </Text>
                                    <ActivityIndicator size="small" color="#007bff" />
                                </View>
                            )}

                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        styles.completeButton,
                                        !validateAnswers() && styles.actionButtonDisabled
                                    ]}
                                    onPress={completeActivity}
                                    disabled={saving || !validateAnswers()}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <MaterialIcons name="check" size={20} color="#fff" />
                                            <Text style={styles.actionButtonText}>{t('activityQuestionnaire.completeActivity')}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        // Exibir questionário em modo leitura para atividades finalizadas/fechadas
                        <>
                            {questions.length > 0 ? (
                                <DynamicActivityQuestionnaire
                                    fields={questions}
                                    onChange={setAnswers}
                                    savedAnswers={savedAnswers}
                                    initialValues={(() => {
                                        const map: { [key: string]: any } = {};
                                        (savedAnswersData || []).forEach((ans: any) => {
                                            const field = questions.find(q => q.id === ans.question_id);
                                            if (field) {
                                                map[field.key] = ans.value;
                                                if (field.type === 'radio_with_justification' && ans.justification) {
                                                    map[`${field.key}_justification`] = ans.justification;
                                                }
                                            }
                                        });
                                        return map;
                                    })()}
                                    initialUploads={(() => {
                                        const map: { [key: string]: any[] } = {};
                                        (savedAnswersData || []).forEach((ans: any) => {
                                            const field = questions.find(q => q.id === ans.question_id);
                                            if (field && ans.uploads && Array.isArray(ans.uploads)) {
                                                map[field.key] = ans.uploads.map((u: any) => ({ uri: u.uri || u.url || u.path, name: u.name || 'arquivo', type: u.type || 'image/jpeg' }));
                                            }
                                        });
                                        return map;
                                    })()}
                                    questionIdField="key"
                                    activityId={activityId}
                                    activityEquipmentId={activityEquipmentId}
                                    readOnly={true}
                                />
                            ) : (
                                <View style={styles.startActivitySection}>
                                    <Text style={styles.startActivityText}>
                                        Questionário não disponível.
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                </View>
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
});

export default ActivityQuestionnaireScreen; 