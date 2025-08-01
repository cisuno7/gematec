import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "../config/apiConfig";
import { Sector } from "../Models/Clientes";

interface EquipmentFiltersProps {
  onFilter: (filters: any) => void;
  sectorId?: number; // Opcional, pois pode não ser sempre fornecido
  clientId?: number;
  subsectors?: Sector[];
}
interface FiltersState {
  brand: string;
  equipmentType: string;
  search: string;
  status: string;
  sector_id: number | null;
  client_id: number | null;
  subsector_id: number | null;
}

const EquipmentFilters: React.FC<EquipmentFiltersProps> = ({ onFilter, sectorId, clientId, subsectors = [], }) => {
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
  const [brandQuery, setBrandQuery] = useState("");
  const [typeQuery, setTypeQuery] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingSectors, setLoadingSectors] = useState(false);
  const [clientQuery, setClientQuery] = useState(""); // Novo estado para query de busca de cliente
  const [sectorQuery, setSectorQuery] = useState("");

  // Buscar Clientes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (clientQuery.length >= 3 || clientQuery.length === 0) { // Busca se 3+ caracteres ou vazio para limpar
        fetchClients(clientQuery);
      }
    }, 500); // Debounce de 500ms
    return () => clearTimeout(delayDebounceFn);
  }, [clientQuery]);

  const fetchClients = async (query: string) => {
    setLoadingClients(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      const res = await axios.get(`${API_BASE_URL}/clients?name=${query}`, {
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
    const delayDebounceFn = setTimeout(() => {
      if (filters.client_id && (sectorQuery.length >= 3 || sectorQuery.length === 0)) {
        fetchSectors(filters.client_id, sectorQuery);
      } else if (!filters.client_id) {
        setSectors([]); // Limpa setores se nenhum cliente for selecionado
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [sectorQuery, filters.client_id]);

  const fetchSectors = async (selectedClientId: number, query: string) => {
    setLoadingSectors(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      const res = await axios.get(`${API_BASE_URL}/clients/${selectedClientId}/sectors?name=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSectors(res.data.results || []);
    } catch (error) {
      console.error("[EquipmentFilters] Erro ao buscar setores:", error);
    } finally {
      setLoadingSectors(false);
    }
  };

  // Buscar Marcas
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (brandQuery.length >= 3 || brandQuery.length === 0) {
        fetchBrands(brandQuery);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [brandQuery]);

  // Buscar Tipos de Equipamento
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (typeQuery.length >= 3 || typeQuery.length === 0) {
        fetchEquipmentTypes(typeQuery);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [typeQuery]);

  const fetchBrands = async (query: string) => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      const res = await axios.get(`${API_BASE_URL}/brands?name=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBrands(res.data.results || []);
    } catch (error) {
      console.error("[EquipmentFilters] Erro ao buscar marcas:", error);
    }
  };

  // Lidar com mudanças nos pickers de cliente e setor
  const handleClientChange = (value: string) => {
    const newClientId = value ? parseInt(value) : null;
    setFilters(prev => ({ ...prev, client_id: newClientId, sector_id: null })); // Reseta setor quando o cliente muda
    setSectorQuery(""); // Limpa a query de setor
  };

  const fetchEquipmentTypes = async (query: string) => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      const res = await axios.get(`${API_BASE_URL}/equipment_types?name=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEquipmentTypes(res.data.results || []);
    } catch (error) {
      console.error("[EquipmentFilters] Erro ao buscar tipos de equipamento:", error);
    }
  };

  const handleSectorChange = (value: string) => {
    const newSectorId = value ? parseInt(value) : null;
    setFilters(prev => ({ ...prev, sector_id: newSectorId }));
  };

  const handleBrandQueryChange = (text: string) => {
    setBrandQuery(text);
    if (text.length >= 3) {
      fetchBrands(text);
    }
  };

  const handleTypeQueryChange = (text: string) => {
    setTypeQuery(text);
    if (text.length >= 3) {
      fetchEquipmentTypes(text);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Filtros</Text>
      {/* Filtro de Cliente */}
      <Text style={styles.label}>Cliente</Text>
      <TextInput
        style={styles.input}
        placeholder="Pesquisar Cliente..."
        placeholderTextColor="#888"
        value={clientQuery}
        onChangeText={setClientQuery}
      />
      {loadingClients ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : (
        <Picker
          selectedValue={filters.client_id ? filters.client_id.toString() : ""}
          onValueChange={handleClientChange}
          style={styles.picker}
        >
          <Picker.Item label="Selecione um cliente" value="" />
          {clients.map((c: any) => (
            <Picker.Item key={c.id} label={c.name} value={c.id.toString()} />
          ))}
        </Picker>
      )}

      {/* Filtro de Setor */}
      <Text style={styles.label}>Setor</Text>
      <TextInput
        style={styles.input}
        placeholder="Pesquisar Setor..."
        placeholderTextColor="#888"
        value={sectorQuery}
        onChangeText={setSectorQuery}
        editable={!!filters.client_id} // Editável apenas se um cliente for selecionado
      />
      {loadingSectors ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : (
        <Picker
          selectedValue={filters.sector_id ? filters.sector_id.toString() : ""}
          onValueChange={handleSectorChange}
          style={styles.picker}
          enabled={!!filters.client_id} // Habilitado apenas se um cliente for selecionado
        >
          <Picker.Item label="Selecione um setor" value="" />
          {sectors.map((s: any) => (
            <Picker.Item key={s.id} label={s.name} value={s.id.toString()} />
          ))}
        </Picker>
      )}
      <TextInput
        style={styles.input}
        placeholder="Busca por Tag ou Patrimônio"
        placeholderTextColor="#888"
        onChangeText={(text) => setFilters({ ...filters, search: text })}
        value={filters.search}
      />
      <TextInput
        style={styles.input}
        placeholder="Pesquisar Fabricante..."
        placeholderTextColor="#888"
        value={brandQuery}
        onChangeText={handleBrandQueryChange}
      />
      <Picker
        selectedValue={filters.brand}
        onValueChange={(value) => setFilters({ ...filters, brand: value })}
        style={styles.picker}
      >
        <Picker.Item label="Fabricante" value="" />
        {brands.map((b: any) => (
          <Picker.Item key={b.id} label={b.name} value={b.id} />
        ))}
      </Picker>
      <TextInput
        style={styles.input}
        placeholder="Pesquisar Tipo de Equipamento..."
        placeholderTextColor="#888"
        value={typeQuery}
        onChangeText={handleTypeQueryChange}
      />
      <Picker
        selectedValue={filters.equipmentType}
        onValueChange={(value) => setFilters({ ...filters, equipmentType: value })}
        style={styles.picker}
      >
        <Picker.Item label="Tipo de Equipamento" value="" />
        {equipmentTypes.map((t: any) => (
          <Picker.Item key={t.id} label={t.name} value={t.id} />
        ))}
      </Picker>
      {/* Novo Picker para Subsetor */}
      {subsectors.length > 0 && ( // Condição simplificada, já que subsectors é garantido como array
        <Picker
          selectedValue={filters.subsector_id?.toString() || ''} // Converte para string para o Picker
          onValueChange={(itemValue: string) => { // itemValue é string
            setFilters({ ...filters, subsector_id: itemValue ? parseInt(itemValue) : null }); // Converte de volta para number ou null
          }}
          style={styles.picker}
        >
          <Picker.Item label="Selecione um Subsetor" value="" /> {/* Value vazio para "Selecione" */}
          {subsectors.map((s: Sector) => ( // Explicitamente tipado 's: Sector' para clareza
            <Picker.Item key={s.id} label={s.name} value={s.id.toString()} /> // Converte id para string
          ))}
        </Picker>
      )}
      <Picker
        selectedValue={filters.status}
        onValueChange={(value) => setFilters({ ...filters, status: value })}
        style={styles.picker}
      >
        <Picker.Item label="Status" value="" />
        <Picker.Item label="Ativo" value="active" />
        <Picker.Item label="Inativo" value="inactive" />
      </Picker>
      <Button title="Filtrar" onPress={() => onFilter(filters)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 10,
  },
});

export default EquipmentFilters;

