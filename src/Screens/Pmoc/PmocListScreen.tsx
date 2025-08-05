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
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PmocService from "../../Services/PmocService";
import { Pmoc } from "../../Models/Pmoc_Model/Pmoc";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../../Context/LanguageContext";

const { width } = Dimensions.get('window');

interface PmocListScreenProps {
  route: RouteProp<RootStackParamList, "PmocListScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "PmocListScreen">;
}

const PmocListScreen: React.FC<PmocListScreenProps> = ({ route, navigation }) => {
  const { t } = useLanguage();
  const [pmocs, setPmocs] = useState<Pmoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchPmocs = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      const validStatuses = ["open", "pending", "closed"];
      const status = validStatuses.includes(statusFilter) ? statusFilter : "";

      const data = await PmocService.fetchPmocs(token, page, 10, search, status);
      setPmocs(data.results || []);
      setTotalPages(Math.ceil(data.count / 10) || 1);
    } catch (error: any) {
      console.error("[PmocListScreen] Erro ao buscar PMOCs:", error.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPmocs();
  }, [page, search, statusFilter]);

  const onRefresh = () => {
    setPage(1);
    fetchPmocs(true);
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
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>{t('pmoc.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('pmoc.subtitle')}</Text>
      </View>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Ionicons name="filter" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersSection}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#667eea" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar PMOC..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.pickerContainer}>
        <Ionicons name="options" size={20} color="#667eea" />
        <Picker
          selectedValue={statusFilter}
          onValueChange={(value) => setStatusFilter(value)}
          style={styles.picker}
        >
          <Picker.Item label={t('pmoc.allStatus')} value="" />
          <Picker.Item label={t('technicalAssistance.open')} value="open" />
          <Picker.Item label={t('technicalAssistance.pending')} value="pending" />
          <Picker.Item label={t('technicalAssistance.closed')} value="closed" />
        </Picker>
      </View>
    </View>
  );

  const renderPmocCard = ({ item }: { item: Pmoc }) => {
    const statusInfo = getStatusInfo(item.status);
    const deadline = new Date(item.deadline).toLocaleDateString('pt-BR');

    return (
      <TouchableOpacity
        style={styles.pmocCard}
        onPress={() => navigation.navigate("PmocDetailsScreen", { pmocId: item.id })}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.cardHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name="assignment" size={24} color="#fff" />
          <Text style={styles.cardTitle}>PMOC #{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon as any} size={16} color="#fff" />
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
        </LinearGradient>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Ionicons name="business" size={16} color="#667eea" />
            <Text style={styles.infoLabel}>Cliente:</Text>
            <Text style={styles.infoValue}>{item.client.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail" size={16} color="#667eea" />
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{item.client.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color="#667eea" />
            <Text style={styles.infoLabel}>Vencimento:</Text>
            <Text style={styles.infoValue}>{deadline}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="build" size={16} color="#667eea" />
            <Text style={styles.infoLabel}>Equip. Fechados:</Text>
            <Text style={styles.infoValue}>{item.equipment_closed_count}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => navigation.navigate("PmocDetailsScreen", { pmocId: item.id })}
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
      <MaterialIcons name="assignment" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>{t('pmoc.noPmocsFound')}</Text>
      <Text style={styles.emptySubtitle}>
        {search || statusFilter ?
          t('pmoc.tryAdjustFilters') :
          t('pmoc.noPmocsRegistered')
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
          {t('common.previous')}
        </Text>
      </TouchableOpacity>

      <Text style={styles.paginationInfo}>
        {t('common.page')} {page} {t('common.of')} {totalPages}
      </Text>

      <TouchableOpacity
        style={[styles.paginationButton, page === totalPages && styles.paginationButtonDisabled]}
        onPress={() => setPage((p) => (p < totalPages ? p + 1 : p))}
        disabled={page === totalPages}
      >
        <Text style={[styles.paginationText, page === totalPages && styles.paginationTextDisabled]}>
          {t('common.next')}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={page === totalPages ? "#ccc" : "#667eea"} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      {showFilters && renderFilters()}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Carregando PMOCs...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={pmocs}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPmocCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#667eea']}
                tintColor="#667eea"
              />
            }
            ListEmptyComponent={renderEmptyState()}
          />

          {pmocs.length > 0 && renderPagination()}
        </>
      )}
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
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
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
  filtersSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
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
  pickerContainer: {
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
    color: "#333",
    backgroundColor: "#fff",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  pmocCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardContent: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
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
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
  },
});

export default PmocListScreen;