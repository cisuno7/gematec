// src/Services/ManualService.ts
import apiClient from "../Context/ApiClient";
import { setDynamicApiUrl } from "../config/apiConfig";
import { Category, Manual } from "../Models/Manual";
import { jwtDecode } from "jwt-decode";
import * as FileSystem from "expo-file-system";

interface FetchManualsParams {
    accessToken: string;
    page: number;
    perPage: number;
    search?: string;
    categoryId?: number;
}

export default class ManualService {
    private static async getDynamicBaseUrl(accessToken: string): Promise<string> {
        const decodedToken: any = jwtDecode(accessToken);
        const accountName = decodedToken?.account_name || "default";
        return await setDynamicApiUrl(accountName); // Corrigido para setDynamicApiUrl e usa await
    }

    static async fetchManuals({
        accessToken,
        page,
        perPage,
        search,
        categoryId,
    }: FetchManualsParams): Promise<{ results: Manual[]; count: number }> {
        try {
            const dynamicBaseUrl = await ManualService.getDynamicBaseUrl(accessToken); // Usa await
            console.log("[ManualService] Fazendo requisição para:", `${dynamicBaseUrl}/manuals`);
            const params = new URLSearchParams({
                per_page: perPage.toString(),
                page: page.toString(),
            });

            if (search) params.append("search", search);
            if (categoryId) params.append("category_id", categoryId.toString());

            const url = `/manuals?${params.toString()}`;
            const response = await apiClient.get(url, {
                baseURL: dynamicBaseUrl,
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            // Handle array response or paginated response
            const data = Array.isArray(response.data)
                ? { results: response.data, count: response.data.length }
                : response.data;
            return {
                results: data.results || data,
                count: data.count || data.length || 0,
            };
        } catch (error: any) {
            console.error("[ManualService] Erro ao buscar manuais:", {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });
            if (error.response?.status === 403) {
                throw new Error("Você não tem permissão para visualizar manuais.");
            }
            throw new Error("Erro ao buscar manuais.");
        }
    }

    static async fetchManualDetails(accessToken: string, manualId: number): Promise<Manual> {
        try {
            const dynamicBaseUrl = await ManualService.getDynamicBaseUrl(accessToken); // Usa await
            console.log("[ManualService] Fazendo requisição para:", `${dynamicBaseUrl}/manuals/${manualId}`);
            const url = `/manuals/${manualId}`;
            const response = await apiClient.get(url, {
                baseURL: dynamicBaseUrl,
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return response.data;
        } catch (error: any) {
            console.error("[ManualService] Erro ao buscar detalhes do manual:", {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });
            if (error.response?.status === 403) {
                throw new Error("Você não tem permissão para visualizar detalhes do manual.");
            }
            throw new Error("Erro ao buscar detalhes do manual.");
        }
    }

    static async fetchCategories(accessToken: string): Promise<Category[]> {
        try {
            const dynamicBaseUrl = await ManualService.getDynamicBaseUrl(accessToken); // Usa await
            console.log("[ManualService] Fazendo requisição para:", `${dynamicBaseUrl}/manual_categories`);
            const url = `/manual_categories`;
            const response = await apiClient.get(url, {
                baseURL: dynamicBaseUrl,
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return Array.isArray(response.data) ? response.data : response.data.results || [];
        } catch (error: any) {
            console.error("[ManualService] Erro ao buscar categorias:", {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });
            if (error.response?.status === 403) {
                throw new Error("Você não tem permissão para visualizar categorias de manuais.");
            }
            throw new Error("Erro ao buscar categorias.");
        }
    }

    static async downloadManual(manualUrl: string, accessToken: string): Promise<string> {
        try {
            const filename = manualUrl.split('/').pop() || 'manual.pdf';
            const fileUri = FileSystem.documentDirectory + filename;

            const downloadResumable = FileSystem.createDownloadResumable(
                manualUrl,
                fileUri,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            const downloadResult = await downloadResumable.downloadAsync();
            if (!downloadResult || !downloadResult.uri) {
                throw new Error("Download do manual falhou ou foi cancelado.");
            }
            console.log("[ManualService] Download concluído em:", downloadResult.uri);
            return downloadResult.uri as string;
        } catch (error: any) {
            console.error("[ManualService] Erro ao baixar manual:", {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });
            throw new Error(`Erro ao baixar manual: ${error.message || 'Erro desconhecido'}`);
        }
    }
}