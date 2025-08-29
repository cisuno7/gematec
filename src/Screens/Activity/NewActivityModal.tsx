import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import { RouteProp } from "@react-navigation/native";
import ActivityService from "../../Services/ActivityService";
import EquipamentService from "../../Services/EquipamentService";
import ClientService from "../../Services/ClientService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../../Context/LanguageContext";
import { Picker } from "@react-native-picker/picker";

interface NewActivityModalProps {
    navigation: DrawerNavigationProp<RootStackParamList, any>;
    route: RouteProp<RootStackParamList, any>;
}

interface ActivityType {
    id: number;
    name: string;
    slug?: string;
    creationPolicy?: string;
    equipmentInsertionPolicy?: string;
    closurePolicy?: string;
    budgetPolicy?: string;
}

interface Client {
    id: number;
    name: string;
}

interface Sector {
    id: number;
    name: string;
    client_id: number;
}

interface SubSector {
    id: number;
    name: string;
    sector_id: number;
}

interface Equipment {
    id: number;
    tag: string;
    name?: string;
    equipment_type?: {
        name: string;
    };
}

const NewActivityModal: React.FC<NewActivityModalProps> = ({ navigation, route }) => {
    const { t } = useLanguage();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1 - Tipo de Atividade e Opção de Cliente
    const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
    const [selectedActivityType, setSelectedActivityType] = useState<ActivityType | null>(null);
    const [clientOption, setClientOption] = useState<"existing" | "new" | null>(null);

    // Step 2 - Seleção de Cliente Existente
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
    const [subsectors, setSubsectors] = useState<SubSector[]>([]);
    const [selectedSubsector, setSelectedSubsector] = useState<SubSector | null>(null);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

    // Step 3 - Dados do Novo Cliente
    const [newClientName, setNewClientName] = useState("");
    const [newClientDocument, setNewClientDocument] = useState("");
    const [newClientPhone, setNewClientPhone] = useState("");
    const [newClientEmail, setNewClientEmail] = useState("");

    // Services
    const activityService = new ActivityService();

    useEffect(() => {
        fetchActivityTypes();
        fetchClients();
    }, []);

    const fetchActivityTypes = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const types = await activityService.fetchActivityTypes(token);
            setActivityTypes(types);
        } catch (error) {
            console.error("Erro ao buscar tipos de atividade:", error);
            Alert.alert("Erro", "Não foi possível carregar os tipos de atividade");
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const response = await ClientService.getClients(
                false, // hasContract
                1, // page
                token, // accessToken
                "" // searchQuery
            );
            setClients(response.results || []);
        } catch (error) {
            console.error("Erro ao buscar clientes:", error);
        }
    };

    const fetchSectors = async (clientId: number) => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const response = await ClientService.getClientSectors(
                clientId.toString(),
                token
            );
            setSectors(response.results || response || []);
        } catch (error) {
            console.error("Erro ao buscar setores:", error);
        }
    };

    const fetchSubsectors = async (sectorId: number) => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            // Subsetores são setores de nível 2 com parent_id = sectorId
            if (selectedClient) {
                const response = await ClientService.getClientSectors(
                    selectedClient.id.toString(),
                    token,
                    2, // level
                    sectorId // parentId
                );
                setSubsectors(response.results || response || []);
            }
        } catch (error) {
            console.error("Erro ao buscar subsetores:", error);
        }
    };

    const fetchEquipments = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const filters: any = {
                page: 1,
                per_page: 100,
            };

            if (selectedClient) filters.client_id = selectedClient.id;
            if (selectedSector) filters.sector_id = selectedSector.id;
            if (selectedSubsector) filters.subsector_id = selectedSubsector.id;

            const response = await EquipamentService.fetchEquipments(token, filters);
            setEquipments(response.results || []);
        } catch (error) {
            console.error("Erro ao buscar equipamentos:", error);
        }
    };

    useEffect(() => {
        if (selectedClient) {
            fetchSectors(selectedClient.id);
            setSelectedSector(null);
            setSelectedSubsector(null);
            setSectors([]);
            setSubsectors([]);
        }
    }, [selectedClient]);

    useEffect(() => {
        if (selectedSector) {
            fetchSubsectors(selectedSector.id);
            setSelectedSubsector(null);
            setSubsectors([]);
        }
    }, [selectedSector]);

    useEffect(() => {
        if (selectedClient) {
            fetchEquipments();
        }
    }, [selectedClient, selectedSector, selectedSubsector]);

    const handleNextStep = () => {
        if (currentStep === 1) {
            if (!selectedActivityType) {
                Alert.alert("Atenção", "Selecione um tipo de atividade");
                return;
            }
            if (!clientOption) {
                Alert.alert("Atenção", "Selecione uma opção de cliente");
                return;
            }
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (clientOption === "existing" && !selectedEquipment) {
                Alert.alert("Atenção", "Selecione um equipamento");
                return;
            }
            if (clientOption === "new" && !newClientName) {
                Alert.alert("Atenção", "Preencha os dados do cliente");
                return;
            }

            // TODO: Criar atividade e vincular equipamento antes de navegar para o questionário
            // Por enquanto, vamos voltar para a tela anterior com os dados selecionados
            Alert.alert(
                "Próximo Passo",
                `Tipo de Atividade: ${selectedActivityType?.name}\n` +
                `${clientOption === "existing" ? `Equipamento: ${selectedEquipment?.tag}` : `Novo Cliente: ${newClientName}`}\n\n` +
                "A criação da atividade e navegação para o questionário será implementada em breve.",
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );
        }
    };

    const handlePreviousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const renderStepIndicator = () => (
        <View style={styles.stepIndicator}>
            <View style={[styles.step, currentStep >= 1 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
                <Text style={styles.stepLabel}>Tipo de Atividade</Text>
            </View>
            <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
            <View style={[styles.step, currentStep >= 2 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
                <Text style={styles.stepLabel}>
                    {clientOption === "new" ? "Novo Cliente" : "Selecionar Equipamento"}
                </Text>
            </View>
        </View>
    );

    const renderStep1 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Tipo de Atividade</Text>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedActivityType?.id}
                    onValueChange={(itemValue) => {
                        const type = activityTypes.find(t => t.id === itemValue);
                        setSelectedActivityType(type || null);
                    }}
                    style={styles.picker}
                >
                    <Picker.Item label="Selecione um tipo de atividade" value={null} />
                    {activityTypes.map((type) => (
                        <Picker.Item key={type.id} label={type.name} value={type.id} />
                    ))}
                </Picker>
            </View>

            <Text style={styles.sectionTitle}>Opção de Cliente</Text>
            <TouchableOpacity
                style={[
                    styles.optionButton,
                    clientOption === "existing" && styles.optionButtonSelected,
                ]}
                onPress={() => setClientOption("existing")}
            >
                <MaterialIcons
                    name="business"
                    size={24}
                    color={clientOption === "existing" ? "#fff" : "#007bff"}
                />
                <Text style={[
                    styles.optionButtonText,
                    clientOption === "existing" && styles.optionButtonTextSelected,
                ]}>
                    Cliente Existente
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.optionButton,
                    clientOption === "new" && styles.optionButtonSelected,
                ]}
                onPress={() => setClientOption("new")}
            >
                <MaterialIcons
                    name="add-business"
                    size={24}
                    color={clientOption === "new" ? "#fff" : "#007bff"}
                />
                <Text style={[
                    styles.optionButtonText,
                    clientOption === "new" && styles.optionButtonTextSelected,
                ]}>
                    Novo Cliente
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderStep2ExistingClient = () => (
        <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Selecionar Equipamento</Text>

            {/* Filtro Cliente */}
            <Text style={styles.filterLabel}>Cliente</Text>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedClient?.id}
                    onValueChange={(itemValue) => {
                        const client = clients.find(c => c.id === itemValue);
                        setSelectedClient(client || null);
                    }}
                    style={styles.picker}
                >
                    <Picker.Item label="Selecione um cliente" value={null} />
                    {clients.map((client) => (
                        <Picker.Item key={client.id} label={client.name} value={client.id} />
                    ))}
                </Picker>
            </View>

            {/* Filtro Setor */}
            {sectors.length > 0 && (
                <>
                    <Text style={styles.filterLabel}>Setor</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={selectedSector?.id}
                            onValueChange={(itemValue) => {
                                const sector = sectors.find(s => s.id === itemValue);
                                setSelectedSector(sector || null);
                            }}
                            style={styles.picker}
                        >
                            <Picker.Item label="Selecione um setor (opcional)" value={null} />
                            {sectors.map((sector) => (
                                <Picker.Item key={sector.id} label={sector.name} value={sector.id} />
                            ))}
                        </Picker>
                    </View>
                </>
            )}

            {/* Filtro Subsetor */}
            {subsectors.length > 0 && (
                <>
                    <Text style={styles.filterLabel}>Subsetor</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={selectedSubsector?.id}
                            onValueChange={(itemValue) => {
                                const subsector = subsectors.find(s => s.id === itemValue);
                                setSelectedSubsector(subsector || null);
                            }}
                            style={styles.picker}
                        >
                            <Picker.Item label="Selecione um subsetor (opcional)" value={null} />
                            {subsectors.map((subsector) => (
                                <Picker.Item key={subsector.id} label={subsector.name} value={subsector.id} />
                            ))}
                        </Picker>
                    </View>
                </>
            )}

            {/* Lista de Equipamentos */}
            <Text style={styles.filterLabel}>Equipamentos</Text>
            <ScrollView style={styles.equipmentList}>
                {equipments.map((equipment) => (
                    <TouchableOpacity
                        key={equipment.id}
                        style={[
                            styles.equipmentItem,
                            selectedEquipment?.id === equipment.id && styles.equipmentItemSelected,
                        ]}
                        onPress={() => setSelectedEquipment(equipment)}
                    >
                        <View style={styles.equipmentInfo}>
                            <Text style={[
                                styles.equipmentTag,
                                selectedEquipment?.id === equipment.id && styles.equipmentTagSelected,
                            ]}>
                                {equipment.tag}
                            </Text>
                            {equipment.equipment_type && (
                                <Text style={[
                                    styles.equipmentType,
                                    selectedEquipment?.id === equipment.id && styles.equipmentTypeSelected,
                                ]}>
                                    {equipment.equipment_type.name}
                                </Text>
                            )}
                        </View>
                        {selectedEquipment?.id === equipment.id && (
                            <MaterialIcons name="check-circle" size={24} color="#007bff" />
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderStep2NewClient = () => (
        <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Dados do Novo Cliente</Text>

            <Text style={styles.inputLabel}>Nome do Cliente *</Text>
            <TextInput
                style={styles.input}
                value={newClientName}
                onChangeText={setNewClientName}
                placeholder="Digite o nome do cliente"
            />

            <Text style={styles.inputLabel}>CPF/CNPJ</Text>
            <TextInput
                style={styles.input}
                value={newClientDocument}
                onChangeText={setNewClientDocument}
                placeholder="Digite o CPF ou CNPJ"
                keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Telefone</Text>
            <TextInput
                style={styles.input}
                value={newClientPhone}
                onChangeText={setNewClientPhone}
                placeholder="Digite o telefone"
                keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>E-mail</Text>
            <TextInput
                style={styles.input}
                value={newClientEmail}
                onChangeText={setNewClientEmail}
                placeholder="Digite o e-mail"
                keyboardType="email-address"
                autoCapitalize="none"
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nova Atividade</Text>
                <View style={{ width: 40 }} />
            </View>

            {renderStepIndicator()}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <Text style={styles.loadingText}>Carregando...</Text>
                </View>
            ) : (
                <ScrollView style={styles.content}>
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && clientOption === "existing" && renderStep2ExistingClient()}
                    {currentStep === 2 && clientOption === "new" && renderStep2NewClient()}
                </ScrollView>
            )}

            <View style={styles.footer}>
                {currentStep > 1 && (
                    <TouchableOpacity
                        style={[styles.footerButton, styles.backButton]}
                        onPress={handlePreviousStep}
                    >
                        <Ionicons name="arrow-back" size={20} color="#666" />
                        <Text style={styles.backButtonText}>Voltar</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.footerButton, styles.nextButton]}
                    onPress={handleNextStep}
                >
                    <Text style={styles.nextButtonText}>
                        {currentStep === 2 ? "Continuar para Questionário" : "Avançar"}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
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
        justifyContent: "space-between",
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
    },
    stepIndicator: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
        paddingHorizontal: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    step: {
        alignItems: "center",
    },
    stepActive: {
        opacity: 1,
    },
    stepNumber: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#e0e0e0",
        color: "#999",
        textAlign: "center",
        lineHeight: 30,
        fontSize: 14,
        fontWeight: "600",
    },
    stepNumberActive: {
        backgroundColor: "#007bff",
        color: "#fff",
    },
    stepLabel: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
        maxWidth: 100,
        textAlign: "center",
    },
    stepLine: {
        width: 50,
        height: 2,
        backgroundColor: "#e0e0e0",
        marginHorizontal: 10,
    },
    stepLineActive: {
        backgroundColor: "#007bff",
    },
    content: {
        flex: 1,
    },
    stepContent: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 16,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        marginBottom: 20,
        backgroundColor: "#fff",
    },
    picker: {
        height: 50,
    },
    optionButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderWidth: 1,
        borderColor: "#007bff",
        borderRadius: 8,
        marginBottom: 12,
        backgroundColor: "#fff",
    },
    optionButtonSelected: {
        backgroundColor: "#007bff",
    },
    optionButtonText: {
        fontSize: 16,
        color: "#007bff",
        marginLeft: 12,
        fontWeight: "500",
    },
    optionButtonTextSelected: {
        color: "#fff",
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginBottom: 8,
        marginTop: 12,
    },
    equipmentList: {
        maxHeight: 300,
        marginTop: 8,
    },
    equipmentItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: "#fff",
    },
    equipmentItemSelected: {
        borderColor: "#007bff",
        backgroundColor: "#f0f8ff",
    },
    equipmentInfo: {
        flex: 1,
    },
    equipmentTag: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    equipmentTagSelected: {
        color: "#007bff",
    },
    equipmentType: {
        fontSize: 14,
        color: "#666",
        marginTop: 2,
    },
    equipmentTypeSelected: {
        color: "#007bff",
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: "#fff",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#666",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e0e0e0",
    },
    footerButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    backButton: {
        backgroundColor: "#f0f0f0",
    },
    backButtonText: {
        fontSize: 16,
        color: "#666",
        marginLeft: 8,
        fontWeight: "500",
    },
    nextButton: {
        backgroundColor: "#007bff",
        flex: 1,
        marginLeft: 12,
        justifyContent: "center",
    },
    nextButtonText: {
        fontSize: 16,
        color: "#fff",
        fontWeight: "600",
        marginRight: 8,
    },
});

export default NewActivityModal;
