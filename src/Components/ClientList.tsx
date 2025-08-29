import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../Routers/AppRouter";
import ClientService from "../Services/ClientService";
import { usePermissions } from "../Context/PermissionsContext";
import Client from "../Models/Clientes";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../Context/LanguageContext";

interface ClientListProps {
  hasContract: boolean;
  navigation: DrawerNavigationProp<RootStackParamList>;
}

const ClientList: React.FC<ClientListProps> = ({ hasContract, navigation }) => {
  const { hasPermission } = usePermissions();
  const { t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!hasPermission("list_clients")) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t('clients.noPermission')}</Text>
      </View>
    );
  }

  const fetchClients = async (query: string = "") => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      const response = await ClientService.getClients(
        hasContract,
        page,
        token,
        query.length >= 3 ? query : ""
      );

      const clientList = response.results.map((data: any) => new Client(data));
      setClients(clientList);
      setTotalPages(Math.ceil(response.count / 10) || 1);
    } catch (error: any) {
      console.error("[ClientList] Erro ao buscar clientes:", error);
      Alert.alert(t('common.error'), t('clients.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients(searchQuery);
  }, [page, hasContract]);

  const handleSearch = () => {
    setPage(1);
    fetchClients(searchQuery);
  };

  const renderClientItem = ({ item }: { item: Client }) => (
    <View style={styles.itemContainer}>
      <View style={styles.clientInfo}>
        <Text style={styles.itemText}>{t('clients.name')}: {item.name}</Text>
        <Text style={styles.itemText}>{t('clients.email')}: {item.email}</Text>
        <Text style={styles.itemText}>{t('clients.document')}: {item.document || "N/A"}</Text>
      </View>

      <View style={styles.actionButtons}>
        {hasPermission("view_client") && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("ClientDetailScreen", { clientId: item.id })}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="eye" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>{t('clients.view')}</Text>
            </View>
          </TouchableOpacity>
        )}

        {hasPermission("list_sectors") && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("ClientSectorsScreen", { clientId: item.id })}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="folder" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>{t('clients.sectors')}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {hasContract ? t('clients.title.withContract') : t('clients.title.withoutContract')}
      </Text>

      <TextInput
        style={styles.input}
        placeholder={t('clients.searchPlaceholder')}
        placeholderTextColor="#666"
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmitEditing={handleSearch}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" />
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => `${item.id}`}
          renderItem={renderClientItem}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('clients.empty')}</Text>}
        />
      )}

      <View style={styles.paginationContainer}>
        <TouchableOpacity
          disabled={page === 1}
          onPress={() => setPage(page - 1)}
          style={[styles.pageButton, page === 1 && styles.disabledButton]}
        >
          <Text style={styles.pageButtonText}>{t('clients.previous')}</Text>
        </TouchableOpacity>
        <Text style={styles.pageText}>{t('common.page')} {page} {t('common.of')} {totalPages}</Text>
        <TouchableOpacity
          disabled={page === totalPages}
          onPress={() => setPage(page + 1)}
          style={[styles.pageButton, page === totalPages && styles.disabledButton]}
        >
          <Text style={styles.pageButtonText}>{t('clients.next')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  itemContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    marginBottom: 5,
    borderRadius: 5,
  },
  clientInfo: {
    marginBottom: 10,
  },
  itemText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: "#007BFF",
    padding: 8,
    borderRadius: 5,
    minWidth: 100,
    alignItems: "center",
  },
  actionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  pageButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
  },
  pageButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: "#ccc",
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

export default ClientList;