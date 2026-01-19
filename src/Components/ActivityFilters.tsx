import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomPicker from "./CustomPicker";
import DatePickerInput from "./DatePickerInput";
import ResponsiveText from "./ResponsiveText";
import { useResponsive } from "../hooks/useResponsive";
import ActivityService from "../Services/ActivityService";
import CacheService from "../Services/CacheService";
import { EquipmentStatus, ActivityStatus, getEquipmentStatusConfig, getActivityStatusConfig } from "../constants/activityStatus";

export interface ActivityFiltersState {
  activity_type_id?: number;
  activity_type_slug?: string;
  status?: string[];
  client_id?: number;
  start_date?: string;
  end_date?: string;
}

interface ActivityFiltersProps {
  onFilter: (filters: ActivityFiltersState) => void;
  resetKey?: number;
  showFilterButton?: boolean;
}

const STATUS_OPTIONS = [
  { label: "Todos", value: "all", icon: "list" },
  { label: "Criado", value: ActivityStatus.CREATED, icon: "add-circle" },
  { label: "Aberto", value: ActivityStatus.OPEN, icon: "play-circle" },
  { label: "Pendente", value: EquipmentStatus.PENDING, icon: "schedule" },
  { label: "Aguardando Orçamento", value: ActivityStatus.WAITING_BUDGET_APPROVAL, icon: "hourglass-outline" },
  { label: "Orçamento Aprovado", value: ActivityStatus.BUDGET_APPROVAL, icon: "checkmark-circle" },
  { label: "Orçamento Reprovado", value: ActivityStatus.BUDGET_DISAPPROVAL, icon: "close-circle" },
  { label: "Fechado", value: EquipmentStatus.CLOSED, icon: "checkmark-circle" },
];

