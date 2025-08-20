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
  ScrollView,
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
import CustomPicker from "../../Components/CustomPicker";
import axios from "axios";
import { buildApiUrlForAccount } from "../../config/apiConfig";

interface EquipmentListScreenProps {
  route: RouteProp<RootStackParamList, "EquipmentListScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "EquipmentListScreen">;
}

const EquipmentListScreen: React.FC<EquipmentListScreenProps> = ({
  route,
  navigation,
}) => {
  const { clientId, sectorId, activityId } = route.params as any;

  console.log("[EquipmentListScreen] Parâmetros recebidos:", {
    clientId,
    sectorId,
    activityId,
    routeParams: route.params
  });

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const { hasPermission, permissions } = usePermissions();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [clientName, setClientName] = useState("");
  const [sectorName, setSectorName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState("");
  const [subsectorFilter, setSubsectorFilter] = useState<number | undefined>(undefined);
  const [brands, setBrands] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingEquipmentTypes, setLoadingEquipmentTypes] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState(clientId || "");
  const [selectedSectorId, setSelectedSectorId] = useState(sectorId || "");

  // Log para verificar se as variáveis foram inicializadas corretamente
  useEffect(() => {
    console.log("[EquipmentListScreen] Estados inicializados:", {
      clientId,
      sectorId,
      selectedClientId,
      selectedSectorId
    });
  }, [clientId, sectorId, selectedClientId, selectedSectorId]);



  // Carregar marcas e tipos de equipamento
  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      const apiUrl = await buildApiUrlForAccount();
      console.log("[EquipmentListScreen] Fazendo requisição para brands:", `${apiUrl}/brands`);
      const res = await axios.get(`${apiUrl}/brands`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("[EquipmentListScreen] Marcas carregadas:", res.data.results?.length || 0);
      setBrands(res.data.results || []);
    } catch (error) {
      console.error("[EquipmentListScreen] Erro ao buscar marcas:", error);
    } finally {
      setLoadingBrands(false);
    }
  };

  const fetchEquipmentTypes = async () => {
    setLoadingEquipmentTypes(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      const apiUrl = await buildApiUrlForAccount();
      console.log("[EquipmentListScreen] Fazendo requisição para equipment_types:", `${apiUrl}/equipment_types`);
      const res = await axios.get(`${apiUrl}/equipment_types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("[EquipmentListScreen] Tipos de equipamento carregados:", res.data.results?.length || 0);
      setEquipmentTypes(res.data.results || []);
    } catch (error) {
      console.error("[EquipmentListScreen] Erro ao buscar tipos de equipamento:", error);
    } finally {
      setLoadingEquipmentTypes(false);
    }
  };

  const fetchClientAndSectorNames = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) return;

      if (selectedClientId) {
        const clientDetails = await ClientService.getClientDetails(parseInt(selectedClientId), token);
        setClientName(clientDetails.name || "N/A");
      }

      if (selectedClientId && selectedSectorId) {
        const sectorsResponse = await ClientService.getClientSectors(selectedClientId, token);
        const sector = sectorsResponse.results?.find((s: any) => s.id === parseInt(selectedSectorId));
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
        if (subsectorFilter) filtered = filtered.filter((eq: any) => eq.subsector_id === subsectorFilter);
        if (searchTerm) filtered = filtered.filter((eq: any) =>
          (eq.tag || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (eq.patrimony || "").toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (brandFilter) filtered = filtered.filter((eq: any) =>
          (eq.brand?.name || "").toLowerCase().includes(brandFilter.toLowerCase())
        );
        if (equipmentTypeFilter) filtered = filtered.filter((eq: any) =>
          (eq.equipment_type?.name || "").toLowerCase().includes(equipmentTypeFilter.toLowerCase())
        );
        setEquipmentList(filtered);
        setTotalPages(1); // Paginação local, ajuste se backend suportar
      } else {
        // Listagem normal
        const filters: { client_id?: number; sector_id?: number; page: number; per_page: number } = {
          page: page,
          per_page: 10,
        };
        if (selectedClientId) filters.client_id = parseInt(selectedClientId);
        if (selectedSectorId) filters.sector_id = parseInt(selectedSectorId);
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
  }, [selectedClientId, selectedSectorId, page, activityId, subsectorFilter, searchTerm, brandFilter, equipmentTypeFilter]);

  // Carregar dados iniciais
  useEffect(() => {
    fetchBrands();
    fetchEquipmentTypes();
  }, []);



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



  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header com informações do cliente/setor */}
        <View style={styles.headerSection}>
          <View style={styles.headerInfo}>
            {selectedClientId && (
              <Text style={styles.headerText}>Cliente: {clientName}</Text>
            )}
            {selectedSectorId && (
              <Text style={styles.headerText}>Setor: {sectorName}</Text>
            )}
          </View>
          {hasPermission("add_equipment") && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                console.log("[EquipmentListScreen] Clicando em Adicionar Equipamento com:", {
                  selectedClientId,
                  selectedSectorId,
                  clientIdInt: parseInt(selectedClientId),
                  sectorIdInt: parseInt(selectedSectorId)
                });
                navigation.navigate("CreateEquipmentScreen", {
                  clientId: parseInt(selectedClientId),
                  sectorId: parseInt(selectedSectorId)
                });
              }}
            >
              <FontAwesome name="plus" size={16} color="#fff" />
              <Text style={styles.createButtonText}>Adicionar Equipamento</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros */}
        <View style={styles.filtersSection}>
          <Text style={styles.filtersTitle}>Filtros</Text>



          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por Tag ou Patrimônio"
            placeholderTextColor="#999"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />

          {/* Filtro de Fabricante */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Fabricante:</Text>
            {loadingBrands ? (
              <ActivityIndicator size="small" color="#007BFF" />
            ) : (
              <CustomPicker
                selectedValue={brandFilter}
                onValueChange={(value) => {
                  console.log("[EquipmentListScreen] Fabricante selecionado:", value);
                  setBrandFilter(value || "");
                }}
                items={brands.map((b: any) => ({ label: b.name, value: b.id.toString() }))}
                placeholder="Selecione um fabricante"
                style={styles.picker}
              />
            )}
          </View>

          {/* Filtro de Tipo de Equipamento */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Tipo:</Text>
            {loadingEquipmentTypes ? (
              <ActivityIndicator size="small" color="#007BFF" />
            ) : (
              <CustomPicker
                selectedValue={equipmentTypeFilter}
                onValueChange={(value) => {
                  console.log("[EquipmentListScreen] Tipo de equipamento selecionado:", value);
                  setEquipmentTypeFilter(value || "");
                }}
                items={equipmentTypes.map((t: any) => ({ label: t.name, value: t.id.toString() }))}
                placeholder="Selecione um tipo"
                style={styles.picker}
              />
            )}
          </View>
        </View>

        {/* Lista de equipamentos */}
        {loading ? (
          <ActivityIndicator size="large" color="#007BFF" />
        ) : equipmentList.length > 0 ? (
          <View style={styles.equipmentListContainer}>
            {equipmentList.map((item) => (
              <View key={item.id} style={styles.itemContainer}>
                <View style={styles.equipmentInfo}>
                  <Text style={styles.itemText}>Tag: {item.tag || "N/A"}</Text>
                  <Text style={styles.itemText}>Patrimônio: {item.patrimony || "N/A"}</Text>
                  <Text style={styles.itemText}>Fabricante: {item.brand?.name || "N/A"}</Text>
                  <Text style={styles.itemText}>Tipo: {item.equipment_type?.name || "N/A"}</Text>
                </View>

                <View style={styles.actionButtons}>
                  {hasPermission("change_equipment") && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => navigation.navigate("EditEquipmentScreen", { equipmentId: String(item.id) })}
                    >
                      <FontAwesome name="pencil" size={16} color="#ffc107" />
                    </TouchableOpacity>
                  )}
                  {hasPermission("delete_equipment") && (
                    <TouchableOpacity
                      style={styles.actionButton}
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
                      <FontAwesome name="trash" size={16} color="#dc3545" />
                    </TouchableOpacity>
                  )}
                  {hasPermission("view_equipment") && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => navigation.navigate("EquipmentDetailsScreen", { equipmentId: String(item.id) })}
                    >
                      <FontAwesome name="eye" size={16} color="#007BFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Nenhum equipamento encontrado.</Text>
        )}

        {/* Paginação */}
        {equipmentList.length > 0 && (
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
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  headerSection: {
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
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
    fontSize: 12,
    fontWeight: "600",
  },
  filtersSection: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
    fontSize: 14,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: "#333",
    marginRight: 8,
    minWidth: 80,
    backgroundColor: "transparent",
  },
  statusInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    backgroundColor: "#fff",
    fontSize: 14,
  },
  picker: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    backgroundColor: "#fff",
    height: 40,
  },
  equipmentListContainer: {
    marginBottom: 20,
  },
  itemContainer: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  equipmentInfo: {
    marginBottom: 12,
  },
  itemText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
    lineHeight: 20,
    backgroundColor: "transparent",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
    marginTop: 8,
  },
  actionButton: {
    padding: 10,
    marginLeft: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginVertical: 20,
    backgroundColor: "transparent",
  },
  errorText: {
    fontSize: 16,
    color: "#FF0000",
    textAlign: "center",
    marginTop: 20,
    backgroundColor: "transparent",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  pageText: {
    fontSize: 14,
    color: "#333",
    backgroundColor: "transparent",
  },
});

export default EquipmentListScreen;
