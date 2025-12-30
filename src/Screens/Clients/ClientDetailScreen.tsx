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
import Client, { IClient, Contract, Contact, Address } from "../../Models/Clientes";
import ResponsiveContainer from "../../Components/ResponsiveContainer";
import { useResponsive } from "../../hooks/useResponsive";

interface ClientDetailScreenProps {
    route: RouteProp<RootStackParamList, "ClientDetailScreen">;
    navigation: DrawerNavigationProp<RootStackParamList>;
}

const ClientDetailScreen: React.FC<ClientDetailScreenProps> = ({ route, navigation }) => {
    const { hasPermission, permissions } = usePermissions();
    const { t } = useLanguage();
    const { clientId } = route.params;
    const r = useResponsive();
    const compact = r.fontScale > 1.25 || r.width < 360;

    // Debug das permissões
    console.log("[ClientDetailScreen] Permissões disponíveis:", permissions);
    console.log("[ClientDetailScreen] Tem permissão list_contracts:", hasPermission("list_contracts"));

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
            const hasListContractsPermission = hasPermission("list_contracts");
            console.log("[ClientDetailScreen] Verificando permissão para buscar contratos:", hasListContractsPermission);

            if (hasListContractsPermission) {
                try {
                    console.log("[ClientDetailScreen] Iniciando busca de contratos para cliente:", clientId);
                    const contractsData = await ClientService.getClientContracts(clientId.toString(), token);
                    console.log("[ClientDetailScreen] Contratos recebidos:", contractsData);
                    setContracts(contractsData.results || []);
                } catch (error: any) {
                    console.error("[ClientDetailScreen] Erro ao buscar contratos:", error);
                    // Se o erro for 404 (sem contratos), definir array vazio
                    if (error.response?.status === 404) {
                        console.log("[ClientDetailScreen] Cliente não possui contratos");
                        setContracts([]);
                    } else {
                        // Para outros erros, mostrar mensagem mas não bloquear a tela
                        console.warn("[ClientDetailScreen] Erro ao buscar contratos, mas continuando...");
                        setContracts([]);
                    }
                }
            } else {
                console.log("[ClientDetailScreen] Usuário não tem permissão para listar contratos");
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

    if (!hasPermission("view_client")) {
        return (
            <ResponsiveContainer withPadding={false} style={styles.container}>
                <Text style={styles.errorText}>{t('clients.noPermission')}</Text>
            </ResponsiveContainer>
        );
    }

    if (loading) {
        return (
            <ResponsiveContainer withPadding={false} style={styles.container}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.loadingText}>{t('clientDetails.loading')}</Text>
            </ResponsiveContainer>
        );
    }

    if (!client) {
        return (
            <ResponsiveContainer withPadding={false} style={styles.container}>
                <Text style={styles.errorText}>{t('clientDetails.notFound')}</Text>
            </ResponsiveContainer>
        );
    }

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === "null" || dateString === "undefined" || dateString === "") {
            console.log("[ClientDetailScreen] Data vazia ou nula:", dateString);
            return "N/A";
        }

        try {
            // Log para debug
            console.log("[ClientDetailScreen] Formatando data:", dateString, "tipo:", typeof dateString);

            // Se já for uma data válida, usar diretamente
            let date: Date;

            // Verificar se é uma string ISO ou formato conhecido
            if (typeof dateString === 'string') {
                // Tentar diferentes formatos de data
                if (dateString.includes('T')) {
                    // Formato ISO
                    date = new Date(dateString);
                } else if (dateString.includes('-')) {
                    // Formato YYYY-MM-DD
                    date = new Date(dateString + 'T00:00:00');
                } else if (dateString.includes('/')) {
                    // Formato DD/MM/YYYY ou MM/DD/YYYY
                    const parts = dateString.split('/');
                    if (parts.length === 3) {
                        // Assumir formato DD/MM/YYYY
                        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
                    } else {
                        date = new Date(dateString);
                    }
                } else {
                    // Tentar parse direto
                    date = new Date(dateString);
                }
            } else {
                date = new Date(dateString);
            }

            if (isNaN(date.getTime())) {
                console.warn("[ClientDetailScreen] Data inválida após parsing:", dateString);
                return "Data inválida";
            }

            const formattedDate = date.toLocaleDateString('pt-BR');
            console.log("[ClientDetailScreen] Data formatada com sucesso:", dateString, "->", formattedDate);
            return formattedDate;
        } catch (error) {
            console.error("[ClientDetailScreen] Erro ao formatar data:", dateString, error);
            return "Data inválida";
        }
    };

    const formatFrequency = (frequencyInDays: number | null) => {
        console.log("[ClientDetailScreen] ===== INÍCIO formatFrequency =====");
        console.log("[ClientDetailScreen] Frequência em dias recebida:", frequencyInDays);
        console.log("[ClientDetailScreen] Tipo da frequência:", typeof frequencyInDays);

        // Verificar se é null, undefined ou 0
        if (!frequencyInDays || frequencyInDays === null || frequencyInDays === undefined) {
            console.log("[ClientDetailScreen] ❌ Frequência vazia ou nula, retornando N/A");
            console.log("[ClientDetailScreen] ===== FIM formatFrequency (vazio) =====");
            return "N/A";
        }

        // Sempre mostrar "A cada X dias" conforme solicitado no tarefas.md
        const result = `A cada ${frequencyInDays} dias`;

        console.log("[ClientDetailScreen] ✅ Frequência formatada:", frequencyInDays, "dias ->", result);
        console.log("[ClientDetailScreen] ===== FIM formatFrequency (sucesso) =====");
        return result;
    };

    const InfoRow = ({ label, value }: { label: string; value: any }) => (
        <View style={[styles.infoRow, compact && styles.infoRowStack]}>
            <Text style={[styles.label, compact && styles.labelStack]}>{label}</Text>
            <Text style={[styles.value, compact && styles.valueStack]}>{String(value ?? "N/A")}</Text>
        </View>
    );

    return (
        <ResponsiveContainer
            withPadding={true}
            scroll={true}
            style={styles.container}
            contentContainerStyle={{ paddingBottom: r.spacing(2) }}
        >

            {/* Informações Básicas */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('clientDetails.basicInfo')}</Text>
                <InfoRow label={`${t('clients.name')}:`} value={client.name} />
                <InfoRow label={`${t('clients.email')}:`} value={client.email} />
                <InfoRow label={`${t('clients.document')}:`} value={client.document || "N/A"} />
                <InfoRow label={`Telefone:`} value={client.phone || "N/A"} />
                <InfoRow label={`${t('clientDetails.fantasyName')}:`} value={client.fantasy_name || "N/A"} />
                <InfoRow label={`${t('clientDetails.stateRegistration')}:`} value={client.state_registration || "N/A"} />
                <InfoRow label={`${t('clientDetails.openingDate')}:`} value={formatDate(client.opening_date || "")} />
                <InfoRow label={`${t('clientDetails.totalSectors')}:`} value={client.total_sectors || 0} />
                <InfoRow label={`${t('clientDetails.totalEquipments')}:`} value={client.total_equipments || 0} />
            </View>

            {/* Contratos */}
            {(() => {
                const hasListContractsPermission = hasPermission("list_contracts");
                console.log("[ClientDetailScreen] Renderizando seção de contratos. Tem permissão:", hasListContractsPermission);
                return hasListContractsPermission && (
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.sectionHeader}
                            onPress={() => setShowContracts(!showContracts)}
                        >
                            <Text style={styles.sectionTitle}>{t('clientDetails.contracts')} ({contracts.length})</Text>
                            <Ionicons
                                name={showContracts ? "chevron-up" : "chevron-down"}
                                size={20}
                                color="#007BFF"
                            />
                        </TouchableOpacity>

                        {showContracts && (
                            <View style={styles.listContainer}>
                                {contracts.length > 0 ? (
                                    contracts.map((contract) => {
                                        console.log("[ClientDetailScreen] ===== RENDERIZANDO CONTRATO =====");
                                        console.log("[ClientDetailScreen] ID:", contract.id);
                                        console.log("[ClientDetailScreen] Start Date:", contract.start_date, "(tipo:", typeof contract.start_date, ")");
                                        console.log("[ClientDetailScreen] End Date:", contract.end_date, "(tipo:", typeof contract.end_date, ")");
                                        console.log("[ClientDetailScreen] Activity Frequency in Days:", contract.activity_frequency_in_days, "(tipo:", typeof contract.activity_frequency_in_days, ")");

                                        return (
                                            <View key={contract.id} style={styles.listItem}>
                                                <Text style={styles.listItemText}>
                                                    <Text style={styles.bold}>{t('clientDetails.start')}:</Text> {formatDate(contract.start_date || "")}
                                                </Text>
                                                <Text style={styles.listItemText}>
                                                    <Text style={styles.bold}>{t('clientDetails.end')}:</Text> {formatDate(contract.end_date || "")}
                                                </Text>
                                                <Text style={styles.listItemText}>
                                                    <Text style={styles.bold}>{t('clientDetails.frequency')}:</Text> {formatFrequency(contract.activity_frequency_in_days)}
                                                </Text>
                                            </View>
                                        );
                                    })
                                ) : (
                                    <Text style={styles.emptyText}>{t('clientDetails.noContracts')}</Text>
                                )}
                            </View>
                        )}
                    </View>
                );
            })()}

            {/* Contatos */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => setShowContacts(!showContacts)}
                >
                    <Text style={styles.sectionTitle}>{t('clientDetails.contacts')} ({contacts.length})</Text>
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
                                        <Text style={styles.bold}>{t('clients.name')}:</Text> {String(contact.name || "N/A")}
                                    </Text>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>{t('clients.email')}:</Text> {String(contact.email || "N/A")}
                                    </Text>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>Telefone:</Text> {String(contact.phone || "N/A")}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>{t('clientDetails.noContacts')}</Text>
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
                    <Text style={styles.sectionTitle}>{t('clientDetails.addresses')} ({addresses.length})</Text>
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
                                        <Text style={styles.bold}>{t('clientDetails.cityStateCountry')}:</Text>{' '}
                                        {(address.city && ((address.city as any).name || address.city)) || 'N/A'}, {" "}
                                        {(address.state && ((address.state as any).name || (address.state as any).code || address.state)) || 'N/A'}, {" "}
                                        {(address.country && ((address.country as any).name || address.country)) || 'N/A'}
                                    </Text>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>{t('clientDetails.neighborhood')}:</Text> {String(address.neighborhood || "N/A")}
                                    </Text>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>{t('clientDetails.address')}:</Text> {String(address.street || "N/A")}
                                    </Text>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>{t('clientDetails.number')}:</Text> {String(address.number || "N/A")}
                                    </Text>
                                    <Text style={styles.listItemText}>
                                        <Text style={styles.bold}>{t('clientDetails.postalCode')}:</Text> {String(address.postal_code || address.zip_code || "N/A")}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>{t('clientDetails.noAddresses')}</Text>
                        )}
                    </View>
                )}
            </View>

            {/* Botão Listar Setores */}
            {hasPermission("list_sectors") && (
                <TouchableOpacity
                    style={[
                        styles.listSectorsButton,
                        { minHeight: r.verticalScale(48), paddingVertical: r.spacing(1) },
                    ]}
                    onPress={() => navigation.navigate("ClientSectorsScreen", { clientId })}
                >
                    <Text style={styles.listSectorsButtonText}>{t('clientDetails.listSectors')}</Text>
                </TouchableOpacity>
            )}
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
        gap: 12,
    },
    infoRowStack: {
        flexDirection: "column",
        alignItems: "flex-start",
    },
    label: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#666",
        flexShrink: 1,
    },
    labelStack: {
        marginBottom: 4,
    },
    value: {
        fontSize: 14,
        color: "#333",
        flexShrink: 1,
        flexWrap: "wrap",
        textAlign: "right",
    },
    valueStack: {
        textAlign: "left",
        width: "100%",
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
        flexShrink: 1,
        flexWrap: "wrap",
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