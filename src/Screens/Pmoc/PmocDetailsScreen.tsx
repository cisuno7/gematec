import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PmocService from "../../Services/PmocService";
import { PmocEquipment } from "../../Models/Pmoc_Model/PmocEqupment";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "../../config/apiConfig";

const { width } = Dimensions.get('window');

interface PmocDetailsScreenProps {
  route: RouteProp<RootStackParamList, "PmocDetailsScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "PmocDetailsScreen">;
}

const PmocDetailsScreen: React.FC<PmocDetailsScreenProps> = ({ route, navigation }) => {
  const { pmocId } = route.params;
  const [equipments, setEquipments] = useState<PmocEquipment[]>([]);
  const [pmocInfo, setPmocInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchPmocInfo = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");
      const response = await axios.get(`${API_BASE_URL}/pmocs/${pmocId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPmocInfo(response.data);
    } catch (error) {
      console.error("[PmocDetailsScreen] Erro ao buscar informações do PMOC:", error);
    }
  };

  const fetchEquipments = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      const data = await PmocService.fetchPmocEquipments(
        token,
        pmocId,
        page,
        10,
        search,
        statusFilter,
        equipmentTypeFilter,
        brandFilter
      );
      setEquipments(data.results || []);
      setTotalPages(Math.ceil(data.count / 10) || 1);
    } catch (error: any) {
      console.error("[PmocDetailsScreen] Erro ao buscar equipamentos:", error.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPmocInfo();
    fetchEquipments();
  }, [page, search, statusFilter, equipmentTypeFilter, brandFilter]);

  const onRefresh = () => {
    setPage(1);
    fetchEquipments(true);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'open':
        return { color: '#28a745', icon: 'checkmark-circle', label: 'Aberto' };
      case 'pending':
        return { color: '#ffc107', icon: 'time', label: 'Pendente' };
      case 'closed':
        return { color: '#6c757d', icon: 'close-circle', label: 'Fechado' };
      default:
        return { color: '#6c757d', icon: 'help-circle', label: status };
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Detalhes do PMOC</Text>
        <Text style={styles.headerSubtitle}>#{pmocId}</Text>
      </View>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Ionicons name="filter" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderPmocInfo = () => {
    if (!pmocInfo) return null;

    const deadline = new Date(pmocInfo.deadline).toLocaleDateString('pt-BR');
    const updatedAt = new Date(pmocInfo.updated_at).toLocaleDateString('pt-BR');

    return (
      <View style={styles.pmocInfoCard}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.infoHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name="assignment" size={24} color="#fff" />
          <Text style={styles.infoTitle}>Informações do PMOC</Text>
        </LinearGradient>

        <View style={styles.infoContent}>
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Empresa</Text>
            <View style={styles.infoRow}>
              <Ionicons name="business" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Nome:</Text>
              <Text style={styles.infoValue}>{pmocInfo.company?.name || "N/A"}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="engineering" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Engenheiro:</Text>
              <Text style={styles.infoValue}>{pmocInfo.company?.chief_engineer_name || "N/A"}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="badge" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>CRM:</Text>
              <Text style={styles.infoValue}>{pmocInfo.company?.chief_engineer_crm || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Nome:</Text>
              <Text style={styles.infoValue}>{pmocInfo.client?.name || "N/A"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{pmocInfo.client?.email || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Detalhes</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Vencimento:</Text>
              <Text style={styles.infoValue}>{deadline}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="build" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Equip. Fechados:</Text>
              <Text style={styles.infoValue}>{pmocInfo.equipment_closed_count || 0}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color="#667eea" />
              <Text style={styles.infoLabel}>Última Atualização:</Text>
              <Text style={styles.infoValue}>{updatedAt}</Text>
            </View>
          </View>

          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={20} color="#ffc107" />
            <Text style={styles.warningText}>
              Os dados mostrados podem ser alterados até o fechamento do PMOC.
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersSection}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#667eea" />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar por tag ou patrimônio..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.filterRow}>
        <View style={styles.pickerContainer}>
          <Ionicons name="options" size={16} color="#667eea" />
          <Picker
            selectedValue={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
            style={styles.picker}
          >
            <Picker.Item label="Status" value="" />
            <Picker.Item label="Aberto" value="open" />
            <Picker.Item label="Pendente" value="pending" />
            <Picker.Item label="Fechado" value="closed" />
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <MaterialIcons name="build" size={16} color="#667eea" />
          <Picker
            selectedValue={equipmentTypeFilter}
            onValueChange={(value) => setEquipmentTypeFilter(value)}
            style={styles.picker}
          >
            <Picker.Item label="Tipo" value="" />
            <Picker.Item label="Split" value="1" />
          </Picker>
        </View>
      </View>

      <View style={styles.pickerContainer}>
        <MaterialIcons name="business" size={16} color="#667eea" />
        <Picker
          selectedValue={brandFilter}
          onValueChange={(value) => setBrandFilter(value)}
          style={styles.picker}
        >
          <Picker.Item label="Fabricante" value="" />
          <Picker.Item label="LG" value="1" />
        </Picker>
      </View>
    </View>
  );

  const renderEquipmentCard = ({ item }: { item: PmocEquipment }) => {
    const statusInfo = getStatusInfo(item.status);

    return (
      <TouchableOpacity
        style={styles.equipmentCard}
        onPress={() =>
          navigation.navigate("PmocEquipmentScreen", {
            pmocId: pmocId,
            equipmentId: item.id,
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <MaterialIcons name="build" size={20} color="#667eea" />
            <Text style={styles.cardTitle}>Equipamento #{item.id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon as any} size={14} color="#fff" />
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Ionicons name="qr-code" size={16} color="#667eea" />
            <Text style={styles.infoLabel}>Tag:</Text>
            <Text style={styles.infoValue}>{item.tag || "N/A"}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="inventory" size={16} color="#667eea" />
            <Text style={styles.infoLabel}>Patrimônio:</Text>
            <Text style={styles.infoValue}>{item.patrimony || "N/A"}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="category" size={16} color="#667eea" />
            <Text style={styles.infoLabel}>Tipo:</Text>
            <Text style={styles.infoValue}>{item.equipment_type?.name || "N/A"}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="business" size={16} color="#667eea" />
            <Text style={styles.infoLabel}>Fabricante:</Text>
            <Text style={styles.infoValue}>{item.brand?.name || "N/A"}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="memory" size={16} color="#667eea" />
            <Text style={styles.infoLabel}>Tecnologia:</Text>
            <Text style={styles.infoValue}>{item.technology || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() =>
              navigation.navigate("PmocEquipmentScreen", {
                pmocId: pmocId,
                equipmentId: item.id,
              })
            }
          >
            <Ionicons name="eye" size={16} color="#667eea" />
            <Text style={styles.viewButtonText}>Ver Detalhes</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="build" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>Nenhum equipamento encontrado</Text>
      <Text style={styles.emptySubtitle}>
        {search || statusFilter || equipmentTypeFilter || brandFilter ?
          'Tente ajustar os filtros de busca' :
          'Não há equipamentos registrados neste PMOC'
        }
      </Text>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      <TouchableOpacity
        style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
        onPress={() => setPage((p) => Math.max(p - 1, 1))}
        disabled={page === 1}
      >
        <Ionicons name="chevron-back" size={20} color={page === 1 ? "#ccc" : "#667eea"} />
        <Text style={[styles.paginationText, page === 1 && styles.paginationTextDisabled]}>
          Anterior
        </Text>
      </TouchableOpacity>

      <Text style={styles.paginationInfo}>
        Página {page} de {totalPages}
      </Text>

      <TouchableOpacity
        style={[styles.paginationButton, page === totalPages && styles.paginationButtonDisabled]}
        onPress={() => setPage((p) => (p < totalPages ? p + 1 : p))}
        disabled={page === totalPages}
      >
        <Text style={[styles.paginationText, page === totalPages && styles.paginationTextDisabled]}>
          Próxima
        </Text>
        <Ionicons name="chevron-forward" size={20} color={page === totalPages ? "#ccc" : "#667eea"} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
          />
        }
      >
        {renderPmocInfo()}

        {showFilters && renderFilters()}

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Carregando equipamentos...</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={equipments}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderEquipmentCard}
              contentContainerStyle={styles.listContainer}
              scrollEnabled={false}
              ListEmptyComponent={renderEmptyState()}
            />

            {equipments.length > 0 && renderPagination()}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#667eea',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollView: {
    flex: 1,
  },
  pmocInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  infoHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  infoContent: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  filtersSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pickerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  picker: {
    flex: 1,
    height: 40,
    marginLeft: 12,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  equipmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardContent: {
    padding: 20,
  },
  cardFooter: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
    paddingTop: 16,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 8,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6c757d',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 22,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  paginationButtonDisabled: {
    backgroundColor: '#f1f3f4',
    borderColor: '#e9ecef',
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  paginationTextDisabled: {
    color: '#ccc',
  },
  paginationInfo: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
  },
});

export default PmocDetailsScreen;