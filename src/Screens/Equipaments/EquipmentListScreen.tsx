import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Button,
  TextInput,
  Switch,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import EquipmentService from "../../Services/EquipamentService";
import ActivityService from "../../Services/ActivityService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import { Equipment } from "../../Models/Equipament";
import { usePermissions } from "../../Context/PermissionsContext";
import ClientService from "../../Services/ClientService";

interface EquipmentListScreenProps {
  route: RouteProp<RootStackParamList, "EquipmentListScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "EquipmentListScreen">;
}

const EquipmentListScreen: React.FC<EquipmentListScreenProps> = ({
  route,
  navigation,
}) => {
  const { clientId, sectorId, activityId } = route.params as any;

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const { hasPermission, permissions } = usePermissions();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [clientName, setClientName] = useState("");
  const [sectorName, setSectorName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [subsectorFilter, setSubsectorFilter] = useState<number | undefined>(undefined);
  const [onlyMine, setOnlyMine] = useState(false);

  // Filtros extras para setor/subsetor/status
  // ... (pode expandir para buscar setores/subsetores se necessário)

  const fetchClientAndSectorNames = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) return;

      if (clientId) {
        const clientDetails = await ClientService.getClientDetails(clientId, token);
        setClientName(clientDetails.name || "N/A");
      }

      if (clientId && sectorId) {
        const sectorsResponse = await ClientService.getClientSectors(clientId.toString(), token);
        const sector = sectorsResponse.results?.find((s: any) => s.id === sectorId);
        setSectorName(sector?.name || "N/A");
      }
    } catch (error) {
      console.error("Erro ao buscar nomes de cliente/setor:", error);
    }
  };

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      if (activityId) {
        // Buscar equipamentos vinculados à atividade
        const response = await ActivityService.fetchActivityEquipments(activityId, { token });
        let filtered = response.results || response.equipments || [];
        // Filtros locais
        if (statusFilter) filtered = filtered.filter((eq: any) => eq.status === statusFilter);
        if (subsectorFilter) filtered = filtered.filter((eq: any) => eq.subsector_id === subsectorFilter);
        if (searchTerm) filtered = filtered.filter((eq: any) =>
          (eq.tag || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (eq.patrimony || "").toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (onlyMine) filtered = filtered.filter((eq: any) => eq.started_by_me);
        setEquipmentList(filtered);
        setTotalPages(1); // Paginação local, ajuste se backend suportar
      } else {
        // Listagem normal
        const filters: { client_id?: number; sector_id?: number; page: number; per_page: number } = {
          page: page,
          per_page: 10,
        };
        if (clientId) filters.client_id = clientId;
        if (sectorId) filters.sector_id = sectorId;
        const response = await EquipmentService.fetchEquipments(token, filters);
        setEquipmentList(response.results || []);
        setTotalPages(Math.ceil(response.count / 10) || 1);
      }
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha ao carregar os equipamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientAndSectorNames();
    fetchEquipments();
  }, [clientId, sectorId, page, activityId, statusFilter, subsectorFilter, searchTerm, onlyMine]);

  const handleRemoveEquipment = async (equipmentId: number) => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");
      await EquipmentService.removeEquipment(token, equipmentId);
      Alert.alert("Sucesso", "Equipamento removido com sucesso!");
      fetchEquipments();
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha ao remover o equipamento.");
    }
  };

  const renderEquipmentItem = ({ item }: { item: any }) => (
    <View style={styles.itemContainer}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemText}>Status: {item.status || "N/A"}</Text>
        <Text style={styles.itemText}>Tag: {item.tag || item.patrimony || "N/A"}</Text>
        <Text style={styles.itemText}>Fabricante: {item.brand?.name || "N/A"}</Text>
        <Text style={styles.itemText}>Setor: {item.sector?.name || "N/A"}</Text>
        <Text style={styles.itemText}>Tipo: {item.equipment_type?.name || "N/A"}</Text>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate("EditEquipmentScreen", { equipmentId: String(item.id) })}
      >
        <FontAwesome name="pencil" size={20} color="#007BFF" />
        <Text style={styles.editButtonText}>Editar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() =>
          Alert.alert(
            "Confirmação",
            "Tem certeza de que deseja remover este equipamento?",
            [
              { text: "Cancelar", style: "cancel" },
              { text: "Confirmar", onPress: () => handleRemoveEquipment(item.id) },
            ]
          )
        }
      >
        <FontAwesome name="times" size={20} color="red" />
        <Text style={styles.removeButtonText}>Remover</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate("ViewOrderActivityScreen", { equipmentId: item.id })}
      >
        <FontAwesome name="eye" size={20} color="#007BFF" />
        <Text style={styles.editButtonText}>Ver Detalhes</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {clientId && (
        <Text style={styles.headerText}>Cliente: {clientName}</Text>
      )}
      {sectorId && (
        <Text style={styles.headerText}>Setor: {sectorName}</Text>
      )}
      {/* Filtros */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 8, marginRight: 8 }}
          placeholder="Buscar por termo (tag, patrimônio...)"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <Text>Status:</Text>
        <TextInput
          style={{ width: 80, borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 8, marginLeft: 4 }}
          placeholder="Status"
          value={statusFilter || ""}
          onChangeText={setStatusFilter}
        />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <Text>Somente meus:</Text>
        <Switch value={onlyMine} onValueChange={setOnlyMine} />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" />
      ) : (
        <>
          <FlatList
            data={equipmentList}
            keyExtractor={(item) => `${item.id}`}
            renderItem={renderEquipmentItem}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhum equipamento encontrado.</Text>}
          />
          <View style={styles.pagination}>
            <Button
              title="Anterior"
              onPress={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
            />
            <Text style={styles.pageText}>Página {page} de {totalPages}</Text>
            <Button
              title="Próximo"
              onPress={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              disabled={page === totalPages}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginVertical: 10,
  },
  errorText: {
    fontSize: 16,
    color: "#FF0000",
    textAlign: "center",
    marginTop: 20,
  },
  opContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  qrButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  itemText: {
    fontSize: 16,
    color: "#333",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
  },
  editButtonText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#007BFF",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
  },
  removeButtonText: {
    marginLeft: 5,
    fontSize: 14,
    color: "red",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  pageText: {
    fontSize: 14,
    color: "#333",
  },
});

export default EquipmentListScreen;
