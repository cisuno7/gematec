// src/Services/ManualService.ts
import apiClient from "../Context/ApiClient";
import { setDynamicApiUrl } from "../config/apiConfig";
import { Category, Manual } from "../Models/Manual";
import { jwtDecode } from "jwt-decode";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";

interface FetchManualsParams {
    accessToken: string;
    page: number;
    perPage: number;
    search?: string;
    categoryId?: number;
}

export default class ManualService {
    static async getDynamicBaseUrl(accessToken: string): Promise<string> {
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

    static async checkFileOpenCapability(fileExtension: string): Promise<boolean> {
        try {
            // Verificar se há aplicativos disponíveis para abrir o tipo de arquivo
            const testUrl = `file://test.${fileExtension}`;
            const canOpen = await Linking.canOpenURL(testUrl);
            console.log(`[ManualService] Verificando capacidade de abrir arquivos .${fileExtension}:`, canOpen);
            return canOpen;
        } catch (error) {
            console.warn(`[ManualService] Erro ao verificar capacidade de abrir .${fileExtension}:`, error);
            return false;
        }
    }

    static async downloadManual(manualUrl: string, accessToken: string, manualName?: string): Promise<string> {
        try {
            // Construir URL completa se for relativa
            let fullUrl = manualUrl;
            if (!manualUrl.startsWith('http')) {
                const dynamicBaseUrl = await ManualService.getDynamicBaseUrl(accessToken);
                fullUrl = `${dynamicBaseUrl}${manualUrl.startsWith('/') ? '' : '/'}${manualUrl}`;
            }

            console.log("[ManualService] Tentando baixar de:", fullUrl);

            // Gerar nome do arquivo baseado no nome do manual ou URL
            const originalFilename = manualUrl.split('/').pop() || 'manual.pdf';
            const fileExtension = originalFilename.split('.').pop() || 'pdf';
            const safeManualName = manualName ? manualName.replace(/[^a-zA-Z0-9]/g, '_') : 'manual';
            const filename = `${safeManualName}.${fileExtension}`;

            // Salvar no diretório de documentos da aplicação
            const fileUri = FileSystem.documentDirectory + filename;

            console.log("[ManualService] Salvando arquivo como:", filename);
            console.log("[ManualService] Caminho completo:", fileUri);

            const downloadResumable = FileSystem.createDownloadResumable(
                fullUrl,
                fileUri,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'User-Agent': 'Mozilla/5.0 (compatible; GematecApp/1.0)',
                        'Accept': '*/*',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive'
                    },
                }
            );

            const downloadResult = await downloadResumable.downloadAsync();
            if (!downloadResult || !downloadResult.uri) {
                throw new Error("Download do manual falhou ou foi cancelado.");
            }

            console.log("[ManualService] Download concluído em:", downloadResult.uri);

            // Verificar se o arquivo foi realmente salvo
            const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
            if (!fileInfo.exists) {
                throw new Error("Arquivo não foi salvo corretamente.");
            }

            console.log("[ManualService] Arquivo salvo com sucesso. Tamanho:", fileInfo.size, "bytes");

            // Tentar abrir o arquivo com múltiplas estratégias
            let fileOpened = false;

            // Estratégia 1: Tentar compartilhar o arquivo
            try {
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                    console.log("[ManualService] Tentando compartilhar arquivo...");
                    await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: `application/${fileExtension}`,
                        dialogTitle: `Manual: ${manualName || 'Documento'}`,
                    });
                    console.log("[ManualService] Arquivo compartilhado com sucesso");
                    fileOpened = true;
                } else {
                    console.log("[ManualService] Compartilhamento não disponível nesta plataforma");
                }
            } catch (shareError) {
                console.warn("[ManualService] Erro ao compartilhar arquivo:", shareError);
            }

            // Estratégia 2: Tentar abrir com aplicativo nativo
            if (!fileOpened) {
                try {
                    console.log("[ManualService] Tentando abrir arquivo com aplicativo nativo...");
                    const canOpen = await Linking.canOpenURL(downloadResult.uri);
                    if (canOpen) {
                        await Linking.openURL(downloadResult.uri);
                        console.log("[ManualService] Arquivo aberto com aplicativo nativo");
                        fileOpened = true;
                    } else {
                        console.log("[ManualService] Nenhum aplicativo disponível para abrir o arquivo");
                    }
                } catch (linkError) {
                    console.warn("[ManualService] Erro ao abrir arquivo com aplicativo nativo:", linkError);
                }
            }

            // Estratégia 3: Tentar abrir com file:// URL
            if (!fileOpened) {
                try {
                    console.log("[ManualService] Tentando abrir com file:// URL...");
                    const fileUrl = `file://${downloadResult.uri}`;
                    const canOpen = await Linking.canOpenURL(fileUrl);
                    if (canOpen) {
                        await Linking.openURL(fileUrl);
                        console.log("[ManualService] Arquivo aberto com file:// URL");
                        fileOpened = true;
                    } else {
                        console.log("[ManualService] Não foi possível abrir com file:// URL");
                    }
                } catch (fileError) {
                    console.warn("[ManualService] Erro ao abrir com file:// URL:", fileError);
                }
            }

            // Se nenhuma estratégia funcionou, tentar abrir no navegador
            if (!fileOpened) {
                try {
                    console.log("[ManualService] Tentando abrir arquivo no navegador...");
                    await Linking.openURL(fullUrl);
                    console.log("[ManualService] Arquivo aberto no navegador");
                    fileOpened = true;
                } catch (browserError) {
                    console.warn("[ManualService] Erro ao abrir no navegador:", browserError);
                    console.log("[ManualService] Nenhuma estratégia de abertura funcionou. Arquivo salvo em:", downloadResult.uri);
                }
            }

            // Enviar notificação local
            try {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "Download Concluído",
                        body: `Manual "${manualName || 'Documento'}" foi baixado com sucesso.`,
                        data: { fileUri: downloadResult.uri },
                    },
                    trigger: null, // Notificação imediata
                });
                console.log("[ManualService] Notificação enviada");
            } catch (notificationError) {
                console.warn("[ManualService] Erro ao enviar notificação:", notificationError);
                // Não falha o download se a notificação falhar
            }

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