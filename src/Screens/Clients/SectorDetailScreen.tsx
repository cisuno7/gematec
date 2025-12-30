import React, { useState, useEffect } from "react";
import {
    View,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    FlatList,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import ClientService from "../../Services/ClientService";
import { usePermissions } from "../../Context/PermissionsContext";
import { useLanguage } from "../../Context/LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Sector } from "../../Models/Clientes";
import ResponsiveContainer from "../../Components/ResponsiveContainer";
import AppTextInput from "../../Components/AppTextInput";
import ResponsiveText from "../../Components/ResponsiveText";
import { useResponsive } from "../../hooks/useResponsive";

interface SectorDetailScreenProps {
    route: RouteProp<RootStackParamList, "SectorDetailScreen">;
    navigation: DrawerNavigationProp<RootStackParamList>;
}

const SectorDetailScreen: React.FC<SectorDetailScreenProps> = ({ route, navigation }) => {
    const { hasPermission } = usePermissions();
    const { t } = useLanguage();
    const r = useResponsive();
    const { clientId, sectorId } = route.params;

    const [sector, setSector] = useState<Sector | null>(null);
    const [subsectors, setSubsectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newSubsectorName, setNewSubsectorName] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchSectorDetails();
    }, [sectorId]);

    const fetchSectorDetails = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            console.log("[SectorDetailScreen] 🚀 FUNÇÃO fetchSectorDetails FOI CHAMADA!");
            console.log("[SectorDetailScreen] ClientId:", clientId, "SectorId:", sectorId);
            
            if (!token) throw new Error("Token de acesso não encontrado.");
            console.log("[SectorDetailScreen] 🔍 DEBUG - Buscando detalhes do setor:");
            console.log("[SectorDetailScreen] Client ID:", clientId);
            console.log("[SectorDetailScreen] Sector ID:", sectorId);
            // Buscar detalhes do setor
            const sectorData = await ClientService.getSectorDetails(clientId.toString(), sectorId, token);
            setSector(sectorData);
            console.log("[SectorDetailScreen] 🚨 RESPOSTA DO ENDPOINT DE DETALHES:");
