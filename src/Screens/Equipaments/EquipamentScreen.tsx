
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Button,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import EquipmentService from "../../Services/EquipamentService";
import apiClient from "../../Context/ApiClient"
import { Equipment } from "../../Models/Equipament";
import EquipmentFilters from "../../Components/EquipamentFilters";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../config/apiConfig";
import axios from "axios";
import { usePermissions } from "../../Context/PermissionsContext";
import { Sector } from "../../Models/Clientes"; // Importe a interface Sector

interface EquipamentScreenProps {
  route: RouteProp<RootStackParamList, "EquipamentScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "EquipamentScreen">;
}

const EquipamentScreen: React.FC<EquipamentScreenProps> = ({ route, navigation }) => {
  const { clientId, sectorId, subsectorId } = route.params; // Recebe clientId, sectorId e subsectorId
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [clientName, setClientName] = useState("");
  const [sectorName, setSectorName] = useState("");
  const [currentSectorSubsectors, setCurrentSectorSubsectors] = useState<Sector[]>([]); // <--- DECLARAÇÃO AQUI!
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { hasPermission, permissions } = usePermissions();



  const fetchClientAndSector = async () => {
    try {
      if (!clientId || !sectorId) {
        throw new Error("clientId ou sectorId não fornecidos.");
      }
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      const clientRes = await apiClient.get(`${API_BASE_URL}/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClientName(clientRes.data.name || "N/A");

      // Buscar detalhes do setor para obter os subsetores
      const sectorRes = await apiClient.get(`${API_BASE_URL}/clients/${clientId}/sectors/${sectorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSectorName(sectorRes.data.name || "N/A");
      setCurrentSectorSubsectors(sectorRes.data.subsectors || []); // Atualiza o estado com os subsetores
    } catch (error: any) {
      console.error("[EquipamentScreen] Erro ao buscar cliente/setor:", error.message || error);
    }
  };

  const fetchEquipment = async (filters: any) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      const updatedFilters = {
        ...filters,
        sector_id: sectorId,
        client_id: clientId,
        subsector_id: filters.subsector_id || subsectorId, // Inclui o subsectorId do filtro ou da rota
        page,
        per_page: 10,
      };

      const equipmentData = await EquipmentService.fetchEquipments(token, updatedFilters);
      setEquipmentList(equipmentData.results || []);
      setTotalPages(Math.ceil(equipmentData.count / 10) || 1);
    } catch (error: any) {
      console.error("[EquipamentScreen] Erro ao buscar equipamentos:", error.message || error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientAndSector();
  }, [clientId, sectorId]); // Adicionado clientId e sectorId como dependências

  useEffect(() => {
    // Chamar fetchEquipment com os filtros iniciais (incluindo subsectorId da rota)
    fetchEquipment({
      brand: "",
      equipmentType: "",
      search: "",
      status: "",
      subsector_id: subsectorId, // Garante que o filtro inicial inclua o subsectorId da rota
    });
  }, [page, subsectorId]); // Adicionado subsectorId como dependência

  const navigateToDetails = (equipmentId: number) => {
    navigation.navigate("EquipmentDetailsScreen", { equipmentId: String(equipmentId) });
  };

  const renderEquipmentItem = ({ item }: { item: Equipment }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemText}>Tag: {item.tag}</Text>
      <Text style={styles.itemText}>Patrimônio: {item.patrimony}</Text>
      <Text style={styles.itemText}>Tipo de Equipamento: {item.equipment_type?.name || "N/A"}</Text>
      <Text style={styles.itemText}>Fabricante: {item.brand?.name || "N/A"}</Text>
      <Text style={styles.itemText}>Tecnologia: {item.technology?.name || "N/A"}</Text>
      <Text style={styles.itemText}>Setor ID: {item.sector_id || "N/A"}</Text>
      <Text style={styles.itemText}>Cliente ID: {item.client_id || "N/A"}</Text>
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => navigateToDetails(item.id)}
      >
        <FontAwesome name="eye" size={20} color="#007BFF" />
        <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.activitiesButton}
        onPress={() => {
          if (!item.id) {
            console.error("Erro: ID do equipamento", { equipmentId: item.id });
            return;
          }
          navigation.navigate("ActivityHistoryScreen", { equipmentId: item.id });
        }}
      >
        <FontAwesome name="history" size={20} color="#28a745" />
        <Text style={styles.activitiesButtonText}>Visualizar Atividades</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Cliente: {clientName} | Setor: {sectorName}</Text>
      <View style={styles.opContainer}>
        <EquipmentFilters
          onFilter={fetchEquipment}
          sectorId={sectorId}
          clientId={clientId}
          subsectors={currentSectorSubsectors} // Passa os subsetores para o filtro
        />
        <View style={styles.actionButtons}>
          {hasPermission("add_equipment") && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate("CreateEquipmentScreen")}
            >
              <FontAwesome name="plus" size={16} color="#fff" />
              <Text style={styles.createButtonText}>Novo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.qrButton}
            onPress={() => navigation.navigate("EquipmentQRCodeScreen", {})}
          >
            <FontAwesome name="qrcode" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
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
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  opContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  qrButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
  },
  itemContainer: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 3,
  },
  itemText: {
    fontSize: 14,
    color: "#333",
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  detailsButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#007BFF",
  },
  activitiesButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#28a745",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  activitiesButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 20,
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
  errorText: {
    fontSize: 16,
    color: "#FF0000",
    textAlign: "center",
    marginTop: 20,
  },
});

export default EquipamentScreen;
