import apiClient from "../Context/ApiClient";
import { setDynamicApiUrl } from "../config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserPermissions {
  permissions: string[];
}

export default class PermissionsService {
  private static async getDynamicBaseUrl(): Promise<string> {
    const accountName = await AsyncStorage.getItem("account") || "default";
    return await setDynamicApiUrl(accountName);
  }

  static async fetchPermissions(accessToken: string): Promise<string[]> {
    console.log("[PermissionsService] === INÍCIO fetchPermissions ===");
    console.log("[PermissionsService] Token recebido:", accessToken ? "Presente" : "Ausente");

    try {
      const dynamicBaseUrl = await PermissionsService.getDynamicBaseUrl();
      console.log("[PermissionsService] Fazendo requisição para:", `${dynamicBaseUrl}/me/permissions`);
      console.log("[PermissionsService] Token de acesso:", accessToken ? "Presente" : "Ausente");

      console.log("[PermissionsService] Configuração da requisição:", {
        baseURL: dynamicBaseUrl,
        url: "/me/permissions",
        headers: { Authorization: `Bearer ${accessToken.substring(0, 20)}...` }
      });

      const response = await apiClient.get("/me/permissions", {
        baseURL: dynamicBaseUrl,
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      console.log("[PermissionsService] Resposta completa:", response.data);

      // Verificar se as permissões estão em response.data.permissions ou diretamente em response.data
      let permissions: string[] = [];

      if (Array.isArray(response.data)) {
        // Se response.data é diretamente um array de permissões
        permissions = response.data;
        console.log("[PermissionsService] Permissões recebidas (array direto):", permissions);
      } else if (response.data.permissions && Array.isArray(response.data.permissions)) {
        // Se response.data tem uma propriedade permissions
        permissions = response.data.permissions;
        console.log("[PermissionsService] Permissões recebidas (objeto):", permissions);
      } else {
        console.log("[PermissionsService] Formato de resposta inesperado:", response.data);
        permissions = [];
      }

      // Salvar permissões no AsyncStorage
      await PermissionsService.savePermissionsToStorage(permissions);

      return permissions;
    } catch (error: any) {
      console.error("[PermissionsService] Erro ao buscar permissões:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 403) {
        throw new Error("Você não tem permissão para acessar as permissões.");
      }

      throw new Error("Erro ao buscar permissões do usuário.");
    }
  }

  static async savePermissionsToStorage(permissions: string[]): Promise<void> {
    try {
      const permissionsJson = JSON.stringify(permissions);
      console.log("[PermissionsService] Salvando permissões no storage:", permissions.length, "permissões");
      console.log("[PermissionsService] JSON das permissões:", permissionsJson.substring(0, 100) + "...");

      await AsyncStorage.setItem("user_permissions", permissionsJson);
      console.log("[PermissionsService] Permissões salvas no storage local com sucesso");

      // Verificar se foi salvo corretamente
      const savedPermissions = await AsyncStorage.getItem("user_permissions");
      console.log("[PermissionsService] Verificação - permissões salvas:", savedPermissions ? "Sim" : "Não");
    } catch (error) {
      console.error("[PermissionsService] Erro ao salvar permissões no storage:", error);
      throw new Error("Erro ao salvar permissões localmente.");
    }
  }

  static async loadPermissionsFromStorage(): Promise<string[]> {
    try {
      const storedPermissions = await AsyncStorage.getItem("user_permissions");
      if (storedPermissions) {
        const permissions = JSON.parse(storedPermissions);
        console.log("[PermissionsService] Permissões carregadas do storage:", permissions);
        return permissions;
      }
      return [];
    } catch (error) {
      console.error("[PermissionsService] Erro ao carregar permissões do storage:", error);
      return [];
    }
  }

  static async clearPermissionsFromStorage(): Promise<void> {
    try {
      await AsyncStorage.removeItem("user_permissions");
      console.log("[PermissionsService] Permissões removidas do storage local");
    } catch (error) {
      console.error("[PermissionsService] Erro ao limpar permissões do storage:", error);
    }
  }
}
