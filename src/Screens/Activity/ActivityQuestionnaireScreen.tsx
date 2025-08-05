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

interface ActivityQuestionnaireScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "ActivityQuestionnaireScreen">;
    route: RouteProp<RootStackParamList, "ActivityQuestionnaireScreen">;
}

const ActivityQuestionnaireScreen: React.FC<ActivityQuestionnaireScreenProps> = ({ route, navigation }) => {
    const { t } = useLanguage();
    const { activityId, activityEquipmentId, equipmentId, equipmentTag, activityName } = route.params;

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [equipmentData, setEquipmentData] = useState<any>(null);
    const [questions, setQuestions] = useState<ActivityDynamicField[]>([]);
    const [answers, setAnswers] = useState<{ [key: string]: any }>({});
    const [activityStarted, setActivityStarted] = useState(false);
    const [activityCompleted, setActivityCompleted] = useState(false);

    useEffect(() => {
        fetchEquipmentData();
        fetchQuestions();
    }, []);

    const fetchEquipmentData = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            console.log('[ActivityQuestionnaireScreen] Buscando dados do equipamento:', equipmentId);

            const apiUrl = await import('../../config/apiConfig').then(m => m.buildApiUrlForAccount());
            const response = await fetch(`${apiUrl}/equipments/${equipmentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setEquipmentData(data);
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] Erro ao buscar dados do equipamento:', error);
            setError("Falha ao carregar dados do equipamento.");
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            console.log('[ActivityQuestionnaireScreen] Buscando questões da atividade');

            // Buscar questões do plano de atividade
            const response = await ActivityService.fetchActivityQuestions(
                equipmentData?.activity_plan?.id || 1,
                equipmentData?.activity_plan?.version?.id || 1,
                token
            );
            setQuestions(response);
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] Erro ao buscar questões:', error);
            setError("Falha ao carregar questões da atividade.");
        }
    };

    const startActivity = async () => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            console.log('[ActivityQuestionnaireScreen] Iniciando atividade no equipamento');

            await ActivityService.patchActivityEquipment(
                activityId,
                activityEquipmentId,
                { status: "in_progress" },
                token
            );

            setActivityStarted(true);
            Alert.alert(t('common.success'), t('activityQuestionnaire.startSuccess'));
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] Erro ao iniciar atividade:', error);
            Alert.alert(t('common.error'), t('activityQuestionnaire.startError'));
        } finally {
            setSaving(false);
        }
    };

    const saveAnswers = async () => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            console.log('[ActivityQuestionnaireScreen] Salvando respostas');

            // Converter respostas para o formato esperado pela API
            const answersArray: ActivityAnswer[] = [];
            Object.keys(answers).forEach(key => {
                if (key !== 'uploads') {
                    const answer: ActivityAnswer = {
                        question_id: parseInt(key),
                        value: answers[key],
                        justification: answers[`${key}_justification`] || undefined,
                        uploads: answers.uploads?.[key] || []
                    };
                    answersArray.push(answer);
                }
            });

            await ActivityService.postActivityAnswers(
                activityId,
                activityEquipmentId,
                answersArray,
                token
            );

            Alert.alert(t('common.success'), t('activityQuestionnaire.saveSuccess'));
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] Erro ao salvar respostas:', error);
            Alert.alert(t('common.error'), t('activityQuestionnaire.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const completeActivity = async () => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            console.log('[ActivityQuestionnaireScreen] Concluindo atividade');

            await ActivityService.patchActivityEquipment(
                activityId,
                activityEquipmentId,
                { status: "completed" },
                token
            );

            setActivityCompleted(true);
            Alert.alert(t('common.success'), t('activityQuestionnaire.completeSuccess'), [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            console.error('[ActivityQuestionnaireScreen] Erro ao concluir atividade:', error);
            Alert.alert(t('common.error'), t('activityQuestionnaire.completeError'));
        } finally {
            setSaving(false);
        }
    };

    const validateAnswers = () => {
        // Verificar se todas as questões obrigatórias foram respondidas
        for (const question of questions) {
            if (question.rules?.required) {
                const value = answers[question.key];
                if (!value || value === '') {
                    return false;
                }

                // Verificar justificativa para radio_with_justification
                if (question.type === 'radio_with_justification' &&
                    value === question.justification_target) {
                    const justification = answers[`${question.key}_justification`];
                    if (!justification || justification === '') {
                        return false;
                    }
                }

                // Verificar upload obrigatório
                if (question.has_upload) {
                    const uploads = answers.uploads?.[question.key];
                    if (!uploads || uploads.length === 0) {
                        return false;
                    }
                }
            }
        }
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
                                <MaterialIcons name="checkmark-circle" size={20} color="#28a745" />
                                <Text style={styles.statusText}>{t('activityQuestionnaire.activityCompleted')}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Questionário */}
                <View style={styles.questionnaireSection}>
                    <Text style={styles.sectionTitle}>{t('activityQuestionnaire.questionnaire')}</Text>

                    {!activityStarted ? (
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
                    ) : (
                        <>
                            <DynamicActivityQuestionnaire
                                fields={questions}
                                onChange={setAnswers}
                                initialValues={{}}
                            />

                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.saveButton]}
                                    onPress={saveAnswers}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <MaterialIcons name="save" size={20} color="#fff" />
                                            <Text style={styles.actionButtonText}>{t('activityQuestionnaire.saveAnswers')}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

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
        backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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