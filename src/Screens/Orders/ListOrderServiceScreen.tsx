import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ActivityIndicator,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    Dimensions,
    Alert,
    TextInput,
} from "react-native";
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import ServiceOrderService from "../../Services/ServiceOrderService";
import apiClient from "../../Context/ApiClient";
import { usePermissions } from "../../Context/PermissionsContext";
import { buildApiUrlForAccount } from "../../config/apiConfig";
import { ServiceOrder } from "../../Models/ServiceOrder";
import { useLanguage } from "../../Context/LanguageContext";

const { width } = Dimensions.get('window');

interface ListOrderServiceScreenProps {
    route: RouteProp<RootStackParamList, "ListOrderServiceScreen">;
    navigation: DrawerNavigationProp<RootStackParamList, "ListOrderServiceScreen">;
}

const ListOrderServiceScreen: React.FC<ListOrderServiceScreenProps> = ({ route, navigation }) => {
    const { t } = useLanguage();
    const { equipmentId } = route.params || { equipmentId: null };
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState({
        search: '',
        equipmentType: '',
        brand: '',
        status: 'open',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [perPage] = useState(10);

    const fetchOrderServices = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const token = await AsyncStorage.getItem("access_token");
            if (!token) {
                setError("Token de acesso não encontrado");
                throw new Error("Token de acesso não encontrado");
            }

            if (equipmentTypes.length === 0 || brands.length === 0) {
                const apiUrl = await buildApiUrlForAccount();
                const [equipmentTypesRes, brandsRes] = await Promise.all([
                    apiClient.get(`${apiUrl}/equipment_types`, { headers: { Authorization: `Bearer ${token}` } }),
                    apiClient.get(`${apiUrl}/brands`, { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                setEquipmentTypes(equipmentTypesRes.data.results || []);
                setBrands(brandsRes.data.results || []);
            }

            const response = await ServiceOrderService.fetchServiceOrders({ token, filters, page });
            setOrders(response.results || []);
            setTotal(response.count || 0);
            setTotalPages(Math.ceil((response.count || 0) / perPage) || 1);
        } catch (error: any) {
            console.error("Erro:", error.message);
            setError(error.message || "Erro desconhecido");
            Alert.alert("Erro", "Falha ao carregar ordens de serviço");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOrderServices();
    }, [equipmentId, page, filters]);

    const onRefresh = () => {
        fetchOrderServices(true);
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'open':
                return { color: '#ff6b35', icon: 'alert-circle', label: 'Aberto' };
            case 'pending':
                return { color: '#f39c12', icon: 'time', label: 'Pendente' };
            case 'closed':
                return { color: '#27ae60', icon: 'checkmark-circle', label: 'Fechado' };
            default:
                return { color: '#95a5a6', icon: 'help-circle', label: 'Desconhecido' };
        }
    };

    const renderStatusBadge = (status: string) => {
        const statusInfo = getStatusInfo(status);
        return (
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                <Ionicons name={statusInfo.icon as any} size={12} color="#fff" />
                <Text style={styles.statusText}>{statusInfo.label}</Text>
            </View>
        );
    };

    const renderOrderCard = ({ item }: { item: ServiceOrder }) => {
        const createdDate = new Date(item.created_at).toLocaleDateString('pt-BR');

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("ViewOrderActivityScreen", {
                    serviceOrderId: item.id,
                    equipmentId: item.equipment.id
                })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                        <MaterialIcons name="assignment" size={20} color="#007BFF" />
                        <Text style={styles.cardTitle}>OS #{item.id}</Text>
                    </View>
                    {renderStatusBadge(item.status)}
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.infoRow}>
                        <Ionicons name="business" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {item.client?.name || "Cliente não informado"}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="mail" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {item.client?.email || "Email não informado"}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="qr-code" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            Tag: {item.equipment?.tag || "N/A"}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="construct" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {item.equipment?.equipmentType?.name || "Tipo não informado"}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="business" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {item.equipment?.brand?.name || "Fabricante não informado"}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="calendar" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            Criado em: {createdDate}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate("ViewOrderActivityScreen", {
                            serviceOrderId: item.id,
                            equipmentId: item.equipment.id
                        })}
                    >
                        <Ionicons name="eye" size={16} color="#007BFF" />
                        <Text style={styles.actionButtonText}>Ver Detalhes</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const renderFilterChip = (label: string, value: string, onPress: () => void, isSelected: boolean) => (
        <TouchableOpacity
            style={[styles.filterChip, isSelected && styles.filterChipSelected]}
            onPress={onPress}
        >
            <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const renderFilters = () => (
        <View style={styles.filtersSection}>
            <View style={styles.filtersHeader}>
                <Text style={styles.filtersTitle}>Filtros</Text>
                <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
                    <Ionicons
                        name={showFilters ? "chevron-up" : "chevron-down"}
                        size={24}
                        color="#007BFF"
                    />
                </TouchableOpacity>
            </View>

            {showFilters && (
                <View style={styles.filtersContent}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar por cliente, tag, tipo..."
                            value={filters.search}
                            onChangeText={(text) => setFilters({ ...filters, search: text })}
                        />
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters}>
                        {renderFilterChip('Todos', '', () => setFilters({ ...filters, status: '' }), !filters.status)}
                        {renderFilterChip('Aberto', 'open', () => setFilters({ ...filters, status: 'open' }), filters.status === 'open')}
                        {renderFilterChip('Pendente', 'pending', () => setFilters({ ...filters, status: 'pending' }), filters.status === 'pending')}
                        {renderFilterChip('Fechado', 'closed', () => setFilters({ ...filters, status: 'closed' }), filters.status === 'closed')}
                    </ScrollView>
                </View>
            )}
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="assignment" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>Nenhuma ordem de serviço encontrada</Text>
            <Text style={styles.emptySubtitle}>
                {filters.search || filters.status ?
                    'Tente ajustar os filtros de busca' :
                    'Não há ordens de serviço registradas no momento'
                }
            </Text>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerContent}>
                <View>
                    <Text style={styles.headerTitle}>{t('serviceOrder.title')}</Text>
                    <Text style={styles.headerSubtitle}>
                        {total} {t('serviceOrder.order')}{total !== 1 ? 's' : ''} {t('common.found')}
                    </Text>
                </View>
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                    <Ionicons name="refresh" size={24} color="#007BFF" />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (!hasPermission("list_activities")) {
        return (
            <View style={styles.errorContainer}>
                <MaterialIcons name="block" size={80} color="#e74c3c" />
                <Text style={styles.errorTitle}>{t('permissions.accessDenied')}</Text>
                <Text style={styles.errorSubtitle}>
                    {t('serviceOrder.noPermission')}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {renderHeader()}
            {renderFilters()}

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007BFF" />
                    <Text style={styles.loadingText}>{t('serviceOrder.loading')}</Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderOrderCard}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#007BFF']}
                            tintColor="#007BFF"
                        />
                    }
                    ListEmptyComponent={renderEmptyState()}
                    ListFooterComponent={
                        orders.length > 0 ? (
                            <View style={styles.pagination}>
                                <TouchableOpacity
                                    style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
                                    onPress={() => setPage(Math.max(page - 1, 1))}
                                    disabled={page === 1}
                                >
                                    <Ionicons name="chevron-back" size={20} color={page === 1 ? "#ccc" : "#007BFF"} />
                                    <Text style={[styles.paginationButtonText, page === 1 && styles.paginationButtonTextDisabled]}>
                                        {t('common.previous')}
                                    </Text>
                                </TouchableOpacity>

                                <Text style={styles.paginationInfo}>
                                    {t('common.page')} {page} {t('common.of')} {totalPages}
                                </Text>

                                <TouchableOpacity
                                    style={[styles.paginationButton, page === totalPages && styles.paginationButtonDisabled]}
                                    onPress={() => setPage(Math.min(page + 1, totalPages))}
                                    disabled={page === totalPages}
                                >
                                    <Text style={[styles.paginationButtonText, page === totalPages && styles.paginationButtonTextDisabled]}>
                                        {t('common.next')}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color={page === totalPages ? "#ccc" : "#007BFF"} />
                                </TouchableOpacity>
                            </View>
                        ) : null
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#7f8c8d',
    },
    refreshButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
    },
    filtersSection: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    filtersHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    filtersTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2c3e50',
    },
    filtersContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: '#2c3e50',
    },
    statusFilters: {
        marginBottom: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    filterChipSelected: {
        backgroundColor: '#007BFF',
        borderColor: '#007BFF',
    },
    filterChipText: {
        fontSize: 14,
        color: '#6c757d',
        fontWeight: '500',
    },
    filterChipTextSelected: {
        color: '#fff',
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    cardTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginLeft: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    cardContent: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#2c3e50',
        marginLeft: 12,
        flex: 1,
    },
    cardFooter: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#f1f3f4',
        paddingTop: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007BFF',
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6c757d',
        marginTop: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#6c757d',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#adb5bd',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 40,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#e74c3c',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginTop: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    paginationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    paginationButtonDisabled: {
        backgroundColor: '#f8f9fa',
        borderColor: '#e9ecef',
    },
    paginationButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007BFF',
        marginHorizontal: 4,
    },
    paginationButtonTextDisabled: {
        color: '#adb5bd',
    },
    paginationInfo: {
        fontSize: 14,
        color: '#6c757d',
        fontWeight: '500',
    },
});

export default ListOrderServiceScreen;