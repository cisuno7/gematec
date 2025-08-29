import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL, buildApiUrlForAccount } from "../config/apiConfig";
import { Sector } from "../Models/Clientes";
import CustomPicker from "./CustomPicker";
import apiClient from "../Context/ApiClient";

interface EquipmentFiltersProps {
  onFilter: (filters: any) => void;
  sectorId?: number; // Opcional, pois pode não ser sempre fornecido
  clientId?: number;
  subsectors?: Sector[];
  resetKey?: number; // Chave para forçar reset dos filtros
}
interface FiltersState {
  brand: string | number;
  equipmentType: string | number;
  search: string;
  status: string;
  sector_id: number | null;
  client_id: number | null;
  subsector_id: number | null;
}

const EquipmentFilters: React.FC<EquipmentFiltersProps> = ({ onFilter, sectorId, clientId, subsectors = [], resetKey = 0 }) => {
  console.log("[EquipmentFilters] Componente montado com props:", { sectorId, clientId, subsectors: subsectors.length, resetKey });
  const [filters, setFilters] = useState<FiltersState>({
    brand: "",
    equipmentType: "",
    search: "",
    status: "",
    sector_id: sectorId || null,
    client_id: clientId || null,
    subsector_id: null,
  });
  const [brands, setBrands] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [clients, setClients] = useState([]); // Novo estado para clientes
  const [sectors, setSectors] = useState([]);
  const [subsectorsState, setSubsectorsState] = useState<Sector[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingSectors, setLoadingSectors] = useState(false);
  const [loadingSubsectors, setLoadingSubsectors] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingEquipmentTypes, setLoadingEquipmentTypes] = useState(false);

  // Reset dos filtros quando resetKey mudar
  useEffect(() => {
    if (resetKey > 0) {
      const resetFilters = {
        brand: "",
        equipmentType: "",
        search: "",
        status: "",
        sector_id: sectorId || null,
        client_id: clientId || null,
        subsector_id: null,
      };
      setFilters(resetFilters);
      console.log("[EquipmentFilters] Filtros resetados:", resetFilters);
    }
  }, [resetKey, sectorId, clientId]);

  // Buscar Clientes
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      const apiUrl = await buildApiUrlForAccount();
      const res = await axios.get(`${apiUrl}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(res.data.results || []);
    } catch (error) {
      console.error("[EquipmentFilters] Erro ao buscar clientes:", error);
    } finally {
      setLoadingClients(false);
    }
  };

  // Buscar Setores (depende do cliente selecionado)
  useEffect(() => {
    if (filters.client_id) {
      fetchSectors(filters.client_id);
    } else {
      setSectors([]);
    }
  }, [filters.client_id]);

  // Carregar setores quando clientId for fornecido via props
  useEffect(() => {
    if (clientId) {
      console.log("[EquipmentFilters] Carregando setores para cliente via props:", clientId);
      fetchSectors(clientId);
    }
  }, [clientId]);



  // Inicializar filtros com valores pré-selecionados
  useEffect(() => {
    if (clientId || sectorId) {
      console.log("[EquipmentFilters] Inicializando filtros com valores pré-selecionados:", { clientId, sectorId });
      setFilters(prev => ({
        ...prev,
        client_id: clientId || prev.client_id,
        sector_id: sectorId || prev.sector_id
      }));
    }
  }, [clientId, sectorId]);

  // Aplicar filtros automaticamente quando valores forem inicializados
  useEffect(() => {
    if (filters.client_id && filters.sector_id) {
      console.log("[EquipmentFilters] Aplicando filtros automaticamente:", filters);
      onFilter(filters);
    }
  }, [filters.client_id, filters.sector_id]);

  // Buscar Subsetores quando setor mudar
  useEffect(() => {
    const loadSubsectors = async () => {
      try {
        setLoadingSubsectors(true);
        setSubsectorsState([]);
        if (!filters.client_id || !filters.sector_id) return;
        const token = await AsyncStorage.getItem("access_token");
        if (!token) return;
        const ClientService = (await import('../Services/ClientService')).default;
        const response = await ClientService.getClientSectors(filters.client_id.toString(), token, undefined, filters.sector_id);
        const list = Array.isArray(response) ? response : (response?.results || []);
        setSubsectorsState(list);
      } catch (error) {
        console.error('[EquipmentFilters] Erro ao buscar subsetores:', error);
        setSubsectorsState([]);
      } finally {
        setLoadingSubsectors(false);
      }
    };
    loadSubsectors();
  }, [filters.client_id, filters.sector_id]);

  const fetchSectors = async (selectedClientId: number) => {
    setLoadingSectors(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      console.log("[EquipmentFilters] Buscando setores para clientId:", selectedClientId);
      console.log("[EquipmentFilters] Token presente:", !!token);

      // Usar ClientService para buscar apenas setores pais (level 0)
      const ClientService = (await import('../Services/ClientService')).default;
      const response = await ClientService.getClientSectors(selectedClientId.toString(), token!, 0);

      console.log("[EquipmentFilters] Resposta dos setores:", response);
      const sectorList = Array.isArray(response) ? response : (response.results || []);
      console.log("[EquipmentFilters] Lista de setores processada:", sectorList.length, "itens");
      setSectors(sectorList);
    } catch (error) {
      console.error("[EquipmentFilters] Erro ao buscar setores:", error);
      // Se der erro 404, é porque o cliente não tem setores cadastrados
      if ((error as any)?.response?.status === 404 || (error as any)?.message?.includes("Erro ao obter os setores")) {
        console.warn("[EquipmentFilters] Cliente não possui setores cadastrados (404).");
        setSectors([]); // Lista vazia - sem setores disponíveis
      }
    } finally {
      setLoadingSectors(false);
    }
  };

  // Buscar Marcas
  useEffect(() => {
    console.log("[EquipmentFilters] useEffect fetchBrands executado");
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    console.log("[EquipmentFilters] fetchBrands iniciado");
    setLoadingBrands(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      const apiUrl = await buildApiUrlForAccount();
      console.log("[EquipmentFilters] Fazendo requisição para:", `${apiUrl}/brands`);
      const res = await axios.get(`${apiUrl}/brands`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("[EquipmentFilters] Resposta da API brands:", res.data);
      console.log("[EquipmentFilters] Marcas carregadas:", res.data.results?.length || 0);
      console.log("[EquipmentFilters] Dados das marcas:", res.data.results);
      setBrands(res.data.results || []);
    } catch (error) {
      console.error("[EquipmentFilters] Erro ao buscar marcas:", error);
    } finally {
      setLoadingBrands(false);
    }
  };

  // Buscar Tipos de Equipamento
  useEffect(() => {
    console.log("[EquipmentFilters] useEffect fetchEquipmentTypes executado");
    fetchEquipmentTypes();
  }, []);

  const fetchEquipmentTypes = async () => {
    console.log("[EquipmentFilters] fetchEquipmentTypes iniciado");
    setLoadingEquipmentTypes(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");
      console.log("[EquipmentFilters] Fazendo requisição para: /equipment_types (via apiClient)");
      const res = await apiClient.get(`/equipment_types`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : (payload?.results ?? []);
      console.log("[EquipmentFilters] Tipos de equipamento carregados:", list.length);
      setEquipmentTypes(list);
    } catch (error) {
      console.error("[EquipmentFilters] Erro ao buscar tipos de equipamento:", error);
      // Em caso de erro 500, evita quebrar a tela e mantém lista vazia
      setEquipmentTypes([]);
    } finally {
      setLoadingEquipmentTypes(false);
    }
  };

  // Lidar com mudanças nos pickers de cliente e setor
  const handleClientChange = (value: string) => {
    const newClientId = value ? parseInt(value) : null;
    setFilters(prev => ({ ...prev, client_id: newClientId, sector_id: null })); // Reseta setor quando o cliente muda
  };

  const handleSectorChange = (value: string) => {
    const newSectorId = value ? parseInt(value) : null;
    setFilters(prev => ({ ...prev, sector_id: newSectorId, subsector_id: null }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Filtros</Text>

      {/* Filtro de Cliente - Apenas Select */}
      <Text style={styles.label}>Cliente</Text>
      {loadingClients ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : (
        <CustomPicker
          selectedValue={filters.client_id ? filters.client_id.toString() : ""}
          onValueChange={handleClientChange}
          items={clients.map((c: any) => ({ label: c.name, value: c.id.toString() }))}
          placeholder="Selecione um cliente"
          style={styles.picker}
        />
      )}

      {/* Filtro de Setor - Apenas Select */}
      <Text style={styles.label}>Setor</Text>
      {loadingSectors ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : sectors.length > 0 ? (
        <CustomPicker
          selectedValue={filters.sector_id ? filters.sector_id.toString() : ""}
          onValueChange={handleSectorChange}
          items={sectors.map((s: any) => ({ label: s.complete_name || s.name, value: s.id.toString() }))}
          placeholder="Selecione um setor"
          style={styles.picker}
        />
      ) : (
        <TextInput
          style={styles.input}
          placeholder="Nenhum setor disponível para este cliente"
          placeholderTextColor="#888"
          editable={false}
        />
      )}

      {/* Filtro de Patrimônio/Tag - Apenas Text */}
      <Text style={styles.label}>Patrimônio/Tag</Text>
      <TextInput
        style={styles.input}
        placeholder="Busca por Tag ou Patrimônio"
        placeholderTextColor="#999"
        onChangeText={(text) => setFilters({ ...filters, search: text })}
        value={filters.search}
      />

      {/* Filtro de Fabricante - Apenas Select */}
      <Text style={styles.label}>Fabricante</Text>
      {loadingBrands ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : brands.length > 0 ? (
        <>
          {console.log("[EquipmentFilters] Renderizando filtro Fabricante - brands.length:", brands.length)}
          {console.log("[EquipmentFilters] Brands data:", brands)}
          <CustomPicker
            selectedValue={filters.brand ? filters.brand.toString() : ""}
            onValueChange={(value) => {
              console.log("[EquipmentFilters] Fabricante selecionado:", value);
              setFilters({ ...filters, brand: value || "" });
            }}
            items={brands.map((b: any) => {
              console.log("[EquipmentFilters] Mapeando marca:", b);
              return { label: b.name, value: b.id.toString() };
            })}
            placeholder="Selecione um fabricante"
            style={styles.picker}
          />
        </>
      ) : (
        <TextInput
          style={styles.input}
          placeholder="Nenhum fabricante disponível"
          placeholderTextColor="#888"
          editable={false}
        />
      )}
      {!loadingBrands && brands.length === 0 && (
        <Text style={styles.errorText}>Nenhum fabricante encontrado</Text>
      )}

      {/* Filtro de Tipo de Equipamento - Apenas Select */}
      <Text style={styles.label}>Tipo de Equipamento</Text>
      {loadingEquipmentTypes ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : equipmentTypes.length > 0 ? (
        <>
          {console.log("[EquipmentFilters] Renderizando filtro Tipo - equipmentTypes.length:", equipmentTypes.length)}
          {console.log("[EquipmentFilters] EquipmentTypes data:", equipmentTypes)}
          <CustomPicker
            selectedValue={filters.equipmentType ? filters.equipmentType.toString() : ""}
            onValueChange={(value) => {
              console.log("[EquipmentFilters] Tipo de equipamento selecionado:", value);
              setFilters({ ...filters, equipmentType: value || "" });
            }}
            items={equipmentTypes.map((t: any) => {
              console.log("[EquipmentFilters] Mapeando tipo de equipamento:", t);
              return { label: t.name, value: t.id.toString() };
            })}
            placeholder="Selecione um tipo"
            style={styles.picker}
          />
        </>
      ) : (
        <TextInput
          style={styles.input}
          placeholder="Nenhum tipo disponível"
          placeholderTextColor="#888"
          editable={false}
        />
      )}
      {!loadingEquipmentTypes && equipmentTypes.length === 0 && (
        <Text style={styles.errorText}>Nenhum tipo de equipamento encontrado</Text>
      )}

      {/* Filtro de Status */}
      <Text style={styles.label}>Status</Text>
      <CustomPicker
        selectedValue={filters.status || ""}
        onValueChange={(value) => setFilters({ ...filters, status: value || "" })}
        items={[
          { label: "Ativo", value: "active" },
          { label: "Inativo", value: "inactive" }
        ]}
        placeholder="Selecione um status"
        style={styles.picker}
      />

      {/* Subsetor */}
      {loadingSubsectors ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : (subsectorsState.length > 0 || subsectors.length > 0) ? (
        <>
          <Text style={styles.label}>Subsetor</Text>
          <CustomPicker
            selectedValue={filters.subsector_id?.toString() || ''}
            onValueChange={(itemValue: string) => {
              setFilters({ ...filters, subsector_id: itemValue ? parseInt(itemValue) : null });
            }}
            items={(subsectorsState.length > 0 ? subsectorsState : subsectors).map((s: Sector) => ({ label: (s.complete_name || s.name), value: s.id.toString() }))}
            placeholder="Selecione um Subsetor"
            style={styles.picker}
          />
        </>
      ) : null}

      <Button
        title="Filtrar"
        onPress={() => {
          console.log("[EquipmentFilters] Botão Filtrar pressionado");
          console.log("[EquipmentFilters] Filtros atuais:", filters);
          onFilter(filters);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
    fontSize: 14,
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    marginBottom: 12,
    backgroundColor: "#fff",
    color: "#333",
    height: 50,
    fontSize: 14,
  },
  errorText: {
    color: "#dc3545",
    fontSize: 12,
    marginBottom: 12,
    fontStyle: "italic",
  },
});

export default EquipmentFilters;

