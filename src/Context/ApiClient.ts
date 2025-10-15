// file: src/Context/ApiClient.ts
import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setDynamicApiUrl } from "../config/apiConfig";
// import jwtDecode from "jwt-decode"; // Remova esta linha se não for usada em outro lugar neste arquivo

const apiClient = axios.create({
    timeout: 15000, // 15 segundos de timeout
});

// =============== Request Monitor (contagem e listeners) ===============
type RequestEvent = { url?: string; method?: string; baseURL?: string; ts: number };
type ResponseEvent = { url?: string; method?: string; status?: number; ts: number };

// =============== Lock System para evitar concorrência ===============
class EquipmentLock {
    private static locks: Map<string, Promise<any>> = new Map();
    private static lockTimeouts: Map<string, NodeJS.Timeout> = new Map();

    static async acquire(equipmentId: string, timeoutMs: number = 30000): Promise<boolean> {
        const lockKey = `equipment_${equipmentId}`;

        console.log(`[EquipmentLock] 🔍 Verificando lock existente para ${equipmentId}:`, this.locks.has(lockKey));

        // Se já existe um lock ativo, espera ele terminar
        if (this.locks.has(lockKey)) {
            console.log(`[EquipmentLock] ⏳ Aguardando lock liberar para equipamento ${equipmentId}`);
            try {
                const existingLock = this.locks.get(lockKey);
                console.log(`[EquipmentLock] Lock existente encontrado:`, !!existingLock);
                await existingLock;
                console.log(`[EquipmentLock] Lock anterior liberado para ${equipmentId}`);
            } catch (error) {
                console.warn(`[EquipmentLock] Lock anterior falhou para ${equipmentId}:`, error);
            }
        }

        // Verifica novamente após aguardar
        if (this.locks.has(lockKey)) {
            console.error(`[EquipmentLock] ❌ Lock ainda ativo após aguardar para ${equipmentId}`);
            return false;
        }

        console.log(`[EquipmentLock] ✅ Criando novo lock para equipamento ${equipmentId}`);

        // Cria novo lock
        let resolveLock: (value: any) => void;
        let rejectLock: (error: any) => void;

        const lockPromise = new Promise((resolve, reject) => {
            resolveLock = resolve;
            rejectLock = reject;
        });

        this.locks.set(lockKey, lockPromise);

        // Timeout para liberar lock automaticamente
        const timeout = setTimeout(() => {
            console.warn(`[EquipmentLock] ⏰ Timeout - liberando lock para equipamento ${equipmentId}`);
            this.release(equipmentId);
            rejectLock(new Error(`Lock timeout para equipamento ${equipmentId}`));
        }, timeoutMs);

        this.lockTimeouts.set(lockKey, timeout);

        console.log(`[EquipmentLock] 🔒 Lock adquirido com sucesso para equipamento ${equipmentId}`);

        // Retorna imediatamente que o lock foi adquirido
        return true;
    }

    static release(equipmentId: string): void {
        const lockKey = `equipment_${equipmentId}`;

        console.log(`[EquipmentLock] 🔓 Iniciando liberação de lock para ${equipmentId}`);
        console.log(`[EquipmentLock] Timeout existe:`, this.lockTimeouts.has(lockKey));
        console.log(`[EquipmentLock] Lock existe:`, this.locks.has(lockKey));

        if (this.lockTimeouts.has(lockKey)) {
            clearTimeout(this.lockTimeouts.get(lockKey)!);
            this.lockTimeouts.delete(lockKey);
            console.log(`[EquipmentLock] Timeout removido para ${equipmentId}`);
        }

        if (this.locks.has(lockKey)) {
            const lockPromise = this.locks.get(lockKey)!;
            console.log(`[EquipmentLock] Resolvendo promise do lock para ${equipmentId}`);

            // Tenta resolver a promise de diferentes formas
            try {
                if (typeof (lockPromise as any).resolve === 'function') {
                    (lockPromise as any).resolve(true);
                    console.log(`[EquipmentLock] Promise resolvida via .resolve() para ${equipmentId}`);
                } else {
                    // Se não tem .resolve, tenta resolver normalmente
                    console.log(`[EquipmentLock] Promise sem .resolve, tentando resolver normalmente`);
                }
            } catch (error) {
                console.error(`[EquipmentLock] Erro ao resolver promise para ${equipmentId}:`, error);
            }

            this.locks.delete(lockKey);
            console.log(`[EquipmentLock] ✅ Lock completamente liberado para equipamento ${equipmentId}`);
        } else {
            console.warn(`[EquipmentLock] ⚠️ Tentativa de liberar lock inexistente para ${equipmentId}`);
        }

        console.log(`[EquipmentLock] Estado final - locks ativos:`, this.locks.size);
    }

    static isLocked(equipmentId: string): boolean {
        return this.locks.has(`equipment_${equipmentId}`);
    }
}

export { EquipmentLock };

const requestListeners: Array<(ev: RequestEvent) => void> = [];
const responseListeners: Array<(ev: ResponseEvent) => void> = [];

