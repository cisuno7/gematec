import React, { useEffect, useState } from "react";
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
    { label: "Pendente", value: "pending", icon: "time" },
    { label: "Fechado", value: "closed", icon: "checkmark-circle" },
];

const ACTIVITY_TYPES = [
    { label: "Todos", value: "all", icon: "apps", color: "#6c757d" },
    { label: "PMOC", value: "pmoc", icon: "build", color: "#007bff" },
    { label: "Ordem de Serviço", value: "service_order", icon: "assignment", color: "#28a745" },
    { label: "Assistência Técnica", value: "technical_assistance", icon: "support-agent", color: "#ffc107" },
    { label: "Instalação", value: "instalation", icon: "settings", color: "#dc3545" },
];

const ActivityHistoryScreen: React.FC<ActivityHistoryScreenProps> = ({ route, navigation }) => {
    const { t } = useLanguage();
    const { equipmentId, activityTypeSlug, status } = route.params || {};
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string>(activityTypeSlug || "all");
    const [selectedStatus, setSelectedStatus] = useState<string[]>(status || ["open", "pending"]);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const { hasPermission } = usePermissions();
    const activityService = new ActivityService();

    // Permissões
    const canViewPmoc = hasPermission("list_activities");
    const canViewServiceOrder = hasPermission("list_activities");
    const canViewTechnicalAssistance = hasPermission("list_activities");

    if (!canViewPmoc && !canViewServiceOrder && !canViewTechnicalAssistance) {
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

    const fetchActivities = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            console.log('[ActivityHistoryScreen] Buscando atividades...', {
                equipmentId,
                currentPage,
                selectedType,
                selectedStatus
            });

            if (equipmentId) {
                // Histórico de atividades de um equipamento específico
                const params = {
                    page: currentPage,
                    per_page: perPage,
                    activity_type: selectedType !== "all" ? selectedType : undefined,
                    token: token,
                };
                console.log('[ActivityHistoryScreen] Parâmetros para equipamento:', params);
                console.log('[ActivityHistoryScreen] Equipment ID:', equipmentId);

                const response = await activityService.fetchActivities(equipmentId, params);
                console.log('[ActivityHistoryScreen] Resposta recebida:', response);
                console.log('[ActivityHistoryScreen] Número de atividades:', response.results?.length || 0);
                console.log('[ActivityHistoryScreen] Total de atividades:', response.count || 0);

                setActivities(response.results || []);
                setTotalPages(Math.ceil(response.count / perPage) || 1);
            } else {
                // Listagem geral de atividades
                const params = {
                    page: currentPage,
                    per_page: perPage,
                    activity_type_slug: selectedType !== "all" ? selectedType : undefined,
                    status: selectedStatus.includes("all") ? undefined : selectedStatus,
                    token: token,
                };
                console.log('[ActivityHistoryScreen] Parâmetros gerais:', params);
                const response = await ActivityService.fetchAllActivities(params);
                console.log('[ActivityHistoryScreen] Resposta geral recebida:', response);
                setActivities(response.results || []);
                setTotalPages(Math.ceil(response.count / perPage) || 1);
            }
        } catch (error: any) {
            console.error('[ActivityHistoryScreen] Erro ao buscar atividades:', error);
            console.error('[ActivityHistoryScreen] Detalhes do erro:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });

            let errorMessage = "Falha ao buscar atividades.";

            if (error.response?.status === 404) {
                errorMessage = "Endpoint de atividades não encontrado. Verifique se o backend está configurado corretamente.";
            } else if (error.response?.status === 500) {
                errorMessage = "Erro interno no servidor ao buscar atividades. Tente novamente ou contate o suporte.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
            setActivities([]);
        } finally {
            setLoading(false);
        }
    };

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
    };

    const statusColors: { [key: string]: string } = {
        open: "#007bff",
        closed: "#28a745",
        pending: "#ffc107",
    };

    const statusIcons: { [key: string]: string } = {
        open: "play-circle",
        closed: "checkmark-circle",
        pending: "time",
    };

    const getActivityTypeInfo = (type: string) => {
        return ACTIVITY_TYPES.find(t => t.value === type) || ACTIVITY_TYPES[0];
    };

    const renderActivityCard = ({ item }: { item: any }) => {
        const isPmoc = item.type === "pmoc" && canViewPmoc;
        const isServiceOrder = item.type === "service_order" && canViewServiceOrder;
        const isTechnicalAssistance = item.type === "technical_assistance" && canViewTechnicalAssistance;
        const isInstalation = item.type === "instalation";

        if (!isPmoc && !isServiceOrder && !isTechnicalAssistance && !isInstalation) {
            return null;
        }

        const navigateToDetails = () => {
            // Navegar para a tela de equipamentos vinculados da atividade
            navigation.navigate("ActivityEquipmentListScreen", {
                activityId: item.id,
                activityName: item.name || item.title || "Atividade",
                clientId: item.client?.id || item.equipment?.client?.id,
                clientName: item.client?.name || item.equipment?.client?.name,
            });
        };

        const activityTypeInfo = getActivityTypeInfo(item.type);
        const statusColor = statusColors[item.status] || "#6c757d";
        const statusIcon = statusIcons[item.status] || "help-circle";

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
                            {statusTranslations[item.status] || item.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.infoRow}>
                        <MaterialIcons name="business" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {item.client?.name || item.equipment?.tag || "N/A"}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialIcons name="event" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </Text>
                    </View>

                    {item.deadline && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="schedule" size={16} color="#666" />
                            <Text style={styles.infoText}>
                                Prazo: {new Date(item.deadline).toLocaleDateString('pt-BR')}
                            </Text>
                        </View>
                    )}

                    {item.equipment && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="build" size={16} color="#666" />
                            <Text style={styles.infoText}>
                                {item.equipment.equipment_type?.name || "Equipamento"}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardFooter}>
                    <TouchableOpacity style={styles.detailsButton} onPress={navigateToDetails}>
                        <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
                        <MaterialIcons name="arrow-forward" size={16} color="#007bff" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    // Filtro de status (múltipla seleção)
    const handleStatusChange = (value: string) => {
        if (value === "all") {
            setSelectedStatus(["all"]);
        } else {
            setSelectedStatus((prev) => {
                const newStatus = prev.includes(value)
                    ? prev.filter((s) => s !== value)
                    : [...prev.filter((s) => s !== "all"), value];
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
                        {equipmentId ? "Histórico de Atividades" : "Atividades"}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {equipmentId ? "Equipamento específico" : "Todas as atividades"}
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Filtros */}
                <View style={styles.filtersSection}>
                    <Text style={styles.sectionTitle}>Filtros</Text>

                    {/* Filtro de Tipo */}
                    <Text style={styles.filterLabel}>Tipo de Atividade</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                        {ACTIVITY_TYPES.map((type) => (
                            renderFilterChip(
                                type,
                                selectedType === type.value,
                                () => {
                                    setSelectedType(type.value);
                                    setCurrentPage(1);
                                }
                            )
                        ))}
                    </ScrollView>

                    {/* Filtro de Status */}
                    <Text style={styles.filterLabel}>Status</Text>
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
                        Atividades ({activities.length})
                    </Text>

                    {loading && !refreshing ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#007bff" />
                            <Text style={styles.loadingText}>Carregando atividades...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <MaterialIcons name="error-outline" size={48} color="#dc3545" />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity style={styles.retryButton} onPress={fetchActivities}>
                                <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                            </TouchableOpacity>
                        </View>
                    ) : activities.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="assignment" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>Nenhuma atividade encontrada</Text>
                            <Text style={styles.emptySubtext}>
                                Tente ajustar os filtros ou verifique se há atividades disponíveis
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={activities}
                            keyExtractor={(item) => `${item.id}`}
                            renderItem={renderActivityCard}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
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
        fontSize: 24,
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
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginBottom: 8,
        marginTop: 16,
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
    },
    filterChipTextSelected: {
        color: "#fff",
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
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 18,
        color: "#666",
        marginTop: 16,
        fontWeight: "600",
    },
    emptySubtext: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
        marginTop: 8,
        paddingHorizontal: 32,
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
    },
    activityText: {
        fontSize: 14,
        color: "#333",
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
    },
    paginationButtonTextDisabled: {
        color: "#ccc",
    },
    pageInfo: {
        alignItems: "center",
    },
    pageText: {
        fontSize: 14,
        color: "#666",
        fontWeight: "500",
    },
});

export default ActivityHistoryScreen;