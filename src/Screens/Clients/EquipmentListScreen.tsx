import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    FlatList,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import { usePermissions } from "../../Context/PermissionsContext";
import { useLanguage } from "../../Context/LanguageContext";
import EquipmentFilters from "../../Components/EquipamentFilters";
import EquipmentService from "../../Services/EquipamentService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

interface EquipmentListScreenProps {
    route: RouteProp<RootStackParamList, "EquipmentListScreen">;
    navigation: DrawerNavigationProp<RootStackParamList>;
}

const EquipmentListScreen: React.FC<EquipmentListScreenProps> = ({ route, navigation }) => {
    const { hasPermission } = usePermissions();
    const { t } = useLanguage();
    const { clientId, sectorId } = route.params;

    const [loading, setLoading] = useState(false);
    const [equipments, setEquipments] = useState<any[]>([]);
    const [filteredEquipments, setFilteredEquipments] = useState<any[]>([]);
    const [filters, setFilters] = useState<any>({});
    const [filterKey, setFilterKey] = useState(0);

    useEffect(() => {
        fetchEquipments();
    }, [sectorId]);

    const fetchEquipments = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const response = await EquipmentService.fetchEquipments(token, {
                sector_id: sectorId,
                search: "",
                ...filters
            });

            setEquipments(response.results || []);
            setFilteredEquipments(response.results || []);
        } catch (error) {
            console.error("Erro ao buscar equipamentos:", error);
            Alert.alert("Erro", "Não foi possível carregar os equipamentos.");
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = (newFilters: any) => {
        setFilters(newFilters);
        // Aplicar filtros
        let filtered = equipments;

        if (newFilters.search) {
            filtered = filtered.filter((eq: any) =>
                eq.tag?.toLowerCase().includes(newFilters.search.toLowerCase()) ||
                eq.patrimony?.toLowerCase().includes(newFilters.search.toLowerCase())
            );
        }

        if (newFilters.brand) {
            filtered = filtered.filter((eq: any) => eq.brand?.id.toString() === newFilters.brand);
        }

        if (newFilters.equipmentType) {
            filtered = filtered.filter((eq: any) => eq.equipment_type?.id.toString() === newFilters.equipmentType);
        }

        if (newFilters.status) {
            const isActive = newFilters.status === "active";
            filtered = filtered.filter((eq: any) => eq.is_active === isActive);
        }

        setFilteredEquipments(filtered);
    };

    const resetFilters = () => {
        setFilterKey(prev => prev + 1);
        setFilters({});
        setFilteredEquipments(equipments);
    };

    if (!hasPermission("list_equipments")) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>{t('equipment.noPermission')}</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.loadingText}>{t('equipment.loading')}</Text>
            </View>
        );
    }

    const renderEquipmentItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.equipmentItem}
            onPress={() => navigation.navigate("EquipmentDetailsScreen", { equipmentId: item.id })}
        >
            <View style={styles.equipmentHeader}>
                <View style={styles.equipmentInfo}>
                    <Text style={styles.equipmentTag}>{item.tag || "Sem Tag"}</Text>
                    <Text style={styles.equipmentPatrimony}>{item.patrimony || t('equipment.patrimonyMissing')}</Text>
                </View>
                <View style={styles.equipmentStatus}>
                    <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
                        <Text style={styles.statusText}>{item.is_active ? t('equipment.active') : t('equipment.inactive')}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.equipmentDetails}>
                <Text style={styles.equipmentDetail}>
                    <MaterialIcons name="business" size={16} color="#666" />
                    {" "}{item.brand?.name || t('equipment.manufacturerNA')}
                </Text>
                <Text style={styles.equipmentDetail}>
                    <MaterialIcons name="settings" size={16} color="#666" />
                    {" "}{item.equipment_type?.name || t('equipment.typeNA')}
                </Text>
                {item.subsector?.name && (
                    <Text style={styles.equipmentDetail}>
                        <MaterialIcons name="location-on" size={16} color="#666" />
                        {" "}{item.subsector.name}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={["#667eea", "#764ba2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>{t('equipment.title')}</Text>
                        <Text style={styles.headerSubtitle}>{t('equipment.clientSector')}</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Filtros */}
            <EquipmentFilters
                onFilter={handleFilter}
                sectorId={sectorId}
                clientId={clientId}
                resetKey={filterKey}
            />

            {/* Botão Reset Filtros */}
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>{t('equipment.resetFilters')}</Text>
            </TouchableOpacity>

            {/* Lista de Equipamentos */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007BFF" />
                    <Text style={styles.loadingText}>{t('equipment.loading')}</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredEquipments}
                    renderItem={renderEquipmentItem}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.equipmentList}
                    contentContainerStyle={styles.equipmentListContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="build" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>{t('equipment.empty')}</Text>
                        </View>
                    }
                />
            )}

            {/* Botão Adicionar Equipamento */}
            {hasPermission("create_equipment") && (
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate("CreateEquipmentScreen", { clientId, sectorId })}
                >
                    <FontAwesome name="plus" size={18} color="#fff" />
                    <Text style={styles.addButtonText}>{t('equipment.add')}</Text>
                </TouchableOpacity>
            )}
        </View>
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
    },
    headerContent: {
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
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: "rgba(255,255,255,0.8)",
    },
    resetButton: {
        backgroundColor: "#f8f9fa",
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ddd",
        alignSelf: "flex-start",
    },
    resetButtonText: {
        color: "#666",
        fontSize: 14,
        fontWeight: "600",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#666",
    },
    equipmentList: {
        flex: 1,
    },
    equipmentListContent: {
        padding: 16,
    },
    equipmentItem: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginBottom: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    equipmentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    equipmentInfo: {
        flex: 1,
    },
    equipmentTag: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    equipmentPatrimony: {
        fontSize: 14,
        color: "#666",
    },
    equipmentStatus: {
        marginLeft: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusActive: {
        backgroundColor: "#d4edda",
    },
    statusInactive: {
        backgroundColor: "#f8d7da",
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    equipmentDetails: {
        gap: 8,
    },
    equipmentDetail: {
        fontSize: 14,
        color: "#666",
        flexDirection: "row",
        alignItems: "center",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: "#999",
        marginTop: 16,
        textAlign: "center",
    },
    errorText: {
        fontSize: 16,
        color: "#FF0000",
        textAlign: "center",
        marginTop: 20,
    },
    addButton: {
        position: "absolute",
        bottom: 20,
        right: 20,
        backgroundColor: "#28a745",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        shadowColor: "#28a745",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    addButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        marginLeft: 8,
    },
});

export default EquipmentListScreen; 