const requestStats = {
    windowStartMs: Date.now(),
    windowSizeMs: 60_000,
    totalInWindow: 0,
    byUrl: new Map<string, number>(),
};

function rotateWindowIfNeeded(now: number) {
    if (now - requestStats.windowStartMs >= requestStats.windowSizeMs) {
        requestStats.windowStartMs = now;
        requestStats.totalInWindow = 0;
        requestStats.byUrl.clear();
    }
}

export function addRequestListener(listener: (ev: RequestEvent) => void) {
    requestListeners.push(listener);
}

export function removeRequestListener(listener: (ev: RequestEvent) => void) {
    const idx = requestListeners.indexOf(listener);
    if (idx >= 0) requestListeners.splice(idx, 1);
}

export function addResponseListener(listener: (ev: ResponseEvent) => void) {
    responseListeners.push(listener);
}

export function removeResponseListener(listener: (ev: ResponseEvent) => void) {
    const idx = responseListeners.indexOf(listener);
    if (idx >= 0) responseListeners.splice(idx, 1);
}

export function getRequestStats() {
    const byUrlObj: Record<string, number> = {};
    requestStats.byUrl.forEach((v, k) => { byUrlObj[k] = v; });
    return {
        windowStartMs: requestStats.windowStartMs,
        windowSizeMs: requestStats.windowSizeMs,
        totalInWindow: requestStats.totalInWindow,
        byUrl: byUrlObj,
    };
}

export function resetRequestStats() {
    requestStats.windowStartMs = Date.now();
    requestStats.totalInWindow = 0;
    requestStats.byUrl.clear();
}

