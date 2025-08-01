import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, Button } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import NewServiceOrderModal from "../../Components/NewServiceOrderModal";
import ServiceOrderService from "../../Services/ServiceOrderService";
import apiClient from "../../Context/ApiClient";
import { usePermissions } from "../../Context/PermissionsContext";
import { API_BASE_URL } from "../../config/apiConfig";
import { ServiceOrder } from "../../Models/ServiceOrder";
import ServiceOrderFilters from "../../Components/ServiceOrderFilters";
import { useLanguage } from "../../Context/LanguageContext";

interface ListOrderServiceScreenProps {
    route: RouteProp<RootStackParamList, "ListOrderServiceScreen">;
    navigation: DrawerNavigationProp<RootStackParamList, "ListOrderServiceScreen">;
}

const ListOrderServiceScreen: React.FC<ListOrderServiceScreenProps> = ({ route, navigation }) => {
    const { t } = useLanguage();
    const { equipmentId } = route.params || { equipmentId: null };
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const { hasPermission, permissions } = usePermissions();
    const [filters, setFilters] = useState({
        search: '',
        equipmentType: '',
        brand: '',
        status: 'open',  // Padrão "open"
    });
    const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [perPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    if (permissions.length === 0 && loading) {
        return <View style={styles.container}><Text style={styles.emptyText}>{t('serviceOrder.loading')}</Text></View>;
    }

    if (!hasPermission("list_activities")) {
        return <View style={styles.container}><Text style={styles.errorText}>{t('serviceOrder.noPermission')}</Text></View>;
    }

    const statusTranslations: { [key: string]: string } = {
        open: t('technicalAssistance.open'),
        pending: t('technicalAssistance.pending'),
        closed: t('technicalAssistance.closed'),
    };

    const fetchOrderServices = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) {
                setError(t('serviceOrder.tokenError'));
                throw new Error(t('serviceOrder.tokenError'));
            }

            if (equipmentTypes.length === 0 || brands.length === 0) {
                const [equipmentTypesRes, brandsRes] = await Promise.all([
                    apiClient.get(`${API_BASE_URL}/equipment_types`, { headers: { Authorization: `Bearer ${token}` } }),
                    apiClient.get(`${API_BASE_URL}/brands`, { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                setEquipmentTypes(equipmentTypesRes.data.results || []);
                setBrands(brandsRes.data.results || []);
            }

            const response = await ServiceOrderService.fetchServiceOrders({ token, filters, page });
            setOrders(response.results || []);
            setTotalPages(Math.ceil(response.count / perPage) || 1);
        } catch (error: any) {
            console.error("Erro:", error.message);
            setError(error.message || t('serviceOrder.unknownError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderServices();
    }, [equipmentId, page, filters]);

    const renderOrder = ({ item }: { item: ServiceOrder }) => (
        <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("ViewOrderActivityScreen", { serviceOrderId: item.id, equipmentId: item.equipment.id })}
        >
            <Text style={styles.cell}>{item.client?.name || t('serviceOrder.nameNotAvailable')}</Text>
            <Text style={styles.cell}>{item.client?.email || t('serviceOrder.emailNotAvailable')}</Text>
            <Text style={styles.cell}>{item.equipment?.tag || t('serviceOrder.tagNotAvailable')}</Text>
            <Text style={styles.cell}>{item.equipment?.equipmentType?.name || t('serviceOrder.typeNotAvailable')}</Text>
            <Text style={styles.cell}>{item.equipment?.brand?.name || t('serviceOrder.brandNotAvailable')}</Text>
            <Text style={styles.cell}>{statusTranslations[item.status] || item.status}</Text>
            <Text style={styles.cell}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </TouchableOpacity>
    );

    const handleFilter = (newFilters: any) => {
        setFilters(newFilters);
        setPage(1);  // Resetar página ao filtrar
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.newOrderButton} onPress={() => setModalVisible(true)}>
                <Text style={styles.newOrderButtonText}>Nova Ordem de Serviço</Text>
            </TouchableOpacity>
            <NewServiceOrderModal visible={modalVisible} onClose={() => setModalVisible(false)} navigation={navigation} />
            <ServiceOrderFilters onFilter={handleFilter} />
            {loading ? (
                <ActivityIndicator size="large" color="#007BFF" />
            ) : (
                <>
                    <FlatList
                        data={orders}
                        renderItem={renderOrder}
                        keyExtractor={(item) => item.id.toString()}
                        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma ordem de serviço encontrada.</Text>}
                    />
                    <View style={styles.pagination}>
                        <Button title="Anterior" onPress={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page === 1} />
                        <Text style={styles.pageText}>Página {page} de {totalPages}</Text>
                        <Button title="Próximo" onPress={() => setPage((prev) => (page < totalPages ? prev + 1 : prev))} disabled={page === totalPages} />
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 16 },
    newOrderButton: { backgroundColor: "#007BFF", padding: 10, borderRadius: 5, marginBottom: 10, alignItems: "center" },
    newOrderButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
    row: { flexDirection: "row", justifyContent: "space-between", padding: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#ccc" },
    cell: { flex: 1, textAlign: "center" },
    pagination: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20 },
    pageText: { fontSize: 16, fontWeight: "bold", color: "#007BFF", marginHorizontal: 10 },
    emptyText: { color: "#007BFF", textAlign: "center", fontSize: 18, marginTop: 20 },
    errorText: { color: "red", textAlign: "center", marginTop: 20 },
});

export default ListOrderServiceScreen;