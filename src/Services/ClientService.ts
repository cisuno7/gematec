import apiClient from "../Context/ApiClient";
import Client from '../Models/Clientes';
import { setDynamicApiUrl } from "../config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
export default class ClientService {

  static async getClients(
    hasContract: boolean,
    page: number,
    accessToken: string,
    searchQuery: string = ""
  ) {
    try {

      if (!accessToken) {
        console.error("[ClientService] Token de acesso ausente.");
        throw new Error("Token de acesso ausente.");
      }

      console.log("[ClientService] Buscando clientes com apiClient automático");

      const params = {
        has_contract: hasContract.toString(),
        page: page.toString(),
        // padroniza paginação para evitar 'Invalid page' por discrepância de page_size
        per_page: 10,
        page_size: 10,
        search: searchQuery,
        include: "sectors,addresses",
      };

      console.log("[ClientService] Iniciando requisição com os seguintes parâmetros:");
      console.log("Parâmetros:", params);

      // apiClient já configura automaticamente a URL dinâmica e Authorization
      const response = await apiClient.get('/clients', { params });
      console.log("[ClientService] Dados recebidos:", response.data);
      const clientList = response.data.results.map((data: any) => new Client(data));
      return {
        results: clientList,
        count: response.data.count,
        total_pages: Math.ceil(response.data.count / 10) || 1,
      };
    } catch (error: any) {
      console.error("[ClientService] Erro ao buscar clientes:", error.message || error);
      console.error("[ClientService] Status do erro:", error.response?.status);
      console.error("[ClientService] Status text:", error.response?.statusText);
      if (error.response) {
        console.error("[ClientService] Resposta do servidor:", error.response.data);
        console.error("[ClientService] Headers da resposta:", error.response.headers);
      } else if (error.request) {
        console.error("[ClientService] Nenhuma resposta recebida do servidor.", error.request);
      } else {
        console.error("[ClientService] Erro ao configurar requisição:", error.message);
      }
      throw error;
    }
  }