apiClient.interceptors.request.use(
    async (config) => {
        console.log('[ApiClient] ==> INÍCIO DA REQUISIÇÃO <==');
        console.log('[ApiClient] Config original:', {
            baseURL: config.baseURL,
            url: config.url,
            method: config.method,
            params: config.params,
        });

        // Log específico para PUT de equipamentos
        if (config.method?.toLowerCase() === 'put' && config.url?.includes('/equipments/')) {
            console.log('');
            console.log('🚨🚨🚨 PARA O BACKEND - PAYLOAD SENDO ENVIADO 🚨🚨🚨');
            console.log('📍 URL:', config.url);
            console.log('📍 Method:', config.method);
            console.log('📍 Content-Type:', config.headers?.['Content-Type']);
            console.log('');
            console.log('📦 PAYLOAD COMPLETO:');
            console.log(JSON.stringify(config.data, null, 2));
            console.log('');
            console.log('🔍 ADDITIONAL_FIELDS DETALHADO:');
            if (config.data?.additional_fields) {
                console.log('✅ additional_fields PRESENTE');
                console.log('📝 Tipo:', typeof config.data.additional_fields);
                console.log('📝 Keys:', Object.keys(config.data.additional_fields));
                console.log('📝 Conteúdo:', JSON.stringify(config.data.additional_fields, null, 2));
            } else {
                console.log('❌ additional_fields AUSENTE OU VAZIO');
                console.log('📝 Valor:', config.data?.additional_fields);
            }
            console.log('🚨🚨🚨 FIM DO LOG PARA BACKEND 🚨🚨🚨');
            console.log('');
        }

        const accessToken = await AsyncStorage.getItem("access_token");
        if (accessToken) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${accessToken}`;
            // Set dynamic base URL
            // const decodedToken: any = jwtDecode(accessToken); // Remova esta linha
            const accountName = await AsyncStorage.getItem("account") || undefined; // Sem fallback "default" para evitar subdomínio inválido
            config.baseURL = await setDynamicApiUrl(accountName as any);
        }

        console.log('[ApiClient] Configuração final:', {
            baseURL: config.baseURL,
            url: config.url,
            method: config.method,
            params: config.params,
            hasAuth: !!accessToken,
        });
        console.log('[ApiClient] ==> FIM DA CONFIGURAÇÃO <==');

        // Atualiza estatísticas e notifica listeners
        try {
            const now = Date.now();
            rotateWindowIfNeeded(now);
            requestStats.totalInWindow += 1;
            const key = `${config.method?.toUpperCase() || 'GET'} ${config.url}`;
            requestStats.byUrl.set(key, (requestStats.byUrl.get(key) || 0) + 1);
            const ev: RequestEvent = { url: config.url, method: config.method, baseURL: config.baseURL, ts: now };
            requestListeners.forEach(fn => {
                try { fn(ev); } catch { }
            });
        } catch { }

        return config;
    },
    (error) => {
        console.error('[ApiClient] Erro no interceptor de requisição:', error);
        return Promise.reject(error);
    }
);

// Interceptor robusto para FORÇAR multipart/form-data quando há FormData
apiClient.interceptors.request.use(async (config) => {
    // Detecta FormData do React Native: nativo (instanceof) ou polyfill/clone com _parts
    const isFormData =
        (typeof FormData !== 'undefined' && config.data instanceof FormData) ||
        (config.data && typeof config.data === 'object' && '_parts' in config.data);

    if (isFormData) {
        // FORÇA multipart/form-data explicitamente (em vez de apenas remover)
        // Isso garante que o backend receba o Content-Type correto mesmo sem arquivos
        if (config.headers) {
            config.headers['Content-Type'] = 'multipart/form-data';
        }
        console.log('[ApiClient] 📦 FormData detectado. Forçando Content-Type: multipart/form-data');
    }
    return config;
}, (error) => Promise.reject(error));

apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        console.log('[ApiClient] Resposta bem-sucedida para:', response.config.url);
        try {
            const ev: ResponseEvent = { url: response.config.url, method: response.config.method, status: response.status, ts: Date.now() };
            responseListeners.forEach(fn => { try { fn(ev); } catch { } });
        } catch { }
        return response;
    },
    async (error: AxiosError) => {
        console.error('[ApiClient] ==> ERRO NA RESPOSTA <==');
        console.error('[ApiClient] Status:', error.response?.status);
        console.error('[ApiClient] URL que falhou:', error.config?.url);
        console.error('[ApiClient] BaseURL:', error.config?.baseURL);
        console.error('[ApiClient] Mensagem:', error.message);
        if (error.request) {
            // Evitar despejar HTML completo (ex.: páginas de erro do servidor) no console
            let responsePreview: string | undefined;
            try {
                const raw = (error.request as any)?._response;
                if (typeof raw === 'string') {
                    const cleaned = raw.replace(/\s+/g, ' ').trim();
                    responsePreview = cleaned.slice(0, 300) + (cleaned.length > 300 ? '... [truncado]' : '');
                }
            } catch { }

            if (__DEV__) {
                console.error('[ApiClient] Detalhes da requisição que falhou:', {
                    url: (error.request as any)?._url || (error.request as any)?.url,
                    method: (error.request as any)?._method || error.config?.method,
                    response_preview: responsePreview,
                });
            } else {
                console.error('[ApiClient] Requisição falhou:', {
                    url: (error.request as any)?._url || (error.request as any)?.url,
                    method: (error.request as any)?._method || error.config?.method,
                });
            }
        }

        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

        try {
            const ev: ResponseEvent = { url: originalRequest?.url, method: originalRequest?.method, status: error.response?.status, ts: Date.now() };
            responseListeners.forEach(fn => { try { fn(ev); } catch { } });
        } catch { }

        // Retry automático para erros 500 (problemas do backend) - reduzido para 1 tentativa
        if (error.response?.status === 500 && !originalRequest._retry) {
            const retryCount = (originalRequest._retryCount || 0) + 1;
            const maxRetries = 1; // Reduzido de 3 para 1

            if (retryCount <= maxRetries) {
                console.log(`[ApiClient] Erro 500, tentativa ${retryCount}/${maxRetries} para:`, originalRequest.url);
                originalRequest._retryCount = retryCount;

                // Backoff: apenas 1s
                const delay = 1000;
                await new Promise(resolve => setTimeout(resolve, delay));

                return apiClient(originalRequest);
            } else {
                console.error(`[ApiClient] Máximo de tentativas atingido (${maxRetries}) para:`, originalRequest.url);
            }
        }

        // Retry/backoff para 429 (throttled) com limite de tentativas (somente GET)
        if (error.response?.status === 429 && (originalRequest.method || 'get').toLowerCase() === 'get') {
            const maxRetries = 3;
            const current = (originalRequest._retryCount || 0) + 1;
            if (current > maxRetries) {
                console.warn(`[ApiClient] 429 persistente após ${maxRetries} tentativas:`, originalRequest.url);
                return Promise.reject(error);
            }
            originalRequest._retryCount = current;
            let retryMs = 0;
            const retryAfterHeader = (error.response.headers || {} as any)['retry-after'];
            if (retryAfterHeader) {
                const n = Number(retryAfterHeader);
                if (!Number.isNaN(n)) retryMs = n * 1000;
            }
            if (!retryMs) {
                try {
                    const preview = (error.request as any)?._response as string | undefined;
                    const match = preview && preview.match(/available in (\d+) seconds/i);
                    if (match) retryMs = parseInt(match[1], 10) * 1000;
                } catch { }
            }
            retryMs = retryMs || (2000 * current); // backoff incremental
            console.warn(`[ApiClient] 429 recebido (tentativa ${current}/${maxRetries}). Aguardando ${retryMs}ms:`, originalRequest.url);
            await new Promise(r => setTimeout(r, retryMs));
            return apiClient(originalRequest);
        }

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

        console.log("[refreshAccessToken] URL para refresh:", `${dynamicBaseUrl}/token/refresh`);
        console.log("[refreshAccessToken] Account:", accountName);
        console.log("[refreshAccessToken] URL base completa:", dynamicBaseUrl);

        // Usar endpoint conforme Postman.md: /token/refresh (apiConfig já adiciona /api)
        console.log("[refreshAccessToken] Tentando com /token/refresh conforme Postman.md");
        const response = await axios.post(
            `${dynamicBaseUrl}/token/refresh`,
            { refresh: refreshToken },
            {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            }
        );

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
