import React, { useState, useEffect } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ServiceOrderService from "../Services/ServiceOrderService";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../Routers/AppRouter";
import apiClient from "../Context/ApiClient";
import { API_BASE_URL } from "../config/apiConfig";

interface NewServiceOrderModalProps {
    visible: boolean;
    onClose: () => void;
    navigation: DrawerNavigationProp<RootStackParamList>;
}

const NewServiceOrderModal: React.FC<NewServiceOrderModalProps> = ({ visible, onClose, navigation }) => {
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

    useEffect(() => {
        const fetchClients = async () => {
            try {
                setLoadingClients(true);
                const token = await AsyncStorage.getItem("access_token");
                if (!token) throw new Error("Token não encontrado");
                const response = await apiClient.post(`${API_BASE_URL}/clients`, { search: "" }, { headers: { Authorization: `Bearer ${token}` } });
                setClients(response.data.results || []);
            } catch (error) {
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
            const response = await apiClient.get(`${API_BASE_URL}/clients/${clientId}/sectors`, { headers: { Authorization: `Bearer ${token}` } });
            setSectors(response.data.results || []);
        } catch (error) {
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
            const response = await apiClient.post(`${API_BASE_URL}/equipments`, { sector_id: parseInt(sectorId), search: "" }, { headers: { Authorization: `Bearer ${token}` } });
            setEquipments(response.data.results || []);
        } catch (error) {
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
        if (value) fetchSectors(value);
    };

    const handleSectorChange = (value: string) => {
        setSelectedSector(value);
        setSelectedEquipment("");
        setEquipments([]);
        if (value) fetchEquipments(value);
    };

    const handleCreate = async () => {
        if (!selectedClient || !selectedSector || !selectedEquipment) {
            Alert.alert("Erro", "Por favor, selecione cliente, setor e equipamento.");
            return;
        }
        try {
            setLoadingCreate(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");
            const response = await ServiceOrderService.createServiceOrder(token, { equipment_id: parseInt(selectedEquipment) });
            Alert.alert("Sucesso", "Ordem de Serviço criada com sucesso!");
            onClose();
            navigation.navigate("ViewOrderActivityScreen", { serviceOrderId: response.id, equipmentId: parseInt(selectedEquipment) });
        } catch (error) {
            Alert.alert("Erro", "Não foi possível criar a ordem de serviço.");
        } finally {
            setLoadingCreate(false);
        }
    };

    const selectedEquipmentData = equipments.find((e) => e.id.toString() === selectedEquipment);

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Nova Ordem de Serviço</Text>
                    <View style={styles.filterSection}>
                        <Text style={styles.label}>Cliente</Text>
                        {loadingClients ? <ActivityIndicator size="small" color="#007BFF" /> : (
                            <Picker selectedValue={selectedClient} onValueChange={handleClientChange} style={styles.picker}>
                                <Picker.Item label="Selecione um cliente" value="" />
                                {clients.map((client) => <Picker.Item key={client.id} label={client.name} value={client.id.toString()} />)}
                            </Picker>
                        )}
                        <Text style={styles.label}>Setor</Text>
                        {loadingSectors ? <ActivityIndicator size="small" color="#007BFF" /> : (
                            <Picker selectedValue={selectedSector} onValueChange={handleSectorChange} style={styles.picker} enabled={!!selectedClient}>
                                <Picker.Item label="Selecione um setor" value="" />
                                {sectors.map((sector) => <Picker.Item key={sector.id} label={sector.name} value={sector.id.toString()} />)}
                            </Picker>
                        )}
                        <Text style={styles.label}>Equipamento</Text>
                        {loadingEquipments ? <ActivityIndicator size="small" color="#007BFF" /> : (
                            <Picker selectedValue={selectedEquipment} onValueChange={setSelectedEquipment} style={styles.picker} enabled={!!selectedSector}>
                                <Picker.Item label="Selecione um equipamento" value="" />
                                {equipments.map((equipment) => (
                                    <Picker.Item key={equipment.id} label={`${equipment.brand?.name} - ${equipment.equipment_type?.name} - ${equipment.tag}`} value={equipment.id.toString()} />
                                ))}
                            </Picker>
                        )}
                    </View>
                    {selectedEquipmentData && (
                        <View style={styles.summarySection}>
                            <Text style={styles.sectionTitle}>Resumo do Equipamento</Text>
                            <Text style={styles.summaryText}>Tag: {selectedEquipmentData.tag}</Text>
                            <Text style={styles.summaryText}>Patrimônio: {selectedEquipmentData.patrimony || "N/A"}</Text>
                            <Text style={styles.summaryText}>Número de Série: {selectedEquipmentData.serial_number || "N/A"}</Text>
                            <Text style={styles.summaryText}>Fabricante: {selectedEquipmentData.brand?.name}</Text>
                            <Text style={styles.summaryText}>Tecnologia: {selectedEquipmentData.technology || "N/A"}</Text>
                            <Text style={styles.summaryText}>Tipo de Equipamento: {selectedEquipmentData.equipment_type?.name}</Text>
                        </View>
                    )}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={[styles.createButton, loadingCreate && styles.disabledButton]} onPress={handleCreate} disabled={loadingCreate}>
                            {loadingCreate ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Criar Ordem de Serviço</Text>}
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
    modalContainer: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0, 0, 0, 0.5)" },
    modalContent: { backgroundColor: "#fff", margin: 20, borderRadius: 10, padding: 20, maxHeight: "80%" },
    modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center", color: "#333" },
    filterSection: { marginBottom: 20 },
    label: { fontSize: 16, fontWeight: "bold", marginBottom: 5, color: "#555" },
    picker: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 5,
        marginBottom: 10,
        backgroundColor: "#fff",
        color: "#333",
    },
    summarySection: { marginBottom: 20, padding: 10, backgroundColor: "#f5f5f5", borderRadius: 5 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10, color: "#333" },
    summaryText: { fontSize: 14, color: "#555", marginBottom: 5 },
    buttonContainer: { flexDirection: "row", justifyContent: "space-between" },
    createButton: { backgroundColor: "#007BFF", padding: 12, borderRadius: 5, flex: 1, alignItems: "center", marginRight: 5 },
    cancelButton: { backgroundColor: "#dc3545", padding: 12, borderRadius: 5, flex: 1, alignItems: "center", marginLeft: 5 },
    disabledButton: { backgroundColor: "#ccc" },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default NewServiceOrderModal;