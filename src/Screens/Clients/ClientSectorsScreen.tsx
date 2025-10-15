import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    TextInput,
    Modal,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import ClientService from "../../Services/ClientService";
import { usePermissions } from "../../Context/PermissionsContext";
import { useLanguage } from "../../Context/LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Sector } from "../../Models/Clientes";

interface ClientSectorsScreenProps {
    route: RouteProp<RootStackParamList, "ClientSectorsScreen">;
    navigation: DrawerNavigationProp<RootStackParamList>;
}

const ClientSectorsScreen: React.FC<ClientSectorsScreenProps> = ({ route, navigation }) => {
    const { hasPermission } = usePermissions();
    const { t } = useLanguage();
    const { clientId } = route.params;

    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newSectorName, setNewSectorName] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchClientSectors();
    }, [clientId]);

    const fetchClientSectors = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado.");

            // Buscar apenas setores pais (level 0)
            const sectorsData = await ClientService.getClientSectors(clientId.toString(), token, 0);
            setSectors(sectorsData.results || []);

        } catch (error: any) {
            console.error("[ClientSectorsScreen] Erro ao buscar setores:", error);
            Alert.alert(t('common.error'), error.message || t('clients.sectorsLoadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRootSector = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado.");
            if (!newSectorName.trim()) {
                Alert.alert(t('common.error'), t('sectors.name') + ' é obrigatório.');
                return;
            }
            setCreating(true);
            await ClientService.createClientSector(clientId.toString(), token, newSectorName, null);
            setShowCreateModal(false);
            setNewSectorName("");
            await fetchClientSectors();
        } catch (err: any) {
            Alert.alert(t('common.error'), err.message || t('sectors.loadError'));
        } finally {
            setCreating(false);
        }
    };

    if (!hasPermission("list_sectors")) {
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
                <Text style={styles.loadingText}>{t('sectors.loading')}</Text>
            </View>
        );
    }

    const renderSectorItem = ({ item }: { item: Sector }) => (
        <View style={styles.sectorItem}>
            <View style={styles.sectorHeader}>
                <Text style={styles.sectorName}>{item.name}</Text>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate("EquipmentListScreen", { clientId, sectorId: item.id })}
                >
                    <Text style={styles.actionButtonText}>{t('sectors.listEquipments')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate("SectorDetailScreen", { clientId, sectorId: item.id })}
                >
                    <Text style={styles.actionButtonText}>{t('sectors.viewSector')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('sectors.rootTitle')}</Text>
            </View>

            <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
                    <Text style={styles.createButtonText}>Adicionar Setor</Text>
                </TouchableOpacity>
            </View>

            {sectors.length > 0 ? (
                <FlatList
                    data={sectors}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderSectorItem}
                    contentContainerStyle={styles.listContainer}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>{t('sectors.noRootFound')}</Text>
                </View>
            )}

            <Modal visible={showCreateModal} transparent animationType="fade">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{t('sectors.name')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('sectors.name')}
                            value={newSectorName}
                            onChangeText={setNewSectorName}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowCreateModal(false)}>
                                <Text style={styles.modalButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={creating} style={[styles.modalButton, styles.confirmButton]} onPress={handleCreateRootSector}>
                                <Text style={styles.modalButtonText}>{creating ? '...' : 'Criar'}</Text>
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
        backgroundColor: "#f5f5f5",
    },
    header: {
        backgroundColor: "#007BFF",
        padding: 20,
        alignItems: "center",
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 10,
        backgroundColor: '#f5f5f5',
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
    listContainer: {
        padding: 10,
    },
    sectorItem: {
        backgroundColor: "#fff",
        marginBottom: 10,
        borderRadius: 10,
        padding: 15,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    sectorHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    sectorName: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        flex: 1,
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 10,
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
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
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

export default ClientSectorsScreen; 