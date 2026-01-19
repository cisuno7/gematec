import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../Routers/AppRouter";
import ActivityService from "../../Services/ActivityService";
import apiClient from "../../Context/ApiClient";
import OfflineService from "../../Services/OfflineService";
import ResponsiveContainer from "../../Components/ResponsiveContainer";
import ResponsiveText from "../../Components/ResponsiveText";
import DynamicActivityQuestionnaire from "../../Components/DynamicActivityQuestionnaire";
import SendToBudgetModal from "../../Components/SendToBudgetModal";
import ErrorBoundary from "../../Components/ErrorBoundary";
import { ActivityDynamicField } from "../../Models/ActivityDynamicField";
import { ActivityAnswer } from "../../Models/ActivityAnswer";
import { EquipmentStatus, getNextStatusForAction, canTransitionEquipmentStatus } from "../../constants/activityStatus";
import { useLanguage } from "../../Context/LanguageContext";
import { usePermissions } from "../../Context/PermissionsContext";
import { useUser } from "../../Context/UserContext";
import { useResponsive } from "../../hooks/useResponsive";

interface ActivityQuestionnaireScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "ActivityQuestionnaireScreen">;
    route: RouteProp<RootStackParamList, "ActivityQuestionnaireScreen">;
}

const ActivityQuestionnaireWrapper: React.FC<ActivityQuestionnaireScreenProps> = ({ route, navigation }) => {
    if (!route?.params) {
        return (
            <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={64} color="#dc3545" />
                <ResponsiveText variant="body" style={styles.errorText}>
                    Erro interno: parâmetros de navegação não encontrados
                </ResponsiveText>
                <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
                    <ResponsiveText variant="button" weight="600" style={styles.retryButtonText}>
                        Voltar
                    </ResponsiveText>
                </TouchableOpacity>
            </View>
        );
    }

    const { activityId, activityEquipmentId, equipmentId, activityName } = route.params;
    const missing: string[] = [];
    if (!activityId || activityId <= 0) missing.push("activityId");
    if (!activityEquipmentId || activityEquipmentId <= 0) missing.push("activityEquipmentId");
    if (!equipmentId || equipmentId <= 0) missing.push("equipmentId");
    if (!activityName || typeof activityName !== "string") missing.push("activityName");

    if (missing.length > 0) {
        return (
            <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={64} color="#dc3545" />
                <ResponsiveText variant="body" style={styles.errorText}>
                    Erro de navegação: dados obrigatórios não fornecidos{'\n'}
                    Faltando: {missing.join(", ")}
                </ResponsiveText>
                <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
                    <ResponsiveText variant="button" weight="600" style={styles.retryButtonText}>
                        Voltar
                    </ResponsiveText>
                </TouchableOpacity>
            </View>
        );
    }

    return <ActivityQuestionnaireScreen route={route} navigation={navigation} />;
};

