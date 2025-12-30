import React, { useEffect, useState } from "react";
import {
    View,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Button,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import EquipmentService from "../../Services/EquipamentService";
import ActivityService from "../../Services/ActivityService";
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
import ResponsiveContainer from "../../Components/ResponsiveContainer";
import ResponsiveText from "../../Components/ResponsiveText";
import { useResponsive } from "../../hooks/useResponsive";

interface GeneralEquipmentListScreenProps {
    route: RouteProp<RootStackParamList, "GeneralEquipmentListScreen">;
    navigation: DrawerNavigationProp<RootStackParamList, "GeneralEquipmentListScreen">;
}

const GeneralEquipmentListScreen: React.FC<GeneralEquipmentListScreenProps> = ({
    route,
    navigation,
}) => {
    const r = useResponsive();
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
    const [showFilterModal, setShowFilterModal] = useState(false); // Modal de filtros

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
            <ResponsiveContainer withPadding={false} style={styles.container}>
                <ResponsiveText variant="body" style={styles.errorText}>
                    Você não tem permissão para visualizar equipamentos.
                </ResponsiveText>
            </ResponsiveContainer>
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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
                {/* Header Principal */}
                <View style={styles.mainHeader}>
                    <View style={styles.mainHeaderContent}>
                        <ResponsiveText variant="title" weight="bold" style={styles.mainTitle} numberOfLines={2}>
                            Equipamentos
                        </ResponsiveText>
                        <ResponsiveText variant="caption" style={styles.mainSubtitle} numberOfLines={2}>
                            Gerencie todos os equipamentos do sistema
                        </ResponsiveText>
                    </View>
                </View>

                {/* Filtros na Tela Principal */}
                <EquipmentFilters onFilter={handleFilterChange} resetKey={resetKey} showFilterButton={false} />

                {/* Botão para limpar filtros */}
                {filterApplied && (
                    <TouchableOpacity
                        style={[styles.clearFiltersButton, { minHeight: r.verticalScale(44) }]}
                        onPress={clearFilters}
                    >
                        <FontAwesome name="times" size={Math.max(14, r.responsiveFontSize(14, { max: 1.5 }))} color="#fff" />
                        <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.clearFiltersText} numberOfLines={1}>
                            Limpar Filtros
                        </ResponsiveText>
                    </TouchableOpacity>
                )}

                {/* Status dos filtros e botão para ver resultados */}
                <View style={styles.filterStatus}>
                    <ResponsiveText variant="body" weight="bold" style={styles.statusText} numberOfLines={2}>
                        Equipamentos Encontrados: {equipmentList.length}
                    </ResponsiveText>
                    {filterApplied && !filters.client_id && (
                        <ResponsiveText variant="caption" maxFontSizeMultiplier={1.3} style={styles.warningText}>
                            Selecione um cliente para buscar equipamentos
                        </ResponsiveText>
                    )}

                    {lastFilterAttempt && (
                        <ResponsiveText variant="caption" maxFontSizeMultiplier={1.3} style={styles.debugText}>
                            Última tentativa: {lastFilterAttempt.toLocaleTimeString()}
                        </ResponsiveText>
                    )}

                    {/* Botão para ver resultados */}
                    {equipmentList.length > 0 && (
                        <TouchableOpacity
                            style={[styles.viewResultsButton, { minHeight: r.verticalScale(44) }]}
                            onPress={() => setShowFilterModal(true)}
                        >
                            <FontAwesome name="eye" size={Math.max(16, r.responsiveFontSize(16, { max: 1.5 }))} color="#fff" />
                            <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.viewResultsButtonText} numberOfLines={1}>
                                Ver Equipamentos ({equipmentList.length})
                            </ResponsiveText>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Área Central - Placeholder quando não há filtros aplicados */}
                {!filterApplied && (
                    <View style={styles.placeholderContainer}>
                        <FontAwesome name="cogs" size={Math.max(64, r.responsiveFontSize(64, { max: 2 }))} color="#e9ecef" />
                        <ResponsiveText variant="body" weight="600" style={styles.placeholderText}>
                            Configure os filtros acima para buscar equipamentos
                        </ResponsiveText>
                        <ResponsiveText variant="caption" style={styles.placeholderSubtext}>
                            Selecione cliente e setor para começar a busca
                        </ResponsiveText>
                    </View>
                )}

                {/* Placeholder quando há filtros mas nenhum resultado */}
                {filterApplied && equipmentList.length === 0 && (
                    <View style={styles.placeholderContainer}>
                        <FontAwesome name="search" size={Math.max(64, r.responsiveFontSize(64, { max: 2 }))} color="#e9ecef" />
                        <ResponsiveText variant="body" weight="600" style={styles.placeholderText}>
                            Nenhum equipamento encontrado
                        </ResponsiveText>
                        <ResponsiveText variant="caption" style={styles.placeholderSubtext}>
                            Tente ajustar os filtros para encontrar equipamentos
                        </ResponsiveText>
                    </View>
                )}

                {/* Modal de Filtros e Listagem */}
                <Modal
                    visible={showFilterModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowFilterModal(false)}
                >
                    <KeyboardAvoidingView
                        style={styles.modalBackdrop}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <View style={[styles.modalContainer, { maxHeight: r.height * 0.9 }]}>
                            <View style={styles.modalHeader}>
                                <ResponsiveText variant="title" weight="bold" style={styles.modalTitle} numberOfLines={1}>
                                    Equipamentos Encontrados
                                </ResponsiveText>
                                <TouchableOpacity
                                    style={[styles.closeButton, { minHeight: r.verticalScale(44), minWidth: r.verticalScale(44) }]}
                                    onPress={() => setShowFilterModal(false)}
                                >
                                    <FontAwesome name="times" size={Math.max(20, r.responsiveFontSize(20, { max: 1.5 }))} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                                {/* Header do Modal com Resumo */}
                                <View style={styles.modalResultsHeader}>
                                    <ResponsiveText variant="subtitle" weight="bold" style={styles.modalResultsTitle} numberOfLines={1}>
                                        Resultados da Busca
                                    </ResponsiveText>
                                    <ResponsiveText variant="caption" style={styles.modalResultsCount} numberOfLines={1}>
                                        {equipmentList.length} equipamento{equipmentList.length !== 1 ? 's' : ''} encontrado{equipmentList.length !== 1 ? 's' : ''}
                                    </ResponsiveText>
                                </View>

                                {/* Botões de Ação dentro do Modal */}
                                <View style={styles.modalActionButtons}>
                                    <TouchableOpacity
                                        style={[styles.qrButton, { minHeight: r.verticalScale(48), minWidth: r.verticalScale(48) }]}
                                        onPress={() => {
                                            setShowFilterModal(false);
                                            navigation.navigate("EquipmentQRCodeScreen", {});
                                        }}
                                    >
                                        <FontAwesome name="qrcode" size={Math.max(20, r.responsiveFontSize(20, { max: 1.5 }))} color="#fff" />
                                    </TouchableOpacity>

                                    {hasPermission("add_equipment") && (
                                        <TouchableOpacity
                                            style={[styles.createButton, { minHeight: r.verticalScale(48) }]}
                                            onPress={() => {
                                                setShowFilterModal(false);
                                                navigation.navigate("CreateEquipmentScreen", {});
                                            }}
                                        >
                                            <FontAwesome name="plus" size={Math.max(16, r.responsiveFontSize(16, { max: 1.5 }))} color="#fff" />
                                            <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.createButtonText} numberOfLines={1}>
                                                Novo
                                            </ResponsiveText>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Conteúdo da Listagem - Apenas os Cards */}
                                {loading ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="large" color="#007BFF" />
                                        <ResponsiveText variant="body" style={styles.loadingText}>
                                            Buscando equipamentos...
                                        </ResponsiveText>
                                    </View>
                                ) : equipmentList.length > 0 ? (
                                    <View style={styles.equipmentListContainer}>
                                        {equipmentList.map((item) => (
                                            <View key={item.id} style={styles.itemContainer}>
                                                <View style={styles.equipmentInfo}>
                                                    <ResponsiveText variant="body" style={styles.itemText} numberOfLines={1}>
                                                        Tag: {item.tag || "N/A"}
                                                    </ResponsiveText>
                                                    <ResponsiveText variant="body" style={styles.itemText} numberOfLines={1}>
                                                        Tipo: {item.equipment_type?.name || "N/A"}
                                                    </ResponsiveText>
                                                    <ResponsiveText variant="body" style={styles.itemText} numberOfLines={1}>
                                                        Fabricante: {item.brand?.name || "N/A"}
                                                    </ResponsiveText>
                                                    <ResponsiveText variant="body" style={styles.itemText} numberOfLines={2}>
                                                        Setor: {item.sector?.name || item.sector?.complete_name || "N/A"}
                                                    </ResponsiveText>
                                                </View>

                                                <View style={styles.actionButtons}>
                                                    {hasPermission("view_equipment") && (
                                                        <TouchableOpacity
                                                            style={[styles.actionButton, { minHeight: r.verticalScale(44), minWidth: r.verticalScale(44) }]}
                                                            onPress={() => {
                                                                setShowFilterModal(false);
                                                                navigation.navigate("EquipmentDetailsScreen", { equipmentId: String(item.id) });
                                                            }}
                                                        >
                                                            <FontAwesome name="eye" size={Math.max(18, r.responsiveFontSize(18, { max: 1.5 }))} color="#007BFF" />
                                                        </TouchableOpacity>
                                                    )}
                                                    {hasPermission("change_equipment") && (
                                                        <TouchableOpacity
                                                            style={[styles.actionButton, { minHeight: r.verticalScale(44), minWidth: r.verticalScale(44) }]}
                                                            onPress={() => {
                                                                console.log("[GeneralEquipmentListScreen] Verificando lock antes de editar equipamento:", item.id);
                                                                console.log("[GeneralEquipmentListScreen] Status do lock:", EquipmentLock.isLocked(String(item.id)));

                                                                if (EquipmentLock.isLocked(String(item.id))) {
                                                                    console.warn("[GeneralEquipmentListScreen] ❌ Equipamento bloqueado, impedindo navegação:", item.id);
                                                                    Alert.alert("Aguarde", "Este equipamento está sendo modificado. Aguarde a operação terminar.");
                                                                    return;
                                                                }

                                                                console.log("[GeneralEquipmentListScreen] ✅ Lock liberado, navegando para edição:", item.id);
                                                                setShowFilterModal(false);
                                                                navigation.navigate("EditEquipmentScreen", { equipmentId: String(item.id) });
                                                            }}
                                                        >
                                                            <FontAwesome name="pencil" size={Math.max(18, r.responsiveFontSize(18, { max: 1.5 }))} color="#ffc107" />
                                                        </TouchableOpacity>
                                                    )}
                                                    {hasPermission("delete_equipment") && (
                                                        <TouchableOpacity
                                                            style={[styles.actionButton, { minHeight: r.verticalScale(44), minWidth: r.verticalScale(44) }]}
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
                                                            <FontAwesome name="trash" size={Math.max(18, r.responsiveFontSize(18, { max: 1.5 }))} color="#dc3545" />
                                                        </TouchableOpacity>
                                                    )}
                                                    {hasPermission("add_activity") && (
                                                        <TouchableOpacity
                                                            style={[styles.actionButton, { minHeight: r.verticalScale(44), minWidth: r.verticalScale(44) }]}
                                                            onPress={async () => {
                                                                try {
                                                                    console.log(`[GeneralEquipmentListScreen] Buscando atividades do equipamento ${item.id}...`);
                                                                    const token = await AsyncStorage.getItem("access_token");
                                                                    if (!token) {
                                                                        Alert.alert("Erro", "Token de acesso não encontrado.");
                                                                        return;
                                                                    }

                                                                    const activitiesResponse = await ActivityService.fetchEquipmentActivities(item.id, { token });

                                                                    if (activitiesResponse.results && activitiesResponse.results.length > 0) {
                                                                        // Navegar para a primeira atividade encontrada
                                                                        const firstActivity = activitiesResponse.results[0];
                                                                        console.log(`[GeneralEquipmentListScreen] Navegando para atividade ${firstActivity.id} do equipamento ${item.id}`);

                                                                        setShowFilterModal(false);
                                                                        navigation.navigate("ActivityHistoryScreen", { activityId: firstActivity.id });
                                                                    } else {
                                                                        Alert.alert(
                                                                            "Sem Atividades",
                                                                            "Este equipamento não possui atividades registradas.",
                                                                            [{ text: "OK" }]
                                                                        );
                                                                    }
                                                                } catch (error: any) {
                                                                    console.error(`[GeneralEquipmentListScreen] Erro ao buscar atividades do equipamento ${item.id}:`, error);
                                                                    Alert.alert(
                                                                        "Erro",
                                                                        "Não foi possível buscar as atividades deste equipamento.",
                                                                        [{ text: "OK" }]
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <FontAwesome name="history" size={Math.max(18, r.responsiveFontSize(18, { max: 1.5 }))} color="#17a2b8" />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.emptyContainer}>
                                        <FontAwesome name="search" size={Math.max(48, r.responsiveFontSize(48, { max: 1.5 }))} color="#ccc" />
                                        <ResponsiveText variant="body" weight="600" style={styles.emptyText}>
                                            Nenhum equipamento encontrado.
                                        </ResponsiveText>
                                        <ResponsiveText variant="caption" style={styles.emptySubtext}>
                                            Tente ajustar os filtros na tela principal.
                                        </ResponsiveText>
                                    </View>
                                )}
                            </ScrollView>

                            {/* Paginação Fixa no Rodapé */}
                            {equipmentList.length > 0 && (
                                <View style={styles.modalFooter}>
                                    <TouchableOpacity
                                        style={[styles.paginationButton, styles.prevButton, { minHeight: r.verticalScale(44) }]}
                                        onPress={() => setPage((p) => Math.max(p - 1, 1))}
                                        disabled={page === 1}
                                    >
                                        <FontAwesome name="chevron-left" size={Math.max(14, r.responsiveFontSize(14, { max: 1.5 }))} color={page === 1 ? "#ccc" : "#007BFF"} />
                                        <ResponsiveText
                                            variant="button"
                                            maxFontSizeMultiplier={1.3}
                                            style={[styles.paginationButtonText, page === 1 && styles.disabledText]}
                                            numberOfLines={1}
                                        >
                                            Anterior
                                        </ResponsiveText>
                                    </TouchableOpacity>

                                    <ResponsiveText variant="body" weight="bold" style={styles.pageText} numberOfLines={1}>
                                        Página {page} de {totalPages}
                                    </ResponsiveText>

                                    <TouchableOpacity
                                        style={[styles.paginationButton, styles.nextButton, { minHeight: r.verticalScale(44) }]}
                                        onPress={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                                        disabled={page === totalPages}
                                    >
                                        <ResponsiveText
                                            variant="button"
                                            maxFontSizeMultiplier={1.3}
                                            style={[styles.paginationButtonText, page === totalPages && styles.disabledText]}
                                            numberOfLines={1}
                                        >
                                            Próximo
                                        </ResponsiveText>
                                        <FontAwesome name="chevron-right" size={Math.max(14, r.responsiveFontSize(14, { max: 1.5 }))} color={page === totalPages ? "#ccc" : "#007BFF"} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    // Header Principal
    mainHeader: {
        backgroundColor: "#007BFF",
        padding: 20,
        alignItems: "center",
        marginBottom: 20,
    },
    mainHeaderContent: {
        alignItems: "center",
        marginBottom: 16,
    },
    mainTitle: {
        color: "#fff",
        textAlign: "center",
        marginBottom: 4,
    },
    mainSubtitle: {
        color: "#e3f2fd",
        textAlign: "center",
    },
    mainHeaderButtons: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: "center",
        width: '100%',
        maxWidth: 400,
    },
    filterButton: {
        backgroundColor: "#0056b3",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minWidth: 120,
        flex: 1,
        justifyContent: 'center',
        flexWrap: "wrap",
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    filterButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    createButton: {
        backgroundColor: "#28a745",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minWidth: 100,
        flex: 1,
        justifyContent: 'center',
        flexWrap: "wrap",
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    createButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    qrButton: {
        backgroundColor: "#ffc107",
        padding: 10,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    // Placeholder Central
    placeholderContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    placeholderText: {
        color: "#666",
        textAlign: "center",
        marginTop: 16,
        fontSize: 18,
    },
    placeholderSubtext: {
        color: "#999",
        textAlign: "center",
        marginTop: 8,
    },
    // Modal Styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '100%',
        flex: 1,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        color: '#333',
        flex: 1,
        marginRight: 16,
    },
    closeButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#f8f9fa',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 16,
    },
    modalResultsHeader: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    modalResultsTitle: {
        color: '#333',
        marginBottom: 4,
    },
    modalResultsCount: {
        color: '#666',
    },
    modalActionButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexWrap: 'wrap',
    },
    // Filtros no Modal
    clearFiltersButton: {
        backgroundColor: "#6c757d",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        marginVertical: 12,
        gap: 6,
        flexWrap: "wrap",
    },
    clearFiltersText: {
        color: "#fff",
        fontWeight: "600",
    },
    filterStatus: {
        marginVertical: 12,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
    },
    viewResultsButton: {
        backgroundColor: "#17a2b8",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 12,
        gap: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    viewResultsButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    statusText: {
        color: "#333",
        marginBottom: 4,
    },
    warningText: {
        color: "#ffc107",
        marginTop: 4,
        fontStyle: "italic",
    },
    debugText: {
        color: "#666",
        marginTop: 2,
        fontStyle: "italic",
    },
    // Listagem no Modal
    loadingContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        color: "#666",
    },
    equipmentListContainer: {
        marginVertical: 12,
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
        flexWrap: 'wrap',
        gap: 8,
    },
    actionButton: {
        padding: 12,
        backgroundColor: "#f8f9fa",
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 44,
        minHeight: 44,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyText: {
        color: "#666",
        textAlign: "center",
        marginTop: 16,
    },
    emptySubtext: {
        color: "#999",
        textAlign: "center",
        marginTop: 8,
    },
    errorText: {
        color: "#FF0000",
        textAlign: "center",
        marginTop: 20,
    },
    // Paginação no Modal Footer
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#f8f9fa',
    },
    paginationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: '#fff',
        gap: 4,
        flex: 1,
        justifyContent: 'center',
        maxWidth: 120,
    },
    prevButton: {
        marginRight: 4,
    },
    nextButton: {
        marginLeft: 4,
    },
    paginationButtonText: {
        color: '#007BFF',
        fontWeight: '600',
    },
    disabledText: {
        color: '#ccc',
    },
    pageText: {
        color: "#333",
        textAlign: 'center',
        flex: 1,
    },
});

export default GeneralEquipmentListScreen;