console.log("[SectorDetailScreen] URL chamada: /clients/" + clientId + "/sectors/" + sectorId);
console.log("[SectorDetailScreen] JSON completo:", JSON.stringify(sectorData, null, 2));
console.log("[SectorDetailScreen] Campos procurados:");
console.log("[SectorDetailScreen] equipment_count:", sectorData.equipment_count, "(esperado: number)");
console.log("[SectorDetailScreen] subsector_count:", sectorData.subsector_count, "(esperado: number)");
console.log("[SectorDetailScreen] Campos que existem na resposta:");
console.log("[SectorDetailScreen] total_equipments:", sectorData.total_equipments);
console.log("[SectorDetailScreen] total_subsectors:", sectorData.total_subsectors);

            // Buscar subsetores se for um setor pai
            if (sectorData.level === 0) {
                try {
                    const subsectorsData = await ClientService.getClientSectors(clientId.toString(), token, undefined, sectorId);
                    setSubsectors(subsectorsData.results || []);
                } catch (error) {
                    console.error("Erro ao buscar subsetores:", error);
                }
            }

        } catch (error: any) {
            console.error("[SectorDetailScreen] Erro ao buscar detalhes:", error);
            Alert.alert(t('common.error'), error.message || t('sectors.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubsector = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado.");
            if (!newSubsectorName.trim()) {
                Alert.alert(t('common.error'), t('sectors.name') + ' é obrigatório.');
                return;
            }
            setCreating(true);
            await ClientService.createClientSector(clientId.toString(), token, newSubsectorName, sectorId);
            setShowCreateModal(false);
            setNewSubsectorName("");
            await fetchSectorDetails();
        } catch (err: any) {
            Alert.alert(t('common.error'), err.message || t('sectors.loadError'));
        } finally {
            setCreating(false);
        }
    };

    if (!hasPermission("view_sector")) {
        return (
            <ResponsiveContainer withPadding={false} style={styles.container}>
                <ResponsiveText variant="body" style={styles.errorText}>
                    {t('sectors.noPermission')}
                </ResponsiveText>
            </ResponsiveContainer>
        );
    }

    if (loading) {
        return (
            <ResponsiveContainer withPadding={false} style={styles.container}>
                <ActivityIndicator size="large" color="#007BFF" />
                <ResponsiveText variant="body" style={styles.loadingText}>
                    {t('sectors.loadingDetails')}
                </ResponsiveText>
            </ResponsiveContainer>
        );
    }

    if (!sector) {
        return (
            <ResponsiveContainer withPadding={false} style={styles.container}>
                <ResponsiveText variant="body" style={styles.errorText}>
                    {t('sectors.notFound')}
                </ResponsiveText>
            </ResponsiveContainer>
        );
    }

    const renderSubsectorItem = ({ item }: { item: Sector }) => (
        <View style={styles.subsectorItem}>
            <View style={styles.subsectorHeader}>
                <ResponsiveText variant="subtitle" style={styles.subsectorName} numberOfLines={2}>
                    {item.name}
                </ResponsiveText>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.actionButton, { minHeight: r.verticalScale(40) }]}
                    onPress={() => navigation.navigate("EquipmentListScreen", { clientId, sectorId: item.id })}
                >
                    <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.actionButtonText}>
                        🔧 Listar Equipamentos
                    </ResponsiveText>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { minHeight: r.verticalScale(40) }]}
                    onPress={() => navigation.navigate("SectorDetailScreen", { clientId, sectorId: item.id })}
                >
                    <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.actionButtonText}>
                        👁️ Visualizar Setor
                    </ResponsiveText>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ResponsiveContainer withPadding={false} style={styles.container} scroll={true}>
            {/* Informações do Setor */}
            <View style={styles.section}>
                <ResponsiveText variant="subtitle" style={styles.sectionTitle}>
                    {t('sectors.infoTitle')}
                </ResponsiveText>
                <View style={styles.infoRow}>
                    <ResponsiveText variant="caption" style={styles.label}>
                        {t('sectors.name')}:
                    </ResponsiveText>
                    <ResponsiveText variant="body" style={styles.value} numberOfLines={2}>
                        {sector.name}
                    </ResponsiveText>
                </View>
                <View style={styles.infoRow}>
                    <ResponsiveText variant="caption" style={styles.label}>
                        {t('sectors.fullName')}:
                    </ResponsiveText>
                    <ResponsiveText variant="body" style={styles.value} numberOfLines={2}>
                        {sector.complete_name}
                    </ResponsiveText>
                </View>
                <View style={styles.infoRow}>
                    <ResponsiveText variant="caption" style={styles.label}>
                        {t('sectors.equipments')}:
                    </ResponsiveText>
                    <ResponsiveText variant="body" style={styles.value}>
                        {sector.equipment_count || 0}
                    </ResponsiveText>
                </View>
                <View style={styles.infoRow}>
                    <ResponsiveText variant="caption" style={styles.label}>
                        {t('sectors.subsectors')}:
                    </ResponsiveText>
                    <ResponsiveText variant="body" style={styles.value}>
                        {sector.subsector_count || 0}
                    </ResponsiveText>
                </View>
            </View>

            {/* Botão Listar Equipamentos */}
            <TouchableOpacity
                style={[styles.listEquipmentButton, { minHeight: r.verticalScale(50) }]}
                onPress={() => navigation.navigate("EquipmentListScreen", { clientId, sectorId })}
            >
                <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.listEquipmentButtonText}>
                    {t('sectors.listEquipments')}
                </ResponsiveText>
            </TouchableOpacity>

            {/* Mensagem explicativa para setores pais */}
            {sector.level === 0 && (
                <View style={styles.infoSection}>
                    <ResponsiveText variant="body" style={styles.infoText}>
                        <ResponsiveText variant="body" weight="bold">ℹ️ Informação:</ResponsiveText> Esta opção lista equipamentos que não estão alocados em nenhum setor filho.
                    </ResponsiveText>
                </View>
            )}

            {/* Lista de Subsetores (apenas para setores pais) */}
            {sector.level === 0 && subsectors.length > 0 && (
                <View style={styles.section}>
                    <ResponsiveText variant="subtitle" style={styles.sectionTitle}>
                        {t('sectors.subsectorsTitle')} ({subsectors.length})
                    </ResponsiveText>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={[styles.createButton, { minHeight: r.verticalScale(40) }]} onPress={() => setShowCreateModal(true)}>
                            <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.createButtonText}>
                                Adicionar Subsetor
                            </ResponsiveText>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={subsectors}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderSubsectorItem}
                        scrollEnabled={false}
                    />
                </View>
            )}

            {sector.level === 0 && subsectors.length === 0 && (
                <View style={styles.section}>
                    <ResponsiveText variant="subtitle" style={styles.sectionTitle}>
                        {t('sectors.subsectorsTitle')}
                    </ResponsiveText>
                    <ResponsiveText variant="body" style={styles.emptyText}>
                        {t('sectors.noSubsectors')}
                    </ResponsiveText>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={[styles.createButton, { minHeight: r.verticalScale(40) }]} onPress={() => setShowCreateModal(true)}>
                            <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.createButtonText}>
                                Adicionar Subsetor
                            </ResponsiveText>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <Modal visible={showCreateModal} transparent animationType="fade">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalBackdrop}
                >
                    <View style={[styles.modalCard, { maxWidth: r.width * 0.9 }]}>
                        <ResponsiveText variant="subtitle" style={styles.modalTitle}>
                            {t('sectors.name')}
                        </ResponsiveText>
                        <AppTextInput
                            style={styles.input}
                            placeholder={t('sectors.name')}
                            value={newSubsectorName}
                            onChangeText={setNewSubsectorName}
                            maxFontSizeMultiplier={1.8}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { minHeight: r.verticalScale(44) }]} onPress={() => setShowCreateModal(false)}>
                                <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.modalButtonText}>
                                    Cancelar
                                </ResponsiveText>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={creating} style={[styles.modalButton, styles.confirmButton, { minHeight: r.verticalScale(44) }]} onPress={handleCreateSubsector}>
                                <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.modalButtonText}>
                                    {creating ? '...' : 'Criar'}
                                </ResponsiveText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ResponsiveContainer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    section: {
        backgroundColor: "#fff",
        margin: 10,
        borderRadius: 10,
        padding: 15,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    sectionTitle: {
        fontWeight: "bold",
        color: "#333",
        marginBottom: 15,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
        flexWrap: 'wrap',
    },
    label: {
        fontWeight: "bold",
        color: "#666",
        flex: 1,
        marginRight: 8,
    },
    value: {
        color: "#333",
        flex: 2,
        textAlign: "right",
        flexShrink: 1,
    },
    listEquipmentButton: {
        backgroundColor: "#28a745",
        margin: 10,
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: 'center',
    },
    listEquipmentButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    infoSection: {
        backgroundColor: "#e3f2fd",
        margin: 10,
        padding: 15,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: "#2196F3",
    },
    infoText: {
        color: "#1976D2",
        lineHeight: 20,
    },
    subsectorItem: {
        backgroundColor: "#f9f9f9",
        padding: 10,
        marginBottom: 8,
        borderRadius: 5,
    },
    subsectorHeader: {
        marginBottom: 10,
    },
    subsectorName: {
        fontWeight: "bold",
        color: "#333",
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-around",
        flexWrap: 'wrap',
        gap: 8,
    },
    actionButton: {
        backgroundColor: "#007BFF",
        padding: 8,
        borderRadius: 5,
        minWidth: 120,
        alignItems: "center",
        justifyContent: 'center',
    },
    actionButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    emptyText: {
        textAlign: "center",
        color: "#666",
        fontStyle: "italic",
        padding: 20,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
    },
    createButton: {
        backgroundColor: '#28a745',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
    },
    modalTitle: {
        fontWeight: 'bold',
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        padding: 10,
        marginBottom: 12,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        flexWrap: 'wrap',
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 80,
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    confirmButton: {
        backgroundColor: '#007BFF',
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    loadingText: {
        textAlign: "center",
        marginTop: 10,
        color: "#666",
    },
    errorText: {
        color: "#FF0000",
        textAlign: "center",
        marginTop: 20,
    },
});

export default SectorDetailScreen; 