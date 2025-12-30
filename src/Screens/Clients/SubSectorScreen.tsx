import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack"; // Importar StackNavigationProp
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../../Routers/AppRouter";
import ClientService from "../../Services/ClientService";
import { Sector } from "../../Models/Clientes";
import { usePermissions } from "../../Context/PermissionsContext";
import { Ionicons } from '@expo/vector-icons';
import ResponsiveContainer from "../../Components/ResponsiveContainer";
import { useResponsive } from "../../hooks/useResponsive";
// Remover: import { router } from 'expo-router';

interface SubSectorScreenProps {
    route: RouteProp<RootStackParamList, "SubSectorScreen">;
    // Usar StackNavigationProp para garantir acesso ao 'replace'
    navigation: StackNavigationProp<RootStackParamList, "SubSectorScreen">;
}

const SubSectorScreen: React.FC<SubSectorScreenProps> = ({ route, navigation }) => {
    const { clientId, parentSector } = route.params;
    const r = useResponsive();
    const { hasPermission } = usePermissions();
    const [subSectors, setSubSectors] = useState<Sector[]>([]);
    const [allSectors, setAllSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);

    if (!hasPermission("list_clients")) {
        return (
            <ResponsiveContainer withPadding={false} style={styles.container} scroll={false}>
                <Text style={styles.errorText}>Você não tem permissão para visualizar setores.</Text>
            </ResponsiveContainer>
        );
    }

    useEffect(() => {
        const fetchSectors = async () => {
            setLoading(true);
            try {
                const accessToken = await AsyncStorage.getItem("access_token");
                if (!accessToken) throw new Error("Token de acesso não encontrado.");

                const response = await ClientService.getClientSectors(clientId.toString(), accessToken);
                const fetchedSectors: Sector[] = response.results || [];
                setAllSectors(fetchedSectors);

                const directSubSectors = fetchedSectors.filter(
                    (sector) =>
                        sector.level === parentSector.level + 1 &&
                        sector.complete_name.startsWith(parentSector.complete_name + ' > ')
                );
                setSubSectors(directSubSectors);

                if (directSubSectors.length === 0) {
                    // Usar navigation.replace para navegação
                    navigation.replace("EquipmentListScreen", { // Caminho para EquipmentListScreen
                        clientId: clientId,
                        sectorId: parentSector.id,
                    });
                    return;
                }

            } catch (error: any) {
                console.error("[SubSectorScreen] Erro ao buscar sub-setores:", error);
                Alert.alert("Erro", "Não foi possível carregar os sub-setores.");
            } finally {
                setLoading(false);
            }
        };

        fetchSectors();
    }, [clientId, parentSector, navigation]); // Adicionado 'navigation' às dependências novamente

    const hasChildren = (sector: Sector, allAvailableSectors: Sector[]): boolean => {
        return allAvailableSectors.some(
            (s) =>
                s.level === sector.level + 1 &&
                s.complete_name.startsWith(sector.complete_name + ' > ')
        );
    };

    const renderSubSectorItem = ({ item }: { item: Sector }) => {
        const hasMoreLevels = hasChildren(item, allSectors);

        return (
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={() => {
                    if (hasMoreLevels) {
                        navigation.navigate("SubSectorScreen", {
                            clientId,
                            parentSector: item,
                        });
                    } else {
                        navigation.navigate("EquipmentListScreen", {
                            clientId,
                            sectorId: item.id,
                        });
                    }
                }}
            >
                <Text style={styles.itemText}>Nome do Sub-setor: {item.name}</Text>
                {hasMoreLevels && <Text style={styles.linkText}>Ver Sub-setores</Text>}
                {!hasMoreLevels && <Text style={styles.linkText}>Ver Equipamentos</Text>}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <ResponsiveContainer withPadding={false} style={styles.container} scroll={false}>
                <ActivityIndicator size="large" color="#007BFF" />
            </ResponsiveContainer>
        );
    }

    if (subSectors.length === 0 && !loading) {
        return (
            <ResponsiveContainer withPadding={false} style={styles.container} scroll={false}>
                <Text style={styles.emptyText}>Nenhum sub-setor encontrado para este setor.</Text>
                <Text style={styles.emptyText}>Redirecionando para equipamentos...</Text>
                <TouchableOpacity onPress={() => navigation.replace("EquipmentListScreen", { clientId, sectorId: parentSector.id })}>
                    <Text style={styles.linkText}>Clique aqui para ver equipamentos</Text>
                </TouchableOpacity>
            </ResponsiveContainer>
        );
    }

    return (
        <ResponsiveContainer withPadding={false} style={styles.container} scroll={false}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="black" />
                <Text style={styles.backText}>Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Sub-setores de: {parentSector.name}</Text>
            <FlatList
                data={subSectors}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderSubSectorItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: r.spacing(2) }}
            />
        </ResponsiveContainer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#f5f5f5",
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    backText: {
        marginLeft: 8,
        fontSize: 16,
        color: "blue",
        flexShrink: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15,
        textAlign: "center",
        flexShrink: 1,
    },
    itemContainer: {
        padding: 15,
        borderBottomWidth: 1,
        borderColor: "#ccc",
        backgroundColor: "#fff",
        borderRadius: 5,
        marginBottom: 10,
    },
    itemText: {
        fontSize: 16,
        color: "#333",
        flexShrink: 1,
        flexWrap: "wrap",
    },
    linkText: {
        color: "#007BFF",
        fontSize: 14,
        marginTop: 5,
        textDecorationLine: "underline",
        flexShrink: 1,
        flexWrap: "wrap",
    },
    emptyText: {
        textAlign: "center",
        marginTop: 20,
        fontSize: 16,
        color: "#666",
    },
    errorText: {
        fontSize: 16,
        color: "#FF0000",
        textAlign: "center",
        marginTop: 20,
    },
});

export default SubSectorScreen;
