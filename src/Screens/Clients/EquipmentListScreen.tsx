import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
} from "react-native";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import { usePermissions } from "../../Context/PermissionsContext";
import { useLanguage } from "../../Context/LanguageContext";
import EquipmentFilters from "../../Components/EquipamentFilters";
import RestrictedEquipmentFilters from "../../Components/RestrictedEquipmentFilters";
import ClientService from "../../Services/ClientService";
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

    console.log('[EquipmentListScreen] Montando componente com params:', { clientId, sectorId });

    const [loading, setLoading] = useState(false);
    const [equipments, setEquipments] = useState<any[]>([]);
    const [filteredEquipments, setFilteredEquipments] = useState<any[]>([]);
    const [filters, setFilters] = useState<any>({});
    const [filterKey, setFilterKey] = useState(0);
    const [clientName, setClientName] = useState<string>("");
    const [sectorName, setSectorName] = useState<string>("");

    const applyLocalFilters = (list: any[], f: any) => {
        let results = Array.isArray(list) ? list.slice() : [];
        const before = results.length;
        console.log('[EquipmentListScreen] Aplicando filtros locais em', before, 'itens com:', JSON.stringify(f));

        // Tag (search)
        if (f?.search) {
            const term = String(f.search).trim().toLowerCase();
            const prev = results.length;
            results = results.filter((eq: any) => {
                const tag = String(eq.tag ?? '').toLowerCase();
                const patrimony = String(eq.patrimony ?? '').toLowerCase();
                const matches = tag.includes(term) || patrimony.includes(term);
                if (!matches && term.length > 0) {
                    console.log(`[EquipmentListScreen] Item excluído: tag="${eq.tag}", patrimony="${eq.patrimony}", term="${term}"`);
                }
                return matches;
            });
            console.log('[EquipmentListScreen] Filtro Tag:', prev, '->', results.length, 'term:', term);
        }
        // Fabricante
        if (f?.brand) {
            const brandStr = String(f.brand).trim().toLowerCase();
            const brandNum = Number(brandStr);
            const prev = results.length;
            results = results.filter((eq: any) => {
                const name = String(eq.brand?.name ?? '').toLowerCase();
                const idStr = String(eq.brand?.id ?? '').toLowerCase();
                return name.includes(brandStr) || idStr === brandStr || (!Number.isNaN(brandNum) && eq.brand?.id === brandNum);
            });
            console.log('[EquipmentListScreen] Filtro Fabricante:', prev, '->', results.length, 'brand:', f.brand);
        }
        // Tipo de equipamento
        if (f?.equipmentType) {
            const typeStr = String(f.equipmentType).trim().toLowerCase();
            const typeNum = Number(typeStr);
            const prev = results.length;
            results = results.filter((eq: any) => {
                const name = String(eq.equipment_type?.name ?? '').toLowerCase();
                const idStr = String(eq.equipment_type?.id ?? '').toLowerCase();
                return name.includes(typeStr) || idStr === typeStr || (!Number.isNaN(typeNum) && eq.equipment_type?.id === typeNum);
            });
            console.log('[EquipmentListScreen] Filtro Tipo:', prev, '->', results.length, 'type:', f.equipmentType);
        }
        // Status
        if (f?.status) {
            const prev = results.length;
            if (f.status === 'active') results = results.filter((eq: any) => eq.is_active === true);
            else if (f.status === 'inactive') results = results.filter((eq: any) => eq.is_active === false);
            console.log('[EquipmentListScreen] Filtro Status:', prev, '->', results.length, 'status:', f.status);
        }
        // Subsetor (se vier no payload como subsector ou sector id)
        if (f?.subsector_id) {
            const idStr = String(f.subsector_id);
            const prev = results.length;
            results = results.filter((eq: any) => String(eq.subsector?.id ?? eq.sector?.id ?? '') === idStr);
            console.log('[EquipmentListScreen] Filtro Subsetor:', prev, '->', results.length, 'subsector_id:', f.subsector_id);
        }
        console.log('[EquipmentListScreen] Resultado final filtros locais:', results.length);
        return results;
    };

    useEffect(() => {
        fetchEquipments();
    }, [sectorId]);

    // Buscar nomes do cliente e do setor para o cabeçalho
    useEffect(() => {
        (async () => {
            try {
                const token = await AsyncStorage.getItem("access_token");
                if (!token) return;
                const client = await ClientService.getClientDetails(clientId, token);
                setClientName(client?.name || String(clientId));
                const sector = await ClientService.getSectorDetails(String(clientId), sectorId, token);
                const complete = sector?.complete_name || sector?.name;
                setSectorName(complete || String(sectorId));
            } catch (e) {
                console.warn('[EquipmentListScreen] Não foi possível carregar nomes do cabeçalho');
                setClientName(String(clientId));
                setSectorName(String(sectorId));
            }
        })();
    }, [clientId, sectorId]);

    // Mantém a lista filtrada sempre coerente com equipamentos e filtros
    useEffect(() => {
        console.log('[EquipmentListScreen] useEffect: atualizando filteredEquipments');
        console.log('[EquipmentListScreen] useEffect: equipments.length =', equipments.length);
        console.log('[EquipmentListScreen] useEffect: filters =', JSON.stringify(filters));
        const filtered = applyLocalFilters(equipments, filters);
        console.log('[EquipmentListScreen] useEffect: filtered.length =', filtered.length);
        setFilteredEquipments(filtered);
    }, [equipments, filters]);

    // Recarrega ao voltar do cadastro
    // Atualizar lista quando a tela ganhar foco (após criar/editar equipamento)
    useFocusEffect(
        React.useCallback(() => {
            fetchEquipments();
        }, [sectorId])
    );

    const fetchEquipments = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            // Buscar com filtros de backend mínimos (client/sector/subsector) e aplicar o restante localmente
            // Sempre restringe ao cliente e setor recebidos na rota
            const backendFilters: any = { client_id: clientId, sector_id: sectorId };
            if (filters?.subsector_id) backendFilters.sector_id = filters.subsector_id; // mapeia subsector -> sector_id

            const response = await EquipmentService.fetchEquipments(token, {
                ...backendFilters,
                per_page: 100,
                page: 1,
            });

            const list = response.results || [];
            setEquipments(list);
            setFilteredEquipments(applyLocalFilters(list, filters));
        } catch (error) {
            console.error("Erro ao buscar equipamentos:", error);
            Alert.alert("Erro", "Não foi possível carregar os equipamentos.");
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = async (newFilters: any) => {
        try {
            console.log('[EquipmentListScreen] handleFilter INÍCIO');
            console.log('[EquipmentListScreen] handleFilter recebido:', JSON.stringify(newFilters));
            console.log('[EquipmentListScreen] filters atuais:', JSON.stringify(filters));
            console.log('[EquipmentListScreen] equipments.length:', equipments.length);
            setFilters(newFilters);
            // Requisita backend somente se client/sector/subsector MUDARAM de fato
            const backendChanged = (
                newFilters.subsector_id !== filters?.subsector_id // só subsetor muda backend
            );

            if (backendChanged) {
                setLoading(true);
                const token = await AsyncStorage.getItem("access_token");
                if (!token) throw new Error("Token não encontrado");

                const apiFilters: any = {
                    client_id: clientId,
                    sector_id: newFilters.subsector_id ? newFilters.subsector_id : sectorId,
                    per_page: 100,
                    page: 1,
                };

                const response = await EquipmentService.fetchEquipments(token, apiFilters);
                const baseList = response.results || [];
                setEquipments(baseList);
                setFilteredEquipments(applyLocalFilters(baseList, newFilters));
            } else {
                // Apenas filtros locais mudaram
                setFilteredEquipments(applyLocalFilters(equipments, newFilters));
            }
        } catch (err: any) {
            console.error("[EquipmentListScreen] Erro ao filtrar:", err);
            console.error("[EquipmentListScreen] Stack:", err?.stack);
            Alert.alert("Erro", "Falha ao aplicar filtros: " + err?.message);
        } finally {
            setLoading(false);
        }
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

    // Removido o early return para permitir que os filtros sejam renderizados

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
                        <Text style={styles.headerTitle}>Cliente: {clientName || String(clientId)}</Text>
                        <Text style={styles.headerSubtitle}>Setor: {sectorName || String(sectorId)}</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* Filtros */}
                <View style={{ marginTop: 16 }}>
                    <RestrictedEquipmentFilters
                        onFilter={handleFilter}
                        clientId={clientId}
                        sectorId={sectorId}
                        resetKey={filterKey}
                    />
                </View>

                {/* Botão Reset Filtros */}
                <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                    <Text style={styles.resetButtonText}>{t('equipment.resetFilters')}</Text>
                </TouchableOpacity>

                {/* Ações no topo (Novo) */}
                {(hasPermission("add_equipment") || hasPermission("create_equipment")) && (
                    <View style={styles.topActionsRow}>
                        <TouchableOpacity
                            style={styles.createButton}
                            onPress={() => navigation.navigate("CreateEquipmentScreen", { clientId, sectorId })}
                        >
                            <FontAwesome name="plus" size={16} color="#fff" />
                            <Text style={styles.createButtonText}>Novo</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Lista de Equipamentos */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007BFF" />
                        <Text style={styles.loadingText}>{t('equipment.loading')}</Text>
                    </View>
                ) : (
                    <View style={styles.equipmentListContainer}>
                        {filteredEquipments.map((item, index) => (
                            <TouchableOpacity
                                key={item.id}
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
                        ))}
                        {filteredEquipments.length === 0 && (
                            <View style={styles.emptyContainer}>
                                <MaterialIcons name="build" size={64} color="#ccc" />
                                <Text style={styles.emptyText}>{t('equipment.empty')}</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Botão Adicionar Equipamento movido para o topo */}

            {/* Botão Atualizar removido a pedido do usuário */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    scrollContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 60,
    },
    equipmentListContainer: {
        paddingBottom: 200, // Espaço muito maior para garantir que tudo seja visível
        marginTop: 20,
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
        marginVertical: 16,
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
    // Estilos replicados da tela geral
    headerButtonsFloating: {
        position: "absolute",
        right: 20,
        bottom: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    createButton: {
        backgroundColor: "#28a745",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        minWidth: 60,
    },
    createButtonText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    topActionsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
});

export default EquipmentListScreen;