const ActivityFilters: React.FC<ActivityFiltersProps> = ({ 
  onFilter, 
  resetKey = 0, 
  showFilterButton = true 
}) => {
  const r = useResponsive();
  const [filters, setFilters] = useState<ActivityFiltersState>({
    activity_type_id: undefined,
    activity_type_slug: undefined,
    status: ["all"],
    client_id: undefined,
    start_date: undefined,
    end_date: undefined,
  });

  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingActivityTypes, setLoadingActivityTypes] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const activityService = new ActivityService();

  // Reset dos filtros quando resetKey mudar
  useEffect(() => {
    if (resetKey > 0) {
      const resetFilters: ActivityFiltersState = {
        activity_type_id: undefined,
        activity_type_slug: undefined,
        status: ["all"],
        client_id: undefined,
        start_date: undefined,
        end_date: undefined,
      };
      setFilters(resetFilters);
    }
  }, [resetKey]);

  // Buscar tipos de atividade
  useEffect(() => {
    fetchActivityTypes();
  }, []);

  const fetchActivityTypes = async () => {
    setLoadingActivityTypes(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");

      const types = await activityService.fetchActivityTypes(token);
      setActivityTypes(types || []);
    } catch (error) {
      console.error("[ActivityFilters] Erro ao buscar tipos de atividade:", error);
      setActivityTypes([]);
    } finally {
      setLoadingActivityTypes(false);
    }
  };

  // Buscar Clientes
  useEffect(() => {
    fetchClients(true);
  }, []);

  const fetchClients = async (forceApi: boolean = false) => {
    setLoadingClients(true);
    try {
      if (!forceApi) {
        const cachedAllClients = await CacheService.get<any[]>(CacheService.KEYS.CLIENTS_ALL);
        if (cachedAllClients && cachedAllClients.length > 0) {
          setClients(cachedAllClients);
          setLoadingClients(false);
          return;
        }
      }

      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token não encontrado");

      const { default: ClientService } = require('../Services/ClientService');
      const allClients = await ClientService.getAllClients(token);

      // Converter para array simples se necessário
      const clientsArray = Array.isArray(allClients) ? allClients : [];
      await CacheService.set(CacheService.KEYS.CLIENTS_ALL, clientsArray, 30 * 60 * 1000);
      setClients(clientsArray);
    } catch (error) {
      console.error("[ActivityFilters] Erro ao buscar clientes:", error);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleStatusToggle = (statusValue: string) => {
    setFilters(prev => {
      const currentStatus = prev.status || ["all"];
      
      if (statusValue === "all") {
        return { ...prev, status: ["all"] };
      }
      
      const newStatus = currentStatus.includes("all") 
        ? [statusValue]
        : currentStatus.includes(statusValue)
        ? currentStatus.filter(s => s !== statusValue)
        : [...currentStatus, statusValue];
      
      return { 
        ...prev, 
        status: newStatus.length === 0 ? ["all"] : newStatus 
      };
    });
  };

  const handleActivityTypeChange = (value: string) => {
    if (!value) {
      setFilters(prev => ({ ...prev, activity_type_id: undefined, activity_type_slug: undefined }));
      return;
    }

    const selectedType = activityTypes.find(t => t.id.toString() === value);
    if (selectedType) {
      setFilters(prev => ({
        ...prev,
        activity_type_id: selectedType.id,
        activity_type_slug: selectedType.slug || selectedType.name,
      }));
    }
  };

  const handleClientChange = (value: string) => {
    const clientId = value ? parseInt(value) : undefined;
    setFilters(prev => ({ ...prev, client_id: clientId }));
  };

  const isStatusSelected = (statusValue: string) => {
    return filters.status?.includes(statusValue) || false;
  };

  return (
    <View style={[styles.container, { padding: r.spacing(1) }]}>
      <ResponsiveText variant="subtitle" weight="bold" style={styles.title}>
        Filtros
      </ResponsiveText>

      {/* Filtro de Tipo de Atividade */}
      <ResponsiveText variant="body" weight="600" style={styles.label}>
        Tipo de Atividade
      </ResponsiveText>
      {loadingActivityTypes ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : (
        <CustomPicker
          selectedValue={filters.activity_type_id?.toString() || ""}
          onValueChange={handleActivityTypeChange}
          items={[
            { label: "Todos", value: "" },
            ...activityTypes.map((t: any) => ({
              label: t.name || t.slug || "Desconhecido",
              value: t.id.toString(),
            })),
          ]}
          placeholder="Selecione um tipo"
          style={[styles.picker, { minHeight: r.verticalScale(44) }]}
          searchable={true}
        />
      )}

      {/* Filtro de Status */}
      <ResponsiveText variant="body" weight="600" style={styles.label}>
        Status
      </ResponsiveText>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.statusScroll}
        contentContainerStyle={styles.statusContainer}
      >
        {STATUS_OPTIONS.map((status) => (
          <TouchableOpacity
            key={status.value}
            style={[
              styles.statusChip,
              isStatusSelected(status.value) && styles.statusChipSelected,
              { paddingHorizontal: r.spacing(1), paddingVertical: r.spacing(0.5) },
            ]}
            onPress={() => handleStatusToggle(status.value)}
          >
            <ResponsiveText
              variant="caption"
              weight={isStatusSelected(status.value) ? "600" : "normal"}
              style={[
                styles.statusChipText,
                isStatusSelected(status.value) && styles.statusChipTextSelected,
              ]}
            >
              {status.label}
            </ResponsiveText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filtro de Cliente */}
      <ResponsiveText variant="body" weight="600" style={styles.label}>
        Cliente
      </ResponsiveText>
      {loadingClients ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : (
        <CustomPicker
          selectedValue={filters.client_id?.toString() || ""}
          onValueChange={handleClientChange}
          items={[
            { label: "Todos", value: "" },
            ...clients.map((c: any) => ({
              label: c.name,
              value: c.id.toString(),
            })),
          ]}
          placeholder="Selecione um cliente"
          style={[styles.picker, { minHeight: r.verticalScale(44) }]}
          searchable={true}
        />
      )}

      {/* Filtro de Período */}
      <ResponsiveText variant="body" weight="600" style={styles.label}>
        Período
      </ResponsiveText>
      <View style={styles.dateRow}>
        <View style={styles.dateInput}>
          <DatePickerInput
            value={filters.start_date || ""}
            onChangeText={(text) => setFilters(prev => ({ ...prev, start_date: text || undefined }))}
            placeholder="Data inicial"
            label="Data Inicial"
          />
        </View>
        <View style={styles.dateInput}>
          <DatePickerInput
            value={filters.end_date || ""}
            onChangeText={(text) => setFilters(prev => ({ ...prev, end_date: text || undefined }))}
            placeholder="Data final"
            label="Data Final"
          />
        </View>
      </View>

      {/* Botão Filtrar */}
      {showFilterButton && (
        <TouchableOpacity
          style={[styles.filterButton, { paddingVertical: r.spacing(0.75) }]}
          onPress={() => onFilter(filters)}
        >
          <ResponsiveText variant="button" weight="bold" style={styles.filterButtonText}>
            Filtrar
          </ResponsiveText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    marginBottom: 16,
    color: "#333",
  },
  label: {
    marginBottom: 8,
    marginTop: 12,
    color: "#666",
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  statusScroll: {
    marginBottom: 12,
  },
  statusContainer: {
    paddingRight: 16,
  },
  statusChip: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#007bff",
    borderRadius: 20,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChipSelected: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  statusChipText: {
    color: "#007bff",
  },
  statusChipTextSelected: {
    color: "#fff",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dateInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  filterButton: {
    backgroundColor: "#007BFF",
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  filterButtonText: {
    color: "#fff",
  },
});

export default ActivityFilters;

