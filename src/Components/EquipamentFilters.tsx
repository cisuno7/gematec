import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Removido axios; usar sempre apiClient
import { Sector } from "../Models/Clientes";
import CustomPicker from "./CustomPicker";
import apiClient from "../Context/ApiClient";
import CacheService from "../Services/CacheService";

interface EquipmentFiltersProps {
  onFilter: (filters: any) => void;
  sectorId?: number; // Opcional, pois pode não ser sempre fornecido
  clientId?: number;
  subsectors?: Sector[];
  resetKey?: number; // Chave para forçar reset dos filtros
  showFilterButton?: boolean; // Controla se mostra o botão Filtrar
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

const EquipmentFilters: React.FC<EquipmentFiltersProps> = ({ onFilter, sectorId, clientId, subsectors = [], resetKey = 0, showFilterButton = true }) => {
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
  const [brands, setBrands] = useState<any[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]); // Novo estado para clientes
  const [sectors, setSectors] = useState<any[]>([]);
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
    fetchClients(true);
  }, []);

  const fetchClients = async (forceApi: boolean = false) => {
    setLoadingClients(true);
    try {
      if (!forceApi) {
        // Tenta carregar do cache primeiro
        const cachedAllClients = await CacheService.get<any[]>(CacheService.KEYS.CLIENTS_ALL);
        if (cachedAllClients && cachedAllClients.length > 0) {
          console.log("[EquipmentFilters] Todos os clientes carregados do cache:", cachedAllClients.length);
          setClients(cachedAllClients);
          setLoadingClients(false);
          return;
        }
      }

      // Buscar todos os clientes da API usando o novo método
      console.log("[EquipmentFilters] Buscando todos os clientes via ClientService.getAllClients");
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");

      const { default: ClientService } = require('../Services/ClientService');
      const allClients = await ClientService.getAllClients(token);

      console.log("[EquipmentFilters] Todos os clientes carregados da API:", allClients.length);

      // Salva no cache
      await CacheService.set(CacheService.KEYS.CLIENTS_ALL, allClients, 30 * 60 * 1000); // 30 minutos

      setClients(allClients);
    } catch (error) {
      console.error("[EquipmentFilters] Erro ao buscar todos os clientes:", error);
      setClients([]); // Garantir lista vazia em caso de erro
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

  // Removido useEffect automático - agora apenas no botão "Filtrar"

  // Buscar Subsetores quando setor mudar
  useEffect(() => {
    const loadSubsectors = async () => {
      try {
        setLoadingSubsectors(true);
        setSubsectorsState([]);
        if (!filters.client_id || !filters.sector_id) return;

        console.log('[EquipmentFilters] Buscando subsetores para client_id:', filters.client_id, 'parent_id:', filters.sector_id);

        // Usar apiClient diretamente com o endpoint correto
        const response = await apiClient.get(`/clients/${filters.client_id}/sectors`, {
          params: { parent_id: filters.sector_id }
        });

        const payload = response.data;
        const list = Array.isArray(payload) ? payload : (payload?.results || []);
        console.log('[EquipmentFilters] Subsetores encontrados:', list.length);
        setSubsectorsState(list);
      } catch (error: any) {
        console.error('[EquipmentFilters] Erro ao buscar subsetores:', error);
        // Se for erro 400 (parent_id inválido), não quebrar a tela
        if (error.response?.status === 400) {
          console.warn('[EquipmentFilters] parent_id inválido, retornando lista vazia');
        }
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
      const { default: ClientService } = require('../Services/ClientService');
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
      // Primeiro tenta do cache
      const cachedBrands = await CacheService.get<any[]>(CacheService.KEYS.BRANDS);
      if (cachedBrands && cachedBrands.length > 0) {
        console.log("[EquipmentFilters] Marcas carregadas do cache:", cachedBrands.length);
        setBrands(cachedBrands);
        setLoadingBrands(false);
        return;
      }

      // Se não tem cache, busca da API
      console.log("[EquipmentFilters] Fazendo requisição para: /brands (via apiClient)");
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");
      let res;
      try {
        res = await apiClient.get(`/brands`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
      } catch (err: any) {
        console.warn("[EquipmentFilters] Falha com Authorization. Tentando sem Authorization (compatibilidade)");
        res = await apiClient.get(`/brands`, { headers: { Accept: "application/json" } });
      }
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : (payload?.results || []);
      console.log("[EquipmentFilters] Marcas carregadas:", list.length);

      // Salva no cache
      await CacheService.set(CacheService.KEYS.BRANDS, list, 60 * 60 * 1000); // 1 hora
      setBrands(list);
    } catch (error) {
      console.error("[EquipmentFilters] Erro ao buscar marcas:", error);
      setBrands([]);
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
      // Primeiro tenta do cache
      const cachedTypes = await CacheService.get<any[]>(CacheService.KEYS.EQUIPMENT_TYPES);
      if (cachedTypes && cachedTypes.length > 0) {
        console.log("[EquipmentFilters] Tipos de equipamento carregados do cache:", cachedTypes.length);
        setEquipmentTypes(cachedTypes);
        setLoadingEquipmentTypes(false);
        return;
      }

      // Se não tem cache, busca da API
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");
      console.log("[EquipmentFilters] Fazendo requisição para: /equipment_types (via apiClient)");
      const res = await apiClient.get(`/equipment_types`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : (payload?.results ?? []);
      console.log("[EquipmentFilters] Tipos de equipamento carregados:", list.length);

      // Salva no cache
      await CacheService.set(CacheService.KEYS.EQUIPMENT_TYPES, list, 60 * 60 * 1000); // 1 hora
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
      {(() => { console.log("[EquipmentFilters] render start"); return null; })()}
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
          searchable={true}
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
          searchable={true}
        />
      ) : (
        <TextInput
          style={styles.input}
          placeholder="Nenhum setor disponível para este cliente"
          placeholderTextColor="#888"
          editable={false}
        />
      )}

      {/* Filtro de Tag - Apenas Text */}
      <Text style={styles.label}>Tag</Text>
      <TextInput
        style={styles.input}
        placeholder="Buscar por Tag"
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
            searchable={true}
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
            searchable={true}
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
        searchable={false}
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
            searchable={true}
          />
        </>
      ) : null}

      {(() => {
        console.log("[EquipmentFilters] showFilterButton:", showFilterButton);
        if (showFilterButton) {
          console.log("[EquipmentFilters] Botão Filtrar deve estar visível!");
        }
        return null;
      })()}
      {(showFilterButton !== false) && (
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            console.log("[EquipmentFilters] Botão Filtrar pressionado");
            console.log("[EquipmentFilters] Filtros atuais:", filters);
            onFilter(filters);
          }}
        >
          <Text style={styles.filterButtonText}>Filtrar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 24,
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
  filterButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  filterButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default EquipmentFilters;

