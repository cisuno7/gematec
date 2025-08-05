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
    TextInput,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import ActivityService from "../../Services/ActivityService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../Context/LanguageContext";

const { width } = Dimensions.get('window');

interface ActivityEquipmentListScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "ActivityEquipmentListScreen">;
    route: RouteProp<RootStackParamList, "ActivityEquipmentListScreen">;
}

const ActivityEquipmentListScreen: React.FC<ActivityEquipmentListScreenProps> = ({ route, navigation }) => {
    const { t } = useLanguage();

    const STATUS_OPTIONS = [
        { label: t('activityEquipmentList.all'), value: "all", icon: "list" },
        { label: t('activityEquipmentList.created'), value: "created", icon: "add-circle" },
        { label: t('activityEquipmentList.inProgress'), value: "in_progress", icon: "play-circle" },
        { label: t('activityEquipmentList.completed'), value: "completed", icon: "checkmark-circle" },
    ];
    const { activityId, activityName, clientId, clientName } = route.params;
    const [equipments, setEquipments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [showOnlyStarted, setShowOnlyStarted] = useState<boolean>(false);
    const [sectors, setSectors] = useState<any[]>([]);
    const [selectedSector, setSelectedSector] = useState<string>("all");
    const [subsectors, setSubsectors] = useState<any[]>([]);
    const [selectedSubsector, setSelectedSubsector] = useState<string>("all");

    useEffect(() => {
        fetchEquipments();
        fetchSectors();
    }, [selectedStatus, showOnlyStarted, selectedSector, selectedSubsector]);

    const fetchEquipments = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            console.log('[ActivityEquipmentListScreen] Buscando equipamentos da atividade:', activityId);

            const response = await ActivityService.fetchActivityEquipments(activityId, { token });
            console.log('[ActivityEquipmentListScreen] Resposta recebida:', response);

            let filteredEquipments = response.results || response || [];

            // Aplicar filtros
            if (selectedStatus !== "all") {
                filteredEquipments = filteredEquipments.filter((eq: any) => eq.status === selectedStatus);
            }

            if (showOnlyStarted) {
                filteredEquipments = filteredEquipments.filter((eq: any) => eq.status !== "created");
            }

            if (selectedSector !== "all") {
                filteredEquipments = filteredEquipments.filter((eq: any) =>
                    eq.equipment?.sector?.id?.toString() === selectedSector
                );
            }

            if (selectedSubsector !== "all") {
                filteredEquipments = filteredEquipments.filter((eq: any) =>
                    eq.equipment?.subsector?.id?.toString() === selectedSubsector
                );
            }

            if (searchTerm) {
                filteredEquipments = filteredEquipments.filter((eq: any) =>
                    eq.equipment?.tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    eq.equipment?.manufacturer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    eq.equipment?.equipment_type?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            setEquipments(filteredEquipments);
        } catch (error: any) {
            console.error('[ActivityEquipmentListScreen] Erro ao buscar equipamentos:', error);
            setError("Falha ao buscar equipamentos da atividade.");
            setEquipments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSectors = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) return;

            // Buscar setores do cliente
            const response = await fetch(`${await import('../../config/apiConfig').then(m => m.buildApiUrlForAccount())}/clients/${clientId}/sectors`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setSectors(data.results || []);
        } catch (error) {
            console.error('[ActivityEquipmentListScreen] Erro ao buscar setores:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchEquipments();
        setRefreshing(false);
    };

    const statusTranslations: { [key: string]: string } = {
        created: t('activityEquipmentList.created'),
        in_progress: t('activityEquipmentList.inProgress'),
        completed: t('activityEquipmentList.completed'),
    };

    const statusColors: { [key: string]: string } = {
        created: "#6c757d",
        in_progress: "#007bff",
        completed: "#28a745",
    };

    const statusIcons: { [key: string]: string } = {
        created: "add-circle",
        in_progress: "play-circle",
        completed: "checkmark-circle",
    };

    const renderEquipmentCard = ({ item }: { item: any }) => {
        const equipment = item.equipment;
        const statusColor = statusColors[item.status] || "#6c757d";
        const statusIcon = statusIcons[item.status] || "help-circle";

        const navigateToDetails = () => {
            // Navegar para a tela de questionário da atividade
            navigation.navigate("ActivityQuestionnaireScreen", {
                activityId: activityId,
                activityEquipmentId: item.id,
                equipmentId: equipment.id,
                equipmentTag: equipment.tag,
                activityName: activityName,
            });
        };

        return (
            <TouchableOpacity style={styles.equipmentCard} onPress={navigateToDetails}>
                <View style={styles.cardHeader}>
                    <View style={styles.equipmentInfo}>
                        <MaterialIcons name="build" size={20} color="#007bff" />
                        <Text style={styles.equipmentTag}>{equipment.tag}</Text>
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
                            {equipment.manufacturer?.name || "N/A"}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialIcons name="location-on" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {equipment.sector?.name || "N/A"}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialIcons name="category" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {equipment.equipment_type?.name || "N/A"}
                        </Text>
                    </View>

                    {equipment.subsector && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="subdirectory-arrow-right" size={16} color="#666" />
                            <Text style={styles.infoText}>
                                {equipment.subsector.name}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardFooter}>
                    <TouchableOpacity style={styles.detailsButton} onPress={navigateToDetails}>
                        <Text style={styles.detailsButtonText}>
                            {item.status === "created" ? t('activityEquipmentList.startActivity') : t('activityEquipmentList.viewDetails')}
                        </Text>
                        <MaterialIcons name="arrow-forward" size={16} color="#007bff" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
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
                    <Text style={styles.headerTitle}>{activityName}</Text>
                    <Text style={styles.headerSubtitle}>{t('activityEquipmentList.title')}</Text>
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
                    <Text style={styles.sectionTitle}>{t('activityEquipmentList.filters')}</Text>

                    {/* Busca */}
                    <Text style={styles.filterLabel}>{t('activityEquipmentList.search')}</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('activityEquipmentList.searchPlaceholder')}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />

                    {/* Filtro de Status */}
                    <Text style={styles.filterLabel}>{t('activityEquipmentList.status')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                        {STATUS_OPTIONS.map((status) => (
                            renderFilterChip(
                                status,
                                selectedStatus === status.value,
                                () => setSelectedStatus(status.value)
                            )
                        ))}
                    </ScrollView>

                    {/* Filtro de Setor */}
                    {sectors.length > 0 && (
                        <>
                            <Text style={styles.filterLabel}>{t('activityEquipmentList.sector')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                                <TouchableOpacity
                                    style={[styles.filterChip, selectedSector === "all" && styles.filterChipSelected]}
                                    onPress={() => setSelectedSector("all")}
                                >
                                    <Text style={[styles.filterChipText, selectedSector === "all" && styles.filterChipTextSelected]}>
                                        {t('activityEquipmentList.all')}
                                    </Text>
                                </TouchableOpacity>
                                {sectors.map((sector) => (
                                    <TouchableOpacity
                                        key={sector.id}
                                        style={[styles.filterChip, selectedSector === sector.id.toString() && styles.filterChipSelected]}
                                        onPress={() => setSelectedSector(sector.id.toString())}
                                    >
                                        <Text style={[styles.filterChipText, selectedSector === sector.id.toString() && styles.filterChipTextSelected]}>
                                            {sector.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    )}

                    {/* Filtro de Apenas Iniciados */}
                    <TouchableOpacity
                        style={[styles.checkboxContainer, showOnlyStarted && styles.checkboxContainerSelected]}
                        onPress={() => setShowOnlyStarted(!showOnlyStarted)}
                    >
                        <MaterialIcons
                            name={showOnlyStarted ? "check-box" : "check-box-outline-blank"}
                            size={20}
                            color={showOnlyStarted ? "#007bff" : "#666"}
                        />
                        <Text style={[styles.checkboxText, showOnlyStarted && styles.checkboxTextSelected]}>
                            {t('activityEquipmentList.showOnlyStarted')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Lista de Equipamentos */}
                <View style={styles.equipmentsSection}>
                    <Text style={styles.sectionTitle}>
                        Equipamentos ({equipments.length})
                    </Text>

                    {loading && !refreshing ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#007bff" />
                            <Text style={styles.loadingText}>{t('activityEquipmentList.loading')}</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <MaterialIcons name="error-outline" size={48} color="#dc3545" />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity style={styles.retryButton} onPress={fetchEquipments}>
                                <Text style={styles.retryButtonText}>{t('activityEquipmentList.retry')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : equipments.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="build" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>{t('activityEquipmentList.noEquipmentsFound')}</Text>
                            <Text style={styles.emptySubtext}>
                                Tente ajustar os filtros ou verifique se há equipamentos vinculados
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={equipments}
                            keyExtractor={(item) => `${item.id}`}
                            renderItem={renderEquipmentCard}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
                        />
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
    searchInput: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: "#fff",
        marginBottom: 8,
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
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 16,
        paddingVertical: 8,
    },
    checkboxContainerSelected: {
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    checkboxText: {
        fontSize: 14,
        color: "#666",
        marginLeft: 8,
    },
    checkboxTextSelected: {
        color: "#007bff",
        fontWeight: "500",
    },
    equipmentsSection: {
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
    equipmentCard: {
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
    equipmentInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    equipmentTag: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
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
});

export default ActivityEquipmentListScreen; 