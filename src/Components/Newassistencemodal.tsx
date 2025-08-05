import React, { useState, useEffect } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TechnicalAssistanceService from "../Services/TechnicalAssistanceService";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../Routers/AppRouter";

interface NewTechnicalAssistanceModalProps {
    visible: boolean;
    onClose: () => void;

}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const NewTechnicalAssistanceModal: React.FC<NewTechnicalAssistanceModalProps> = ({
    visible,
    onClose,

}) => {
    const navigation = useNavigation<NavigationProp>();
    const [clients, setClients] = useState<any[]>([]);
    const [sectors, setSectors] = useState<any[]>([]);
    const [equipments, setEquipments] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState("");
    const [selectedSector, setSelectedSector] = useState("");
    const [selectedEquipment, setSelectedEquipment] = useState("");
    const [loadingClients, setLoadingClients] = useState(false);
    const [loadingSectors, setLoadingSectors] = useState(false);
    const [loadingEquipments, setLoadingEquipments] = useState(false);
    const [loadingCreate, setLoadingCreate] = useState(false);
    const service = new TechnicalAssistanceService();

    useEffect(() => {
        const fetchClients = async () => {
            try {
                setLoadingClients(true);
                const token = await AsyncStorage.getItem("access_token");
                if (!token) throw new Error("Token não encontrado");
                const response = await service.fetchClients(token, "");
                setClients(response.results || []);
            } catch (error) {
                console.error("Erro ao buscar clientes:", error);
                Alert.alert("Erro", "Não foi possível carregar os clientes.");
            } finally {
                setLoadingClients(false);
            }
        };
        if (visible) {
            fetchClients();
            setSelectedClient("");
            setSelectedSector("");
            setSelectedEquipment("");
            setSectors([]);
            setEquipments([]);
        }
    }, [visible]);

    const fetchSectors = async (clientId: string) => {
        try {
            setLoadingSectors(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");
            const response = await service.fetchSectors(token, parseInt(clientId), "");
            setSectors(response.results || []);
        } catch (error) {
            console.error("Erro ao buscar setores:", error);
            Alert.alert("Erro", "Não foi possível carregar os setores.");
        } finally {
            setLoadingSectors(false);
        }
    };

    const fetchEquipments = async (sectorId: string) => {
        try {
            setLoadingEquipments(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");
            const response = await service.fetchEquipments(token, parseInt(sectorId), "");
            setEquipments(response.results || []);
        } catch (error) {
            console.error("Erro ao buscar equipamentos:", error);
            Alert.alert("Erro", "Não foi possível carregar os equipamentos.");
        } finally {
            setLoadingEquipments(false);
        }
    };

    const handleClientChange = (value: string) => {
        setSelectedClient(value);
        setSelectedSector("");
        setSelectedEquipment("");
        setSectors([]);
        setEquipments([]);
        if (value) {
            fetchSectors(value);
        }
    };

    const handleSectorChange = (value: string) => {
        setSelectedSector(value);
        setSelectedEquipment("");
        setEquipments([]);
        if (value) {
            fetchEquipments(value);
        }
    };

    const handleCreate = async () => {
        if (!selectedClient) {
            Alert.alert("Erro", "Por favor, selecione um cliente.");
            return;
        }
        if (!selectedSector) {
            Alert.alert("Erro", "Por favor, selecione um setor.");
            return;
        }
        if (!selectedEquipment) {
            Alert.alert("Erro", "Por favor, selecione um equipamento.");
            return;
        }

        try {
            setLoadingCreate(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const response = await service.createTechnicalAssistance(token, {
                equipment_id: parseInt(selectedEquipment),
            });

            Alert.alert("Sucesso", "Assistência técnica criada com sucesso!");
            onClose();
            navigation.navigate("TechnicalAssistanceDetails", { id: response.id });
        } catch (error) {
            console.error("Erro ao criar assistência técnica:", error);
            Alert.alert("Erro", "Não foi possível criar a assistência técnica.");
        } finally {
            setLoadingCreate(false);
        }
    };

    const selectedEquipmentData = equipments.find((e) => e.id.toString() === selectedEquipment);

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Nova Assistência Técnica</Text>

                    {/* Filtros */}
                    <View style={styles.filterSection}>
                        <Text style={styles.label}>Cliente</Text>
                        {loadingClients ? (
                            <ActivityIndicator size="small" color="#007BFF" />
                        ) : (
                            <Picker
                                selectedValue={selectedClient}
                                onValueChange={handleClientChange}
                                style={styles.picker}
                            >
                                <Picker.Item label="Selecione um cliente" value="" />
                                {clients.map((client) => (
                                    <Picker.Item key={client.id} label={client.name} value={client.id.toString()} />
                                ))}
                            </Picker>
                        )}

                        <Text style={styles.label}>Setor</Text>
                        {loadingSectors ? (
                            <ActivityIndicator size="small" color="#007BFF" />
                        ) : (
                            <Picker
                                selectedValue={selectedSector}
                                onValueChange={handleSectorChange}
                                style={styles.picker}
                                enabled={!!selectedClient}
                            >
                                <Picker.Item label="Selecione um setor" value="" />
                                {sectors.map((sector) => (
                                    <Picker.Item key={sector.id} label={sector.name} value={sector.id.toString()} />
                                ))}
                            </Picker>
                        )}

                        <Text style={styles.label}>Equipamento</Text>
                        {loadingEquipments ? (
                            <ActivityIndicator size="small" color="#007BFF" />
                        ) : (
                            <Picker
                                selectedValue={selectedEquipment}
                                onValueChange={setSelectedEquipment}
                                style={styles.picker}
                                enabled={!!selectedSector}
                            >
                                <Picker.Item label="Selecione um equipamento" value="" />
                                {equipments.map((equipment) => (
                                    <Picker.Item
                                        key={equipment.id}
                                        label={`${equipment.brand?.name} - ${equipment.equipment_type?.name} - ${equipment.tag}`}
                                        value={equipment.id.toString()}
                                    />
                                ))}
                            </Picker>
                        )}
                    </View>

                    {/* Resumo do Equipamento */}
                    {selectedEquipmentData && (
                        <View style={styles.summarySection}>
                            <Text style={styles.sectionTitle}>Resumo do Equipamento</Text>
                            <Text style={styles.summaryText}>Tag: {selectedEquipmentData.tag}</Text>
                            <Text style={styles.summaryText}>Patrimônio: {selectedEquipmentData.patrimony}</Text>
                            <Text style={styles.summaryText}>Número de Série: {selectedEquipmentData.serial_number || "N/A"}</Text>
                            <Text style={styles.summaryText}>Fabricante: {selectedEquipmentData.brand?.name}</Text>
                            <Text style={styles.summaryText}>Tecnologia: {selectedEquipmentData.technology || "N/A"}</Text>
                            <Text style={styles.summaryText}>Tipo de Equipamento: {selectedEquipmentData.equipment_type?.name}</Text>
                        </View>
                    )}

                    {/* Botões */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.createButton, (loadingCreate || !selectedEquipment) && styles.disabledButton]}
                            onPress={handleCreate}
                            disabled={loadingCreate || !selectedEquipment}
                        >
                            {loadingCreate ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Criar Assistência Técnica</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.buttonText}>Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        backgroundColor: "#fff",
        margin: 20,
        borderRadius: 10,
        padding: 20,
        maxHeight: "80%",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
        color: "#333",
    },
    filterSection: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 5,
        color: "#555",
    },
    picker: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 5,
        marginBottom: 10,
        backgroundColor: "#fff",
        color: "#333",
    },
    summarySection: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: "#f5f5f5",
        borderRadius: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#333",
    },
    summaryText: {
        fontSize: 14,
        color: "#555",
        marginBottom: 5,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    createButton: {
        backgroundColor: "#007BFF",
        padding: 12,
        borderRadius: 5,
        flex: 1,
        alignItems: "center",
        marginRight: 5,
    },
    cancelButton: {
        backgroundColor: "#dc3545",
        padding: 12,
        borderRadius: 5,
        flex: 1,
        alignItems: "center",
        marginLeft: 5,
    },
    disabledButton: {
        backgroundColor: "#ccc",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default NewTechnicalAssistanceModal;