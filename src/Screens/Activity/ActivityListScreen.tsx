import React, { useEffect, useState } from "react";
import {
    View,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    Modal,
    Platform,
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
import ActivityFilters, { ActivityFiltersState } from "../../Components/ActivityFilters";
import { useResponsive } from "../../hooks/useResponsive";
import { useTheme } from "../../Context/ThemeContext";
import { Activity } from "../../Models/Activity";
import { getActivityStatusConfig, getEquipmentStatusConfig } from "../../constants/activityStatus";

interface ActivityListScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "ActivityListScreen">;
    route: RouteProp<RootStackParamList, "ActivityListScreen">;
}

const ActivityListScreen: React.FC<ActivityListScreenProps> = ({ route, navigation }) => {
    const { t } = useLanguage();
    const theme = useTheme();
    const r = useResponsive();
    const { activityTypeSlug, status, clientId } = route.params || {};
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState<ActivityFiltersState>({
        activity_type_slug: activityTypeSlug,
        status: status || ["all"],
        client_id: clientId,
    });
    const [filterKey, setFilterKey] = useState(0);
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const { hasPermission } = usePermissions();
    const [activityTypes, setActivityTypes] = useState<any[]>([]);
    const activityService = new ActivityService();

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

    // Buscar tipos de atividade ao montar o componente
    useEffect(() => {
        fetchActivityTypes();
    }, []);

    useEffect(() => {
        fetchActivities();
    }, [currentPage, filters]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            const params = route.params;
            if (params?.activityTypeSlug) {
                setFilters(prev => ({ ...prev, activity_type_slug: params.activityTypeSlug }));
            }
            if (params?.status && Array.isArray(params.status)) {
                setFilters(prev => ({ ...prev, status: params.status }));
            }
            if (params?.clientId) {
                setFilters(prev => ({ ...prev, client_id: params.clientId }));
            }
            setCurrentPage(1);
            fetchActivities();
        });
        return unsubscribe;
    }, [navigation, route.params]);

    const fetchActivityTypes = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) return;

            const types = await activityService.fetchActivityTypes(token);
            setActivityTypes(types || []);
        } catch (error) {
            console.error('[ActivityListScreen] Erro ao buscar tipos de atividade:', error);
            setActivityTypes([]);
        }
    };

    const fetchActivities = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const params = {
                page: currentPage,
                per_page: 50,
                activity_type_slug: filters.activity_type_slug,
                activity_type_id: filters.activity_type_id,
                status: filters.status?.includes("all") ? undefined : filters.status,
                token: token,
            };

            const response = await ActivityService.fetchAllActivities(params);

            if (response.results && response.results.length > 0) {
                const validActivities = response.results.map((activity: any) => {
                    let typeValue: string = 'unknown';
                    if (typeof activity.type === 'string') {
                        typeValue = activity.type;
                    } else if (activity.activity_type) {
                        if (typeof activity.activity_type === 'string') {
                            typeValue = activity.activity_type;
                        } else if (typeof activity.activity_type === 'object' && activity.activity_type !== null) {
                            typeValue = activity.activity_type.name || activity.activity_type.slug || 'unknown';
                        }
                    }

                    let statusValue: string = 'pending';
                    if (typeof activity.status === 'string') {
                        statusValue = activity.status;
                    } else if (activity.status && typeof activity.status === 'object') {
                        statusValue = activity.status.name || activity.status.value || 'pending';
                    }

                    return {
                        ...activity,
                        id: activity.id || Math.random(),
                        name: activity.name || activity.title || 'Atividade sem nome',
                        type: typeValue,
                        status: statusValue,
                        activity_type: activity.activity_type, // Preservar objeto completo
                        start_date: activity.start_date || activity.created_at,
                        end_date: activity.end_date || null,
                        preview_date: activity.preview_date || null,
                        is_overdue: activity.is_overdue || false,
                        client: activity.client, // Preservar objeto cliente
                    };
                });
                setActivities(validActivities);
            } else {
                setActivities([]);
            }

            setTotalPages(Math.ceil(response.count / 50) || 1);
        } catch (error: any) {
            console.error('[ActivityListScreen] Erro ao buscar atividades:', error);
            let errorMessage = "Falha ao buscar atividades.";
            if (error.response?.status === 404) {
                errorMessage = "Endpoint de atividades não encontrado.";
            } else if (error.response?.status === 500) {
                errorMessage = "Erro interno no servidor.";
            } else if (error.response?.status === 401) {
                errorMessage = "Token de acesso inválido ou expirado.";
            } else if (error.response?.status === 403) {
                errorMessage = "Sem permissão para acessar atividades.";
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

    const handleFilter = (newFilters: ActivityFiltersState) => {
        setFilters(newFilters);
        setCurrentPage(1);
        setFilterKey(prev => prev + 1);
    };

    // Função para obter informações de status usando constantes centralizadas
    const getStatusInfo = (status: string) => {
        // Usar função centralizada para obter configuração de status
        return getActivityStatusConfig(status);
    };

    const getActivityTypeInfo = (type: string | undefined | null, activityTypeObj?: any) => {
        // Primeiro, tentar encontrar no objeto activity_type completo
        if (activityTypeObj && typeof activityTypeObj === 'object') {
            const slug = activityTypeObj.slug?.toLowerCase() || activityTypeObj.name?.toLowerCase().replace(/\s+/g, '_');
            const name = activityTypeObj.name || activityTypeObj.slug || type;
            
            // Mapeamento de ícones e cores por slug conhecido
            const known: Record<string, { icon: string; color: string }> = {
                pmoc: { icon: 'build', color: '#007bff' },
                service_order: { icon: 'assignment', color: '#28a745' },
                technical_assistance: { icon: 'support-agent', color: '#ffc107' },
                instalation: { icon: 'settings', color: '#dc3545' },
            };
            
            const typeInfo = known[slug] || { icon: 'assignment', color: '#6c757d' };
            return { ...typeInfo, label: name };
        }
        
        // Fallback para tipos conhecidos por string
        const known: Record<string, { icon: string; color: string; label: string }> = {
            pmoc: { icon: 'build', color: '#007bff', label: 'PMOC' },
            service_order: { icon: 'assignment', color: '#28a745', label: 'Ordem de Serviço' },
            technical_assistance: { icon: 'support-agent', color: '#ffc107', label: 'Assistência Técnica' },
            instalation: { icon: 'settings', color: '#dc3545', label: 'Instalação' },
        };
        
        // Tentar encontrar nos tipos carregados da API
        if (type && activityTypes.length > 0) {
            const foundType = activityTypes.find((t: any) => 
                t.slug?.toLowerCase() === type.toLowerCase() || 
                t.name?.toLowerCase() === type.toLowerCase()
            );
            if (foundType) {
                const slug = foundType.slug?.toLowerCase();
                const typeInfo = known[slug] || { icon: 'assignment', color: '#6c757d' };
                return { ...typeInfo, label: foundType.name || foundType.slug || type };
            }
        }
        
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

    const renderActivityCard = ({ item }: { item: Activity }) => {
        const activityTypeObj = (item as any).activity_type;
        const activityTypeInfo = getActivityTypeInfo(item.type, activityTypeObj);
        const status = typeof item.status === 'string' ? item.status : (item.status as any)?.name || 'pending';
        const statusInfo = getStatusInfo(status);

        const navigateToEquipmentList = () => {
            navigation.navigate("ActivityEquipmentListScreen", {
                activityId: item.id,
                activityName: item.name || `Atividade ${item.id}`,
                clientId: (item.client as any)?.id,
                clientName: (item.client as any)?.name,
            });
        };

        return (
            <TouchableOpacity
                style={[styles.activityCard, {
                    marginBottom: r.spacing(1),
                    minHeight: r.verticalScale(120)
                }]}
                onPress={navigateToEquipmentList}
                activeOpacity={0.7}
            >
                <View style={[styles.cardHeader, { padding: r.spacing(1.25) }]}>
                    <View style={styles.activityTypeContainer}>
                        <View style={[styles.typeIcon, { backgroundColor: activityTypeInfo.color + '20' }]}>
                            <MaterialIcons
                                name={activityTypeInfo.icon as any}
                                size={r.scale(20)}
                                color={activityTypeInfo.color}
                            />
                        </View>
                        <View style={styles.typeInfo}>
                            <ResponsiveText
                                variant="body"
                                weight="600"
                                style={[styles.activityTypeText, { color: activityTypeInfo.color }]}
                                numberOfLines={1}
                            >
                                {activityTypeInfo.label}
                            </ResponsiveText>
                            <ResponsiveText
                                variant="caption"
                                style={styles.activityId}
                                numberOfLines={1}
                            >
                                #{item.id}
                            </ResponsiveText>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                        <Ionicons name={statusInfo.icon as any} size={r.scale(16)} color={statusInfo.color} />
                        <ResponsiveText
                            variant="caption"
                            weight="600"
                            style={[styles.statusText, { color: statusInfo.color }]}
                            numberOfLines={1}
                        >
                            {statusInfo.translation}
                        </ResponsiveText>
                    </View>
                </View>

                <View style={[styles.cardContent, { padding: r.spacing(1.25), flex: 1 }]}>
                    <ResponsiveText
                        variant="subtitle"
                        weight="bold"
                        style={styles.activityTitle}
                        numberOfLines={2}
                    >
                        {item.name || `Atividade ${item.id}`}
                    </ResponsiveText>

                    <View style={styles.infoGrid}>
                        {item.client && (
                            <View style={styles.infoRow}>
                                <MaterialIcons name="business" size={r.scale(16)} color="#666" />
                                <ResponsiveText
                                    variant="body"
                                    style={styles.infoText}
                                    numberOfLines={1}
                                >
                                    {item.client.name}
                                </ResponsiveText>
                            </View>
                        )}

                        <View style={styles.datesContainer}>
                            {item.start_date && (
                                <View style={styles.dateRow}>
                                    <MaterialIcons name="play-circle-outline" size={r.scale(14)} color="#666" />
                                    <ResponsiveText variant="caption" style={styles.dateText}>
                                        {formatDate(item.start_date)}
                                    </ResponsiveText>
                                </View>
                            )}
                            {item.end_date && (
                                <View style={styles.dateRow}>
                                    <Ionicons name="stop-circle" size={r.scale(14)} color="#666" />
                                    <ResponsiveText variant="caption" style={styles.dateText}>
                                        {formatDate(item.end_date)}
                                    </ResponsiveText>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <View style={[styles.cardFooter, { padding: r.spacing(1.25) }]}>
                    <TouchableOpacity style={styles.detailsButton} onPress={navigateToEquipmentList}>
                        <ResponsiveText variant="body" weight="600" style={styles.detailsButtonText}>
                            Iniciar Atividade
                        </ResponsiveText>
                        <MaterialIcons name="arrow-forward" size={r.scale(18)} color="#007bff" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ResponsiveContainer withPadding={false} style={styles.container}>
            <View style={[
                styles.header,
                {
                    paddingTop: r.verticalScale(50),
                    paddingBottom: r.verticalScale(20),
                    paddingHorizontal: r.spacing(1.25),
                }
            ]}>
                <TouchableOpacity
                    style={[
                        styles.backButton,
                        {
                            width: r.scale(40),
                            height: r.scale(40),
                            borderRadius: r.scale(20),
                            marginRight: r.spacing(1),
                        }
                    ]}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={r.scale(24)} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <ResponsiveText variant="title" weight="bold" style={styles.headerTitle}>
                        Atividades
                    </ResponsiveText>
                    <ResponsiveText variant="caption" style={styles.headerSubtitle}>
                        Listagem de atividades
                    </ResponsiveText>
                </View>
                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        {
                            width: r.scale(40),
                            height: r.scale(40),
                            borderRadius: r.scale(20),
                        }
                    ]}
                    onPress={() => setShowFiltersModal(true)}
                >
                    <MaterialIcons name="filter-list" size={r.scale(24)} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={[styles.activitiesSection, { paddingHorizontal: r.spacing(1) }]}>
                    <View style={styles.sectionHeader}>
                        <ResponsiveText variant="subtitle" weight="bold" style={styles.sectionTitle}>
                            Atividades ({activities.length})
                        </ResponsiveText>
                        <TouchableOpacity
                            style={[styles.filterButtonSmall, {
                                paddingHorizontal: r.spacing(0.75),
                                paddingVertical: r.spacing(0.5),
                                minHeight: r.scale(32),
                                borderRadius: r.scale(6),
                            }]}
                            onPress={() => setShowFiltersModal(true)}
                        >
                            <MaterialIcons name="filter-list" size={r.scale(16)} color="#007bff" />
                        </TouchableOpacity>
                    </View>

                    {loading && !refreshing ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#007bff" />
                            <ResponsiveText variant="body" style={styles.loadingText}>
                                Carregando...
                            </ResponsiveText>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <MaterialIcons name="error-outline" size={r.scale(48)} color="#dc3545" />
                            <ResponsiveText variant="body" style={styles.errorText}>
                                {error}
                            </ResponsiveText>
                            <TouchableOpacity style={styles.retryButton} onPress={fetchActivities}>
                                <ResponsiveText variant="button" weight="600" style={styles.retryButtonText}>
                                    Tentar Novamente
                                </ResponsiveText>
                            </TouchableOpacity>
                        </View>
                    ) : activities.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="assignment" size={r.scale(64)} color="#ccc" />
                            <ResponsiveText variant="body" weight="600" style={styles.emptyText}>
                                Nenhuma atividade encontrada
                            </ResponsiveText>
                            <ResponsiveText variant="caption" style={styles.emptySubtext}>
                                Tente ajustar os filtros
                            </ResponsiveText>
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

                {totalPages > 1 && (
                    <View style={[styles.paginationContainer, { padding: r.spacing(1.5), marginHorizontal: r.spacing(1) }]}>
                        <TouchableOpacity
                            style={[
                                styles.paginationButton,
                                currentPage === 1 && styles.paginationButtonDisabled,
                                { minHeight: r.scale(44) }
                            ]}
                            onPress={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            <Ionicons name="chevron-back" size={r.scale(20)} color={currentPage === 1 ? "#ccc" : "#007bff"} />
                            <ResponsiveText
                                variant="body"
                                weight="600"
                                style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}
                            >
                                Anterior
                            </ResponsiveText>
                        </TouchableOpacity>

                        <View style={[styles.pageInfo, { flex: 1, marginHorizontal: r.spacing(1) }]}>
                            <ResponsiveText variant="body" weight="600" style={styles.pageText}>
                                {currentPage} de {totalPages}
                            </ResponsiveText>
                            <ResponsiveText variant="caption" style={styles.pageSubtext}>
                                Página atual
                            </ResponsiveText>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.paginationButton,
                                currentPage === totalPages && styles.paginationButtonDisabled,
                                { minHeight: r.scale(44) }
                            ]}
                            onPress={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
                            disabled={currentPage === totalPages}
                        >
                            <ResponsiveText
                                variant="body"
                                weight="600"
                                style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}
                            >
                                Próxima
                            </ResponsiveText>
                            <Ionicons name="chevron-forward" size={r.scale(20)} color={currentPage === totalPages ? "#ccc" : "#007bff"} />
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Modal Centralizado */}
            <Modal
                visible={showFiltersModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowFiltersModal(false)}
            >
                <View style={styles.centeredModalOverlay}>
                    <TouchableOpacity
                        style={styles.centeredModalOverlayTouchable}
                        activeOpacity={1}
                        onPress={() => setShowFiltersModal(false)}
                    />
                    <View style={[styles.centeredModalContent, {
                        maxWidth: r.width > 768 ? r.scale(500) : r.width * 0.95,
                        maxHeight: r.height * 0.85
                    }]}>
                        {/* Botão Nova Atividade */}
                        <View style={[styles.newActivitySection, { padding: r.spacing(1.5) }]}>
                            <TouchableOpacity
                                style={styles.newActivityButton}
                                onPress={() => {
                                    setShowFiltersModal(false);
                                    navigation.navigate("NewActivityModal");
                                }}
                            >
                                <View style={styles.newActivityButtonContent}>
                                    <View style={styles.newActivityIcon}>
                                        <MaterialIcons name="add" size={r.scale(24)} color="#fff" />
                                    </View>
                                    <View style={styles.newActivityTextContent}>
                                        <ResponsiveText variant="subtitle" weight="bold" style={styles.newActivityTitle}>
                                            Nova Atividade
                                        </ResponsiveText>
                                        <ResponsiveText variant="caption" style={styles.newActivitySubtitle}>
                                            Criar uma nova atividade do zero
                                        </ResponsiveText>
                                    </View>
                                    <MaterialIcons name="arrow-forward" size={r.scale(20)} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Divisor */}
                        <View style={styles.modalDivider} />

                        {/* Header dos Filtros */}
                        <View style={[styles.modalHeader, { padding: r.spacing(1.5) }]}>
                            <View style={styles.modalHeaderContent}>
                                <ResponsiveText variant="subtitle" weight="bold" style={styles.modalTitle}>
                                    Filtros
                                </ResponsiveText>
                                <ResponsiveText variant="caption" style={styles.modalSubtitle}>
                                    Refine sua busca de atividades
                                </ResponsiveText>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowFiltersModal(false)}
                            >
                                <Ionicons name="close" size={r.scale(24)} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <ActivityFilters
                                onFilter={(newFilters) => {
                                    handleFilter(newFilters);
                                    setShowFiltersModal(false);
                                }}
                                resetKey={filterKey}
                                showFilterButton={false}
                            />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
        justifyContent: "space-between",
    },
    backButton: {
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    filterButton: {
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
    activitiesSection: {
        marginTop: 0,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        color: "#333",
    },
    filterButtonSmall: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
        gap: 4,
    },
    filterButtonText: {
        color: "#007bff",
        flex: 1,
        fontSize: 14,
        lineHeight: 16,
    },
    loadingContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 16,
        color: "#666",
    },
    errorContainer: {
        alignItems: "center",
        paddingVertical: 40,
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
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 16,
        color: "#666",
    },
    emptySubtext: {
        marginTop: 8,
        color: "#999",
        textAlign: "center",
    },
    activityCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
        overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
        backgroundColor: "#fafbfc",
    },
    activityTypeContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    typeIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    typeInfo: {
        flex: 1,
    },
    activityTypeText: {
        color: "#333",
    },
    activityId: {
        color: "#666",
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        color: "#333",
        marginLeft: 4,
    },
    cardContent: {
        paddingTop: 16,
    },
    activityTitle: {
        color: "#333",
        marginBottom: 12,
        lineHeight: 24,
    },
    infoGrid: {
        gap: 8,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    infoText: {
        color: "#333",
        flex: 1,
        marginLeft: 8,
    },
    datesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 4,
    },
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    dateText: {
        color: "#666",
        marginLeft: 4,
        fontSize: 12,
    },
    overdueBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ffebee",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: "flex-start",
        marginTop: 12,
    },
    overdueText: {
        color: "#dc3545",
        marginLeft: 6,
    },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        backgroundColor: "#fafbfc",
    },
    detailsButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
    },
    detailsButtonText: {
        color: "#007bff",
        marginRight: 6,
    },
    paginationContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    paginationButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#f8f9fa",
        minWidth: 100,
        justifyContent: "center",
    },
    paginationButtonDisabled: {
        backgroundColor: "#f5f5f5",
    },
    paginationButtonText: {
        color: "#007bff",
        marginHorizontal: 4,
    },
    paginationButtonTextDisabled: {
        color: "#ccc",
    },
    pageInfo: {
        alignItems: "center",
    },
    pageText: {
        color: "#333",
        textAlign: "center",
    },
    pageSubtext: {
        color: "#666",
        fontSize: 10,
        marginTop: 2,
        textAlign: "center",
    },
    centeredModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    centeredModalOverlayTouchable: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    centeredModalContent: {
        backgroundColor: "#fff",
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
        overflow: "hidden",
    },
    newActivitySection: {
        backgroundColor: "#667eea",
    },
    newActivityButton: {
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
    newActivityButtonContent: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        gap: 12,
    },
    newActivityIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    newActivityTextContent: {
        flex: 1,
    },
    newActivityTitle: {
        color: "#fff",
        marginBottom: 2,
    },
    newActivitySubtitle: {
        color: "rgba(255,255,255,0.8)",
    },
    modalDivider: {
        height: 1,
        backgroundColor: "#e9ecef",
    },
    filtersModal: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    modalHeaderContent: {
        flex: 1,
    },
    modalTitle: {
        color: "#333",
        marginBottom: 4,
    },
    modalSubtitle: {
        color: "#666",
    },
    modalCloseButton: {
        padding: 8,
        marginLeft: 16,
    },
    modalBody: {
        padding: 20,
    },
});

export default ActivityListScreen;