const ActivityQuestionnaireScreen: React.FC<ActivityQuestionnaireScreenProps> = ({ route, navigation }) => {
    const { activityId, activityEquipmentId, equipmentId, equipmentTag, activityName, budgetPolicy, fromNewActivityFlow } = route.params;

    const { t } = useLanguage();
    const { hasPermission } = usePermissions();
    const { username } = useUser();
    const r = useResponsive();

    let insets;
    try {
        insets = useSafeAreaInsets();
    } catch {
        insets = { top: 0, bottom: 0, left: 0, right: 0 };
    }

    const safeInsets = insets || { top: 0, bottom: 0, left: 0, right: 0 };

    const [loading, setLoading] = useState(true);
    const [questionsLoading, setQuestionsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [equipmentData, setEquipmentData] = useState<any>(null);
    const [questions, setQuestions] = useState<ActivityDynamicField[]>([]);
    const [answers, setAnswers] = useState<{ [key: string]: any }>({});
    const [savedAnswers, setSavedAnswers] = useState<{ [key: string]: boolean }>({});
    const [savedAnswersData, setSavedAnswersData] = useState<any[]>([]);
    const [equipmentStatus, setEquipmentStatus] = useState<string>(EquipmentStatus.CREATED);
    const [noQuestions, setNoQuestions] = useState(false);
    const [showBudgetModal, setShowBudgetModal] = useState(false);

    const isQuestionnaireReadOnly =
        equipmentStatus === EquipmentStatus.BUDGET_APPROVAL ||
        ((equipmentStatus === EquipmentStatus.CLOSED || equipmentStatus === EquipmentStatus.COMPLETED) &&
            !hasPermission("add_answer_in_completed_question"));

    const sortedQuestions = useMemo(() => {
        return [...questions].sort((a, b) => {
            const orderA = (a as any).order ?? 999;
            const orderB = (b as any).order ?? 999;
            return orderA - orderB;
        });
    }, [questions]);

    const handleAuthError = useCallback(async (err: any) => {
        const isAuthError =
            err?.response?.status === 401 ||
            err?.message?.includes("Sessão expirada") ||
            err?.message?.includes("Token") ||
            err?.message?.includes("token");

        if (!isAuthError) return false;

        Alert.alert(
            "Sessão Expirada",
            "Sua sessão expirou. Por favor, faça login novamente.",
            [
                {
                    text: "OK",
                    onPress: async () => {
                        try {
                            await AsyncStorage.multiRemove(["access_token", "refresh_token", "account", "keep_logged_in"]);
                        } finally {
                            navigation.reset({
                                index: 0,
                                routes: [{ name: "LoginScreen" as any }],
                            });
                        }
                    },
                },
            ],
            { cancelable: false }
        );

        return true;
    }, [navigation]);

    const loadQuestions = useCallback(async (activityPlanId: number, versionId: number, token: string) => {
        setQuestionsLoading(true);
        setNoQuestions(false);
        try {
            const response = await apiClient.get(`/activity_plans/${activityPlanId}/versions/${versionId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const fetchedQuestions = response.data?.questions || [];
            setQuestions(fetchedQuestions);

            if (!fetchedQuestions.length) {
                setNoQuestions(true);
                return;
            }

            const savedAnswersResponse = await ActivityService.fetchActivityAnswers(activityId, activityEquipmentId, token);
            const results = savedAnswersResponse?.results || savedAnswersResponse || [];
            setSavedAnswersData(results);

            const savedMap: { [key: string]: boolean } = {};
            results.forEach((ans: any) => {
                const field = fetchedQuestions.find((q: any) => q.id === ans.question_id);
                if (field) savedMap[field.key] = true;
            });
            setSavedAnswers(savedMap);
        } catch (err: any) {
            if (await handleAuthError(err)) return;
            setError("Não foi possível carregar as questões para este equipamento.");
        } finally {
            setQuestionsLoading(false);
        }
    }, [activityId, activityEquipmentId, handleAuthError]);

    const loadScreen = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) {
                throw new Error("Token não encontrado");
            }

            const isConnected = await NetInfo.fetch().then(state => state.isConnected);
            const cacheKey = `equipment_data_${equipmentId}`;

            if (isConnected) {
                const response = await apiClient.get(`/equipments/${equipmentId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setEquipmentData(response.data);
                await OfflineService.cacheData(cacheKey, response.data);
            } else {
                const cached = await OfflineService.getCachedData(cacheKey);
                if (!cached) {
                    throw new Error("Dados do equipamento não disponíveis offline. Conecte-se à internet para carregar.");
                }
                setEquipmentData(cached);
            }

            const equipmentsResponse = await ActivityService.fetchActivityEquipments(activityId, { token });
            const list = Array.isArray(equipmentsResponse)
                ? equipmentsResponse
                : (equipmentsResponse?.results ?? equipmentsResponse?.data ?? []);
            const equipmentInActivity = list.find((eq: any) => eq.id === activityEquipmentId);

            const planId = equipmentInActivity?.activity_plan_id;
            const versionId = equipmentInActivity?.activity_plan_version_id;
            setEquipmentStatus(equipmentInActivity?.status || EquipmentStatus.CREATED);

            if (!planId || !versionId) {
                setNoQuestions(true);
                return;
            }

            await loadQuestions(planId, versionId, token);
        } catch (err: any) {
            if (await handleAuthError(err)) return;
            setError(err?.message || "Falha ao carregar dados do equipamento.");
        } finally {
            setLoading(false);
        }
    }, [activityId, activityEquipmentId, equipmentId, handleAuthError, loadQuestions]);

    useEffect(() => {
        loadScreen();
    }, [loadScreen]);

    const startActivity = useCallback(async () => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            if (equipmentStatus === EquipmentStatus.PENDING || equipmentStatus === EquipmentStatus.OPEN) {
                Alert.alert("Sucesso", "Atividade já está disponível para questionário!");
                return;
            }

            const response = await ActivityService.patchActivityEquipment(
                activityId,
                activityEquipmentId,
                { status: EquipmentStatus.OPEN },
                token
            );

            if (response.offline) {
                Alert.alert(
                    "📱 Modo Offline",
                    "A atividade foi marcada para início e será processada quando houver conexão com a internet.",
                    [{ text: "OK" }]
                );
            } else {
                Alert.alert("Sucesso", "Atividade iniciada com sucesso!");
            }

            setEquipmentStatus(EquipmentStatus.OPEN);
            await loadScreen();
        } catch (err: any) {
            if (await handleAuthError(err)) return;
            Alert.alert("Erro", err?.message || "Falha ao iniciar atividade. Tente novamente.");
        } finally {
            setSaving(false);
        }
    }, [activityId, activityEquipmentId, equipmentStatus, handleAuthError, loadScreen]);

    const saveIndividualAnswer = useCallback(async (questionKey: string, answer: ActivityAnswer) => {
        if (isQuestionnaireReadOnly) return;
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const answerData: ActivityAnswer = {
                question_id: Number(answer.question_id),
                value: answer.value,
                justification: answer.justification || "",
                uploads: Array.isArray(answer.uploads) ? answer.uploads : [],
            };

            if ((equipmentStatus === EquipmentStatus.CLOSED || equipmentStatus === EquipmentStatus.COMPLETED) &&
                hasPermission("add_answer_in_completed_question")) {
                const now = new Date().toISOString();
                (answerData as any).completed_at = now;
                (answerData as any).completed_by = username || "Usuário";
            }

            const response = await ActivityService.postActivityAnswer(
                activityId,
                activityEquipmentId,
                answerData,
                token
            );

            if (response.offline || response.queued) {
                Alert.alert(
                    "Salvo Localmente",
                    "Resposta salva no dispositivo e será enviada ao servidor quando houver conexão estável.",
                    [{ text: "Entendi" }]
                );
            }

            setSavedAnswers(prev => ({ ...prev, [questionKey]: true }));
        } catch (err: any) {
            if (await handleAuthError(err)) return;
            setSavedAnswers(prev => ({ ...prev, [questionKey]: false }));
        }
    }, [
        activityId,
        activityEquipmentId,
        equipmentStatus,
        hasPermission,
        handleAuthError,
        isQuestionnaireReadOnly,
        username,
    ]);

    const getUri = (u: any): string | undefined => {
        if (!u) return undefined;
        if (typeof u === "string") return u;
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

    const initialValues = useMemo(() => {
        const map: { [key: string]: any } = {};
        savedAnswersData.forEach((ans: any) => {
            const field = questions.find(q => q.id === ans.question_id);
            if (!field) return;
            map[field.key] = ans.value;
            if (field.type === "radio_with_justification" && ans.justification) {
                map[`${field.key}_justification`] = ans.justification;
            }
        });
        return map;
    }, [savedAnswersData, questions]);

    const initialUploads = useMemo(() => {
        const map: { [key: string]: any[] } = {};
        savedAnswersData.forEach((ans: any) => {
            const field = questions.find(q => q.id === ans.question_id);
            if (!field) return;
            const uploadsList = Array.isArray(ans.uploads_urls) ? ans.uploads_urls : ans.uploads;
            if (!Array.isArray(uploadsList)) return;
            const items = uploadsList
                .map((u: any) => {
                    const uri = getUri(u);
                    return uri ? { uri, name: "arquivo", type: "image/jpeg" } : null;
                })
                .filter(Boolean);
            if (items.length > 0) map[field.key] = items as any[];
        });
        return map;
    }, [savedAnswersData, questions]);

    const handleSendToBudget = () => setShowBudgetModal(true);

    const handleContinueExecution = async () => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const nextStatus = getNextStatusForAction(
                equipmentStatus,
                "continue_execution",
                budgetPolicy
            );

            if (!nextStatus || !canTransitionEquipmentStatus(equipmentStatus, nextStatus, budgetPolicy)) {
                throw new Error("Transição de status não permitida");
            }

            const response = await ActivityService.patchActivityEquipment(
                activityId,
                activityEquipmentId,
                { status: nextStatus },
                token
            );

            if (response.offline) {
                Alert.alert(
                    "📱 Modo Offline",
                    "A atividade foi marcada para execução e será processada quando houver conexão.",
                    [{ text: "OK" }]
                );
            } else {
                Alert.alert("Sucesso", "Atividade marcada para execução");
            }

            setEquipmentStatus(nextStatus as string);
        } catch (err: any) {
            if (await handleAuthError(err)) return;
            Alert.alert("Erro", err?.message || "Falha ao continuar execução");
        } finally {
            setSaving(false);
        }
    };

    const shouldShowBudgetButton = fromNewActivityFlow || !budgetPolicy || budgetPolicy === "always" || budgetPolicy === "on_request" || budgetPolicy === "spot";

    if (loading) {
        return (
            <ResponsiveContainer scroll={false} withPadding={false}>
                <View style={styles.container}>
                    <View style={[styles.header, { paddingTop: safeInsets.top + r.spacing(1.5), paddingBottom: r.spacing(2.5), paddingHorizontal: r.spacing(2.5) }]}>
                        <TouchableOpacity style={[styles.backButton, { width: r.scale(40), height: r.scale(40), borderRadius: r.scale(20), marginRight: r.spacing(2) }]} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={r.scale(24)} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerContent}>
                            <ResponsiveText variant="title" weight="bold" style={styles.headerTitle}>{activityName}</ResponsiveText>
                            {equipmentTag && (
                                <ResponsiveText variant="caption" style={styles.headerSubtitle}>
                                    {t("activityQuestionnaire.equipmentTag")}: {equipmentTag}
                                </ResponsiveText>
                            )}
                        </View>
                    </View>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007bff" />
                        <ResponsiveText variant="body" style={styles.loadingText}>
                            {t("activityQuestionnaire.loading")}
                        </ResponsiveText>
                    </View>
                </View>
            </ResponsiveContainer>
        );
    }

    if (error) {
        return (
            <ResponsiveContainer scroll={false} withPadding={false}>
                <View style={styles.container}>
                    <View style={[styles.header, { paddingTop: safeInsets.top + r.spacing(1.5), paddingBottom: r.spacing(2.5), paddingHorizontal: r.spacing(2.5) }]}>
                        <TouchableOpacity style={[styles.backButton, { width: r.scale(40), height: r.scale(40), borderRadius: r.scale(20), marginRight: r.spacing(2) }]} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={r.scale(24)} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerContent}>
                            <ResponsiveText variant="title" weight="bold" style={styles.headerTitle}>{activityName}</ResponsiveText>
                            {equipmentTag && (
                                <ResponsiveText variant="caption" style={styles.headerSubtitle}>
                                    {t("activityQuestionnaire.equipmentTag")}: {equipmentTag}
                                </ResponsiveText>
                            )}
                        </View>
                    </View>
                    <View style={styles.errorContainer}>
                        <MaterialIcons name="error-outline" size={r.scale(64)} color="#dc3545" />
                        <ResponsiveText variant="body" style={styles.errorText}>{error}</ResponsiveText>
                        <TouchableOpacity style={styles.retryButton} onPress={loadScreen}>
                            <ResponsiveText variant="button" weight="600" style={styles.retryButtonText}>
                                {t("activityQuestionnaire.retry")}
                            </ResponsiveText>
                        </TouchableOpacity>
                    </View>
                </View>
            </ResponsiveContainer>
        );
    }

    return (
        <ResponsiveContainer scroll={false} withPadding={false}>
            <View style={styles.container}>
                <View style={[styles.header, { paddingTop: safeInsets.top + r.spacing(1.5), paddingBottom: r.spacing(2.5), paddingHorizontal: r.spacing(2.5) }]}>
                    <TouchableOpacity style={[styles.backButton, { width: r.scale(40), height: r.scale(40), borderRadius: r.scale(20), marginRight: r.spacing(2) }]} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={r.scale(24)} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <ResponsiveText variant="title" weight="bold" style={styles.headerTitle}>{activityName}</ResponsiveText>
                        {equipmentTag && (
                            <ResponsiveText variant="caption" style={styles.headerSubtitle}>
                                {t("activityQuestionnaire.equipmentTag")}: {equipmentTag}
                            </ResponsiveText>
                        )}
                    </View>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === "ios" ? safeInsets.top + r.spacing(2) : safeInsets.top}
                >
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={{ paddingBottom: r.spacing(3) + safeInsets.bottom }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={[styles.section, { margin: r.spacing(2), padding: r.spacing(2) }]}>
                            <ResponsiveText variant="subtitle" weight="600" style={[styles.sectionTitle, { marginBottom: r.spacing(2) }]}>
                                {t("activityQuestionnaire.equipmentInfo")}
                            </ResponsiveText>
                            {equipmentData && (
                                <View style={[styles.card, { padding: r.spacing(1.5) }]}>
                                    {equipmentData.tag && (
                                        <View style={[styles.infoRow, { marginBottom: r.spacing(1) }]}>
                                            <MaterialIcons name="build" size={r.scale(16)} color="#666" />
                                            <ResponsiveText variant="body" style={styles.infoText}>
                                                {t("activityQuestionnaire.equipmentTag")}: {equipmentData.tag}
                                            </ResponsiveText>
                                        </View>
                                    )}
                                    <View style={[styles.infoRow, { marginBottom: r.spacing(1) }]}>
                                        <MaterialIcons name="business" size={r.scale(16)} color="#666" />
                                        <ResponsiveText variant="body" style={styles.infoText}>
                                            {t("activityQuestionnaire.manufacturer")}: {equipmentData.brand?.name || equipmentData.manufacturer?.name || "N/A"}
                                        </ResponsiveText>
                                    </View>
                                    <View style={[styles.infoRow, { marginBottom: r.spacing(1) }]}>
                                        <MaterialIcons name="category" size={r.scale(16)} color="#666" />
                                        <ResponsiveText variant="body" style={styles.infoText}>
                                            {t("activityQuestionnaire.type")}: {equipmentData.equipment_type?.name || "N/A"}
                                        </ResponsiveText>
                                    </View>
                                    <View style={[styles.infoRow, { marginBottom: r.spacing(1) }]}>
                                        <MaterialIcons name="location-on" size={r.scale(16)} color="#666" />
                                        <ResponsiveText variant="body" style={styles.infoText}>
                                            {t("activityQuestionnaire.sector")}: {equipmentData.sector?.complete_name || equipmentData.sector?.name || (equipmentData.sector_id ? `#${equipmentData.sector_id}` : "N/A")}
                                        </ResponsiveText>
                                    </View>
                                </View>
                            )}
                        </View>

                        <View style={[styles.section, { margin: r.spacing(2), marginTop: 0, padding: r.spacing(2) }]}>
                            <ResponsiveText variant="subtitle" weight="600" style={[styles.sectionTitle, { marginBottom: r.spacing(2) }]}>
                                {t("activityQuestionnaire.questionnaire")}
                            </ResponsiveText>

                            {equipmentStatus === EquipmentStatus.CREATED ? (
                                <View style={styles.centeredBlock}>
                                    <ResponsiveText variant="body" style={styles.centeredText}>
                                        Para responder o questionário, você precisa iniciar a atividade no equipamento.
                                    </ResponsiveText>
                                    <TouchableOpacity style={[styles.actionButton, styles.startButton]} onPress={startActivity} disabled={saving}>
                                        {saving ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <>
                                                <MaterialIcons name="play-arrow" size={20} color="#fff" />
                                                <ResponsiveText variant="button" weight="600" style={styles.actionButtonText}>
                                                    {t("activityQuestionnaire.startActivity")}
                                                </ResponsiveText>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    {questionsLoading ? (
                                        <View style={styles.centeredBlock}>
                                            <ActivityIndicator size="small" color="#007bff" />
                                            <ResponsiveText variant="body" style={styles.centeredText}>
                                                {t("activityQuestionnaire.loading")}
                                            </ResponsiveText>
                                        </View>
                                    ) : noQuestions ? (
                                        <View style={styles.centeredBlock}>
                                            <ResponsiveText variant="body" style={styles.centeredText}>
                                                {t("activityQuestionnaire.noQuestions")}
                                            </ResponsiveText>
                                        </View>
                                    ) : (
                                        <DynamicActivityQuestionnaire
                                            fields={sortedQuestions}
                                            onChange={setAnswers}
                                            onSaveAnswer={saveIndividualAnswer}
                                            savedAnswers={savedAnswers}
                                            initialValues={initialValues}
                                            initialUploads={initialUploads}
                                            questionIdField="key"
                                            activityId={activityId}
                                            activityEquipmentId={activityEquipmentId}
                                            readOnly={isQuestionnaireReadOnly}
                                        />
                                    )}

                                    {!isQuestionnaireReadOnly && (
                                        <View style={styles.actionButtons}>
                                            {shouldShowBudgetButton && (
                                                <TouchableOpacity
                                                    style={[styles.actionButton, styles.saveButton, saving && styles.actionButtonDisabled]}
                                                    onPress={handleSendToBudget}
                                                    disabled={saving}
                                                >
                                                    {saving ? (
                                                        <ActivityIndicator size="small" color="#fff" />
                                                    ) : (
                                                        <>
                                                            <MaterialIcons name="attach-money" size={20} color="#fff" />
                                                            <ResponsiveText variant="button" weight="600" style={styles.actionButtonText}>
                                                                {t("activityQuestionnaire.sendToBudget")}
                                                            </ResponsiveText>
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            )}

                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.completeButton, saving && styles.actionButtonDisabled]}
                                                onPress={handleContinueExecution}
                                                disabled={saving}
                                            >
                                                {saving ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <>
                                                        <MaterialIcons name="check" size={20} color="#fff" />
                                                        <ResponsiveText variant="button" weight="600" style={styles.actionButtonText}>
                                                            {t("activityQuestionnaire.continueExecution")}
                                                        </ResponsiveText>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>

                <SendToBudgetModal
                    visible={showBudgetModal}
                    onClose={() => setShowBudgetModal(false)}
                    onSuccess={async () => {
                        try {
                            const token = await AsyncStorage.getItem("access_token");
                            if (!token) throw new Error("Token não encontrado");

                            const nextStatus = getNextStatusForAction(
                                equipmentStatus,
                                "send_to_budget",
                                budgetPolicy
                            );

                            if (nextStatus && canTransitionEquipmentStatus(equipmentStatus, nextStatus, budgetPolicy)) {
                                await ActivityService.patchActivityEquipment(
                                    activityId,
                                    activityEquipmentId,
                                    { status: nextStatus },
                                    token
                                );
                                setEquipmentStatus(nextStatus as string);
                            }

                            Alert.alert("Sucesso", "Equipamento enviado para orçamento com sucesso!");
                            setShowBudgetModal(false);
                        } catch (err: any) {
                            if (await handleAuthError(err)) return;
                            Alert.alert("Aviso", "Equipamento enviado para orçamento, mas houve um problema ao atualizar o status.");
                            setShowBudgetModal(false);
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
        flexDirection: "row",
        alignItems: "center",
    },
    backButton: {
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        color: "#fff",
        marginBottom: 4,
    },
    headerSubtitle: {
        color: "rgba(255,255,255,0.8)",
    },
    content: {
        flex: 1,
    },
    section: {
        backgroundColor: "#fff",
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontWeight: "600",
        color: "#333",
    },
    card: {
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    infoText: {
        color: "#333",
        marginLeft: 8,
        flex: 1,
    },
    centeredBlock: {
        alignItems: "center",
        paddingVertical: 20,
    },
    centeredText: {
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
        marginLeft: 8,
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
});

export default function ActivityQuestionnaireScreenWithErrorBoundary(props: ActivityQuestionnaireScreenProps) {
    return (
        <ErrorBoundary>
            <ActivityQuestionnaireWrapper {...props} />
        </ErrorBoundary>
    );
}

export { ActivityQuestionnaireWrapper as ActivityQuestionnaireScreen };
