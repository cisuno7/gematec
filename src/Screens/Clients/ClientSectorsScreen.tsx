import React, { useState, useEffect } from "react";
import {
    View,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
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

interface ClientSectorsScreenProps {
    route: RouteProp<RootStackParamList, "ClientSectorsScreen">;
    navigation: DrawerNavigationProp<RootStackParamList>;
}

const ClientSectorsScreen: React.FC<ClientSectorsScreenProps> = ({ route, navigation }) => {
    const { hasPermission } = usePermissions();
    const { t } = useLanguage();
    const r = useResponsive();
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
            <ResponsiveContainer withPadding={false} style={styles.container} scroll={false}>
                <ResponsiveText variant="body" style={styles.errorText}>
                    {t('sectors.noPermission')}
                </ResponsiveText>
            </ResponsiveContainer>
        );
    }

    if (loading) {
        return (
            <ResponsiveContainer withPadding={false} style={styles.container} scroll={false}>
                <ActivityIndicator size="large" color="#007BFF" />
                <ResponsiveText variant="body" style={styles.loadingText}>
                    {t('sectors.loading')}
                </ResponsiveText>
            </ResponsiveContainer>
        );
    }

    const renderSectorItem = ({ item }: { item: Sector }) => (
        <View style={styles.sectorItem}>
            <View style={styles.sectorHeader}>
                <ResponsiveText variant="subtitle" style={styles.sectorName} numberOfLines={2}>
                    {item.name}
                </ResponsiveText>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.actionButton, { minHeight: r.verticalScale(40) }]}
                    onPress={() => navigation.navigate("EquipmentListScreen", { clientId, sectorId: item.id })}
                >
                    <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.actionButtonText}>
                        {t('sectors.listEquipments')}
                    </ResponsiveText>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { minHeight: r.verticalScale(40) }]}
                    onPress={() => navigation.navigate("SectorDetailScreen", { clientId, sectorId: item.id })}
                >
                    <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.actionButtonText}>
                        {t('sectors.viewSector')}
                    </ResponsiveText>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ResponsiveContainer withPadding={false} style={styles.container} scroll={true}>
            <View style={styles.header}>
                <ResponsiveText variant="title" style={styles.title} numberOfLines={2}>
                    {t('sectors.rootTitle')}
                </ResponsiveText>
            </View>

            <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.createButton, { minHeight: r.verticalScale(40) }]} onPress={() => setShowCreateModal(true)}>
                    <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.createButtonText}>
                        Adicionar Setor
                    </ResponsiveText>
                </TouchableOpacity>
            </View>

            {sectors.length > 0 ? (
                <FlatList
                    data={sectors}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderSectorItem}
                    contentContainerStyle={[styles.listContainer, { paddingBottom: r.height * 0.1 }]}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <ResponsiveText variant="body" style={styles.emptyText}>
                        {t('sectors.noRootFound')}
                    </ResponsiveText>
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
                            value={newSectorName}
                            onChangeText={setNewSectorName}
                            maxFontSizeMultiplier={1.8}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { minHeight: r.verticalScale(44) }]} onPress={() => setShowCreateModal(false)}>
                                <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.modalButtonText}>
                                    Cancelar
                                </ResponsiveText>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={creating} style={[styles.modalButton, styles.confirmButton, { minHeight: r.verticalScale(44) }]} onPress={handleCreateRootSector}>
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
    header: {
        backgroundColor: "#007BFF",
        padding: 20,
        alignItems: "center",
    },
    title: {
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
        justifyContent: 'center',
        alignItems: 'center',
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
        fontWeight: "bold",
        color: "#333",
        flex: 1,
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 10,
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
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyText: {
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

export default ClientSectorsScreen; 