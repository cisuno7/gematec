import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Picker,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import TechnicalAssistanceService from "../../Services/TechnicalAssistanceService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePermissions } from "../../Context/PermissionsContext";
import apiClient from "../../Context/ApiClient";
import ActivityService from "../../Services/ActivityService";

import { API_BASE_URL } from "../../config/apiConfig";
interface EquipmentDetailsScreenProps {
  route: RouteProp<RootStackParamList, "EquipmentDetailsScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "EquipmentDetailsScreen">;
}

const EquipmentDetailsScreen: React.FC<EquipmentDetailsScreenProps> = ({ route, navigation }) => {
  const { equipmentId } = route.params;
  const { hasPermission, permissions } = usePermissions();
  const [equipment, setEquipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const parsedEquipmentId = parseInt(equipmentId as unknown as string);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [activityForm, setActivityForm] = useState({
    name: "",
    activity_type_id: undefined,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
  });
  const [creatingActivity, setCreatingActivity] = useState(false);


  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const token = await AsyncStorage.getItem("access_token");
        if (!token) throw new Error("Token não encontrado");

        const response = await apiClient.get(`${API_BASE_URL}/equipments/${equipmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEquipment(response.data);
      } catch (error) {
        console.error("Erro ao buscar equipamento:", error);
        Alert.alert("Erro", "Não foi possível carregar os detalhes do equipamento.");
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, [equipmentId]);

  const handleCreateAssistance = async () => {
    try {
      setLoadingCreate(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");

      const service = new TechnicalAssistanceService();
      const response = await service.createTechnicalAssistance(token, {
        equipment_id: parseInt(equipmentId),
      });

      Alert.alert("Sucesso", "Assistência técnica criada com sucesso!");
      navigation.navigate("TechnicalAssistanceDetails", { id: response.id });
    } catch (error) {
      console.error("Erro ao criar assistência técnica:", error);
      Alert.alert("Erro", "Não foi possível criar a assistência técnica.");
    } finally {
      setLoadingCreate(false);
    }
  };

  const openCreateActivityModal = async () => {
    setShowCreateActivity(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");
      const types = await ActivityService.fetchActivityTypes(token);
      setActivityTypes(types);
    } catch (err) {
      Alert.alert("Erro", "Não foi possível carregar tipos de atividade.");
    }
  };

  const handleCreateActivity = async () => {
    try {
      setCreatingActivity(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");
      // 1. Criar atividade
      const activity = await ActivityService.createActivity({
        name: activityForm.name,
        activity_type_id: activityForm.activity_type_id,
        start_date: activityForm.start_date,
        end_date: activityForm.end_date,
      }, token);
      // 2. Vincular equipamento
      await ActivityService.linkEquipmentToActivity(activity.id, { equipment_id: parsedEquipmentId }, token);
      setShowCreateActivity(false);
      Alert.alert("Sucesso", "Atividade criada e equipamento vinculado!");
      navigation.navigate("ActivityHistoryScreen", { equipmentId: parsedEquipmentId });
    } catch (err) {
      Alert.alert("Erro", "Não foi possível criar a atividade.");
    } finally {
      setCreatingActivity(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#007BFF" />;
  }

  if (!equipment) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Equipamento não encontrado.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Detalhes do Equipamento</Text>
      <Text style={styles.label}>Cliente: <Text style={styles.value}>{equipment.client?.name || "N/A"}</Text></Text>
      <Text style={styles.label}>Setor: <Text style={styles.value}>{equipment.sector?.name || "N/A"}</Text></Text>
      <Text style={styles.label}>Tag: <Text style={styles.value}>{equipment.tag || "N/A"}</Text></Text>
      <Text style={styles.label}>Patrimônio: <Text style={styles.value}>{equipment.patrimony || "N/A"}</Text></Text>
      <Text style={styles.label}>Número de Série: <Text style={styles.value}>{equipment.serial_number || "N/A"}</Text></Text>
      <Text style={styles.label}>Fabricante: <Text style={styles.value}>{equipment.brand?.name || "N/A"}</Text></Text>
      <Text style={styles.label}>Tecnologia: <Text style={styles.value}>{equipment.technology || "N/A"}</Text></Text>
      <Text style={styles.label}>Tipo de Equipamento: <Text style={styles.value}>{equipment.equipment_type?.name || "N/A"}</Text></Text>
      <Text style={styles.label}>Tipo de Evaporadora: <Text style={styles.value}>{equipment.evaporator_type?.name || "N/A"}</Text></Text>
      <Text style={styles.label}>Tipo de Serpentina: <Text style={styles.value}>{equipment.coil_type?.name || "N/A"}</Text></Text>
      <Text style={styles.label}>Tipo de Coifa: <Text style={styles.value}>{equipment.condenser_type?.name || "N/A"}</Text></Text>
      <Text style={styles.label}>Capacidade: <Text style={styles.value}>{equipment.capacity || "N/A"}</Text></Text>
      <Text style={styles.label}>Voltagem: <Text style={styles.value}>{equipment.voltage || "N/A"}</Text></Text>
      <Text style={styles.label}>Corrente Elétrica: <Text style={styles.value}>{equipment.electric_current || "N/A"}</Text></Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("ActivityHistoryScreen", { equipmentId: parsedEquipmentId })}
        >
          <Text style={styles.buttonText}>Visualizar Atividades</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, loadingCreate && styles.disabledButton]}
          onPress={handleCreateAssistance}
          disabled={loadingCreate}
        >
          {loadingCreate ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Criar Assistência Técnica</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={openCreateActivityModal}
        >
          <Text style={styles.buttonText}>Criar Atividade</Text>
        </TouchableOpacity>
      </View>
      {/* Modal de criação de atividade */}
      <Modal
        visible={showCreateActivity}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateActivity(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '90%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Criar Atividade</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, marginBottom: 10 }}
              placeholder="Nome da atividade"
              value={activityForm.name}
              onChangeText={text => setActivityForm(f => ({ ...f, name: text }))}
            />
            <Text>Tipo de Atividade:</Text>
            <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 10 }}>
              <Picker
                selectedValue={activityForm.activity_type_id}
                onValueChange={v => setActivityForm(f => ({ ...f, activity_type_id: v }))}
              >
                <Picker.Item label="Selecione..." value={undefined} />
                {activityTypes.map((t: any) => (
                  <Picker.Item key={t.id} label={t.name} value={t.id} />
                ))}
              </Picker>
            </View>
            <Text>Data de início:</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, marginBottom: 10 }}
              placeholder="AAAA-MM-DD"
              value={activityForm.start_date}
              onChangeText={text => setActivityForm(f => ({ ...f, start_date: text }))}
            />
            <Text>Data final:</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, marginBottom: 10 }}
              placeholder="AAAA-MM-DD"
              value={activityForm.end_date}
              onChangeText={text => setActivityForm(f => ({ ...f, end_date: text }))}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={[styles.button, { marginRight: 10 }]}
                onPress={() => setShowCreateActivity(false)}
                disabled={creatingActivity}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={handleCreateActivity}
                disabled={creatingActivity}
              >
                {creatingActivity ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Criar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// Estilos - Adicionar disabledButton
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    color: "#555",
  },
  value: {
    fontWeight: "normal",
    color: "#333",
  },
  buttonContainer: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 5,
    flex: 1,
    alignItems: "center",
    marginHorizontal: 5,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  errorText: {
    fontSize: 18,
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
});

export default EquipmentDetailsScreen;