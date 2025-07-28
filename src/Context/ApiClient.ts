import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "../config/apiConfig";
import AuthService from "../Services/AuthService";

// Função para criar cliente axios dinâmico baseado na conta
const createApiClient = async () => {
    const account = await AsyncStorage.getItem("account");
    if (!account) {
        throw new Error("Conta não encontrada. Faça login novamente.");
    }

    return axios.create({
        baseURL: getApiBaseUrl(account),
        timeout: 10000,
    });
};

// Cliente principal que será usado pela aplicação
const apiClient = axios.create({
    timeout: 10000,
});

// Interceptor para definir a URL base dinamicamente e adicionar token
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const account = await AsyncStorage.getItem("account");
            if (!account) {
                throw new Error("Conta não encontrada. Faça login novamente.");
            }

            // Definir a URL base dinamicamente
            config.baseURL = getApiBaseUrl(account);

            // Adicionar token de acesso se existir
            const accessToken = await AsyncStorage.getItem("access_token");
            if (accessToken) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${accessToken}`;
            }

            return config;
        } catch (error) {
            console.error("[apiClient] Erro no interceptor de request:", error);
            return Promise.reject(error);
        }
    },
    (error) => Promise.reject(error)
);

// Interceptor para lidar com respostas e refresh automático de token
apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Verificar se é erro 401 e se o token precisa ser renovado
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.endsWith('/token')) {
            // Verificar se é o tipo específico de erro de token expirado
            const errorData = error.response?.data as any;
            const isTokenExpiredError = errorData?.errors?.some((err: any) => 
                err.code === 'token_not_valid' && 
                err.attr === 'messages.0.token_type' && 
                err.detail === 'access'
            );

            if (isTokenExpiredError) {
                originalRequest._retry = true;

                try {
                    const newTokens = await refreshAccessToken();
                    if (!newTokens) {
                        throw new Error("Falha ao renovar o token. Faça login novamente.");
                    }

                    await AsyncStorage.setItem("access_token", newTokens.access);
                    if (newTokens.refresh) {
                        await AsyncStorage.setItem("refresh_token", newTokens.refresh);
                    }

                    // Atualizar o header da requisição original
                    if (!originalRequest.headers) {
                        originalRequest.headers = {} as any;
                    }
                    originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;

                    // Retentar a requisição original
                    return apiClient(originalRequest);
                } catch (refreshError) {
                    console.error("[apiClient] Erro ao renovar token:", refreshError);
                    
                    // Limpar tokens e redirecionar para login
                    await AsyncStorage.removeItem("access_token");
                    await AsyncStorage.removeItem("refresh_token");
                    await AsyncStorage.removeItem("account");
                    await AsyncStorage.removeItem("keep_logged_in");
                    
                    // Retornar erro específico para que a aplicação possa lidar
                    const loginError = new Error("Sessão expirada. Faça login novamente.");
                    (loginError as any).code = 'SESSION_EXPIRED';
                    throw loginError;
                }
            }
        }

        return Promise.reject(error);
    }
);

// Função para refresh de token
const refreshAccessToken = async () => {
    try {
        const refreshToken = await AsyncStorage.getItem("refresh_token");
        const account = await AsyncStorage.getItem("account");
        
        if (!refreshToken) {
            throw new Error("Refresh token não encontrado.");
        }

        if (!account) {
            throw new Error("Conta não encontrada.");
        }

        console.log("[refreshAccessToken] Tentando renovar token para conta:", account);

        const response = await AuthService.refreshAccessToken(account, refreshToken);

        console.log("[refreshAccessToken] Token renovado com sucesso");
        return response;
    } catch (error) {
        console.error("[refreshAccessToken] Erro ao renovar token:", error);
        throw error;
    }
};

export default apiClient;