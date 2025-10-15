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
    ScrollView,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import EquipmentService from "../../Services/EquipamentService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import { Equipment } from "../../Models/Equipament";
import { usePermissions } from "../../Context/PermissionsContext";
import EquipmentFilters from "../../Components/EquipamentFilters"; // Importa o componente
import { EquipmentLock } from "../../Context/ApiClient";
import { addRequestListener, removeRequestListener, addResponseListener, removeResponseListener, getRequestStats, resetRequestStats } from "../../Context/ApiClient";
import CacheService from "../../Services/CacheService";

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
    const { hasPermission, permissions } = usePermissions();
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState<any>({}); // Estado unificado para filtros
    const [filterApplied, setFilterApplied] = useState(false); // Novo estado para controlar se filtro foi aplicado
    const [lastFilterAttempt, setLastFilterAttempt] = useState<Date | null>(null); // Debug: última tentativa de filtro
    const [resetKey, setResetKey] = useState(0); // Chave para resetar os filtros
    const [totalFilteredCount, setTotalFilteredCount] = useState(0); // total após filtros locais

    // Monitor de requisições específico desta tela
    useEffect(() => {
        resetRequestStats();
        const reqLogger = (ev: any) => {
            console.log('[GeneralEquipmentListScreen][REQ]', ev.method?.toUpperCase(), ev.url);
        };
        const resLogger = (ev: any) => {
            console.log('[GeneralEquipmentListScreen][RES]', ev.method?.toUpperCase(), ev.url, ev.status);
        };
        addRequestListener(reqLogger);
        addResponseListener(resLogger);
        const interval = setInterval(() => {
            const stats = getRequestStats();
            console.log('[GeneralEquipmentListScreen][STATS/min]', {
                totalInWindow: stats.totalInWindow,
                byUrl: stats.byUrl,
            });
        }, 5000);

        return () => {
            clearInterval(interval);
            removeRequestListener(reqLogger);
            removeResponseListener(resLogger);
        };
    }, []);

    // Verificar permissão
    if (!hasPermission("list_equipments")) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Você não tem permissão para visualizar equipamentos.</Text>
            </View>
        );
    }

    const fetchEquipments = async () => {
        // Busca sempre que houver filtros aplicados (cliente/setor deixam de ser obrigatórios)
        if (!filterApplied) {
            return;
        }

        try {
            setLoading(true);
            console.log("[GeneralEquipmentListScreen] Iniciando busca com filtros:", filters);

            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado.");

            // Somente filtros suportados pelo backend: client_id, sector_id, page, per_page
            const apiFilters: any = { page, per_page: 10 };
            if (filters.client_id) apiFilters.client_id = filters.client_id;
            if (filters.subsector_id) {
                // Backend espera sector_id também para subsetor
                apiFilters.sector_id = filters.subsector_id;
            } else if (filters.sector_id) {
                apiFilters.sector_id = filters.sector_id;
            }
            console.log("[GeneralEquipmentListScreen] Filtros para API (somente backend):", apiFilters);

            const hasLocalFilters = Boolean(filters.search || filters.brand || filters.equipmentType || filters.status);

            // Se houver filtros locais, precisamos de todos os resultados para filtrar corretamente
            let allResults: any[] = [];
            if (hasLocalFilters) {
                // Buscar todas as páginas respeitando client_id/sector_id
                let currentPage = 1;
                const perPage = 50; // buscar em páginas maiores para reduzir requisições
                const maxPages = 10; // LIMITE PARA EVITAR SOBRECARGA

                console.log("[GeneralEquipmentListScreen] Iniciando busca paginada com limite de", maxPages, "páginas");

                while (true) {
                    // Limite de segurança para evitar sobrecarga do backend
                    if (currentPage > maxPages) {
                        console.log(`[GeneralEquipmentListScreen] Limite de ${maxPages} páginas atingido para evitar sobrecarga`);
                        break;
                    }

                    try {
                        console.log(`[GeneralEquipmentListScreen] Buscando página ${currentPage}/${maxPages}...`);
                        const pageResp = await EquipmentService.fetchEquipments(token, { ...apiFilters, page: currentPage, per_page: perPage });
                        const pageResults = pageResp.results || [];
                        allResults = allResults.concat(pageResults);
                        const total = pageResp.count || allResults.length;
                        const fetched = allResults.length;

                        console.log(`[GeneralEquipmentListScreen] Página ${currentPage}: ${pageResults.length} itens, total acumulado: ${fetched}/${total}`);

                        if (fetched >= total || (pageResp.links && !pageResp.links.next) || pageResults.length === 0) {
                            console.log("[GeneralEquipmentListScreen] Busca concluída - todos os dados obtidos");
                            break;
                        }
                    } catch (pageError: any) {
                        console.error(`[GeneralEquipmentListScreen] Erro na página ${currentPage}:`, pageError.message);
                        // Continua para a próxima página mesmo com erro, mas com limite reduzido
                        if (currentPage >= 5) {
                            console.log("[GeneralEquipmentListScreen] Parando busca após erro em página alta");
                            break;
                        }
                    }

                    currentPage += 1;

                    // Pequeno delay para reduzir concorrência e pressão no backend
                    if (currentPage > 1) {
                        await new Promise(resolve => setTimeout(resolve, 150));
                    }
                }

                console.log(`[GeneralEquipmentListScreen] Busca finalizada: ${allResults.length} itens coletados em ${currentPage - 1} páginas`);
            } else {
                // Sem filtros locais: usar paginação do backend diretamente
                const response = await EquipmentService.fetchEquipments(token, apiFilters);
                console.log("[GeneralEquipmentListScreen] Resposta da API (backend pagination):", response);
                const backendResults = response.results || [];
                const backendCount = response.count ?? backendResults.length;
                setEquipmentList(backendResults);
                setTotalFilteredCount(backendCount);
                setTotalPages(Math.max(1, Math.ceil(backendCount / 10)));
                return; // evita paginação local abaixo
            }

            // Aplicar filtros restantes no frontend: search(tag), brand, equipmentType, status
            let results = allResults;

            if (filters.search) {
                const term = String(filters.search).trim().toLowerCase();
                results = results.filter((eq: any) => {
                    const tag = String(eq.tag ?? '').toLowerCase();
                    // Algumas APIs podem devolver tag numérica ou com espaços/quebra
                    return tag.includes(term);
                });
            }
            if (filters.brand) {
                const brandTerm = String(filters.brand).toLowerCase();
                results = results.filter((eq: any) =>
                    (eq.brand?.name || "").toLowerCase().includes(brandTerm) || String(eq.brand?.id || "").toLowerCase() === brandTerm
                );
            }
            if (filters.equipmentType) {
                const typeTerm = String(filters.equipmentType).toLowerCase();
                results = results.filter((eq: any) =>
                    (eq.equipment_type?.name || "").toLowerCase().includes(typeTerm) || String(eq.equipment_type?.id || "").toLowerCase() === typeTerm
                );
            }
            if (filters.status) {
                if (filters.status === 'active') results = results.filter((eq: any) => eq.is_active === true);
                else if (filters.status === 'inactive') results = results.filter((eq: any) => eq.is_active === false);
            }

            // Paginação local após filtros
            const pageSize = 10;
            const total = results.length;
            setTotalFilteredCount(total);
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            setEquipmentList(results.slice(start, end));
            setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
        } catch (error: any) {
            console.error("[GeneralEquipmentListScreen] Erro ao buscar equipamentos:", error);
            Alert.alert("Erro", error.message || "Falha ao carregar os equipamentos.");
            setEquipmentList([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEquipments();
    }, [page, filters, filterApplied]);

    // Recarregar quando voltar do fluxo de criação/edição
    useFocusEffect(
        React.useCallback(() => {
            // Sempre atualiza quando a tela ganha foco
            fetchEquipments();
        }, [page, filters, filterApplied])
    );

    const handleFilterChange = (newFilters: any) => {
        console.log("[GeneralEquipmentListScreen] Novos filtros recebidos:", newFilters);
        console.log("[GeneralEquipmentListScreen] Filtros anteriores:", filters);

        // Debug: registra a tentativa de filtro
        setLastFilterAttempt(new Date());

        // Verifica se os filtros realmente mudaram
        const filtersChanged = JSON.stringify(newFilters) !== JSON.stringify(filters);
        console.log("[GeneralEquipmentListScreen] Filtros mudaram?", filtersChanged);

        setPage(1); // Reseta a página ao mudar os filtros
        setFilters(newFilters);

        // Só marca como aplicado se realmente houver mudança
        if (filtersChanged) {
            setFilterApplied(true);
            console.log("[GeneralEquipmentListScreen] Filtro marcado como aplicado");
        } else {
            console.log("[GeneralEquipmentListScreen] Filtros não mudaram, não marcando como aplicado");
        }
    };

    const clearFilters = () => {
        console.log("[GeneralEquipmentListScreen] Limpando filtros");
        setFilters({});
        setFilterApplied(false);
        setPage(1);
        setEquipmentList([]);
        setTotalPages(1);
        setResetKey(prev => prev + 1); // Incrementa a chave para forçar reset no componente
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <EquipmentFilters onFilter={handleFilterChange} resetKey={resetKey} showFilterButton={true} />

                {/* Botão para limpar filtros */}
                {filterApplied && (
                    <TouchableOpacity
                        style={styles.clearFiltersButton}
                        onPress={clearFilters}
                    >
                        <FontAwesome name="times" size={14} color="#fff" />
                        <Text style={styles.clearFiltersText}>Limpar Filtros</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.headerSection}>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerText}>
                            Equipamentos Encontrados: {equipmentList.length}
                        </Text>
                        {filterApplied && !filters.client_id && (
                            <Text style={styles.warningText}>Selecione um cliente para buscar equipamentos</Text>
                        )}
                        {filterApplied && filters.client_id && !filters.sector_id && (
                            <Text style={styles.warningText}>Selecione um setor para buscar equipamentos</Text>
                        )}
                        {lastFilterAttempt && (
                            <Text style={styles.debugText}>
                                Última tentativa: {lastFilterAttempt.toLocaleTimeString()}
                            </Text>
                        )}
                    </View>
                    <View style={styles.headerButtons}>
                        {hasPermission("add_equipment") && (
                            <TouchableOpacity
                                style={styles.createButton}
                                onPress={() => navigation.navigate("CreateEquipmentScreen", {})}
                            >
                                <FontAwesome name="plus" size={16} color="#fff" />
                                <Text style={styles.createButtonText}>Novo</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.qrButton}
                            onPress={() => navigation.navigate("EquipmentQRCodeScreen", {})}
                        >
                            <FontAwesome name="qrcode" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007BFF" />
                        <Text style={styles.loadingText}>Buscando equipamentos...</Text>
                    </View>
                ) : equipmentList.length > 0 ? (
                    <View style={styles.equipmentListContainer}>
                        {equipmentList.map((item) => (
                            <View key={item.id} style={styles.itemContainer}>
                                <View style={styles.equipmentInfo}>
                                    <Text style={styles.itemText}>Tag: {item.tag || "N/A"}</Text>
                                    <Text style={styles.itemText}>Tipo: {item.equipment_type?.name || "N/A"}</Text>
                                    <Text style={styles.itemText}>Fabricante: {item.brand?.name || "N/A"}</Text>
                                    <Text style={styles.itemText}>Setor: {item.sector?.name || item.sector?.complete_name || "N/A"}</Text>
                                </View>

                                <View style={styles.actionButtons}>
                                    {hasPermission("view_equipment") && (
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => navigation.navigate("EquipmentDetailsScreen", { equipmentId: String(item.id) })}
                                        >
                                            <FontAwesome name="eye" size={16} color="#007BFF" />
                                        </TouchableOpacity>
                                    )}
                                    {hasPermission("change_equipment") && (
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => {
                                                console.log("[GeneralEquipmentListScreen] Verificando lock antes de editar equipamento:", item.id);
                                                console.log("[GeneralEquipmentListScreen] Status do lock:", EquipmentLock.isLocked(String(item.id)));

                                                if (EquipmentLock.isLocked(String(item.id))) {
                                                    console.warn("[GeneralEquipmentListScreen] ❌ Equipamento bloqueado, impedindo navegação:", item.id);
                                                    Alert.alert("Aguarde", "Este equipamento está sendo modificado. Aguarde a operação terminar.");
                                                    return;
                                                }

                                                console.log("[GeneralEquipmentListScreen] ✅ Lock liberado, navegando para edição:", item.id);
                                                navigation.navigate("EditEquipmentScreen", { equipmentId: String(item.id) });
                                            }}
                                        >
                                            <FontAwesome name="pencil" size={16} color="#ffc107" />
                                        </TouchableOpacity>
                                    )}
                                    {hasPermission("delete_equipment") && (
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
                                    {hasPermission("add_activity") && (
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => navigation.navigate("ActivityHistoryScreen", { equipmentId: item.id })}
                                        >
                                            <FontAwesome name="wrench" size={16} color="#17a2b8" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                ) : filterApplied ? (
                    <View style={styles.emptyContainer}>
                        <FontAwesome name="search" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>Nenhum equipamento encontrado com os filtros aplicados.</Text>
                        <Text style={styles.emptySubtext}>Tente ajustar os filtros ou verificar se os dados estão corretos.</Text>
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <FontAwesome name="filter" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>Utilize os filtros para buscar os equipamentos.</Text>
                        <Text style={styles.emptySubtext}>Selecione um cliente e setor para começar a busca.</Text>
                    </View>
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
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    scrollContainer: {
        flex: 1,
        padding: 16,
    },
    clearFiltersButton: {
        backgroundColor: "#6c757d",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        marginBottom: 12,
        gap: 6,
    },
    clearFiltersText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    headerSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        marginTop: 16,
        paddingHorizontal: 4,
    },
    headerInfo: {
        flex: 1,
        marginRight: 8,
    },
    headerText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    warningText: {
        fontSize: 12,
        color: "#ffc107",
        marginTop: 4,
        fontStyle: "italic",
    },
    debugText: {
        fontSize: 10,
        color: "#666",
        marginTop: 2,
        fontStyle: "italic",
    },
    headerButtons: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
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
    qrButton: {
        backgroundColor: "#007BFF",
        padding: 8,
        borderRadius: 5,
        minWidth: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: "#666",
    },
    equipmentListContainer: {
        marginBottom: 20,
    },
    itemContainer: {
        backgroundColor: "#fff",
        padding: 16,
        marginBottom: 12,
        borderRadius: 8,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    equipmentInfo: {
        marginBottom: 12,
    },
    itemText: {
        fontSize: 14,
        color: "#333",
        marginBottom: 4,
        lineHeight: 20,
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        paddingTop: 12,
        marginTop: 8,
    },
    actionButton: {
        padding: 10,
        marginLeft: 8,
        backgroundColor: "#f8f9fa",
        borderRadius: 6,
        minWidth: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginTop: 16,
        fontWeight: "600",
    },
    emptySubtext: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
        marginTop: 8,
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
        marginBottom: 20,
        paddingHorizontal: 16,
    },
    pageText: {
        fontSize: 14,
        color: "#333",
    },
});

export default GeneralEquipmentListScreen;