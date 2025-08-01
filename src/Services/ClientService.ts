import axios from 'axios';
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

      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const endpoint = `${dynamicBaseUrl}/clients`;
      console.log("[ClientService] Endpoint completo:", endpoint);
      console.log("[ClientService] Account name:", accountName);
      console.log("[ClientService] Dynamic base URL:", dynamicBaseUrl);

      const params = {
        has_contract: hasContract.toString(),
        page: page.toString(),
        search: searchQuery,
        include: "sectors,addresses",
      };

      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };
      console.log("[ClientService] Iniciando requisição com os seguintes parâmetros:");
      console.log("Parâmetros:", params);
      console.log("Headers:", headers);
      console.log("[ClientService] URL completa:", `${endpoint}?${new URLSearchParams(params).toString()}`);

      const response = await apiClient.get(endpoint, { params, headers });
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

      const response = await apiClient.get(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log("[ClientService] Contratos do cliente recebidos:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[ClientService] Erro ao buscar contratos do cliente:", error);
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

      const response = await apiClient.get(endpoint, {
        params,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log("[ClientService] Resposta completa dos setores:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[ClientService] Erro ao buscar setores do cliente:", error);
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

}
