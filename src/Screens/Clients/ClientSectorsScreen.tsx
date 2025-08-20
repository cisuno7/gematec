import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
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