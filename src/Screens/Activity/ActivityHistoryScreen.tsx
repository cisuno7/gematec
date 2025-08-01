import React, { useEffect, useState } from "react";
import { Picker } from "@react-native-picker/picker";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Button,
    TouchableOpacity,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import ActivityService from "../../Services/ActivityService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePermissions } from "../../Context/PermissionsContext";

interface ActivityHistoryScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "ActivityHistoryScreen">;
    route: RouteProp<RootStackParamList, "ActivityHistoryScreen">;
}

const STATUS_OPTIONS = [
    { label: "Todos", value: "all" },
    { label: "Aberto", value: "open" },
    { label: "Pendente", value: "pending" },
    { label: "Fechado", value: "closed" },
];

const ActivityHistoryScreen: React.FC<ActivityHistoryScreenProps> = ({ route, navigation }) => {
    const { equipmentId, activityTypeSlug, status } = route.params || {};
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string>(activityTypeSlug || "pmoc");
    const [selectedStatus, setSelectedStatus] = useState<string[]>(status || ["open", "pending"]);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const { hasPermission } = usePermissions();
    const activityService = new ActivityService();

    // Permissões
    const canViewPmoc = hasPermission("list_activites");
    const canViewServiceOrder = hasPermission("list_activities");
    const canViewTechnicalAssistance = hasPermission("list_activities");

    if (!canViewPmoc && !canViewServiceOrder && !canViewTechnicalAssistance) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Você não tem permissão para visualizar atividades.</Text>
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

            if (equipmentId) {
                // Histórico de atividades de um equipamento específico
                const params = {
                    page: currentPage,
                    per_page: perPage,
                    activity_type: selectedType !== "all" ? selectedType : undefined,
                    token: token,
                };
                const response = await activityService.fetchActivities(equipmentId, params);
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
                const response = await ActivityService.fetchAllActivities(params);
                setActivities(response.results || []);
                setTotalPages(Math.ceil(response.count / perPage) || 1);
            }
        } catch (error: any) {
            const errorMessage = error.response?.status === 500
                ? "Erro interno no servidor ao buscar atividades. Tente novamente ou contate o suporte."
                : error.message || "Falha ao buscar atividades.";
            setError(errorMessage);
            setActivities([]);
        } finally {
            setLoading(false);
        }
    };

    const statusTranslations: { [key: string]: string } = {
        open: "Aberto",
        closed: "Fechado",
        pending: "Pendente",
    };

    const statusColors: { [key: string]: string } = {
        open: "blue",
        closed: "green",
        pending: "orange",
    };

    const renderActivityItem = ({ item }: { item: any }) => {
        const isPmoc = item.type === "pmoc" && canViewPmoc;
        const isServiceOrder = item.type === "service_order" && canViewServiceOrder;
        const isTechnicalAssistance = item.type === "technical_assistance" && canViewTechnicalAssistance;
        const isInstalation = item.type === "instalation"; // Novo tipo

        if (!isPmoc && !isServiceOrder && !isTechnicalAssistance && !isInstalation) {
            return null;
        }

        const navigateToDetails = () => {
            if (isPmoc) {
                navigation.navigate("PmocDetailsScreen", { pmocId: item.id });
            } else if (isServiceOrder) {
                navigation.navigate("ViewOrderActivityScreen", {
                    serviceOrderId: item.id,
                    equipmentId: item.equipment?.id || equipmentId,
                });
            } else if (isTechnicalAssistance) {
                navigation.navigate("TechnicalAssistanceDetails", { id: item.id });
            } else if (isInstalation) {
                // Adapte para tela de instalação se necessário
            }
        };

        return (
            <TouchableOpacity style={styles.tableRow} onPress={navigateToDetails}>
                <Text style={styles.cellText}>{item.client?.name || "N/A"}</Text>
                <Text style={styles.cellText}>{new Date(item.created_at).toLocaleDateString()}</Text>
                <Text style={[styles.cellText, { color: statusColors[item.status] || "black" }]}>
                    {statusTranslations[item.status] || item.status}
                </Text>
                <Text style={styles.cellText}>{item.deadline || "N/A"}</Text>
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

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{equipmentId ? "Histórico de Atividades do Equipamento" : "Atividades"}</Text>

            {/* Filtro de Tipo de Atividade */}
            <Picker
                selectedValue={selectedType}
                onValueChange={(itemValue) => {
                    setSelectedType(itemValue);
                    setCurrentPage(1);
                }}
                style={styles.picker}
            >
                <Picker.Item label="Todos" value="all" />
                <Picker.Item label="PMOC" value="pmoc" />
                <Picker.Item label="Ordem de Serviço" value="service_order" />
                <Picker.Item label="Assistência Técnica" value="technical_assistance" />
                <Picker.Item label="Instalação" value="instalation" />
            </Picker>

            {/* Filtro de Status */}
            <View style={styles.statusFilterContainer}>
                {STATUS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[
                            styles.statusOption,
                            selectedStatus.includes(opt.value) && styles.statusOptionSelected,
                        ]}
                        onPress={() => handleStatusChange(opt.value)}
                    >
                        <Text
                            style={[
                                styles.statusOptionText,
                                selectedStatus.includes(opt.value) && styles.statusOptionTextSelected,
                            ]}
                        >
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#007BFF" />
            ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : (
                <FlatList
                    data={activities}
                    keyExtractor={(item) => `${item.id}`}
                    renderItem={renderActivityItem}
                    ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma atividade encontrada.</Text>}
                />
            )}

            {/* Paginação */}
            <View style={styles.paginationContainer}>
                <Button
                    title="Anterior"
                    onPress={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                />
                <Text style={styles.pageText}>Página {currentPage} de {totalPages}</Text>
                <Button
                    title="Próxima"
                    onPress={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
                    disabled={currentPage === totalPages}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f5f5f5",
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15,
        textAlign: "center",
    },
    picker: {
        marginBottom: 10,
    },
    statusFilterContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 10,
        flexWrap: "wrap",
    },
    statusOption: {
        borderWidth: 1,
        borderColor: "#007BFF",
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginHorizontal: 4,
        marginBottom: 4,
    },
    statusOptionSelected: {
        backgroundColor: "#007BFF",
    },
    statusOptionText: {
        color: "#007BFF",
    },
    statusOptionTextSelected: {
        color: "#fff",
    },
    tableRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: "#ccc",
    },
    cellText: {
        flex: 1,
        fontSize: 14,
        color: "#333",
        textAlign: "center",
    },
    errorText: {
        color: "#dc3545",
        textAlign: "center",
        marginVertical: 20,
    },
    emptyText: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        marginVertical: 20,
    },
    paginationContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 16,
        paddingHorizontal: 16,
    },
    pageText: {
        fontSize: 14,
        color: "#333",
    },
});

export default ActivityHistoryScreen;