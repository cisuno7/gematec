// file: src/Services/MenuService.ts
import apiClient from "../Context/ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuItem } from "../Models/MenuItem";

export default class MenuService {
    static async fetchDynamicMenu(): Promise<MenuItem[]> {
        try {
            const accessToken = await AsyncStorage.getItem("access_token");
            console.log("[MenuService] access_token usado para buscar menu:", accessToken);
            if (!accessToken) {
                throw new Error("Token de acesso não encontrado.");
            }

            const endpoint = `/me/menu?app=mobile`;

            console.log("[MenuService] Buscando menu dinâmico do endpoint:", endpoint);

            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.get(endpoint);

            console.log("[MenuService] Resposta do menu dinâmico:", response.data);
            const menuData: MenuItem[] = response.data;
            return menuData;
        } catch (error: any) {
            console.error("[MenuService] Erro ao buscar menu dinâmico:", error);
            if (error.response?.status === 404) {
                throw new Error("Endpoint de menu não encontrado. Verifique a configuração do servidor.");
            }
            throw new Error("Não foi possível carregar o menu. Tente novamente mais tarde.");
        }
    }
}
