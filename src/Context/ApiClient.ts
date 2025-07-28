import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config/apiConfig";

// Função para validar e corrigir URLs malformadas
const validateAndFixUrl = (url: string): string => {
    console.log('[validateAndFixUrl] URL recebida:', url);
    
    // Se a URL contém o padrão problemático (subdomínio.https://domínio)
    if (url.includes('.https://')) {
        console.log('[validateAndFixUrl] DETECTADO padrão problemático:', url);
        
        // Extrair as partes da URL incorreta
        const parts = url.split('.https://');
        if (parts.length === 2) {
            const subdomain = parts[0].replace(/^https?:\/\//, ''); // Remove protocolo do início se existir
            const domain = parts[1];
            const correctedUrl = `https://${subdomain}.${domain}`;
            console.log('[validateAndFixUrl] URL corrigida:', correctedUrl);
            return correctedUrl;
        }
    }
    
    // Verificar se há duplicação de protocolo
    const duplicateProtocolMatch = url.match(/https?:\/\/.*?https?:\/\//);
    if (duplicateProtocolMatch) {
        console.log('[validateAndFixUrl] DETECTADA duplicação de protocolo:', url);
        const correctedUrl = url.replace(/https?:\/\/.*?https?:\/\//, 'https://');
        console.log('[validateAndFixUrl] URL corrigida (protocolo):', correctedUrl);
        return correctedUrl;
    }
    
    // Se nenhum problema foi detectado, retornar a URL original
    console.log('[validateAndFixUrl] URL está correta:', url);
    return url;
};

// Função específica para corrigir URLs que contêm "jordan.https"
const fixJordanUrl = (url: string): string => {
    if (url.includes('jordan.https://')) {
        console.log('[fixJordanUrl] DETECTADO erro específico do jordan:', url);
        const correctedUrl = url.replace('jordan.https://', 'https://jordan.');
        console.log('[fixJordanUrl] URL corrigida:', correctedUrl);
        return correctedUrl;
    }
    return url;
};

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

// Interceptor de requisição com logs detalhados e correção robusta
apiClient.interceptors.request.use(
    async (config) => {
        console.log('[ApiClient] ==> INÍCIO DA REQUISIÇÃO <==');
        console.log('[ApiClient] Config original:', {
            baseURL: config.baseURL,
            url: config.url,
            method: config.method
        });
        
        // Construir URL completa para análise
        let fullUrl = '';
        if (config.baseURL && config.url) {
            fullUrl = config.baseURL + config.url;
        } else if (config.url) {
            fullUrl = config.url;
        }
        
        console.log('[ApiClient] URL completa original:', fullUrl);
        
        // Aplicar correções específicas
        let correctedUrl = fixJordanUrl(fullUrl);
        correctedUrl = validateAndFixUrl(correctedUrl);
        
        // Se a URL foi corrigida, atualizar a configuração
        if (correctedUrl !== fullUrl && correctedUrl.includes('://')) {
            console.log('[ApiClient] APLICANDO CORREÇÃO DE URL');
            try {
                const urlObj = new URL(correctedUrl);
                config.baseURL = `${urlObj.protocol}//${urlObj.host}`;
                config.url = urlObj.pathname + urlObj.search;
                console.log('[ApiClient] Nova configuração:', {
                    baseURL: config.baseURL,
                    url: config.url
                });
            } catch (urlError) {
                console.error('[ApiClient] Erro ao parsear URL corrigida:', urlError);
            }
        }
        
        // Adicionar token de autorização
        const accessToken = await AsyncStorage.getItem("access_token");
        if (accessToken) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        console.log('[ApiClient] Configuração final:', {
            baseURL: config.baseURL,
            url: config.url,
            method: config.method,
            hasAuth: !!accessToken
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
        
        // Capturar detalhes específicos do erro de rede
        if (error.request) {
            console.error('[ApiClient] Detalhes da requisição que falhou:', {
                url: error.request._url || error.request.url,
                method: error.request._method || error.config?.method,
                response: error.request._response
            });
        }
        
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.endsWith('/token')) {
            originalRequest._retry = true;

            try {
                const newAccessToken = await refreshAccessToken();
                if (!newAccessToken) {
                    throw new Error("Falha ao renovar o token. Faça login novamente.");
                }

                await AsyncStorage.setItem("access_token", newAccessToken);

                if (!originalRequest.headers) {
                    originalRequest.headers = {} as any;
                }
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                return apiClient(originalRequest);
            } catch (refreshError) {
                console.error("[apiClient] Erro ao renovar token:", refreshError);
                await AsyncStorage.removeItem("access_token");
                await AsyncStorage.removeItem("refresh_token");
                throw refreshError;
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

        const response = await axios.post(
            `${API_BASE_URL}/refresh`, // Ajustado
            { refresh_token: refreshToken },
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