import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL, buildApiUrlForAccount } from "../config/apiConfig";
import { Sector } from "../Models/Clientes";

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
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingSectors, setLoadingSectors] = useState(false);
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

  const fetchSectors = async (selectedClientId: number) => {
    setLoadingSectors(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      const apiUrl = await buildApiUrlForAccount();
      const res = await axios.get(`${apiUrl}/clients/${selectedClientId}/sectors`, {
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
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      const apiUrl = await buildApiUrlForAccount();
      const res = await axios.get(`${apiUrl}/brands`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBrands(res.data.results || []);
    } catch (error) {
      console.error("[EquipmentFilters] Erro ao buscar marcas:", error);
    } finally {
      setLoadingBrands(false);
    }
  };

  // Buscar Tipos de Equipamento
  useEffect(() => {
    fetchEquipmentTypes();
  }, []);

  const fetchEquipmentTypes = async () => {
    setLoadingEquipmentTypes(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      const apiUrl = await buildApiUrlForAccount();
      const res = await axios.get(`${apiUrl}/equipment_types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEquipmentTypes(res.data.results || []);
    } catch (error) {
      console.error("[EquipmentFilters] Erro ao buscar tipos de equipamento:", error);
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
    setFilters(prev => ({ ...prev, sector_id: newSectorId }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Filtros</Text>

      {/* Filtro de Cliente - Apenas Select */}
      <Text style={styles.label}>Cliente</Text>
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

      {/* Filtro de Setor - Apenas Select */}
      <Text style={styles.label}>Setor</Text>
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
            <Picker.Item key={s.id} label={s.complete_name || s.name} value={s.id.toString()} />
          ))}
        </Picker>
      )}

      {/* Filtro de Patrimônio/Tag - Apenas Text */}
      <Text style={styles.label}>Patrimônio/Tag</Text>
      <TextInput
        style={styles.input}
        placeholder="Busca por Tag ou Patrimônio"
        placeholderTextColor="#888"
        onChangeText={(text) => setFilters({ ...filters, search: text })}
        value={filters.search}
      />

      {/* Filtro de Fabricante - Apenas Select */}
      <Text style={styles.label}>Fabricante</Text>
      {loadingBrands ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : (
        <Picker
          selectedValue={filters.brand ? filters.brand.toString() : ""}
          onValueChange={(value) => setFilters({ ...filters, brand: value || "" })}
          style={styles.picker}
        >
          <Picker.Item label="Selecione um fabricante" value="" />
          {brands.map((b: any) => (
            <Picker.Item key={b.id} label={b.name} value={b.id.toString()} />
          ))}
        </Picker>
      )}

      {/* Filtro de Tipo de Equipamento - Apenas Select */}
      <Text style={styles.label}>Tipo de Equipamento</Text>
      {loadingEquipmentTypes ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : (
        <Picker
          selectedValue={filters.equipmentType ? filters.equipmentType.toString() : ""}
          onValueChange={(value) => setFilters({ ...filters, equipmentType: value || "" })}
          style={styles.picker}
        >
          <Picker.Item label="Selecione um tipo" value="" />
          {equipmentTypes.map((t: any) => (
            <Picker.Item key={t.id} label={t.name} value={t.id.toString()} />
          ))}
        </Picker>
      )}

      {/* Filtro de Status */}
      <Text style={styles.label}>Status</Text>
      <Picker
        selectedValue={filters.status || ""}
        onValueChange={(value) => setFilters({ ...filters, status: value || "" })}
        style={styles.picker}
      >
        <Picker.Item label="Selecione um status" value="" />
        <Picker.Item label="Ativo" value="active" />
        <Picker.Item label="Inativo" value="inactive" />
      </Picker>

      {/* Novo Picker para Subsetor - apenas se houver subsetores */}
      {subsectors.length > 0 && (
        <>
          <Text style={styles.label}>Subsetor</Text>
          <Picker
            selectedValue={filters.subsector_id?.toString() || ''}
            onValueChange={(itemValue: string) => {
              setFilters({ ...filters, subsector_id: itemValue ? parseInt(itemValue) : null });
            }}
            style={styles.picker}
          >
            <Picker.Item label="Selecione um Subsetor" value="" />
            {subsectors.map((s: Sector) => (
              <Picker.Item key={s.id} label={s.name} value={s.id.toString()} />
            ))}
          </Picker>
        </>
      )}

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
  },
});

export default EquipmentFilters;

