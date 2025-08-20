import axios from 'axios';
import { Equipment } from '../Models/Equipament';
import EquipmentTemplateModel from '../Models/EquipmentTemplate';
import apiClient from "../Context/ApiClient";
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
      console.log("[EquipmentService] Iniciando busca de equipamentos com filtros:", filters);

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

      const url = `/equipments?${params}`;
      console.log("[EquipmentService] URL da requisição:", url);

      const response = await apiClient.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("[EquipmentService] Resposta recebida:", response.data);
      return response.data; // Deve retornar { results, count }
    } catch (error: any) {
      console.error("[EquipmentService] Erro ao buscar equipamentos:", error);
      console.error("[EquipmentService] Detalhes do erro:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });

      if (error.response?.status === 404) {
        throw new Error("Endpoint não encontrado. Verifique a URL da API.");
      } else if (error.response?.status === 401) {
        throw new Error("Token inválido ou expirado. Faça login novamente.");
      } else if (error.response?.status === 403) {
        throw new Error("Sem permissão para acessar este recurso.");
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error("Erro de conexão. Verifique sua internet.");
      } else {
        throw new Error(`Erro ao buscar equipamentos: ${error.message || 'Erro desconhecido'}`);
      }
    }
  }
  static async fetchEquipmentDetails(equipmentId: string, accessToken: string) {
    try {
      const response = await apiClient.get(`/equipments/${equipmentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (error: any) {
      console.error("[EquipmentService] Erro ao buscar detalhes do equipamento:", error.message);
      throw new Error(error.response?.data?.message || "Falha ao buscar detalhes do equipamento.");
    }
  }

  // Buscar equipamento por QR Code conforme documentação
  static async fetchEquipmentByQRCode(qrCode: string, accessToken: string) {
    try {
      console.log("[EquipmentService] Buscando equipamento por QR Code:", qrCode);
      console.log("[EquipmentService] Token disponível:", !!accessToken);

      // Usar endpoint: /equipments/:uuid (o UUID é o código do QR code)
      const url = `/equipments/${qrCode}`;
      console.log("[EquipmentService] URL da requisição:", url);

      const response = await apiClient.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      console.log("[EquipmentService] Resposta do equipamento por QR Code:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[EquipmentService] Erro ao buscar equipamento por QR Code:", error.message);
      console.error("[EquipmentService] Status do erro:", error.response?.status);
      console.error("[EquipmentService] Dados do erro:", error.response?.data);
      console.error("[EquipmentService] URL que falhou:", error.config?.url);

      if (error.response?.status === 404) {
        throw new Error("Equipamento não encontrado. Verifique se o QR code é válido ou se o equipamento está cadastrado no sistema.");
      } else if (error.response?.status === 401) {
        throw new Error("Token de acesso inválido ou expirado. Faça login novamente.");
      } else if (error.response?.status === 403) {
        throw new Error("Sem permissão para acessar este equipamento.");
      } else if (error.response?.status === 500) {
        throw new Error("Erro interno do servidor. Tente novamente mais tarde.");
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error("Erro de conexão. Verifique sua internet.");
      } else {
        throw new Error(error.response?.data?.message || "Falha ao buscar equipamento por QR Code.");
      }
    }
  }
  static async createEquipment(
    token: string,
    equipmentData: Partial<Equipment>
  ): Promise<Equipment> {
    try {
      console.log("[EquipmentService] Criando equipamento com dados:", equipmentData);

      const response = await apiClient.post(`/equipments`, equipmentData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      console.log("[EquipmentService] Equipamento criado com sucesso:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[EquipmentService] Erro ao criar equipamento:", error);

      if (error.response) {
        console.error("[EquipmentService] Erro no servidor:");
        console.error("Status:", error.response.status);
        console.error("Dados:", error.response.data);
        console.error("Headers:", error.response.headers);

        // Tratamento específico para erro 400
        if (error.response.status === 400) {
          const errorMessage = error.response.data?.message || error.response.data?.error || "Dados inválidos";
          console.error("[EquipmentService] Erro 400 - Dados inválidos:", errorMessage);
          throw new Error(`Erro de validação: ${errorMessage}`);
        } else if (error.response.status === 401) {
          throw new Error("Token de acesso inválido ou expirado.");
        } else if (error.response.status === 422) {
          const validationErrors = error.response.data?.errors || {};
          const errorMessages = Object.values(validationErrors).flat().join(", ");
          throw new Error(`Erro de validação: ${errorMessages}`);
        } else {
          throw new Error(error.response.data?.message || "Erro inesperado no servidor.");
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
  static async updateEquipment(
    token: string,
    equipmentId: string,
    data: any
  ): Promise<any> {
    try {
      console.log("[EquipmentService] Atualizando equipamento...");

      console.log("[EquipmentService] ID do Equipamento:", equipmentId);
      console.log("[EquipmentService] Dados para atualização:", data);

      const response = await apiClient.put(`/equipments/${equipmentId}`, data, {
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
      const response = await apiClient.delete(`/equipments/${equipmentId}`, {
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
    console.log("[EquipmentService] Buscando template de equipamentos (tentando plural -> singular)...");
    // 1) Tenta endpoint plural (comportamento observado no servidor)
    try {
      const respPlural = await apiClient.get(`/equipment_templates/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("[EquipmentService] Template (plural) recebido:", respPlural.data);
      return new EquipmentTemplateModel(respPlural.data);
    } catch (errPlural: any) {
      if (errPlural?.response?.status !== 404) {
        console.error("[EquipmentService] Falha no endpoint plural:", errPlural?.response?.status, errPlural?.message);
      } else {
        console.log("[EquipmentService] Endpoint plural 404. Tentando endpoint singular...");
      }
      // 2) Fallback: tenta endpoint singular (documentação)
      try {
        const respSingular = await apiClient.get(`/equipment_template/current`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("[EquipmentService] Template (singular) recebido:", respSingular.data);
        return new EquipmentTemplateModel(respSingular.data);
      } catch (errSingular: any) {
        console.error("[EquipmentService] Falha no endpoint singular:", errSingular?.response?.status, errSingular?.message);
        const serverMessage = errSingular?.response?.data?.message || errPlural?.response?.data?.message;
        throw new Error(serverMessage || "Falha ao buscar template de equipamentos.");
      }
    }
  }

}
