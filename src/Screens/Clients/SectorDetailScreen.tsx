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
    Modal,
    TextInput,
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

interface SectorDetailScreenProps {
    route: RouteProp<RootStackParamList, "SectorDetailScreen">;
    navigation: DrawerNavigationProp<RootStackParamList>;
}

const SectorDetailScreen: React.FC<SectorDetailScreenProps> = ({ route, navigation }) => {
    const { hasPermission } = usePermissions();
    const { t } = useLanguage();
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
            if (!token) throw new Error("Token de acesso não encontrado.");

            // Buscar detalhes do setor
            const sectorData = await ClientService.getSectorDetails(clientId.toString(), sectorId, token);
            setSector(sectorData);

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
            <View style={styles.container}>
                <Text style={styles.errorText}>{t('sectors.noPermission')}</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.loadingText}>{t('sectors.loadingDetails')}</Text>
            </View>
        );
    }

    if (!sector) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>{t('sectors.notFound')}</Text>
            </View>
        );
    }

    const renderSubsectorItem = ({ item }: { item: Sector }) => (
        <View style={styles.subsectorItem}>
            <View style={styles.subsectorHeader}>
                <Text style={styles.subsectorName}>{item.name}</Text>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate("EquipmentListScreen", { clientId, sectorId: item.id })}
                >
                    <Text style={styles.actionButtonText}>🔧 Listar Equipamentos</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate("SectorDetailScreen", { clientId, sectorId: item.id })}
                >
                    <Text style={styles.actionButtonText}>👁️ Visualizar Setor</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            {/* Informações do Setor */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('sectors.infoTitle')}</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>{t('sectors.name')}:</Text>
                    <Text style={styles.value}>{sector.name}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>{t('sectors.fullName')}:</Text>
                    <Text style={styles.value}>{sector.complete_name}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>{t('sectors.level')}:</Text>
                    <Text style={styles.value}>{sector.level}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>{t('sectors.equipments')}:</Text>
                    <Text style={styles.value}>{sector.equipment_count || 0}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>{t('sectors.subsectors')}:</Text>
                    <Text style={styles.value}>{sector.subsector_count || 0}</Text>
                </View>
            </View>

            {/* Botão Listar Equipamentos */}
            <TouchableOpacity
                style={styles.listEquipmentButton}
                onPress={() => navigation.navigate("EquipmentListScreen", { clientId, sectorId })}
            >
                <Text style={styles.listEquipmentButtonText}>{t('sectors.listEquipments')}</Text>
            </TouchableOpacity>

            {/* Mensagem explicativa para setores pais */}
            {sector.level === 0 && (
                <View style={styles.infoSection}>
                    <Text style={styles.infoText}>
                        <Text style={styles.bold}>ℹ️ Informação:</Text> Esta opção lista equipamentos que não estão alocados em nenhum setor filho.
                    </Text>
                </View>
            )}

            {/* Lista de Subsetores (apenas para setores pais) */}
            {sector.level === 0 && subsectors.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('sectors.subsectorsTitle')} ({subsectors.length})</Text>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
                            <Text style={styles.createButtonText}>Adicionar Subsetor</Text>
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
                    <Text style={styles.sectionTitle}>{t('sectors.subsectorsTitle')}</Text>
                    <Text style={styles.emptyText}>{t('sectors.noSubsectors')}</Text>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
                            <Text style={styles.createButtonText}>Adicionar Subsetor</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <Modal visible={showCreateModal} transparent animationType="fade">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{t('sectors.name')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('sectors.name')}
                            value={newSubsectorName}
                            onChangeText={setNewSubsectorName}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowCreateModal(false)}>
                                <Text style={styles.modalButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={creating} style={[styles.modalButton, styles.confirmButton]} onPress={handleCreateSubsector}>
                                <Text style={styles.modalButtonText}>{creating ? '...' : 'Criar'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
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
        fontSize: 18,
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
    },
    label: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#666",
        flex: 1,
    },
    value: {
        fontSize: 14,
        color: "#333",
        flex: 2,
        textAlign: "right",
    },
    listEquipmentButton: {
        backgroundColor: "#28a745",
        margin: 10,
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
    },
    listEquipmentButtonText: {
        color: "#fff",
        fontSize: 16,
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
        fontSize: 14,
        color: "#1976D2",
        lineHeight: 20,
    },
    bold: {
        fontWeight: "bold",
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
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    actionButton: {
        backgroundColor: "#007BFF",
        padding: 8,
        borderRadius: 5,
        minWidth: 120,
        alignItems: "center",
    },
    actionButtonText: {
        color: "#fff",
        fontSize: 12,
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
        fontSize: 16,
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
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 6,
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
        fontSize: 16,
        color: "#FF0000",
        textAlign: "center",
        marginTop: 20,
    },
});

export default SectorDetailScreen; 