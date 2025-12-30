import React, { useEffect, useState } from "react";
import {
    View,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import ActivityService from "../../Services/ActivityService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePermissions } from "../../Context/PermissionsContext";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../Context/LanguageContext";
import ResponsiveContainer from "../../Components/ResponsiveContainer";
import ResponsiveText from "../../Components/ResponsiveText";
import { useResponsive } from "../../hooks/useResponsive";
import { Activity } from "../../Models/Activity";

interface ActivityHistoryScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "ActivityHistoryScreen">;
    route: RouteProp<RootStackParamList, "ActivityHistoryScreen">;
}

const ActivityHistoryScreen: React.FC<ActivityHistoryScreenProps> = ({ route, navigation }) => {
    const { t } = useLanguage();
    const r = useResponsive();
    const { activityId } = route.params;
    const [activity, setActivity] = useState<Activity | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { hasPermission } = usePermissions();

    const canViewActivities = hasPermission("list_activities");

    if (!canViewActivities) {
        return (
            <ResponsiveContainer style={styles.container}>
                <View style={styles.errorContainer}>
                    <MaterialIcons name="security" size={r.scale(64)} color="#dc3545" />
                    <ResponsiveText variant="body" style={styles.errorText}>
                        {t('activity.noPermission')}
                    </ResponsiveText>
                </View>
            </ResponsiveContainer>
        );
    }

    useEffect(() => {
        fetchActivityDetails();
    }, [activityId]);

    const fetchActivityDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const response = await ActivityService.fetchActivityDetails(activityId, { token });

            // Normalizar dados da atividade
            let typeValue: string = 'unknown';
            if (typeof response.type === 'string') {
                typeValue = response.type;
            } else if (response.activity_type) {
                if (typeof response.activity_type === 'string') {
                    typeValue = response.activity_type;
                } else if (typeof response.activity_type === 'object' && response.activity_type !== null) {
                    typeValue = response.activity_type.name || response.activity_type.slug || 'unknown';
                }
            }

            let statusValue: string = 'pending';
            if (typeof response.status === 'string') {
                statusValue = response.status;
            } else if (response.status && typeof response.status === 'object') {
                statusValue = response.status.name || response.status.value || 'pending';
            }

            const normalizedActivity: Activity = {
                ...response,
                id: response.id || activityId,
                name: response.name || response.title || 'Atividade sem nome',
                type: typeValue,
                status: statusValue,
                start_date: response.start_date || response.created_at,
                end_date: response.end_date || null,
                preview_date: response.preview_date || null,
                is_overdue: response.is_overdue || false,
            };

            setActivity(normalizedActivity);
        } catch (error: any) {
            console.error('[ActivityHistoryScreen] Erro ao buscar detalhes da atividade:', error);
            let errorMessage = "Falha ao buscar detalhes da atividade.";
            if (error.response?.status === 404) {
                errorMessage = "Atividade não encontrada.";
            } else if (error.response?.status === 500) {
                errorMessage = "Erro interno no servidor.";
            } else if (error.response?.status === 401) {
                errorMessage = "Token de acesso inválido ou expirado.";
            } else if (error.response?.status === 403) {
                errorMessage = "Sem permissão para acessar esta atividade.";
            } else if (error.message) {
                errorMessage = error.message;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchActivityDetails();
        setRefreshing(false);
    };

    const statusTranslations: { [key: string]: string } = {
        open: "Aberto",
        closed: "Fechado",
        pending: "Pendente",
        waiting_budget_approval: "Aguardando Aprovação",
        budget_not_approved: "Orçamento não aprovado",
    };

    const statusColors: { [key: string]: string } = {
        open: "#007bff",
        pending: "#ffc107",
        closed: "#6c757d",
        waiting_budget_approval: "#6f42c1",
        budget_not_approved: "#dc3545",
    };

    const getActivityTypeInfo = (type: string | undefined | null) => {
        const known: Record<string, { icon: string; color: string; label: string }> = {
            pmoc: { icon: 'build', color: '#007bff', label: 'PMOC' },
            service_order: { icon: 'assignment', color: '#28a745', label: 'Ordem de Serviço' },
            technical_assistance: { icon: 'support-agent', color: '#ffc107', label: 'Assistência Técnica' },
            instalation: { icon: 'settings', color: '#dc3545', label: 'Instalação' },
        };
        const normalizedType = type?.toLowerCase() || 'unknown';
        return known[normalizedType] || { icon: 'assignment', color: '#6c757d', label: type || 'Atividade' };
    };

    const formatDate = (dateString: string | null | undefined): string => {
        if (!dateString) return '';
        try {
            if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
                return dateString;
            }
            const isoMatch = typeof dateString === 'string' && dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) {
                const [, y, m, d] = isoMatch as unknown as [string, string, string, string];
                return `${d}/${m}/${y}`;
            }
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = String(date.getFullYear());
            return `${d}/${m}/${y}`;
        } catch {
            return '';
        }
    };

    if (loading && !refreshing) {
        return (
            <ResponsiveContainer style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <ResponsiveText variant="body" style={styles.loadingText}>
                        Carregando histórico...
                    </ResponsiveText>
                </View>
            </ResponsiveContainer>
        );
    }

    if (error) {
        return (
            <ResponsiveContainer style={styles.container}>
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={r.scale(48)} color="#dc3545" />
                    <ResponsiveText variant="body" style={styles.errorText}>
                        {error}
                    </ResponsiveText>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchActivityDetails}>
                        <ResponsiveText variant="button" weight="600" style={styles.retryButtonText}>
                            Tentar Novamente
                        </ResponsiveText>
                    </TouchableOpacity>
                </View>
            </ResponsiveContainer>
        );
    }

    if (!activity) {
        return (
            <ResponsiveContainer style={styles.container}>
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="assignment" size={r.scale(64)} color="#ccc" />
                    <ResponsiveText variant="body" weight="600" style={styles.emptyText}>
                        Atividade não encontrada
                    </ResponsiveText>
                </View>
            </ResponsiveContainer>
        );
    }

    const activityTypeInfo = getActivityTypeInfo(activity.type);
    const status = typeof activity.status === 'string' ? activity.status : (activity.status as any)?.name || 'pending';
    const statusColor = statusColors[status] || "#6c757d";

    return (
        <ResponsiveContainer withPadding={false} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={[styles.backButton, {
                        width: r.scale(40),
                        height: r.scale(40),
                        borderRadius: r.scale(20),
                    }]}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={r.scale(24)} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <ResponsiveText variant="title" weight="bold" style={styles.headerTitle}>
                        Histórico da Atividade
                    </ResponsiveText>
                    <ResponsiveText variant="caption" style={styles.headerSubtitle}>
                        Visualização somente leitura
                    </ResponsiveText>
                </View>
                <View style={[styles.activityIdBadge, {
                    paddingHorizontal: r.spacing(1),
                    paddingVertical: r.spacing(0.5),
                }]}>
                    <ResponsiveText variant="caption" weight="600" style={styles.activityIdText}>
                        #{activity.id}
                    </ResponsiveText>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Timeline Header */}
                <View style={[styles.timelineHeader, { padding: r.spacing(1.5) }]}>
                    <View style={styles.activitySummary}>
                        <View style={[styles.activityIcon, { backgroundColor: activityTypeInfo.color + '20' }]}>
                            <MaterialIcons name={activityTypeInfo.icon as any} size={r.scale(28)} color={activityTypeInfo.color} />
                        </View>
                        <View style={styles.activitySummaryContent}>
                            <ResponsiveText variant="subtitle" weight="bold" style={styles.activitySummaryTitle}>
                                {activity.name}
                            </ResponsiveText>
                            <View style={styles.activityMeta}>
                                <ResponsiveText variant="body" style={[styles.activityType, { color: activityTypeInfo.color }]}>
                                    {activityTypeInfo.label}
                                </ResponsiveText>
                                <View style={[styles.statusIndicator, { backgroundColor: statusColor + '20' }]}>
                                    <Ionicons name="checkmark-circle" size={r.scale(14)} color={statusColor} />
                                    <ResponsiveText variant="caption" weight="600" style={[styles.statusIndicatorText, { color: statusColor }]}>
                                        {statusTranslations[status] || status}
                                    </ResponsiveText>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Timeline */}
                <View style={styles.timeline}>
                    {/* Informações Principais */}
                    <View style={styles.timelineItem}>
                        <View style={styles.timelineConnector}>
                            <View style={[styles.timelineDot, { backgroundColor: activityTypeInfo.color }]} />
                            <View style={[styles.timelineLine, { backgroundColor: activityTypeInfo.color + '40' }]} />
                        </View>
                        <View style={[styles.timelineContent, { padding: r.spacing(1.25) }]}>
                            <View style={styles.timelineHeader}>
                                <ResponsiveText variant="subtitle" weight="bold" style={styles.timelineTitle}>
                                    Informações Principais
                                </ResponsiveText>
                                <MaterialIcons name="info" size={r.scale(20)} color="#666" />
                            </View>

                            <View style={styles.infoGrid}>
                                {activity.client && (
                                    <View style={styles.infoItem}>
                                        <View style={styles.infoIcon}>
                                            <MaterialIcons name="business" size={r.scale(16)} color="#007bff" />
                                        </View>
                                        <View style={styles.infoContent}>
                                            <ResponsiveText variant="caption" weight="600" style={styles.infoLabel}>
                                                Cliente
                                            </ResponsiveText>
                                            <ResponsiveText variant="body" style={styles.infoValue}>
                                                {activity.client.name}
                                            </ResponsiveText>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Datas */}
                    <View style={styles.timelineItem}>
                        <View style={styles.timelineConnector}>
                            <View style={[styles.timelineDot, { backgroundColor: '#28a745' }]} />
                            <View style={[styles.timelineLine, { backgroundColor: '#28a74540' }]} />
                        </View>
                        <View style={[styles.timelineContent, { padding: r.spacing(1.25) }]}>
                            <View style={styles.timelineHeader}>
                                <ResponsiveText variant="subtitle" weight="bold" style={styles.timelineTitle}>
                                    Cronograma
                                </ResponsiveText>
                                <MaterialIcons name="schedule" size={r.scale(20)} color="#666" />
                            </View>

                            <View style={styles.datesGrid}>
                                {activity.start_date && (
                                    <View style={styles.dateItem}>
                                        <View style={[styles.dateIcon, { backgroundColor: '#007bff20' }]}>
                                            <MaterialIcons name="play-arrow" size={r.scale(16)} color="#007bff" />
                                        </View>
                                        <View style={styles.dateContent}>
                                            <ResponsiveText variant="caption" weight="600" style={styles.dateLabel}>
                                                Início
                                            </ResponsiveText>
                                            <ResponsiveText variant="body" style={styles.dateValue}>
                                                {formatDate(activity.start_date)}
                                            </ResponsiveText>
                                        </View>
                                    </View>
                                )}

                                {activity.end_date && (
                                    <View style={styles.dateItem}>
                                        <View style={[styles.dateIcon, { backgroundColor: '#6c757d20' }]}>
                                            <MaterialIcons name="stop" size={r.scale(16)} color="#6c757d" />
                                        </View>
                                        <View style={styles.dateContent}>
                                            <ResponsiveText variant="caption" weight="600" style={styles.dateLabel}>
                                                Fim
                                            </ResponsiveText>
                                            <ResponsiveText variant="body" style={styles.dateValue}>
                                                {formatDate(activity.end_date)}
                                            </ResponsiveText>
                                        </View>
                                    </View>
                                )}

                                {activity.preview_date && (
                                    <View style={styles.dateItem}>
                                        <View style={[styles.dateIcon, { backgroundColor: '#ffc10720' }]}>
                                            <MaterialIcons name="visibility" size={r.scale(16)} color="#ffc107" />
                                        </View>
                                        <View style={styles.dateContent}>
                                            <ResponsiveText variant="caption" weight="600" style={styles.dateLabel}>
                                                Preview
                                            </ResponsiveText>
                                            <ResponsiveText variant="body" style={styles.dateValue}>
                                                {formatDate(activity.preview_date)}
                                            </ResponsiveText>
                                        </View>
                                    </View>
                                )}

                                {activity.deadline && (
                                    <View style={styles.dateItem}>
                                        <View style={[styles.dateIcon, { backgroundColor: '#dc354520' }]}>
                                            <MaterialIcons name="flag" size={r.scale(16)} color="#dc3545" />
                                        </View>
                                        <View style={styles.dateContent}>
                                            <ResponsiveText variant="caption" weight="600" style={styles.dateLabel}>
                                                Prazo
                                            </ResponsiveText>
                                            <ResponsiveText variant="body" style={styles.dateValue}>
                                                {formatDate(activity.deadline)}
                                            </ResponsiveText>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {activity.is_overdue && (
                                <View style={styles.overdueAlert}>
                                    <MaterialIcons name="warning" size={r.scale(20)} color="#dc3545" />
                                    <ResponsiveText variant="body" weight="600" style={styles.overdueAlertText}>
                                        Esta atividade está atrasada
                                    </ResponsiveText>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Informações Adicionais */}
                    {(activity.equipment || activity.count_equipment !== undefined) && (
                        <View style={styles.timelineItem}>
                        <View style={styles.timelineConnector}>
                            <View style={[styles.timelineDot, { backgroundColor: '#17a2b8' }]} />
                            {activity.equipment && (
                                <View style={[styles.timelineLine, { backgroundColor: '#17a2b840' }]} />
                            )}
                        </View>
                            <View style={[styles.timelineContent, { padding: r.spacing(1.25) }]}>
                                <View style={styles.timelineHeader}>
                                    <ResponsiveText variant="subtitle" weight="bold" style={styles.timelineTitle}>
                                        Equipamentos
                                    </ResponsiveText>
                                    <MaterialIcons name="build" size={r.scale(20)} color="#666" />
                                </View>

                                <View style={styles.equipmentStats}>
                                    {activity.equipment && (
                                        <View style={styles.equipmentCard}>
                                            <View style={[styles.equipmentIcon, { backgroundColor: '#007bff20' }]}>
                                                <MaterialIcons name="settings" size={r.scale(20)} color="#007bff" />
                                            </View>
                                            <View style={styles.equipmentInfo}>
                                                {activity.equipment.tag && (
                                                    <ResponsiveText variant="body" weight="600" style={styles.equipmentTag}>
                                                        {activity.equipment.tag}
                                                    </ResponsiveText>
                                                )}
                                                {activity.equipment.equipment_type && (
                                                    <ResponsiveText variant="caption" style={styles.equipmentType}>
                                                        {activity.equipment.equipment_type.name}
                                                    </ResponsiveText>
                                                )}
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.statsGrid}>
                                        {activity.count_equipment !== undefined && (
                                            <View style={styles.statItem}>
                                                <View style={[styles.statIcon, { backgroundColor: '#6c757d20' }]}>
                                                    <MaterialIcons name="inventory" size={r.scale(16)} color="#6c757d" />
                                                </View>
                                                <View>
                                                    <ResponsiveText variant="body" weight="bold" style={styles.statValue}>
                                                        {activity.count_equipment}
                                                    </ResponsiveText>
                                                    <ResponsiveText variant="caption" style={styles.statLabel}>
                                                        Total
                                                    </ResponsiveText>
                                                </View>
                                            </View>
                                        )}

                                        {activity.count_equipment_close !== undefined && (
                                            <View style={styles.statItem}>
                                                <View style={[styles.statIcon, { backgroundColor: '#28a74520' }]}>
                                                    <MaterialIcons name="check-circle" size={r.scale(16)} color="#28a745" />
                                                </View>
                                                <View>
                                                    <ResponsiveText variant="body" weight="bold" style={styles.statValue}>
                                                        {activity.count_equipment_close}
                                                    </ResponsiveText>
                                                    <ResponsiveText variant="caption" style={styles.statLabel}>
                                                        Concluídos
                                                    </ResponsiveText>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                </View>

                {/* Botão para Questionário */}
                <View style={[styles.questionnaireSection, { padding: r.spacing(1.5) }]}>
                    <TouchableOpacity
                        style={styles.questionnaireButton}
                        onPress={() => navigation.navigate("ActivityQuestionnaireScreen", {
                            activityId: activity.id,
                            activityName: activity.name,
                            readOnly: true
                        })}
                    >
                        <MaterialIcons name="assignment" size={r.scale(20)} color="#fff" />
                        <ResponsiveText variant="button" weight="600" style={styles.questionnaireButtonText}>
                            Ver Questionário
                        </ResponsiveText>
                        <MaterialIcons name="arrow-forward" size={r.scale(18)} color="#fff" />
                    </TouchableOpacity>
                    <ResponsiveText variant="caption" style={styles.questionnaireNote}>
                        Modo somente leitura
                    </ResponsiveText>
                </View>
            </ScrollView>
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
        justifyContent: "space-between",
    },
    backButton: {
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerContent: {
        flex: 1,
        marginLeft: 16,
    },
    headerTitle: {
        color: "#fff",
        marginBottom: 4,
    },
    headerSubtitle: {
        color: "rgba(255,255,255,0.8)",
    },
    activityIdBadge: {
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 12,
    },
    activityIdText: {
        color: "#fff",
    },
    content: {
        flex: 1,
    },
    timelineHeader: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    activitySummary: {
        flexDirection: "row",
        alignItems: "center",
    },
    activityIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    activitySummaryContent: {
        flex: 1,
    },
    activitySummaryTitle: {
        color: "#333",
        marginBottom: 8,
    },
    activityMeta: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    activityType: {
        fontSize: 14,
    },
    statusIndicator: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusIndicatorText: {
        marginLeft: 4,
        fontSize: 12,
    },
    timeline: {
        paddingVertical: 20,
    },
    timelineItem: {
        flexDirection: "row",
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    timelineConnector: {
        width: 20,
        alignItems: "center",
        marginRight: 16,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        zIndex: 1,
    },
    timelineLine: {
        position: "absolute",
        top: 12,
        left: 5.5,
        width: 1,
        bottom: -24,
    },
    timelineContent: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    timelineHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    timelineTitle: {
        color: "#333",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 16,
        color: "#666",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorText: {
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
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        marginTop: 16,
        color: "#666",
    },
    infoGrid: {
        gap: 12,
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    infoIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        color: "#666",
        marginBottom: 2,
    },
    infoValue: {
        color: "#333",
    },
    datesGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    dateItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        padding: 12,
        borderRadius: 12,
        minWidth: 120,
        flex: 1,
    },
    dateIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    dateContent: {
        flex: 1,
    },
    dateLabel: {
        color: "#666",
        marginBottom: 2,
    },
    dateValue: {
        color: "#333",
    },
    overdueAlert: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ffebee",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 16,
    },
    overdueAlertText: {
        color: "#dc3545",
        marginLeft: 8,
    },
    equipmentStats: {
        gap: 16,
    },
    equipmentCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        padding: 16,
        borderRadius: 12,
    },
    equipmentIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    equipmentInfo: {
        flex: 1,
    },
    equipmentTag: {
        color: "#333",
        marginBottom: 2,
    },
    equipmentType: {
        color: "#666",
    },
    statsGrid: {
        flexDirection: "row",
        gap: 16,
    },
    statItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        padding: 12,
        borderRadius: 12,
        flex: 1,
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    statValue: {
        color: "#333",
        textAlign: "center",
    },
    statLabel: {
        color: "#666",
        fontSize: 12,
        textAlign: "center",
    },
    questionnaireSection: {
        paddingTop: 20,
        paddingBottom: 40,
    },
    questionnaireButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#007bff",
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        gap: 8,
    },
    questionnaireButtonText: {
        color: "#fff",
        marginHorizontal: 8,
    },
    questionnaireNote: {
        color: "#666",
        textAlign: "center",
        marginTop: 8,
    },
});

export default ActivityHistoryScreen;
