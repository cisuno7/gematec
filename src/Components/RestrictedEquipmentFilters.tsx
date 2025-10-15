import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import CustomPicker from "./CustomPicker";
import { Sector } from "../Models/Clientes";
import apiClient from "../Context/ApiClient";

type RestrictedFilters = {
  search: string;
  brand: string | number;
  equipmentType: string | number;
  status: string;
  subsector_id: number | null;
};

interface Props {
  clientId: number;
  sectorId: number;
  resetKey?: number;
  onFilter: (filters: RestrictedFilters) => void;
}

const RestrictedEquipmentFilters: React.FC<Props> = ({ clientId, sectorId, resetKey = 0, onFilter }) => {
  console.log('[RestrictedEquipmentFilters] Componente montado com props:', { clientId, sectorId, resetKey });

  const [filters, setFilters] = useState<RestrictedFilters>({
    search: "",
    brand: "",
    equipmentType: "",
    status: "",
    subsector_id: null,
  });

  const [brands, setBrands] = useState<any[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
  const [subsectors, setSubsectors] = useState<Sector[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingSubsectors, setLoadingSubsectors] = useState(false);

  useEffect(() => {
    // Reset ao solicitar
    if (resetKey > 0) {
      setFilters({ search: "", brand: "", equipmentType: "", status: "", subsector_id: null });
    }
  }, [resetKey]);

  useEffect(() => {
    // Carregar brands e types
    const load = async () => {
      try {
        setLoadingBrands(true);
        const resBrands = await apiClient.get("/brands");
        const brandsPayload = resBrands.data;
        setBrands(Array.isArray(brandsPayload) ? brandsPayload : (brandsPayload?.results || []));
      } catch (e) {
        setBrands([]);
      } finally {
        setLoadingBrands(false);
      }

      try {
        setLoadingTypes(true);
        const resTypes = await apiClient.get("/equipment_types");
        const typesPayload = resTypes.data;
        setEquipmentTypes(Array.isArray(typesPayload) ? typesPayload : (typesPayload?.results || []));
      } catch (e) {
        setEquipmentTypes([]);
      } finally {
        setLoadingTypes(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    // Carregar subsetores do setor informado
    const loadSubsectors = async () => {
      if (!clientId || !sectorId) {
        setSubsectors([]);
        return;
      }
      try {
        setLoadingSubsectors(true);
        const res = await apiClient.get(`/clients/${clientId}/sectors`, { params: { parent_id: sectorId } });
        const payload = res.data;
        setSubsectors(Array.isArray(payload) ? payload : (payload?.results || []));
      } catch (error: any) {
        if (error?.response?.status === 400) {
          // parent_id inválido -> lista vazia silenciosa
          setSubsectors([]);
        } else {
          setSubsectors([]);
        }
      } finally {
        setLoadingSubsectors(false);
      }
    };
    loadSubsectors();
  }, [clientId, sectorId]);

  // Comentado temporariamente para evitar duplicação
  // useEffect(() => {
  //   console.log('[RestrictedEquipmentFilters] useEffect debounce: filters mudaram', JSON.stringify(filters));
  //   const handler = setTimeout(() => {
  //     console.log('[RestrictedEquipmentFilters] useEffect debounce: disparando onFilter após 200ms');
  //     onFilter(filters);
  //   }, 200);
  //   return () => clearTimeout(handler);
  // }, [filters]);

  // Também dispara uma vez ao montar com os filtros iniciais
  useEffect(() => {
    console.log('[RestrictedEquipmentFilters] useEffect inicial: chamando onFilter');
    onFilter(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Filtros</Text>

      <Text style={styles.label}>Status</Text>
      <CustomPicker
        selectedValue={filters.status || ""}
        onValueChange={(value) => {
          const next = { ...filters, status: value || "" };
          setFilters(next);
          onFilter(next);
        }}
        items={[{ label: "Ativo", value: "active" }, { label: "Inativo", value: "inactive" }]}
        placeholder="Selecione um status"
        style={styles.picker}
      />

      {loadingSubsectors ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : subsectors.length > 0 ? (
        <>
          <Text style={styles.label}>Subsetor</Text>
          <CustomPicker
            selectedValue={filters.subsector_id?.toString() || ""}
            onValueChange={(value: string) => {
              const next = { ...filters, subsector_id: value ? parseInt(value) : null };
              setFilters(next);
              onFilter(next);
            }}
            items={subsectors.map(s => ({ label: (s.complete_name || s.name), value: s.id.toString() }))}
            placeholder="Selecione um subsetor"
            style={styles.picker}
          />
        </>
      ) : null}

      <Text style={styles.label}>Tag</Text>
      <TextInput
        style={styles.input}
        placeholder="Buscar por Tag"
        placeholderTextColor="#999"
        autoCapitalize="none"
        autoCorrect={false}
        value={filters.search}
        onChangeText={(text) => {
          console.log('[RestrictedEquipmentFilters] Tag digitada:', text);
          const next = { ...filters, search: text };
          setFilters(next);
          console.log('[RestrictedEquipmentFilters] Chamando onFilter com:', JSON.stringify(next));
          onFilter(next); // aplica imediatamente enquanto digita
        }}
      />

      <Text style={styles.label}>Fabricante</Text>
      {loadingBrands ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : (
        <CustomPicker
          selectedValue={filters.brand ? String(filters.brand) : ""}
          onValueChange={(value) => {
            const next = { ...filters, brand: value || "" };
            setFilters(next);
            onFilter(next);
          }}
          items={brands.map(b => ({ label: b.name, value: String(b.id) }))}
          placeholder="Selecione um fabricante"
          style={styles.picker}
        />
      )}

      <Text style={styles.label}>Tipo</Text>
      {loadingTypes ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : (
        <CustomPicker
          selectedValue={filters.equipmentType ? String(filters.equipmentType) : ""}
          onValueChange={(value) => {
            const next = { ...filters, equipmentType: value || "" };
            setFilters(next);
            onFilter(next);
          }}
          items={equipmentTypes.map(t => ({ label: t.name, value: String(t.id) }))}
          placeholder="Selecione um tipo"
          style={styles.picker}
        />
      )}

      {/* Sem botão: aplicação automática dos filtros */}
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
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    color: "#222",
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

export default RestrictedEquipmentFilters;


