import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Button,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker"; // Adicionado Picker
import { FontAwesome } from "@expo/vector-icons";
import PmocService from "../../Services/PmocService";
import { Pmoc } from "../../Models/Pmoc_Model/Pmoc";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../../Context/LanguageContext";

interface PmocListScreenProps {
  route: RouteProp<RootStackParamList, "PmocListScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "PmocListScreen">;
}

const PmocListScreen: React.FC<PmocListScreenProps> = ({ route, navigation }) => {
  const { t } = useLanguage();
  const [pmocs, setPmocs] = useState<Pmoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [pmocData, setPmocData] = useState({
    client_id: "",
    sector_id: "",
    equipment_ids: [] as string[],
    start_date: "",
    frequency_days: "",
  });
  const fetchPmocs = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      const validStatuses = ["open", "pending", "closed"];
      const status = validStatuses.includes(statusFilter) ? statusFilter : "";

      const data = await PmocService.fetchPmocs(token, page, 10, search, status);
      setPmocs(data.results || []);
      setTotalPages(Math.ceil(data.count / 10) || 1); // Calcula total de páginas
    } catch (error: any) {
      console.error("[PmocListScreen] Erro ao buscar PMOCs:", error.message || error);
    } finally {
      setLoading(false);
    }
  };
  const handleCreatePmoc = async () => {
    if (!pmocData.client_id || !pmocData.sector_id || !pmocData.start_date || !pmocData.frequency_days) {
      Alert.alert("Erro", "Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");

      const pmocPayload: Partial<Pmoc> = {
        client_id: parseInt(pmocData.client_id),
        sector_id: parseInt(pmocData.sector_id),
        equipment_ids: pmocData.equipment_ids.map(id => parseInt(id)),
        start_date: pmocData.start_date,
        frequency_days: parseInt(pmocData.frequency_days),
      };

      const response = await PmocService.createPmoc(token, pmocPayload); // Corrigido: adicionado host
      setPmocs([...pmocs, response]); // Adicionar o novo PMOC à lista (response já é Pmoc)
      setModalVisible(false);
      setPmocData({ client_id: "", sector_id: "", equipment_ids: [], start_date: "", frequency_days: "" }); // Resetar formulário
      Alert.alert("Sucesso", "PMOC criado com sucesso!");
    } catch (error: any) {
      console.error("[PmocListScreen] Erro ao criar PMOC:", error);
      Alert.alert("Erro", error.message || "Não foi possível criar o PMOC.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPmocs();
  }, [page, search, statusFilter]);

  const renderPmocItem = ({ item }: { item: Pmoc }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate("PmocDetailsScreen", { pmocId: item.id })}
    >
      <Text style={styles.itemText}>Cliente: {item.client.name}</Text>
      <Text style={styles.itemText}>Email: {item.client.email}</Text>
      <Text style={styles.itemText}>Vencimento: {item.deadline}</Text>
      <Text style={styles.itemText}>Status: {item.status}</Text>
      <Text style={styles.itemText}>Equipamentos Fechados: {item.equipment_closed_count}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.createButtonText}>{t('pmoc.newPmoc')}</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.searchInput}
        placeholder={t('pmoc.searchPlaceholder')}
        value={search}
        onChangeText={setSearch}
      />
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

      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" />
      ) : (
        <>
          <FlatList
            data={pmocs}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPmocItem}
            ListEmptyComponent={<Text style={styles.emptyText}>{t('pmoc.noPmocsFound')}</Text>}
          />
          <View style={styles.pagination}>
            <Button
              title={t('common.previous')}
              onPress={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
            />
            <Text style={styles.pageText}>{t('common.page')} {page} {t('common.of')} {totalPages}</Text>
            <Button
              title={t('common.next')}
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
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  createButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 10,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: "#fff",
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
});

export default PmocListScreen;