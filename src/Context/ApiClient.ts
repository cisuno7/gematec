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

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/token') &&
            !originalRequest.url?.includes('/token/refresh')
        ) {
            originalRequest._retry = true;
            try {
                const newAccessToken = await refreshAccessToken();
                if (!newAccessToken) {
                    throw new Error("Falha ao renovar o token. Faça login novamente.");
                }
                await AsyncStorage.setItem("access_token", newAccessToken);
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                console.error("[apiClient] Erro ao renovar token:", refreshError);
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
        const refreshToken = await AsyncStorage.getItem("refresh_token");
        if (!refreshToken) {
            throw new Error("Refresh token não encontrado.");
        }

        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await setDynamicApiUrl(accountName);

        const response = await axios.post(
            `${dynamicBaseUrl}/token/refresh/`,
            { refresh: refreshToken },
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const { access, refresh: newRefreshToken } = response.data;
        if (newRefreshToken) {
            await AsyncStorage.setItem("refresh_token", newRefreshToken);
        }

        return access;
    } catch (error) {
        console.error("[refreshAccessToken] Erro ao renovar token:", error);
        throw error;
    }
};

export default apiClient;
