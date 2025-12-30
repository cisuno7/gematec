import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    TextInput,
    Modal,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
// ➕ ADICIONAR ESTE IMPORT:
import { useUser } from "../../Context/UserContext";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import ActivityService from "../../Services/ActivityService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../Context/LanguageContext";
import WorkService from "../../Services/WorkService";
import { usePermissions } from "../../Context/PermissionsContext";
import ResponsiveContainer from "../../Components/ResponsiveContainer";
import ResponsiveText from "../../Components/ResponsiveText";
import { useResponsive } from "../../hooks/useResponsive";
import { getEquipmentStatusConfig, EquipmentStatus } from "../../constants/activityStatus";

interface ActivityEquipmentListScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "ActivityEquipmentListScreen">;
    route: RouteProp<RootStackParamList, "ActivityEquipmentListScreen">;
}

const ActivityEquipmentListScreen: React.FC<ActivityEquipmentListScreenProps> = ({ route, navigation }) => {
    const r = useResponsive();
    const width = r?.width ?? 414;
    const height = r?.height ?? 896;
    const { t } = useLanguage();
    const { username, clientId: userId } = useUser();
    const { hasPermission } = usePermissions();

    const STATUS_OPTIONS = [
        { label: "Todos", value: "all", icon: "list" },
        { label: "Criado", value: EquipmentStatus.CREATED, icon: "add-circle" },
        { label: "Aberto", value: EquipmentStatus.OPEN, icon: "play-circle" },
        { label: "Pendente", value: EquipmentStatus.PENDING, icon: "schedule" },
        { label: "Aguardando Orçamento", value: EquipmentStatus.WAITING_BUDGET_APPROVAL, icon: "hourglass-outline" },
        { label: "Orçamento Aprovado", value: EquipmentStatus.BUDGET_APPROVAL, icon: "checkmark-circle" },
        { label: "Orçamento Reprovado", value: EquipmentStatus.BUDGET_DISAPPROVAL, icon: "close-circle" },
        { label: "Concluído", value: EquipmentStatus.COMPLETED, icon: "checkmark-done-circle" },
        { label: "Aguardando Registro", value: EquipmentStatus.WAITING_WORK_APPROVAL, icon: "time-outline" },
        { label: "Fechado", value: EquipmentStatus.CLOSED, icon: "check-circle" },
    ];
    const { activityId, activityName, clientId, clientName } = route.params;
    const [equipments, setEquipments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState<string>("");
    
    const [showOnlyStartedByMe, setShowOnlyStartedByMe] = useState<boolean>(false);
    const [sectors, setSectors] = useState<any[]>([]);
    const [selectedSector, setSelectedSector] = useState<string>("all");
    const [subsectors, setSubsectors] = useState<any[]>([]);
    const [selectedSubsector, setSelectedSubsector] = useState<string>("all");
    const [selectedEquipmentVersionIds, setSelectedEquipmentVersionIds] = useState<number[]>([]);
    const [showCreateWorkModal, setShowCreateWorkModal] = useState<boolean>(false);
    const [workName, setWorkName] = useState<string>("");
    const [creatingWork, setCreatingWork] = useState<boolean>(false);
    const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);

    // ✅ Novo estado para os detalhes da atividade
    const [activityDetails, setActivityDetails] = useState<any>(null);

    useEffect(() => {
        // ✅ Adicionar busca dos detalhes da atividade
        fetchActivityDetails();
        fetchEquipments();
        fetchSectors();
    }, [selectedStatus,  selectedSector, selectedSubsector, showOnlyStartedByMe]);

    useEffect(() => {
        console.log('[ActivityEquipmentListScreen] Estado equipments mudou:', equipments.length, 'equipamentos');
    }, [equipments]);

    const fetchEquipments = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");
   // ➕ DETERMINAR SE DEVE FILTRAR POR USUÁRIO ATUAL:
        const openedById = showOnlyStartedByMe && userId !== null ? userId : undefined;
            console.log('[ActivityEquipmentListScreen] Buscando equipamentos da atividade:', activityId);

            // ➕ PASSAR O PARÂMETRO PARA A API:
        const response = await ActivityService.fetchAllActivityEquipments(activityId, { 
            token,
            opened_by_id: openedById
        });
            console.log('[ActivityEquipmentListScreen] Resposta completa:', JSON.stringify(response, null, 2));
            console.log('[ActivityEquipmentListScreen] Tipo da resposta:', typeof response);
            console.log('[ActivityEquipmentListScreen] É array?', Array.isArray(response));
            console.log('[ActivityEquipmentListScreen] Tem results?', response?.results);
            console.log('[ActivityEquipmentListScreen] Tem data?', response?.data);
            console.log('[ActivityEquipmentListScreen] Chaves da resposta:', Object.keys(response || {}));

            // Verificar se a resposta tem a estrutura esperada
            let filteredEquipments = [];
            if (Array.isArray(response)) {
                filteredEquipments = response;
                console.log('[ActivityEquipmentListScreen] Usando resposta como array direto, quantidade:', response.length);
            } else if (response && Array.isArray(response.results)) {
                filteredEquipments = response.results;
                console.log('[ActivityEquipmentListScreen] Usando response.results, quantidade:', response.results.length);
            } else if (response && Array.isArray(response.data)) {
                filteredEquipments = response.data;
                console.log('[ActivityEquipmentListScreen] Usando response.data, quantidade:', response.data.length);
            } else {
                console.warn('[ActivityEquipmentListScreen] Estrutura de resposta inesperada:', response);
                filteredEquipments = [];
            }

            console.log('[ActivityEquipmentListScreen] Equipamentos antes dos filtros:', filteredEquipments.length);
            console.log('[ActivityEquipmentListScreen] Status selecionado:', selectedStatus);
           
            console.log('[ActivityEquipmentListScreen] Termo de busca:', searchTerm);

            // Aplicar filtros
            if (selectedStatus !== "all") {
                const beforeFilter = filteredEquipments.length;
                filteredEquipments = filteredEquipments.filter((eq: any) => eq.status === selectedStatus);
                console.log('[ActivityEquipmentListScreen] Filtro de status aplicado:', beforeFilter, '->', filteredEquipments.length);
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
                const beforeFilter = filteredEquipments.length;
                filteredEquipments = filteredEquipments.filter((eq: any) =>
                    eq.equipment?.id?.toString().includes(searchTerm) ||
                    eq.equipment?.tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    eq.equipment?.brand?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    eq.equipment?.equipment_type?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                );
                console.log('[ActivityEquipmentListScreen] Filtro de busca aplicado:', beforeFilter, '->', filteredEquipments.length, 'termo:', searchTerm);
            }



            console.log('[ActivityEquipmentListScreen] Equipamentos filtrados finais:', filteredEquipments.length);
            console.log('[ActivityEquipmentListScreen] Primeiro equipamento (exemplo):', filteredEquipments[0]);
            console.log('[ActivityEquipmentListScreen] Definindo equipments com', filteredEquipments.length, 'itens');
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

            if (!clientId) {
                console.warn('[ActivityEquipmentListScreen] clientId não fornecido, pulando busca de setores');
                return;
            }

            console.log('[ActivityEquipmentListScreen] Buscando setores para clientId:', clientId);

            // Buscar apenas setores pais (level 0) do cliente
            const { buildApiUrlForAccount } = require('../../config/apiConfig');
            const apiUrl = await buildApiUrlForAccount();
            const response = await fetch(`${apiUrl}/clients/${clientId}/sectors`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('[ActivityEquipmentListScreen] Status da resposta:', response.status);

            if (!response.ok) {
                console.warn('[ActivityEquipmentListScreen] Erro na resposta da API:', response.status, response.statusText);
                return;
            }

            const text = await response.text();
            console.log('[ActivityEquipmentListScreen] Resposta da API:', text.substring(0, 200) + '...');

            if (!text) {
                console.warn('[ActivityEquipmentListScreen] Resposta vazia da API');
                return;
            }

            const data = JSON.parse(text);
            console.log('[ActivityEquipmentListScreen] Setores encontrados:', data.results?.length || 0);
            setSectors(data.results || []);
        } catch (error) {
            console.error('[ActivityEquipmentListScreen] Erro ao buscar setores:', error);
            setSectors([]);
        }
    };

    // ✅ Novo método para buscar detalhes da atividade
    const fetchActivityDetails = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            console.log('[ActivityEquipmentListScreen] Buscando detalhes da atividade:', activityId);

            const response = await ActivityService.fetchActivityDetails(activityId, { token });
            console.log('[ActivityEquipmentListScreen] Detalhes da atividade recebidos:', response);

            setActivityDetails(response);
        } catch (error: any) {
            console.error('[ActivityEquipmentListScreen] Erro ao buscar detalhes da atividade:', error);
            // Não bloquear a tela se não conseguir buscar detalhes
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        // ✅ Buscar detalhes da atividade também no refresh
        await Promise.all([
            fetchActivityDetails(),
            fetchEquipments()
        ]);
        setRefreshing(false);
    };


    const renderEquipmentCard = ({ item }: { item: any }) => {
        console.log('[ActivityEquipmentListScreen] Renderizando equipamento:', item.id, item.equipment?.tag);
        const equipment = item.equipment;
        const statusInfo = getEquipmentStatusConfig(item.status || EquipmentStatus.CREATED);
        const statusColor = statusInfo.color;
        const statusIcon = statusInfo.icon;
        const statusTranslation = statusInfo.translation;
        const isSelected = selectedEquipmentVersionIds.includes(item.id);

        const navigateToDetails = () => {
            // Navegar para a tela de questionário da atividade
            // Tag é opcional - pode ser undefined/null
            const params = {
                activityId: activityId,
                activityEquipmentId: item.id,
                equipmentId: equipment.id,
                equipmentTag: equipment.tag || undefined, // Tag opcional
                activityName: activityName,
            };

            console.log('[ActivityEquipmentListScreen] Navegando para questionário com params:', params);

            navigation.navigate("ActivityQuestionnaireScreen", params);
        };

        return (
            <TouchableOpacity
                style={[styles.equipmentCard, {
                    marginBottom: r.spacing(1),
                    minHeight: r.verticalScale(140)
                }]}
                onPress={navigateToDetails}
                activeOpacity={0.7}
            >
                <View style={[styles.cardHeader, { padding: r.spacing(1.25) }]}>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedEquipmentVersionIds((prev) =>
                                prev.includes(item.id)
                                    ? prev.filter((id) => id !== item.id)
                                    : [...prev, item.id]
                            );
                        }}
                        style={[styles.checkbox, { marginRight: r.spacing(1) }]}
                    >
                        <MaterialIcons
                            name={isSelected ? "check-box" : "check-box-outline-blank"}
                            size={r.scale(22)}
                            color={isSelected ? "#007bff" : "#666"}
                        />
                    </TouchableOpacity>
                    <View style={styles.equipmentInfo}>
                        <View style={[styles.equipmentIcon, { backgroundColor: '#007bff20' }]}>
                            <MaterialIcons name="build" size={r.scale(20)} color="#007bff" />
                        </View>
                        <View style={styles.equipmentDetails}>
                            <ResponsiveText
                                variant="subtitle"
                                weight="600"
                                style={styles.equipmentTag}
                                numberOfLines={1}
                            >
                                {equipment.tag}
                            </ResponsiveText>
                            <ResponsiveText
                                variant="caption"
                                style={styles.equipmentId}
                                numberOfLines={1}
                            >
                                ID: #{item.id}
                            </ResponsiveText>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Ionicons name={statusIcon as any} size={r.scale(16)} color={statusColor} />
                        <ResponsiveText
                            variant="caption"
                            weight="600"
                            style={[styles.statusText, { color: statusColor }]}
                            numberOfLines={1}
                        >
                            {statusTranslation}
                        </ResponsiveText>
                    </View>
                </View>

                <View style={[styles.cardContent, { padding: r.spacing(1.25), flex: 1 }]}>
                    <View style={styles.equipmentMeta}>
                        {item.open_by?.name && (
                            <View style={styles.metaItem}>
                                <View style={[styles.metaIcon, { backgroundColor: '#dc354520' }]}>
                                    <MaterialIcons name="person" size={r.scale(14)} color="#dc3545" />
                                </View>
                                <View style={styles.metaContent}>
                                    <ResponsiveText variant="caption" weight="600" style={styles.metaLabel}>
                                        Iniciado por
                                    </ResponsiveText>
                                    <ResponsiveText variant="body" style={styles.metaValue}>
                                        {item.open_by.name}
                                    </ResponsiveText>
                                </View>
                            </View>
                        )}

                        <View style={styles.specsGrid}>
                            <View style={styles.specItem}>
                                <MaterialIcons name="branding-watermark" size={r.scale(14)} color="#666" />
                                <ResponsiveText variant="caption" style={styles.specText} numberOfLines={1}>
                                    {equipment.brand?.name || equipment.manufacturer?.name || "N/A"}
                                </ResponsiveText>
                            </View>

                            <View style={styles.specItem}>
                                <MaterialIcons name="category" size={r.scale(14)} color="#666" />
                                <ResponsiveText variant="caption" style={styles.specText} numberOfLines={1}>
                                    {equipment.equipment_type?.name || "N/A"}
                                </ResponsiveText>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={[styles.cardFooter, { padding: r.spacing(1.25) }]}>
                    <TouchableOpacity style={styles.detailsButton} onPress={navigateToDetails}>
                        <ResponsiveText variant="body" weight="600" style={styles.detailsButtonText}>
                            {item.status === EquipmentStatus.CREATED ? t('activityEquipmentList.startActivity') : t('activityEquipmentList.viewDetails')}
                        </ResponsiveText>
                        <MaterialIcons name="arrow-forward" size={r.scale(18)} color="#007bff" />
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

    // ✅ Componente para renderizar informações do cliente
    const renderClientInfo = () => {
        if (!activityDetails || !activityDetails.client) {
            return null;
        }

        const { client } = activityDetails;
        const addresses = client.addresses || [];

        return (
            <View style={styles.clientInfoSection}>
                <Text style={styles.sectionTitle}>Informações do Cliente</Text>

                {/* Nome do Cliente */}
                <View style={styles.clientNameContainer}>
                    <MaterialIcons name="person" size={20} color="#007bff" />
                    <Text style={styles.clientName}>{client.name}</Text>
                </View>

                {/* Endereços do Cliente */}
                {addresses.length > 0 && (
                    <View style={styles.addressesContainer}>
                        <Text style={styles.addressesTitle}>Endereços ({addresses.length})</Text>
                        {addresses.map((address: any, index: number) => (
                            <View key={address.id || index} style={styles.addressCard}>
                                <View style={styles.addressHeader}>
                                    <MaterialIcons name="location-on" size={16} color="#666" />
                                    <Text style={styles.addressName}>{address.name || `Endereço ${index + 1}`}</Text>
                                </View>
                                <Text style={styles.addressText}>
                                    {`${address.street}${address.number ? `, ${address.number}` : ''}`}
                                    {address.complement ? `, ${address.complement}` : ''}
                                </Text>
                                <Text style={styles.addressText}>
                                    {address.neighborhood}, {address.city?.name} - {address.state?.name}
                                </Text>
                                <Text style={styles.addressText}>
                                    CEP: {address.zipcode || 'N/A'}
                                </Text>
                                {address.reference_point && (
                                    <Text style={styles.referenceText}>
                                        Ref: {address.reference_point}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Observação da Atividade */}
                <View style={styles.observationContainer}>
                    <Text style={styles.observationTitle}>Observação</Text>
                    <Text style={styles.observationText}>
                        {activityDetails?.observation && activityDetails.observation.trim().length > 0
                            ? activityDetails.observation
                            : '—'}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <ResponsiveContainer withPadding={false} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={[styles.backButton, {
                        width: r.scale(40),
                        height: r.scale(40),
                        borderRadius: r.scale(20),
                    }]}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={r.scale(24)} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <ResponsiveText variant="title" weight="bold" style={styles.headerTitle}>
                        {activityName}
                    </ResponsiveText>
                    <ResponsiveText variant="caption" style={styles.headerSubtitle}>
                        {t('activityEquipmentList.title')}
                    </ResponsiveText>
                </View>
                <TouchableOpacity
                    style={[styles.filterButton, {
                        width: r.scale(40),
                        height: r.scale(40),
                        borderRadius: r.scale(20),
                    }]}
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
                {/* ✅ NOVA SEÇÃO - Informações do Cliente */}
                {renderClientInfo()}


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
                    ) : (() => {
                        console.log('[ActivityEquipmentListScreen] Verificando condição de renderização: equipments.length =', equipments.length);
                        return equipments.length === 0;
                    })() ? (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="build" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>Nenhum equipamento vinculado</Text>
                            <Text style={styles.emptySubtext}>
                                Esta atividade ainda não possui equipamentos vinculados.{'\n'}
                                Os equipamentos devem ser vinculados pelo administrador do sistema.
                            </Text>
                            <View style={styles.emptyInfo}>
                                <Text style={styles.emptyInfoText}>
                                    • Atividade ID: {activityId}{'\n'}
                                    • Nome: {activityName}{'\n'}
                                    • Cliente: {clientName || 'N/A'}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <>
                            {console.log('[ActivityEquipmentListScreen] Renderizando FlatList com', equipments.length, 'equipamentos')}
                            <FlatList
                                data={equipments}
                                keyExtractor={(item) => `${item.id}`}
                                renderItem={renderEquipmentCard}
                                scrollEnabled={false}
                                showsVerticalScrollIndicator={false}
                            />
                        </>
                    )}
                </View>

                {/* Botão para Registrar Trabalho */}
                {hasPermission('add_activitywork') && (
                    <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
                        <TouchableOpacity
                            style={[styles.registerButton, selectedEquipmentVersionIds.length === 0 && styles.registerButtonDisabled]}
                            disabled={selectedEquipmentVersionIds.length === 0}
                            onPress={() => setShowCreateWorkModal(true)}
                        >
                            <MaterialIcons name="assignment" size={20} color="#fff" />
                            <Text style={styles.registerButtonText}>Registrar trabalho</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Botão para Listar Registros de Trabalho */}
                {(hasPermission('list_activityworks') || hasPermission('list_me_activityworks')) && (
                    <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
                        <TouchableOpacity
                            style={styles.listButton}
                            onPress={() => navigation.navigate('WorkListScreen', { activityId, activityName })}
                        >
                            <MaterialIcons name="list" size={20} color="#fff" />
                            <Text style={styles.listButtonText}>Listar registros de trabalho</Text>
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
                                    Filtros de Equipamentos
                                </ResponsiveText>
                                <ResponsiveText variant="caption" style={styles.modalSubtitle}>
                                    Refine sua busca na atividade atual
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
                            {/* Busca */}
                            <View style={styles.filterSection}>
                                <ResponsiveText variant="body" weight="600" style={styles.filterSectionTitle}>
                                    Busca
                                </ResponsiveText>
                                <TextInput
                                    style={[styles.searchInput, { marginTop: r.spacing(0.5) }]}
                                    placeholder="Buscar por ID, Tag, Fabricante ou Tipo"
                                    placeholderTextColor="#999"
                                    value={searchTerm}
                                    onChangeText={setSearchTerm}
                                />
                            </View>

                            {/* Status */}
                            <View style={styles.filterSection}>
                                <ResponsiveText variant="body" weight="600" style={styles.filterSectionTitle}>
                                    Status
                                </ResponsiveText>
                                <View style={styles.statusGrid}>
                                    {STATUS_OPTIONS.map((status) => (
                                        <TouchableOpacity
                                            key={status.value}
                                            style={[
                                                styles.statusChip,
                                                selectedStatus === status.value && styles.statusChipSelected
                                            ]}
                                            onPress={() => setSelectedStatus(status.value)}
                                        >
                                            <Ionicons
                                                name={status.icon as any}
                                                size={r.scale(16)}
                                                color={selectedStatus === status.value ? "#fff" : status.value === "all" ? "#007bff" : "#666"}
                                            />
                                            <ResponsiveText
                                                variant="caption"
                                                weight="600"
                                                style={[
                                                    styles.statusChipText,
                                                    selectedStatus === status.value && styles.statusChipTextSelected
                                                ]}
                                            >
                                                {status.label}
                                            </ResponsiveText>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Setor */}
                            {sectors.length > 0 && (
                                <View style={styles.filterSection}>
                                    <ResponsiveText variant="body" weight="600" style={styles.filterSectionTitle}>
                                        Setor
                                    </ResponsiveText>
                                    <View style={styles.sectorGrid}>
                                        <TouchableOpacity
                                            style={[
                                                styles.sectorChip,
                                                selectedSector === "all" && styles.sectorChipSelected
                                            ]}
                                            onPress={() => setSelectedSector("all")}
                                        >
                                            <ResponsiveText
                                                variant="body"
                                                style={[
                                                    styles.sectorChipText,
                                                    selectedSector === "all" && styles.sectorChipTextSelected
                                                ]}
                                            >
                                                Todos
                                            </ResponsiveText>
                                        </TouchableOpacity>
                                        {sectors.map((sector) => (
                                            <TouchableOpacity
                                                key={sector.id}
                                                style={[
                                                    styles.sectorChip,
                                                    selectedSector === sector.id.toString() && styles.sectorChipSelected
                                                ]}
                                                onPress={() => setSelectedSector(sector.id.toString())}
                                            >
                                                <ResponsiveText
                                                    variant="body"
                                                    style={[
                                                        styles.sectorChipText,
                                                        selectedSector === sector.id.toString() && styles.sectorChipTextSelected
                                                    ]}
                                                >
                                                    {sector.name}
                                                </ResponsiveText>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Apenas Iniciados por Mim */}
                            <View style={styles.filterSection}>
                                <TouchableOpacity
                                    style={[
                                        styles.personalFilter,
                                        showOnlyStartedByMe && styles.personalFilterSelected,
                                        { padding: r.spacing(1) }
                                    ]}
                                    onPress={() => setShowOnlyStartedByMe(!showOnlyStartedByMe)}
                                >
                                    <MaterialIcons
                                        name={showOnlyStartedByMe ? "check-box" : "check-box-outline-blank"}
                                        size={r.scale(20)}
                                        color={showOnlyStartedByMe ? "#6f42c1" : "#666"}
                                    />
                                    <ResponsiveText
                                        variant="body"
                                        style={[
                                            styles.personalFilterText,
                                            showOnlyStartedByMe && styles.personalFilterTextSelected
                                        ]}
                                    >
                                        Iniciados por mim
                                    </ResponsiveText>
                                </TouchableOpacity>
                            </View>

                            {/* Botões de Ação */}
                            <View style={[styles.modalActions, { marginTop: r.spacing(2) }]}>
                                <TouchableOpacity
                                    style={styles.clearFiltersButton}
                                    onPress={() => {
                                        setSelectedStatus("all");
                                        setSelectedSector("all");
                                        setShowOnlyStartedByMe(false);
                                        setSearchTerm("");
                                    }}
                                >
                                    <ResponsiveText variant="body" weight="600" style={styles.clearFiltersText}>
                                        Limpar Filtros
                                    </ResponsiveText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.applyFiltersButton}
                                    onPress={() => setShowFiltersModal(false)}
                                >
                                    <ResponsiveText variant="button" weight="600" style={styles.applyFiltersText}>
                                        Aplicar
                                    </ResponsiveText>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal de Criação de Trabalho */}
            <Modal visible={showCreateWorkModal && hasPermission('add_activitywork')} transparent animationType="slide" onRequestClose={() => setShowCreateWorkModal(false)}>
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <TouchableOpacity
                        style={styles.modalOverlayTouchable}
                        activeOpacity={1}
                        onPress={() => setShowCreateWorkModal(false)}
                    >
                        <View
                            style={[styles.modalContent, { maxWidth: width * 0.9, maxHeight: height * 0.85 }]}
                            onStartShouldSetResponder={() => true}
                        >
                            <View style={styles.modalHeader}>
                                <View style={styles.modalHeaderContent}>
                                    <Text style={styles.modalTitle}>Criar Registro de Trabalho</Text>
                                    <Text style={styles.modalSubtitle}>Atividade: {activityName}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.modalCloseButton}
                                    onPress={() => setShowCreateWorkModal(false)}
                                >
                                    <Ionicons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                style={[styles.modalBodyScroll, { maxHeight: height * 0.45 }]}
                                contentContainerStyle={styles.modalBodyContent}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={true}
                            >
                                <Text style={styles.inputLabel}>Nome do registro</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Ex.: Trabalho diário"
                                    placeholderTextColor="#999"
                                    value={workName}
                                    onChangeText={setWorkName}
                                />
                                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Equipamentos selecionados</Text>
                                <View style={styles.equipmentsListContainer}>
                                    <ScrollView nestedScrollEnabled={true}>
                                        {equipments
                                            .filter((ev: any) => selectedEquipmentVersionIds.includes(ev.id))
                                            .map((ev: any) => (
                                                <View key={ev.id} style={styles.summaryRow}>
                                                    <MaterialIcons name="build" size={16} color="#666" />
                                                    <Text style={styles.summaryText}>#{ev.id} • {ev.equipment?.tag} • {ev.equipment?.equipment_type?.name}</Text>
                                                </View>
                                            ))}
                                    </ScrollView>
                                </View>
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowCreateWorkModal(false)} disabled={creatingWork}>
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.confirmButton]}
                                    onPress={async () => {
                                        try {
                                            if (!workName.trim()) {
                                                Alert.alert("Nome obrigatório", "Informe um nome para o registro.");
                                                return;
                                            }
                                            setCreatingWork(true);
                                            const token = await AsyncStorage.getItem("access_token");
                                            if (!token) throw new Error("Token não encontrado");
                                            const created = await WorkService.create(activityId, {
                                                name: workName.trim(),
                                                activity_equipment_versions_ids: selectedEquipmentVersionIds,
                                            }, token);
                                            setShowCreateWorkModal(false);
                                            setWorkName("");
                                            navigation.navigate("WorkDetailScreen", { activityId, workId: created.id });
                                        } catch (e: any) {
                                            Alert.alert("Erro", e.message || "Falha ao criar registro de trabalho");
                                        } finally {
                                            setCreatingWork(false);
                                        }
                                    }}
                                    disabled={creatingWork}
                                >
                                    <Text style={styles.confirmButtonText}>{creatingWork ? "Salvando..." : "Salvar"}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
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
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
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
        marginLeft: 16,
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
    filtersBar: {
        backgroundColor: "#fff",
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    filtersButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        gap: 8,
        borderWidth: 1,
        borderColor: "#007bff",
    },
    filtersButtonText: {
        color: "#007bff",
        flex: 1,
    },
    filterBadge: {
        backgroundColor: "#007bff",
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 6,
    },
    filterBadgeText: {
        color: "#fff",
        fontSize: 12,
    },
    quickSearchInput: {
        flex: 1,
        backgroundColor: "#f8f9fa",
        fontSize: 16,
        color: "#000",
        borderWidth: 1,
        borderColor: "#e9ecef",
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
        color: "#000",
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
    emptyInfo: {
        marginTop: 16,
        padding: 16,
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e9ecef",
    },
    emptyInfoText: {
        fontSize: 12,
        color: "#666",
        lineHeight: 18,
    },
    equipmentCard: {
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
    checkbox: {
        padding: 4,
    },
    equipmentInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    equipmentIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    equipmentDetails: {
        flex: 1,
    },
    equipmentTag: {
        color: "#333",
        marginBottom: 2,
    },
    equipmentId: {
        color: "#666",
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        marginLeft: 4,
    },
    cardContent: {
        backgroundColor: "#fff",
    },
    equipmentMeta: {
        gap: 12,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    metaIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    metaContent: {
        flex: 1,
    },
    metaLabel: {
        color: "#666",
        marginBottom: 2,
    },
    metaValue: {
        color: "#333",
    },
    specsGrid: {
        flexDirection: "row",
        gap: 16,
        marginTop: 8,
    },
    specItem: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    specText: {
        color: "#666",
        marginLeft: 6,
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
        backgroundColor: "transparent",
    },
    registerButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#28a745",
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    registerButtonDisabled: {
        backgroundColor: "#98d4a5",
    },
    registerButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    listButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#007bff",
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    listButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalOverlayTouchable: {
        flex: 1,
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
    filterSection: {
        marginBottom: 24,
    },
    filterSectionTitle: {
        color: "#333",
        marginBottom: 8,
    },
    statusGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
    },
    statusChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: "#e9ecef",
    },
    statusChipSelected: {
        backgroundColor: "#007bff",
        borderColor: "#007bff",
    },
    statusChipText: {
        color: "#666",
    },
    statusChipTextSelected: {
        color: "#fff",
    },
    sectorGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
    },
    sectorChip: {
        backgroundColor: "#f8f9fa",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#007bff",
    },
    sectorChipSelected: {
        backgroundColor: "#007bff",
    },
    sectorChipText: {
        color: "#007bff",
    },
    sectorChipTextSelected: {
        color: "#fff",
    },
    personalFilter: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e9ecef",
    },
    personalFilterSelected: {
        backgroundColor: "#f3f0ff",
        borderColor: "#6f42c1",
    },
    personalFilterText: {
        color: "#666",
        marginLeft: 8,
    },
    personalFilterTextSelected: {
        color: "#6f42c1",
        fontWeight: "500",
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    clearFiltersButton: {
        flex: 1,
        backgroundColor: "#f8f9fa",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    clearFiltersText: {
        color: "#666",
    },
    applyFiltersButton: {
        flex: 1,
        backgroundColor: "#007bff",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    applyFiltersText: {
        color: "#fff",
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
    modalButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 8,
    },
    cancelButton: {
        backgroundColor: "#f1f3f5",
    },
    cancelButtonText: {
        color: "#333",
        fontWeight: "600",
    },
    confirmButton: {
        backgroundColor: "#007bff",
    },
    confirmButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    clientInfoSection: {
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
    clientNameContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    clientName: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginLeft: 8,
    },
    
    addressesContainer: {
        marginTop: 8,
    },
    addressesTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
        marginBottom: 12,
    },
    addressCard: {
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#007bff",
    },
    addressHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    addressName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        marginLeft: 4,
    },
    addressText: {
        fontSize: 13,
        color: "#666",
        marginBottom: 4,
        lineHeight: 18,
    },
    referenceText: {
        fontSize: 12,
        color: "#999",
        fontStyle: "italic",
        marginTop: 4,
    },
    observationContainer: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
    },
    observationTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
        marginBottom: 8,
    },
    observationText: {
        fontSize: 14,
        color: "#333",
        lineHeight: 20,
    },
    modalContent: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        overflow: 'hidden',
    },
    modalBodyScroll: {
    },
    modalBodyContent: {
        padding: 16,
        paddingBottom: 10,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        marginBottom: 6,
    },
    textInput: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 10,
        backgroundColor: "#fff",
        color: "#000",
    },
    equipmentsListContainer: {
        maxHeight: 160,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        borderRadius: 8,
        padding: 8,
        backgroundColor: "#f8f9fa",
    },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 6,
    },
    summaryText: {
        color: "#333",
        fontSize: 14,
    },
});

export default ActivityEquipmentListScreen; 