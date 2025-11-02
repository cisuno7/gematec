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
    Modal,
    Alert,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import ActivityService from "../../Services/ActivityService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../Context/LanguageContext";
import WorkService from "../../Services/WorkService";
import { usePermissions } from "../../Context/PermissionsContext";

const { width } = Dimensions.get('window');

interface ActivityEquipmentListScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "ActivityEquipmentListScreen">;
    route: RouteProp<RootStackParamList, "ActivityEquipmentListScreen">;
}

const ActivityEquipmentListScreen: React.FC<ActivityEquipmentListScreenProps> = ({ route, navigation }) => {
    const { t } = useLanguage();
    const { hasPermission } = usePermissions();

    const STATUS_OPTIONS = [
        { label: "Todos", value: "all", icon: "list" },
        { label: "Pendente", value: "pending", icon: "pending" },
        { label: "Aberto", value: "open", icon: "play-circle" },
        { label: "Fechado", value: "closed", icon: "check" },
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
    const [selectedEquipmentVersionIds, setSelectedEquipmentVersionIds] = useState<number[]>([]);
    const [showCreateWorkModal, setShowCreateWorkModal] = useState<boolean>(false);
    const [workName, setWorkName] = useState<string>("");
    const [creatingWork, setCreatingWork] = useState<boolean>(false);

    // ✅ Novo estado para os detalhes da atividade
    const [activityDetails, setActivityDetails] = useState<any>(null);

    useEffect(() => {
        // ✅ Adicionar busca dos detalhes da atividade
        fetchActivityDetails();
        fetchEquipments();
        fetchSectors();
    }, [selectedStatus, showOnlyStarted, selectedSector, selectedSubsector]);

    useEffect(() => {
        console.log('[ActivityEquipmentListScreen] Estado equipments mudou:', equipments.length, 'equipamentos');
    }, [equipments]);

    const fetchEquipments = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            console.log('[ActivityEquipmentListScreen] Buscando equipamentos da atividade:', activityId);

            const response = await ActivityService.fetchAllActivityEquipments(activityId, { token });
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
            console.log('[ActivityEquipmentListScreen] Mostrar apenas iniciados:', showOnlyStarted);
            console.log('[ActivityEquipmentListScreen] Termo de busca:', searchTerm);

            // Aplicar filtros
            if (selectedStatus !== "all") {
                const beforeFilter = filteredEquipments.length;
                filteredEquipments = filteredEquipments.filter((eq: any) => eq.status === selectedStatus);
                console.log('[ActivityEquipmentListScreen] Filtro de status aplicado:', beforeFilter, '->', filteredEquipments.length);
            }

            if (showOnlyStarted) {
                const beforeFilter = filteredEquipments.length;
                filteredEquipments = filteredEquipments.filter((eq: any) => eq.status === "open" || eq.status === "pending");
                console.log('[ActivityEquipmentListScreen] Filtro de iniciados aplicado:', beforeFilter, '->', filteredEquipments.length);
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

    const statusTranslations: { [key: string]: string } = {
        created: t('activityEquipmentList.created'),
        pending: "Pendente",
        open: "Aberto",
        closed: "Fechado",
        waiting_budget_approval: "Aguardando Aprovação de Orçamento",
        budget_not_approved: "Orçamento não aprovado",
    };

    const statusColors: { [key: string]: string } = {
        created: "#6c757d",
        open: "#007bff", // Azul
        pending: "#ffc107", // Amarelo
        closed: "#6c757d", // Cinza
        waiting_budget_approval: "#6f42c1", // Roxo
        budget_not_approved: "#dc3545", // Vermelho
    };

    const statusIcons: { [key: string]: string } = {
        created: "add-circle",
        open: "play-circle",
        pending: "schedule",
        closed: "check-circle",
        waiting_budget_approval: "cash",
        budget_not_approved: "close-circle",
    };

    const renderEquipmentCard = ({ item }: { item: any }) => {
        console.log('[ActivityEquipmentListScreen] Renderizando equipamento:', item.id, item.equipment?.tag);
        const equipment = item.equipment;
        const statusColor = statusColors[item.status] || "#6c757d";
        const statusIcon = statusIcons[item.status] || "help-circle";
        const isSelected = selectedEquipmentVersionIds.includes(item.id);

        const navigateToDetails = () => {
            // Navegar para a tela de questionário da atividade
            const params = {
                activityId: activityId,
                activityEquipmentId: item.id,
                equipmentId: equipment.id,
                equipmentTag: equipment.tag,
                activityName: activityName,
            };

            console.log('[ActivityEquipmentListScreen] Navegando para questionário com params:', params);

            navigation.navigate("ActivityQuestionnaireScreen", params);
        };

        return (
            <TouchableOpacity style={styles.equipmentCard} onPress={navigateToDetails}>
                <View style={styles.cardHeader}>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedEquipmentVersionIds((prev) =>
                                prev.includes(item.id)
                                    ? prev.filter((id) => id !== item.id)
                                    : [...prev, item.id]
                            );
                        }}
                        style={{ marginRight: 12 }}
                    >
                        <MaterialIcons name={isSelected ? "check-box" : "check-box-outline-blank"} size={22} color={isSelected ? "#007bff" : "#666"} />
                    </TouchableOpacity>
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
                        <MaterialIcons name="person" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {clientName || "N/A"}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialIcons name="build" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            Tag: {equipment.tag || "N/A"}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialIcons name="branding-watermark" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {equipment.brand?.name || equipment.manufacturer?.name || "N/A"}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialIcons name="category" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {equipment.equipment_type?.name || "N/A"}
                        </Text>
                    </View>
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
                {/* ✅ NOVA SEÇÃO - Informações do Cliente */}
                {renderClientInfo()}

                {/* Filtros */}
                <View style={styles.filtersSection}>
                    <Text style={styles.sectionTitle}>{t('activityEquipmentList.filters')}</Text>

                    {/* Busca */}
                    <Text style={styles.filterLabel}>{t('activityEquipmentList.search')}</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por ID, Tag, Fabricante ou Tipo"
                        placeholderTextColor="#999"
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
                                        Todos
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

            {/* Modal de Criação de Trabalho */}
            <Modal visible={showCreateWorkModal && hasPermission('add_activitywork')} transparent animationType="slide" onRequestClose={() => setShowCreateWorkModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Criar Registro de Trabalho</Text>
                        <Text style={styles.modalSubtitle}>Atividade: {activityName}</Text>
                        <Text style={styles.inputLabel}>Nome do registro</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Ex.: Trabalho diário"
                            placeholderTextColor="#999"
                            value={workName}
                            onChangeText={setWorkName}
                        />
                        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Equipamentos selecionados</Text>
                        <View style={{ maxHeight: 160 }}>
                            <ScrollView>
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
                </View>
            </Modal>
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
        backgroundColor: "transparent",
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
        backgroundColor: "transparent",
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
        backgroundColor: "transparent",
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
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modalContent: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 12,
        color: "#666",
        marginBottom: 12,
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
    modalActions: {
        flexDirection: "row",
        gap: 8,
        marginTop: 16,
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
});

export default ActivityEquipmentListScreen; 