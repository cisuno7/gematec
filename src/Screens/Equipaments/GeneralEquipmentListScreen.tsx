import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Button,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import EquipmentService from "../../Services/EquipamentService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import { Equipment } from "../../Models/Equipament";
import { usePermissions } from "../../Context/PermissionsContext";
import EquipmentFilters from "../../Components/EquipamentFilters"; // Importa o componente

interface GeneralEquipmentListScreenProps {
    route: RouteProp<RootStackParamList, "GeneralEquipmentListScreen">;
    navigation: DrawerNavigationProp<RootStackParamList, "GeneralEquipmentListScreen">;
}

const GeneralEquipmentListScreen: React.FC<GeneralEquipmentListScreenProps> = ({
    route,
    navigation,
}) => {
    const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(false);
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState<any>({}); // Estado unificado para filtros

    // Verificar permissão
    if (!hasPermission("equipments.list_equipments")) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Você não tem permissão para visualizar equipamentos.</Text>
            </View>
        );
    }

    const fetchEquipments = async () => {
        // Não busca se os filtros principais não estiverem preenchidos
        if (!filters.client_id || !filters.sector_id) {
            setEquipmentList([]);
            setTotalPages(1);
            return;
        }

        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado.");

            const apiFilters = { ...filters, page, per_page: 10 };
            const response = await EquipmentService.fetchEquipments(token, apiFilters);
            setEquipmentList(response.results || []);
            setTotalPages(Math.ceil(response.count / 10) || 1);
        } catch (error: any) {
            Alert.alert("Erro", error.message || "Falha ao carregar os equipamentos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEquipments();
    }, [page, filters]);

    const handleFilterChange = (newFilters: any) => {
        setPage(1); // Reseta a página ao mudar os filtros
        setFilters(newFilters);
    };

    const renderEquipmentItem = ({ item }: { item: Equipment }) => (
        <View style={styles.itemContainer}>
            <View style={styles.equipmentInfo}>
                <Text style={styles.itemText}>Tag: {item.tag || "N/A"}</Text>
                <Text style={styles.itemText}>Patrimônio: {item.patrimony || "N/A"}</Text>
                <Text style={styles.itemText}>Tipo: {item.equipment_type?.name || "N/A"}</Text>
                <Text style={styles.itemText}>Fabricante: {item.brand?.name || "N/A"}</Text>
            </View>

            <View style={styles.actionButtons}>
                {hasPermission("equipments.view_equipment") && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate("EquipmentDetailsScreen", { equipmentId: String(item.id) })}
                    >
                        <FontAwesome name="eye" size={16} color="#007BFF" />
                    </TouchableOpacity>
                )}
                {hasPermission("equipments.change_equipment") && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate("EditEquipmentScreen", { equipmentId: String(item.id) })}
                    >
                        <FontAwesome name="pencil" size={16} color="#ffc107" />
                    </TouchableOpacity>
                )}
                {hasPermission("equipments.delete_equipment") && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                            Alert.alert(
                                "Confirmar Remoção",
                                `Tem certeza que deseja remover o equipamento ${item.tag || ""}?`,
                                [
                                    { text: "Cancelar", style: "cancel" },
                                    {
                                        text: "Remover",
                                        onPress: async () => {
                                            const token = await AsyncStorage.getItem("access_token");
                                            if (token) {
                                                await EquipmentService.removeEquipment(token, item.id);
                                                fetchEquipments();
                                            }
                                        },
                                        style: "destructive",
                                    },
                                ]
                            );
                        }}
                    >
                        <FontAwesome name="trash" size={16} color="#dc3545" />
                    </TouchableOpacity>
                )}
                {hasPermission("activities.add_activity") && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate("ActivityHistoryScreen", { equipmentId: item.id })}
                    >
                        <FontAwesome name="wrench" size={16} color="#17a2b8" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <EquipmentFilters onFilter={handleFilterChange} />

            <View style={styles.headerSection}>
                <Text style={styles.headerText}>
                    Equipamentos Encontrados: {equipmentList.length}
                </Text>
                <TouchableOpacity
                    style={styles.qrButton}
                    onPress={() => navigation.navigate("EquipmentQRCodeScreen", {})}
                >
                    <FontAwesome name="qrcode" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#007BFF" />
            ) : equipmentList.length > 0 ? (
                <FlatList
                    data={equipmentList}
                    keyExtractor={(item) => `${item.id}`}
                    renderItem={renderEquipmentItem}
                />
            ) : (
                <Text style={styles.emptyText}>Utilize os filtros para buscar os equipamentos.</Text>
            )}

            {equipmentList.length > 0 && (
                <View style={styles.pagination}>
                    <Button
                        title="Anterior"
                        onPress={() => setPage((p) => Math.max(p - 1, 1))}
                        disabled={page === 1}
                    />
                    <Text style={styles.pageText}>Página {page} de {totalPages}</Text>
                    <Button
                        title="Próximo"
                        onPress={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                        disabled={page === totalPages}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f5f5f5",
    },
    headerSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        marginTop: 16,
    },
    headerText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    qrButton: {
        backgroundColor: "#007BFF",
        padding: 10,
        borderRadius: 5,
    },
    itemContainer: {
        backgroundColor: "#fff",
        padding: 16,
        marginBottom: 8,
        borderRadius: 8,
        elevation: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    equipmentInfo: {
        flex: 1,
    },
    itemText: {
        fontSize: 14,
        color: "#333",
        marginBottom: 4,
    },
    actionButtons: {
        flexDirection: "row",
        alignItems: "center",
    },
    actionButton: {
        padding: 8,
        marginLeft: 8,
    },
    emptyText: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        marginVertical: 20,
    },
    errorText: {
        fontSize: 16,
        color: "#FF0000",
        textAlign: "center",
        marginTop: 20,
    },
    pagination: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 16,
    },
    pageText: {
        fontSize: 14,
        color: "#333",
    },
});

export default GeneralEquipmentListScreen;