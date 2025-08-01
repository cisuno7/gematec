import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import ClientService from "../../Services/ClientService";
import { usePermissions } from "../../Context/PermissionsContext";
import { useLanguage } from "../../Context/LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Client, Contract, Contact, Address } from "../../Models/Clientes";

interface ClientDetailScreenProps {
    route: RouteProp<RootStackParamList, "ClientDetailScreen">;
    navigation: DrawerNavigationProp<RootStackParamList>;
}

const ClientDetailScreen: React.FC<ClientDetailScreenProps> = ({ route, navigation }) => {
    const { hasPermission } = usePermissions();
    const { t } = useLanguage();
    const { clientId } = route.params;

    const [client, setClient] = useState<Client | null>(null);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [showContracts, setShowContracts] = useState(false);
    const [showContacts, setShowContacts] = useState(false);
    const [showAddresses, setShowAddresses] = useState(false);

    useEffect(() => {
        fetchClientDetails();
    }, [clientId]);

    const fetchClientDetails = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado.");

            // Buscar detalhes do cliente
            const clientData = await ClientService.getClientDetails(clientId, token);
            setClient(clientData);

            // Buscar contratos se tiver permissão
            if (hasPermission("clients.view_contract")) {
                try {
                    const contractsData = await ClientService.getClientContracts(clientId.toString(), token);
                    console.log("[ClientDetailScreen] Contratos recebidos:", contractsData);
                    setContracts(contractsData.results || []);
                } catch (error) {
                    console.error("Erro ao buscar contratos:", error);
                }
            }

            // Buscar contatos
            try {
                const contactsData = await ClientService.getClientContacts(clientId.toString(), token);
                console.log("[ClientDetailScreen] Contatos recebidos:", contactsData);
                setContacts(contactsData.results || []);
            } catch (error) {
                console.error("Erro ao buscar contatos:", error);
            }

            // Buscar endereços
            try {
                const addressesData = await ClientService.getClientAddresses(clientId.toString(), token);
                console.log("[ClientDetailScreen] Endereços recebidos:", addressesData);
                setAddresses(addressesData.results || []);
            } catch (error) {
                console.error("Erro ao buscar endereços:", error);
            }

        } catch (error: any) {
            console.error("[ClientDetailScreen] Erro ao buscar detalhes:", error);
            Alert.alert(t('common.error'), error.message || t('clients.loadError'));
        } finally {
            setLoading(false);
        }
    };

    if (!hasPermission("clients.view_client")) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Você não tem permissão para visualizar clientes.</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.loadingText}>Carregando detalhes do cliente...</Text>
            </View>
        );
    }

    if (!client) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Cliente não encontrado.</Text>
            </View>
        );
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    return (
        <ScrollView style={styles.container}>

            {/* Informações Básicas */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Informações Básicas</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Nome:</Text>
                    <Text style={styles.value}>{client.name}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Email:</Text>
                    <Text style={styles.value}>{client.email}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Documento:</Text>
                    <Text style={styles.value}>{client.document || "N/A"}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Telefone:</Text>
                    <Text style={styles.value}>{client.phone || "N/A"}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Nome Fantasia:</Text>
                    <Text style={styles.value}>{client.fantasy_name || "N/A"}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Registro Estadual:</Text>
                    <Text style={styles.value}>{client.state_registration || "N/A"}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Data de Abertura:</Text>
                    <Text style={styles.value}>{formatDate(client.opening_date || "")}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Total de Setores:</Text>
                    <Text style={styles.value}>{client.total_sectors || 0}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Total de Equipamentos:</Text>
                    <Text style={styles.value}>{client.total_equipments || 0}</Text>
                </View>
            </View>

            {/* Contratos */}
            {hasPermission("clients.view_contract") && (
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.sectionHeader}
                        onPress={() => setShowContracts(!showContracts)}
                    >
                        <Text style={styles.sectionTitle}>Contratos ({contracts.length})</Text>
                        <Ionicons
                            name={showContracts ? "chevron-up" : "chevron-down"}
                            size={20}
                            color="#007BFF"
                        />
                    </TouchableOpacity>

                    {showContracts && (
                        <View style={styles.listContainer}>
                            {contracts.length > 0 ? (
                                contracts.map((contract) => (
                                    <View key={contract.id} style={styles.listItem}>
                                        <Text style={styles.listItemText}>
                                            <Text style={styles.bold}>Início:</Text> {formatDate(contract.start_date || "")}
                                        </Text>
                                        <Text style={styles.listItemText}>
                                            <Text style={styles.bold}>Fim:</Text> {formatDate(contract.end_date || "")}
                                        </Text>
                                        <Text style={styles.listItemText}>
                                            <Text style={styles.bold}>Frequência:</Text> {String(contract.activity_frequency || "N/A")}
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>Nenhum contrato encontrado.</Text>
                            )}
                        </View>
                    )}
                </View>
            )}

            {/* Contatos */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => setShowContacts(!showContacts)}
                >
                    <Text style={styles.sectionTitle}>Contatos ({contacts.length})</Text>
                    <Ionicons
                        name={showContacts ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#007BFF"
                    />
                </TouchableOpacity>

                {showContacts && (
                    <View style={styles.listContainer}>
                        {contacts.length > 0 ? (
                            contacts.map((contact) => (
                                <View key={contact.id} style={styles.listItem}>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>Nome:</Text> {String(contact.name || "N/A")}
                                    </Text>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>Email:</Text> {String(contact.email || "N/A")}
                                    </Text>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>Telefone:</Text> {String(contact.phone || "N/A")}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>Nenhum contato encontrado.</Text>
                        )}
                    </View>
                )}
            </View>

            {/* Endereços */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => setShowAddresses(!showAddresses)}
                >
                    <Text style={styles.sectionTitle}>Endereços ({addresses.length})</Text>
                    <Ionicons
                        name={showAddresses ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#007BFF"
                    />
                </TouchableOpacity>

                {showAddresses && (
                    <View style={styles.listContainer}>
                        {addresses.length > 0 ? (
                            addresses.map((address) => (
                                <View key={address.id} style={styles.listItem}>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>Cidade/Estado/País:</Text> {String(address.city || "N/A")}, {String(address.state || "N/A")}
                                    </Text>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>Bairro:</Text> {String(address.neighborhood || "N/A")}
                                    </Text>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>Endereço:</Text> {String(address.street || "N/A")}
                                    </Text>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>Número:</Text> {String(address.number || "N/A")}
                                    </Text>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>CEP:</Text> {String(address.postal_code || address.zip_code || "N/A")}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>Nenhum endereço encontrado.</Text>
                        )}
                    </View>
                )}
            </View>

            {/* Botão Listar Setores */}
            {hasPermission("clients.list_sectors") && (
                <TouchableOpacity
                    style={styles.listSectorsButton}
                    onPress={() => navigation.navigate("ClientSectorsScreen", { clientId })}
                >
                    <Text style={styles.listSectorsButtonText}>📁 Listar Setores</Text>
                </TouchableOpacity>
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
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
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
    listContainer: {
        marginTop: 10,
    },
    listItem: {
        backgroundColor: "#f9f9f9",
        padding: 10,
        marginBottom: 8,
        borderRadius: 5,
    },
    listItemText: {
        fontSize: 14,
        color: "#333",
        marginBottom: 2,
    },
    bold: {
        fontWeight: "bold",
    },
    emptyText: {
        textAlign: "center",
        color: "#666",
        fontStyle: "italic",
        padding: 20,
    },
    listSectorsButton: {
        backgroundColor: "#28a745",
        margin: 10,
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
    },
    listSectorsButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
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

export default ClientDetailScreen; 