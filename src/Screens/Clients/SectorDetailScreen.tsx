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

    if (!hasPermission("clients.view_sector")) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Você não tem permissão para visualizar setores.</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.loadingText}>Carregando detalhes do setor...</Text>
            </View>
        );
    }

    if (!sector) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Setor não encontrado.</Text>
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
                <Text style={styles.sectionTitle}>Informações do Setor</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Nome:</Text>
                    <Text style={styles.value}>{sector.name}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Nome Completo:</Text>
                    <Text style={styles.value}>{sector.complete_name}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Nível:</Text>
                    <Text style={styles.value}>{sector.level}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Equipamentos:</Text>
                    <Text style={styles.value}>{sector.equipment_count || 0}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Subsetores:</Text>
                    <Text style={styles.value}>{sector.subsector_count || 0}</Text>
                </View>
            </View>

            {/* Botão Listar Equipamentos */}
            <TouchableOpacity
                style={styles.listEquipmentButton}
                onPress={() => navigation.navigate("EquipmentListScreen", { clientId, sectorId })}
            >
                <Text style={styles.listEquipmentButtonText}>🔧 Listar Equipamentos</Text>
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
                    <Text style={styles.sectionTitle}>Subsetores ({subsectors.length})</Text>
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
                    <Text style={styles.sectionTitle}>Subsetores</Text>
                    <Text style={styles.emptyText}>Nenhum subsetor encontrado.</Text>
                </View>
            )}
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