  static async getClientDetails(clientId: number, accessToken: string) {
    try {
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const endpoint = `${dynamicBaseUrl}/clients/${clientId}`;
      console.log("[ClientService] Buscando detalhes do cliente...");
      console.log("[ClientService] Endpoint:", endpoint);
      console.log("[ClientService] Token de Acesso:", accessToken ? "Token recebido" : "Token não fornecido");

      const response = await apiClient.get(endpoint, {
        params: {
          include: "sectors,addresses",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log("[ClientService] Detalhes do cliente recebidos:", response.data);
      return new Client(response.data);
    } catch (error: any) {
      console.error("[ClientService] Erro ao buscar detalhes do cliente:", error);

      if (error.response) {
        console.error("[ClientService] Resposta do Servidor:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
      } else if (error.request) {
        console.error("[ClientService] Nenhuma resposta recebida:", error.request);
      } else {
        console.error("[ClientService] Erro na configuração da requisição:", error.message);
      }

      throw new Error("Erro ao conectar ao servidor.");
    }
  }

  static async getClientContracts(clientId: string, accessToken: string) {
    try {
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const endpoint = `${dynamicBaseUrl}/clients/${clientId}/contracts`;
      console.log("[ClientService] Obtendo contratos do cliente...");
      console.log("[ClientService] Endpoint:", endpoint);
      console.log("[ClientService] Client ID:", clientId);

      const response = await apiClient.get(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      console.log("[ClientService] Contratos do cliente recebidos:", response.data);
      console.log("[ClientService] Estrutura da resposta:", {
        hasResults: !!response.data.results,
        resultsLength: response.data.results?.length || 0,
        count: response.data.count,
        isArray: Array.isArray(response.data.results)
      });

      // Log detalhado de cada contrato
      if (response.data.results && Array.isArray(response.data.results)) {
        response.data.results.forEach((contract: any, index: number) => {
          console.log(`[ClientService] ===== CONTRATO ${index + 1} =====`);
          console.log(`[ClientService] ID:`, contract.id);
          console.log(`[ClientService] Start Date:`, contract.start_date, `(tipo: ${typeof contract.start_date})`);
          console.log(`[ClientService] End Date:`, contract.end_date, `(tipo: ${typeof contract.end_date})`);
          console.log(`[ClientService] Activity Frequency in Days:`, contract.activity_frequency_in_days, `(tipo: ${typeof contract.activity_frequency_in_days})`);

          // Análise da frequência em dias
          if (contract.activity_frequency_in_days) {
            console.log(`[ClientService] ✅ Frequência em dias:`, contract.activity_frequency_in_days);
          } else {
            console.log(`[ClientService] ❌ Activity Frequency in Days é null/undefined/vazio`);
          }

          console.log(`[ClientService] ===== FIM CONTRATO ${index + 1} =====`);

          // Validar e limpar dados se necessário
          if (contract.start_date === null || contract.start_date === undefined || contract.start_date === "") {
            console.warn(`[ClientService] ⚠️ Contrato ${index + 1} tem start_date inválido:`, contract.start_date);
          }
          if (contract.end_date === null || contract.end_date === undefined || contract.end_date === "") {
            console.warn(`[ClientService] ⚠️ Contrato ${index + 1} tem end_date inválido:`, contract.end_date);
          }
          if (contract.activity_frequency_in_days === null || contract.activity_frequency_in_days === undefined) {
            console.warn(`[ClientService] ⚠️ Contrato ${index + 1} tem activity_frequency_in_days inválido:`, contract.activity_frequency_in_days);
          }
        });
      }

      return response.data;
    } catch (error: any) {
      console.error("[ClientService] Erro ao buscar contratos do cliente:", error);

      // Se o erro for 404 (cliente não tem contratos), retorna estrutura vazia
      if (error.response?.status === 404) {
        console.log("[ClientService] Cliente não possui contratos");
        return { results: [], count: 0 };
      }

      throw new Error("Erro ao obter os contratos do cliente.");
    }
  }

  static async getClientSectors(clientId: string, accessToken: string, level?: number, parentId?: number) {
    try {
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const endpoint = `${dynamicBaseUrl}/clients/${clientId}/sectors`;
      console.log("[ClientService] Obtendo setores do cliente...");
      console.log("[ClientService] Endpoint:", endpoint);

      const params: any = {};
      if (level !== undefined) {
        params.level = level;
      }
      if (parentId !== undefined) {
        params.parent_id = parentId;
      }

      // apiClient já configura automaticamente a URL dinâmica e Authorization
      const response = await apiClient.get(`/clients/${clientId}/sectors`, { params });
      const payload = response.data;
      // Normaliza para o payload do Postman: { links, count, results: [...] }
      const results = Array.isArray(payload) ? payload : (payload?.results || []);
      const count = typeof payload?.count === 'number' ? payload.count : results.length;
      const links = payload?.links || { next: null, previous: null };
      console.log("[ClientService] Setores normalizados:", { results_len: results.length, count });
      return { results, count, links };
    } catch (error: any) {
      console.error("[ClientService] Erro ao buscar setores do cliente:", error);
      const status = error?.response?.status;
      // Tratamento silencioso para erros de servidor (500) ou respostas HTML inesperadas
      if (status >= 500 || typeof error?.response?.data === 'string') {
        console.warn('[ClientService] Retornando lista vazia para setores devido a erro do servidor.');
        return { results: [], count: 0, links: { next: null, previous: null } };
      }
      throw new Error("Erro ao obter os setores do cliente.");
    }
  }

  static async getSectorDetails(clientId: string, sectorId: number, accessToken: string) {
    try {
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const endpoint = `${dynamicBaseUrl}/clients/${clientId}/sectors/${sectorId}`;
      console.log("[ClientService] Obtendo detalhes do setor...");
      console.log("[ClientService] Endpoint:", endpoint);

      const response = await apiClient.get(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log("[ClientService] Detalhes do setor recebidos:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[ClientService] Erro ao buscar detalhes do setor:", error);
      throw new Error("Erro ao obter os detalhes do setor.");
    }
  }

  static async getClientContacts(clientId: string, accessToken: string) {
    try {
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const endpoint = `${dynamicBaseUrl}/clients/${clientId}/contacts`;
      console.log("[ClientService] Obtendo contatos do cliente...");
      console.log("[ClientService] Endpoint:", endpoint);

      const response = await apiClient.get(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log("[ClientService] Contatos do cliente recebidos:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[ClientService] Erro ao buscar contatos do cliente:", error);
      throw new Error("Erro ao obter os contatos do cliente.");
    }
  }

  static async createClientSector(
    clientId: string,
    accessToken: string,
    name: string,
    parentId?: number | null
  ) {
    try {
      const payload = {
        name: name.trim(),
        parent_id: parentId ?? null,
        ignores_auto_activity_mapping: true,
      } as any;

      const response = await apiClient.post(`/clients/${clientId}/sectors`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return response.data;
    } catch (error: any) {
      console.error("[ClientService] Erro ao criar setor:", error);
      throw new Error("Erro ao criar setor.");
    }
  }

  static async getClientAddresses(clientId: string, accessToken: string) {
    try {
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const endpoint = `${dynamicBaseUrl}/clients/${clientId}/addresses`;
      console.log("[ClientService] Obtendo endereços do cliente...");
      console.log("[ClientService] Endpoint:", endpoint);

      const response = await apiClient.get(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log("[ClientService] Endereços do cliente recebidos:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[ClientService] Erro ao buscar endereços do cliente:", error);
      throw new Error("Erro ao obter os endereços do cliente.");
    }
  }

  static async createClient(clientData: {
    name: string;
    email: string;
    document?: string;
    phone?: string;
    company_name?: string;
    company_state_registration?: string;
    company_opening_at?: string | null;
    is_active?: boolean;
    additional_fields?: {
      sector_name?: string;
      subsector_name?: string;
      contact_name?: string;
    };
  }, accessToken: string) {
    try {
      if (!accessToken) {
        console.error("[ClientService] Token de acesso ausente.");
        throw new Error("Token de acesso ausente.");
      }

      console.log("[ClientService] Criando novo cliente:", clientData);

      const payload = {
        name: clientData.name,
        email: clientData.email,
        document: clientData.document || "",
        phone: clientData.phone || "",
        company_name: clientData.company_name || "",
        company_state_registration: clientData.company_state_registration || "",
        company_opening_at: clientData.company_opening_at || null,
        is_active: clientData.is_active !== undefined ? clientData.is_active : true,
        additional_fields: clientData.additional_fields || {}
      };

      const response = await apiClient.post('/clients', payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      console.log("[ClientService] Cliente criado com sucesso:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[ClientService] Erro ao criar cliente:", error);

      if (error.response) {
        console.error("[ClientService] Erro no servidor:");
        console.error('Status:', error.response.status);
        console.error('Dados:', error.response.data);

        if (error.response.status === 400) {
          throw new Error(error.response.data?.message || "Dados inválidos para criação do cliente");
        } else if (error.response.status === 401) {
          throw new Error("Token de acesso inválido ou expirado");
        } else if (error.response.status === 422) {
          const validationErrors = error.response.data?.errors || {};
          const errorMessages = Object.values(validationErrors).flat().join(", ");
          throw new Error(`Erro de validação: ${errorMessages}`);
        } else {
          throw new Error(error.response.data?.message || "Erro inesperado no servidor");
        }
      } else if (error.request) {
        console.error("[ClientService] Erro de rede:", error.request);
        throw new Error("Erro de conexão. Verifique sua internet");
      } else {
        console.error("[ClientService] Erro inesperado:", error.message);
        throw new Error(`Erro inesperado: ${error.message}`);
      }
    }
  }

}
