import { Equipment } from '../Models/Equipament';
import EquipmentTemplateModel from '../Models/EquipmentTemplate';
import apiClient, { EquipmentLock } from "../Context/ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Contador global de operações simultâneas
let activeOperations = new Map<string, number>();

function incrementOperation(equipmentId: string) {
  const key = `equipment_${equipmentId}`;
  const current = activeOperations.get(key) || 0;
  const newCount = current + 1;
  activeOperations.set(key, newCount);

  console.log(`[EquipmentService] 🔢 Operações simultâneas para ${equipmentId}: ${newCount}`);
  if (newCount > 1) {
    console.error(`[EquipmentService] ⚠️ ALERTA: ${newCount} operações simultâneas para equipamento ${equipmentId}!`);
  }

  return newCount;
}

function decrementOperation(equipmentId: string) {
  const key = `equipment_${equipmentId}`;
  const current = activeOperations.get(key) || 0;
  const newCount = Math.max(0, current - 1);
  activeOperations.set(key, newCount);

  console.log(`[EquipmentService] 🔢 Operação finalizada para ${equipmentId}, restantes: ${newCount}`);
  return newCount;
}

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
  ): Promise<{ results: Equipment[]; count: number; links?: { next: string | null; previous: string | null } }> {
    try {
      console.log("[EquipmentService] Iniciando busca de equipamentos com filtros:", filters);

      const query: any = {};
      if (filters.search) query.search = filters.search;
      // Parametrização alinhada ao backend: *_id e is_active
      if (filters.equipmentType) {
        const eqTypeId = Number(filters.equipmentType);
        query.equipment_type_id = Number.isNaN(eqTypeId) ? filters.equipmentType : eqTypeId;
      }
      if (filters.brand) {
        const brandId = Number(filters.brand);
        query.brand_id = Number.isNaN(brandId) ? filters.brand : brandId;
      }
      if (filters.status) {
        if (filters.status === 'active') query.is_active = true;
        else if (filters.status === 'inactive') query.is_active = false;
      }
      if (filters.sector_id) query.sector_id = filters.sector_id;
      if (filters.client_id) query.client_id = filters.client_id;
      if (filters.subsector_id) query.subsector_id = filters.subsector_id;
      if (filters.page) query.page = filters.page;
      if (filters.per_page) query.per_page = filters.per_page;

      console.log("[EquipmentService] GET /equipments com params:", query);

      const response = await apiClient.get('/equipments', {
        headers: { Authorization: `Bearer ${token}` },
        params: query,
      });

      const payload = response.data;
      const results: any[] = Array.isArray(payload)
        ? payload
        : (payload?.results || payload?.data || []);
      const count: number = typeof payload?.count === 'number' ? payload.count : results.length;
      const links = payload?.links || { next: null, previous: null };

      console.log("[EquipmentService] Resposta normalizada:", { results_len: results.length, count });
      return { results, count, links };
    } catch (error: any) {
      console.error("[EquipmentService] Erro ao buscar equipamentos:", error?.message || error);
      const status = error.response?.status;
      const dataType = typeof error.response?.data;
      const dataPreview = dataType === 'string' ? (error.response?.data as string).slice(0, 200) + '... [truncado]' : '[objeto]';
      console.error("[EquipmentService] Status:", status, "Dados (preview):", error.response?.data ? dataPreview : undefined);

      // Fallback para paginação diferente: trocar page_size -> per_page se 500
      if (status === 500) {
        try {
          console.log("[EquipmentService] Tentando fallback invertendo page_size->per_page...");
          const queryFallback: any = { ...((error.config?.params) || {}) };
          if (queryFallback.page_size && !queryFallback.per_page) {
            queryFallback.per_page = queryFallback.page_size;
            delete queryFallback.page_size;
          }
          const retry = await apiClient.get('/equipments', {
            headers: { Authorization: `Bearer ${token}` },
            params: queryFallback,
          });
          console.log("[EquipmentService] Fallback bem-sucedido. count:", retry.data?.count);
          return retry.data;
        } catch (retryErr: any) {
          console.error("[EquipmentService] Fallback com page_size falhou:", retryErr?.response?.status || retryErr?.message);
        }
      }

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
      console.log("[EquipmentService] ===== INICIANDO UPDATE EQUIPAMENTO =====");
      console.log("[EquipmentService] ID do Equipamento:", equipmentId);
      console.log("[EquipmentService] Payload recebido (tipo):", typeof data);
      console.log("[EquipmentService] Payload tem additional_fields?:", !!data?.additional_fields);
      console.log("[EquipmentService] Tipo de additional_fields:", typeof data?.additional_fields);

      // Log detalhado do payload antes de enviar
      console.log("[EquipmentService] Payload recebido para update:", JSON.stringify(data, null, 2));

      // Validar que additional_fields seja objeto simples conforme Postman.md
      if (data && data.additional_fields) {
        console.log("[EquipmentService] Additional fields antes da sanitização:", data.additional_fields);
        // Manter como está - sem conversão para JSON string
      }

      // Garantir que additional_fields sempre exista (campo obrigatório no backend)
      if (!data.additional_fields) {
        console.warn("[EquipmentService] additional_fields estava ausente, adicionando objeto vazio");
        data.additional_fields = {};
      }

      // Incrementa contador de operações simultâneas
      incrementOperation(equipmentId);

      // Adquire lock para evitar concorrência
      console.log("[EquipmentService] 🔒 Tentando adquirir lock para equipamento", equipmentId);
      console.log("[EquipmentService] Status do lock antes de adquirir:", EquipmentLock.isLocked(equipmentId));
      console.log("[EquipmentService] Timestamp da tentativa:", new Date().toISOString());

      const lockAcquired = await EquipmentLock.acquire(equipmentId, 30000); // 30 segundos de timeout
      console.log("[EquipmentService] Resultado da aquisição de lock:", lockAcquired);

      if (!lockAcquired) {
        console.error("[EquipmentService] ❌ FALHA: Não foi possível adquirir lock para equipamento", equipmentId);
        throw new Error(`Não foi possível adquirir lock para equipamento ${equipmentId}`);
      }

      console.log("[EquipmentService] ✅ Lock confirmado, iniciando operação para equipamento", equipmentId);
      console.log("[EquipmentService] Status do lock após aquisição:", EquipmentLock.isLocked(equipmentId));

      try {
        // Log detalhado do payload sendo enviado
        console.log("[EquipmentService] === 🚀 PAYLOAD ENVIADO PARA BACK-END ===");
        console.log("[EquipmentService] 📦 Payload completo:", JSON.stringify(data, null, 2));
        console.log("[EquipmentService] 📋 Estrutura detalhada:");
        console.log("  🔹 client_id:", data.client_id, "(tipo:", typeof data.client_id, ")");
        console.log("  🔹 sector_id:", data.sector_id, "(tipo:", typeof data.sector_id, ")");
        console.log("  🔹 brand_id:", data.brand_id, "(tipo:", typeof data.brand_id, ")");
        console.log("  🔹 equipment_type_id:", data.equipment_type_id, "(tipo:", typeof data.equipment_type_id, ")");
        console.log("  🔹 tag:", data.tag, "(tipo:", typeof data.tag, ")");
        console.log("  🔹 additional_fields:", data.additional_fields ? "PRESENTE" : "NULO");

        if (data.additional_fields) {
          console.log("  📋 Conteúdo additional_fields:");
          Object.keys(data.additional_fields).forEach(key => {
            console.log(`    • ${key}:`, data.additional_fields[key], "(tipo:", typeof data.additional_fields[key], ")");
          });
        } else {
          console.log("  📋 additional_fields: vazio/null");
        }

        console.log("[EquipmentService] 🔗 URL da requisição: PUT /equipments/" + equipmentId);
        console.log("[EquipmentService] ⏰ Timestamp:", new Date().toISOString());
        console.log("[EquipmentService] === 🏁 FIM PAYLOAD ===");

        console.log("[EquipmentService] ===== ANTES DA REQUISIÇÃO PUT =====");
        console.log("[EquipmentService] Payload final tem additional_fields?:", !!data?.additional_fields);
        console.log("[EquipmentService] Payload keys:", Object.keys(data));

        const response = await apiClient.put(`/equipments/${equipmentId}`, data, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        console.log("[EquipmentService] ✅ Equipamento atualizado com sucesso:", response.data);
        console.log("[EquipmentService] 🔓 Liberando lock para equipamento", equipmentId);
        return response.data;
      } finally {
        // Sempre libera o lock
        console.log("[EquipmentService] 🔓 Finalizando - liberando lock para equipamento", equipmentId);
        EquipmentLock.release(equipmentId);
        console.log("[EquipmentService] ✅ Lock liberado com sucesso");

        // Decrementa contador de operações simultâneas
        decrementOperation(equipmentId);
      }
    } catch (error: any) {
      console.error("[EquipmentService] ❌ Erro ao atualizar equipamento:", error);

      // Libera lock em caso de erro também
      console.log("[EquipmentService] 🔓 Liberando lock devido a erro para equipamento", equipmentId);
      EquipmentLock.release(equipmentId);
      console.log("[EquipmentService] ✅ Lock liberado após erro");

      // Decrementa contador de operações simultâneas em caso de erro
      decrementOperation(equipmentId);

      if (error.response) {
        const status = error.response.status;
        const url = (error.config && (error.config as any).url) || "(sem URL)";
        const serverData = error.response.data;
        console.error("[EquipmentService] Erro no servidor:", { status, url, data: serverData });

        // Extrair mensagem útil do backend
        let serverMessage: string | undefined =
          serverData?.message || serverData?.error || serverData?.detail;

        // Tentar consolidar mensagens de validação
        if (!serverMessage && serverData && typeof serverData === 'object') {
          try {
            const errorsObj = serverData.errors || serverData?.non_field_errors || serverData?.data;
            if (errorsObj && typeof errorsObj === 'object') {
              const parts: string[] = [];
              Object.keys(errorsObj).forEach((k) => {
                const val = errorsObj[k];
                if (Array.isArray(val)) parts.push(`${k}: ${val.join(', ')}`);
                else if (typeof val === 'string') parts.push(`${k}: ${val}`);
              });
              if (parts.length) serverMessage = parts.join(' | ');
            }
          } catch { }
        }

        if (status === 404) {
          throw new Error(serverMessage || "Equipamento não encontrado.");
        } else if (status === 401) {
          throw new Error(serverMessage || "Token de acesso inválido ou expirado.");
        } else if (status === 400 || status === 422) {
          throw new Error(serverMessage || "Dados inválidos ao atualizar equipamento.");
        } else if (status === 500) {
          console.error("Detalhes do erro 500:", error.response.data);
          // Repassa o erro original para permitir fallback no chamador
          throw error;
        } else {
          throw new Error(serverMessage || `Erro inesperado no servidor (status ${status}) na URL ${url}.`);
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

  /**
   * Busca o template atual vinculado a um tipo de equipamento específico
   * Endpoint conforme tarefas.md: GET /api/equipment_types/:equipment_type_id/templates/current
   */
  static async getEquipmentTemplateByEquipmentType(equipmentTypeId: number, token: string): Promise<EquipmentTemplateModel> {
    try {
      console.log(`[EquipmentService] Buscando template por tipo de equipamento: ${equipmentTypeId}`);
      const response = await apiClient.get(`/equipment_types/${equipmentTypeId}/templates/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("[EquipmentService] Template por tipo recebido:", response.data);
      return new EquipmentTemplateModel(response.data);
    } catch (error: any) {
      console.error("[EquipmentService] Erro ao buscar template por tipo de equipamento:", error?.response?.status, error?.message);
      const serverMessage = error?.response?.data?.message || error?.message;
      throw new Error(serverMessage || "Falha ao buscar template por tipo de equipamento.");
    }
  }

}
