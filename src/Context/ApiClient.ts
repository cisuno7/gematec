// file: src/Context/ApiClient.ts
import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setDynamicApiUrl } from "../config/apiConfig";
// import jwtDecode from "jwt-decode"; // Remova esta linha se não for usada em outro lugar neste arquivo

const apiClient = axios.create({
    timeout: 10000,
});

apiClient.interceptors.request.use(
    async (config) => {
        console.log('[ApiClient] ==> INÍCIO DA REQUISIÇÃO <==');
        console.log('[ApiClient] Config original:', {
            baseURL: config.baseURL,
            url: config.url,
            method: config.method,
            params: config.params,
        });

        const accessToken = await AsyncStorage.getItem("access_token");
        if (accessToken) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${accessToken}`;
            // Set dynamic base URL
            // const decodedToken: any = jwtDecode(accessToken); // Remova esta linha
            const accountName = await AsyncStorage.getItem("account") || "default"; // Obtenha o nome da conta do AsyncStorage
            config.baseURL = await setDynamicApiUrl(accountName);
        }

        console.log('[ApiClient] Configuração final:', {
            baseURL: config.baseURL,
            url: config.url,
            method: config.method,
            params: config.params,
            hasAuth: !!accessToken,
        });
        console.log('[ApiClient] ==> FIM DA CONFIGURAÇÃO <==');

        return config;
    },
    (error) => {
        console.error('[ApiClient] Erro no interceptor de requisição:', error);
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        console.log('[ApiClient] Resposta bem-sucedida para:', response.config.url);
        return response;
    },
    async (error: AxiosError) => {
        console.error('[ApiClient] ==> ERRO NA RESPOSTA <==');
        console.error('[ApiClient] Status:', error.response?.status);
        console.error('[ApiClient] URL que falhou:', error.config?.url);
        console.error('[ApiClient] BaseURL:', error.config?.baseURL);
        console.error('[ApiClient] Mensagem:', error.message);
        if (error.request) {
            console.error('[ApiClient] Detalhes da requisição que falhou:', {
                url: error.request._url || error.request.url,
                method: error.request._method || error.config?.method,
                response: error.request._response,
            });
        }

        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Verifica se é um erro 401 e se não é uma requisição de token
        const isTokenRequest = originalRequest.url?.includes('/token') ||
            originalRequest.url?.includes('/token/refresh') ||
            originalRequest.url?.includes('/login');

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !isTokenRequest
        ) {
            console.log("[ApiClient] Token expirado, tentando renovar...");
            console.log("[ApiClient] URL da requisição original:", originalRequest.url);

            originalRequest._retry = true;
            try {
                console.log("[ApiClient] Chamando refreshAccessToken...");
                const newAccessToken = await refreshAccessToken();

                if (!newAccessToken) {
                    console.error("[ApiClient] Nenhum token recebido do refresh");
                    throw new Error("Falha ao renovar o token. Faça login novamente.");
                }

                console.log("[ApiClient] Novo token recebido, salvando...");
                await AsyncStorage.setItem("access_token", newAccessToken);

                console.log("[ApiClient] Reenviando requisição original com novo token...");
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                return apiClient(originalRequest);
            } catch (refreshError: any) {
                console.error("[ApiClient] Erro ao renovar token:", refreshError);
                console.error("[ApiClient] Limpando tokens do AsyncStorage...");

                await AsyncStorage.removeItem("access_token");
                await AsyncStorage.removeItem("refresh_token");
                await AsyncStorage.removeItem("account");

                throw new Error("Sessão expirada. Faça login novamente.");
            }
        }

        return Promise.reject(error);
    }
);

const refreshAccessToken = async () => {
    try {
        console.log("[refreshAccessToken] Iniciando renovação do token...");

        const refreshToken = await AsyncStorage.getItem("refresh_token");
        if (!refreshToken) {
            console.error("[refreshAccessToken] Refresh token não encontrado no AsyncStorage");
            throw new Error("Refresh token não encontrado.");
        }

        console.log("[refreshAccessToken] Refresh token encontrado, tentando renovar...");

        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await setDynamicApiUrl(accountName);

        console.log("[refreshAccessToken] URL para refresh:", `${dynamicBaseUrl}/token/refresh/`);
        console.log("[refreshAccessToken] Account:", accountName);
        console.log("[refreshAccessToken] URL base completa:", dynamicBaseUrl);

        // Tenta primeiro com barra no final, se falhar tenta sem
        let response;
        try {
            console.log("[refreshAccessToken] Tentando com /token/refresh/");
            response = await axios.post(
                `${dynamicBaseUrl}/token/refresh/`,
                { refresh: refreshToken },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 10000,
                }
            );
        } catch (firstError: any) {
            if (firstError.response?.status === 404) {
                console.log("[refreshAccessToken] Endpoint com / não encontrado, tentando sem /");
                response = await axios.post(
                    `${dynamicBaseUrl}/token/refresh`,
                    { refresh: refreshToken },
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        timeout: 10000,
                    }
                );
            } else {
                throw firstError;
            }
        }

        console.log("[refreshAccessToken] Resposta do servidor:", {
            status: response.status,
            hasAccess: !!response.data.access,
            hasRefresh: !!response.data.refresh
        });

        const { access, refresh: newRefreshToken } = response.data;

        if (!access) {
            throw new Error("Token de acesso não recebido na resposta.");
        }

        if (newRefreshToken) {
            await AsyncStorage.setItem("refresh_token", newRefreshToken);
            console.log("[refreshAccessToken] Novo refresh token salvo");
        }

        console.log("[refreshAccessToken] Token renovado com sucesso");
        return access;
    } catch (error: any) {
        console.error("[refreshAccessToken] Erro ao renovar token:", error);

        if (error.response) {
            console.error("[refreshAccessToken] Detalhes do erro:", {
                status: error.response.status,
                data: error.response.data,
                url: error.config?.url
            });
        }

        throw error;
    }
};

// Função de teste para debug (remover em produção)
export const testTokenRefresh = async () => {
    try {
        console.log("[TEST] Iniciando teste de refresh de token...");
        const result = await refreshAccessToken();
        console.log("[TEST] Refresh bem-sucedido:", !!result);
        return result;
    } catch (error) {
        console.error("[TEST] Erro no teste de refresh:", error);
        throw error;
    }
};

export default apiClient;
