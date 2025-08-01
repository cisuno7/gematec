import axios from 'axios';
import { Equipment } from '../Models/Equipament';
import EquipmentTemplateModel from '../Models/EquipmentTemplate';
import apiClient from "../Context/ApiClient";
import { setDynamicApiUrl } from "../config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface EquipmentFilters {
  search?: string;
  equipmentType?: string;
  brand?: string;
  status?: string;
  sector_id?: number;
  client_id?: number;
  subsector_id?: number; // Adicionado
  page?: number;
  per_page?: number;
}
export default class EquipmentService {
  static async fetchEquipments(
    token: string,
    filters: EquipmentFilters
  ): Promise<{ results: Equipment[]; count: number }> {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.equipmentType) params.append('equipment_type', filters.equipmentType);
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.status) params.append('status', filters.status);
      if (filters.sector_id) params.append('sector_id', filters.sector_id.toString());
      if (filters.client_id) params.append('client_id', filters.client_id.toString());
      if (filters.subsector_id) params.append('subsector_id', filters.subsector_id.toString());
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.per_page) params.append('per_page', filters.per_page.toString());
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const url = `${dynamicBaseUrl}/equipments?${params}`;
      const response = await apiClient.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data; // Deve retornar { results, count }
    } catch (error: any) {
      console.error("[EquipmentService] Erro ao buscar equipamentos:", error);
      throw new Error("[EquipmentService] Erro ao buscar equipamentos.");
    }
  }
  static async fetchEquipmentDetails(equipmentId: string, accessToken: string) {
    try {
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const response = await apiClient.get(`${dynamicBaseUrl}/equipments/${equipmentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (error: any) {
      console.error("[EquipmentService] Erro ao buscar detalhes do equipamento:", error.message);
      throw new Error(error.response?.data?.message || "Falha ao buscar detalhes do equipamento.");
    }
  }
  static async createEquipment(
    token: string,
    equipmentData: Partial<Equipment>
  ): Promise<Equipment> {
    try {
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const response = await apiClient.post(`${dynamicBaseUrl}/equipments`, equipmentData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error("[EquipmentService] Erro ao criar equipamento:", error);
      throw error;
    }
  }
  static async updateEquipment(
    token: string,
    equipmentId: string,
    data: any
  ): Promise<any> {
    try {
      console.log("[EquipmentService] Atualizando equipamento...");

      console.log("[EquipmentService] ID do Equipamento:", equipmentId);
      console.log("[EquipmentService] Dados para atualização:", data);

      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const response = await apiClient.put(`${dynamicBaseUrl}/equipments/${equipmentId}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("[EquipmentService] Equipamento atualizado com sucesso:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[EquipmentService] Erro ao atualizar equipamento:", error);

      if (error.response) {
        console.error("[EquipmentService] Erro no servidor:");
        console.error("Status:", error.response.status);
        console.error("Dados:", error.response.data);

        // Tratamento de códigos de erro específicos
        if (error.response.status === 404) {
          throw new Error("Equipamento não encontrado.");
        } else if (error.response.status === 401) {
          throw new Error("Token de acesso inválido ou expirado.");
        } else {
          throw new Error("Erro inesperado no servidor.");
        }
      } else if (error.request) {
        console.error("[EquipmentService] Nenhuma resposta recebida do servidor:", error.request);
        throw new Error("Falha na conexão com o servidor. Verifique sua rede.");
      } else {
        console.error("[EquipmentService] Erro ao configurar requisição:", error.message);
        throw new Error("Erro ao configurar a requisição. Verifique os parâmetros.");
      }
    }
  }

  static async removeEquipment(token: string, equipmentId: number): Promise<void> {
    try {
      console.log(`[EquipmentService] Removendo equipamento com ID: ${equipmentId}`);
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const response = await apiClient.delete(`${dynamicBaseUrl}/equipments/${equipmentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("[EquipmentService] Equipamento removido com sucesso:", response.data);
    } catch (error: any) {
      console.error("[EquipmentService] Erro ao remover equipamento:", error);

      if (error.response) {
        if (error.response.status === 404) {
          throw new Error("Equipamento não encontrado.");
        } else if (error.response.status === 401) {
          throw new Error("Token de acesso inválido ou expirado.");
        }
      }

      throw new Error(error.message || "Erro ao remover o equipamento.");
    }
  }

  static async getEquipmentTemplate(token: string): Promise<EquipmentTemplateModel> {
    try {
      console.log("[EquipmentService] Buscando template de equipamentos...");
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const response = await apiClient.get(`${dynamicBaseUrl}/equipment_template`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("[EquipmentService] Template de equipamentos recebido:", response.data);
      return new EquipmentTemplateModel(response.data);
    } catch (error: any) {
      console.error("[EquipmentService] Erro ao buscar template de equipamentos:", error);
      throw new Error(error.response?.data?.message || "Falha ao buscar template de equipamentos.");
    }
  }

}
