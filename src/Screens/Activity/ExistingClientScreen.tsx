import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationProp } from "@react-navigation/native";

import ResponsiveContainer from "../../Components/ResponsiveContainer";
import ResponsiveText from "../../Components/ResponsiveText";
import CustomPicker from "../../Components/CustomPicker";
import { useResponsive } from "../../hooks/useResponsive";
import ClientService from "../../Services/ClientService";
import { useNewActivityFlow } from "../../Context/NewActivityFlowContext";

type ClientItem = {
  id: number;
  name: string;
};

type SectorItem = {
  id: number;
  name: string;
  complete_name?: string;
};

interface Props {
  navigation: NavigationProp<any>;
}

const PER_PAGE_CLIENTS = 10; // alinhado ao ClientService.getClients

const ExistingClientScreen: React.FC<Props> = ({ navigation }) => {
  const r = useResponsive();
  const { state, setExistingClient, setClientMode } = useNewActivityFlow();

  const activityTypeName = state.activityType?.name;


  const [token, setToken] = useState<string | null>(null);

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsTotalPages, setClientsTotalPages] = useState(1);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsRefreshing, setClientsRefreshing] = useState(false);
  const [clientsLoadingMore, setClientsLoadingMore] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);

  const [sectors, setSectors] = useState<SectorItem[]>([]);
  const [subsectors, setSubsectors] = useState<SectorItem[]>([]);
  const [selectedSectorId, setSelectedSectorId] = useState<string>("");
  const [selectedSubsectorId, setSelectedSubsectorId] = useState<string>("");
  const [sectorsLoading, setSectorsLoading] = useState(false);

  const searchDebounceRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      const tkn = await AsyncStorage.getItem("access_token");
      if (!tkn) {
        Alert.alert("Sessão expirada", "Faça login novamente.");
        navigation.navigate("LoginScreen" as any);
        return;
      }
      setToken(tkn);
    };
    init();
  }, [navigation]);

  const loadClients = useCallback(
    async (opts?: { page?: number; append?: boolean; refreshing?: boolean; search?: string }) => {
      if (!token) return;
      const page = opts?.page ?? 1;
      const append = !!opts?.append;
      const refreshing = !!opts?.refreshing;
      const search = opts?.search ?? clientSearch;

      try {
        if (refreshing) setClientsRefreshing(true);
        else if (append) setClientsLoadingMore(true);
        else setClientsLoading(true);

        const resp = await ClientService.getClients("all", page, token, search);
        const list = (resp?.results || []) as any[];
        const normalized: ClientItem[] = list.map((c: any) => ({ id: Number(c.id), name: String(c.name || "") }));
        const totalPages = Number(resp?.total_pages || 1) || 1;

        setClientsTotalPages(totalPages);
        setClientsPage(page);
        setClients((prev) => (append ? [...prev, ...normalized] : normalized));
      } catch (e: any) {
        console.warn("[ExistingClientScreen] Erro ao buscar clientes:", e?.message || e);
        setClients((prev) => (append ? prev : []));
      } finally {
        setClientsLoading(false);
        setClientsRefreshing(false);
        setClientsLoadingMore(false);
      }
    },
    [token, clientSearch]
  );

  useEffect(() => {
    if (!token) return;
    loadClients({ page: 1, append: false, search: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      loadClients({ page: 1, append: false, search: clientSearch });
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [clientSearch, token, loadClients]);

  const onRefresh = async () => {
    await loadClients({ page: 1, append: false, refreshing: true, search: clientSearch });
  };

  const canLoadMoreClients = clientsPage < clientsTotalPages && !clientsLoadingMore && !clientsLoading && !clientsRefreshing;

  const loadMoreClients = async () => {
    if (!canLoadMoreClients) return;
    await loadClients({ page: clientsPage + 1, append: true, search: clientSearch });
  };

  const fetchSectors = useCallback(
    async (clientId: number) => {
      if (!token) return;

      try {
        setSectorsLoading(true);
        setSelectedSectorId("");
        setSelectedSubsectorId("");
        setSubsectors([]);

        const resp0 = await ClientService.getClientSectors(String(clientId), token, 0);
        const list0 = (resp0?.results || []) as any[];
        const normalized0: SectorItem[] = list0.map((s: any) => ({
          id: Number(s.id),
          name: String(s.name || ""),
          complete_name: s.complete_name,
        }));

        setSectors(normalized0);

        // Auto-selecionar setor único
        if (normalized0.length === 1) {
          setSelectedSectorId(String(normalized0[0].id));
        }

      } catch (e: any) {
        console.warn("[ExistingClientScreen] Erro ao buscar setores:", e?.message || e);
        setSectors([]);
        setSubsectors([]);
      } finally {
        setSectorsLoading(false);
      }
    },
    [token]
  );

  const fetchSubsectors = useCallback(
    async (clientId: number, parentSectorId: number) => {
      if (!token) return;
      try {
        setSectorsLoading(true);
        setSelectedSubsectorId("");
        const resp = await ClientService.getClientSectors(String(clientId), token, undefined, parentSectorId);
        const list = (resp?.results || []) as any[];
        const normalized: SectorItem[] = list.map((s: any) => ({
          id: Number(s.id),
          name: String(s.name || ""),
          complete_name: s.complete_name,
        }));
        setSubsectors(normalized);
      } catch (e: any) {
        console.warn("[ExistingClientScreen] Erro ao buscar subsetores:", e?.message || e);
        setSubsectors([]);
      } finally {
        setSectorsLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!selectedClient) return;
    fetchSectors(selectedClient.id);
  }, [selectedClient, fetchSectors]);


  useEffect(() => {
    if (!selectedClient) return;
    const parentId = Number(selectedSectorId);
    if (!parentId) return;
    fetchSubsectors(selectedClient.id, parentId);
  }, [selectedClient, selectedSectorId, fetchSubsectors]);

  const effectiveSectorId = useMemo(() => {
    const subId = Number(selectedSubsectorId);
    const secId = Number(selectedSectorId);

    // Prioridade: subsetor > setor selecionado > setor único automático > 0 (fallback)
    if (subId) return subId;
    if (secId) return secId;
    if (sectors.length === 1) return sectors[0].id;

    return 0; // Só como último recurso
  }, [selectedSectorId, selectedSubsectorId, sectors]);
  
  // Memoizar os itens dos pickers para evitar re-renders desnecessários
  const sectorPickerItems = useMemo(() => [
    { label: "Selecione um setor", value: "" },
    ...sectors.map((s) => ({
      label: s.complete_name || s.name,
      value: String(s.id)
    })),
  ], [sectors]);

  const subsectorPickerItems = useMemo(() => [
    { label: "Selecione um subsetor (opcional)", value: "" },
    ...subsectors.map((s) => ({
      label: s.complete_name || s.name,
      value: String(s.id)
    })),
  ], [subsectors]);

  const canContinue = !!selectedClient && !!Number(selectedSectorId) && effectiveSectorId > 0;


  const handleContinue = () => {
    if (!state.activityType?.id) {
      Alert.alert("Erro", "Tipo de atividade não encontrado. Volte e selecione novamente.");
      navigation.goBack();
      return;
    }

    if (!selectedClient) {
      Alert.alert("Atenção", "Selecione um cliente.");
      return;
    }
    const parentSectorNum = Number(selectedSectorId);
    if (!parentSectorNum) {
      Alert.alert("Atenção", "Selecione um setor.");
      return;
    }
    if (!effectiveSectorId) {
      Alert.alert("Atenção", "Setor inválido.");
      return;
    }

    setClientMode("existing");
    const sectorName =
      (subsectors.find((s) => String(s.id) === String(selectedSubsectorId))?.complete_name ||
        subsectors.find((s) => String(s.id) === String(selectedSubsectorId))?.name ||
        sectors.find((s) => String(s.id) === String(selectedSectorId))?.complete_name ||
        sectors.find((s) => String(s.id) === String(selectedSectorId))?.name ||
        undefined) as any;

    setExistingClient({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      sectorId: effectiveSectorId,
      sectorName,
    });

    navigation.navigate("AddMultipleEquipmentsScreen", {
      activityTypeId: state.activityType.id,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      sectorId: effectiveSectorId,
      fromNewActivityFlow: true,
    });
  };

  const renderClient = ({ item }: { item: ClientItem }) => {
    const isSelected = selectedClient?.id === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.clientCard,
          { padding: r.spacing(1.5), minHeight: r.verticalScale(60) },
          isSelected && styles.clientCardSelected,
        ]}
        onPress={() => setSelectedClient(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.clientIcon, isSelected && { backgroundColor: "#007BFF20" }]}>
          <MaterialIcons name="business" size={r.scale(18)} color={isSelected ? "#007BFF" : "#666"} />
        </View>
        <View style={{ flex: 1, marginLeft: r.spacing(1) }}>
          <ResponsiveText variant="body" weight="600" numberOfLines={2} style={{ color: "#333" }}>
            {item.name}
          </ResponsiveText>
          <ResponsiveText variant="caption" numberOfLines={1} style={{ color: "#666" }}>
            ID: {item.id}
          </ResponsiveText>
        </View>
        {isSelected && <MaterialIcons name="check-circle" size={r.scale(20)} color="#007BFF" />}
      </TouchableOpacity>
    );
  };

  const listFooter = () => (
    <View style={{ paddingVertical: r.spacing(2) }}>
      {clientsLoadingMore ? (
        <View style={{ alignItems: "center" }}>
          <ActivityIndicator size="small" color="#007BFF" />
        </View>
      ) : canLoadMoreClients ? (
        <TouchableOpacity
          style={[styles.loadMoreButton, { minHeight: r.verticalScale(44), paddingHorizontal: r.spacing(2) }]}
          onPress={loadMoreClients}
        >
          <ResponsiveText variant="body" weight="600" style={{ color: "#007BFF" }}>
            Carregar mais clientes
          </ResponsiveText>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <ResponsiveContainer withPadding={false} style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: r.spacing(2), paddingTop: r.spacing(3), paddingBottom: r.spacing(2) }]}>
        <TouchableOpacity
          style={[styles.iconButton, { minHeight: r.verticalScale(44), minWidth: r.verticalScale(44) }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={r.scale(22)} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ResponsiveText variant="title" weight="bold" style={styles.headerTitle} numberOfLines={1}>
            Cliente Existente
          </ResponsiveText>
          <ResponsiveText variant="caption" style={styles.headerSubtitle} numberOfLines={2}>
            {activityTypeName ? `Atividade: ${activityTypeName}` : "Selecione cliente e setor"}
          </ResponsiveText>
        </View>
      </View>

      <View style={{ padding: r.spacing(2) }}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={r.scale(18)} color="#999" style={{ marginRight: r.spacing(1) }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente..."
            placeholderTextColor="#999"
            value={clientSearch}
            onChangeText={setClientSearch}
            returnKeyType="search"
          />
          {clientSearch.length > 0 && (
            <TouchableOpacity onPress={() => setClientSearch("")} style={{ padding: 6 }}>
              <MaterialIcons name="close" size={r.scale(18)} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sempre mostrar os pickers quando há cliente selecionado */}
        {!!selectedClient && sectorPickerItems.length > 1 && (
          <>

            <View style={[styles.pickersRow, { marginTop: r.spacing(1.5) }]}>
              <View style={{ flex: 1 }}>
                <ResponsiveText variant="caption" style={{ marginBottom: r.spacing(0.5), color: "#666" }}>
                  Setor *
                </ResponsiveText>
                <CustomPicker
                  selectedValue={selectedSectorId}
                  onValueChange={(v) => setSelectedSectorId(String(v))}
                  items={sectorPickerItems}
                  enabled={!sectorsLoading}
                  searchable={true}
                  placeholder="Selecione um setor"
                />
                {sectors.length === 0 && !sectorsLoading && (
                  <ResponsiveText variant="caption" style={{ color: "#ff6b6b", marginTop: r.spacing(0.5) }}>
                    Nenhum setor encontrado para este cliente
                  </ResponsiveText>
                )}
              </View>
            </View>

            <View style={[styles.pickersRow, { marginTop: r.spacing(1) }]}>
              <View style={{ flex: 1 }}>
                <ResponsiveText variant="caption" style={{ marginBottom: r.spacing(0.5), color: "#666" }}>
                  Subsetor (opcional)
                </ResponsiveText>
            <CustomPicker
              selectedValue={selectedSubsectorId}
              onValueChange={(v) => setSelectedSubsectorId(String(v))}
              items={subsectorPickerItems}
              enabled={!!selectedSectorId && !sectorsLoading}
              searchable={true}
              placeholder="Selecione um subsetor"
            />
              </View>
            </View>

            {sectorsLoading && (
              <View style={{ marginTop: r.spacing(1), alignItems: "center" }}>
                <ActivityIndicator size="small" color="#007BFF" />
                <ResponsiveText variant="caption" style={{ marginTop: r.spacing(0.5), color: "#666" }}>
                  Carregando setores...
                </ResponsiveText>
              </View>
            )}
          </>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {clientsLoading && clients.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007BFF" />
            <ResponsiveText variant="body" style={{ marginTop: r.spacing(1) }}>
              Carregando clientes...
            </ResponsiveText>
          </View>
        ) : (
          <FlatList
            data={clients}
            keyExtractor={(it) => String(it.id)}
            renderItem={renderClient}
            contentContainerStyle={{ paddingHorizontal: r.spacing(2), paddingBottom: r.spacing(2) }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={clientsRefreshing} onRefresh={onRefresh} />}
            onEndReachedThreshold={0.5}
            onEndReached={() => {
              // Para evitar muitos hits, usamos botão “Carregar mais”; aqui só ajuda em scroll longo
              if (canLoadMoreClients) loadMoreClients();
            }}
            ListFooterComponent={listFooter}
            ListEmptyComponent={() => (
              <View style={{ paddingHorizontal: r.spacing(2), paddingVertical: r.spacing(3), alignItems: "center" }}>
                <MaterialIcons name="business" size={r.scale(56)} color="#ccc" />
                <ResponsiveText variant="subtitle" style={{ marginTop: r.spacing(1), color: "#666" }}>
                  Nenhum cliente encontrado
                </ResponsiveText>
                <ResponsiveText variant="caption" style={{ marginTop: r.spacing(0.5), color: "#999", textAlign: "center" }}>
                  Ajuste a busca ou puxe para atualizar
                </ResponsiveText>
              </View>
            )}
          />
        )}
      </View>

      <View style={[styles.footer, { padding: r.spacing(2) }]}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { minHeight: r.verticalScale(52) },
            !canContinue && styles.primaryButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <ResponsiveText variant="button" weight="bold" style={{ color: "#fff" }}>
            Continuar para Equipamentos
          </ResponsiveText>
          <Ionicons name="arrow-forward" size={r.scale(18)} color="#fff" style={{ marginLeft: r.spacing(1) }} />
        </TouchableOpacity>
      </View>
    </ResponsiveContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  header: { backgroundColor: "#007BFF", flexDirection: "row", alignItems: "center" },
  iconButton: { justifyContent: "center", alignItems: "center", marginRight: 12 },
  headerTitle: { color: "#fff", backgroundColor: "transparent" },
  headerSubtitle: { color: "rgba(255,255,255,0.9)", backgroundColor: "transparent" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e6eaf2",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchInput: { flex: 1, color: "#333", fontSize: 16, paddingVertical: 10 },
  pickersRow: {},
  clientCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e6eaf2",
  },
  clientCardSelected: { borderColor: "#007BFF" },
  clientIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f2f6",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadMoreButton: {
    borderWidth: 1,
    borderColor: "#cfe0ff",
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e6eaf2",
    backgroundColor: "#fff",
  },
  primaryButton: {
    backgroundColor: "#007BFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  primaryButtonDisabled: { backgroundColor: "#9bbcf2" },
});

export default ExistingClientScreen;


