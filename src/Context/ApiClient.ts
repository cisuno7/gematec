// file: src/Context/ApiClient.ts
import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setDynamicApiUrl } from "../config/apiConfig";
import { REQUEST_TIMEOUT, REFRESH_TOKEN_TIMEOUT } from "../config/timeoutConfig";
// import jwtDecode from "jwt-decode"; // Remova esta linha se não for usada em outro lugar neste arquivo

const apiClient = axios.create({
    timeout: REQUEST_TIMEOUT,
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
        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║           🚀 REQUISIÇÃO HTTP - LOG COMPLETO                  ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');

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
        const accountName = await AsyncStorage.getItem("account");

        if (accessToken) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${accessToken}`;
            config.baseURL = await setDynamicApiUrl(accountName as any);
        }

        // ═══════════════════════════════════════════════════════════════
        // 📋 LOG DETALHADO DA REQUISIÇÃO (ANTES DE EXECUTAR)
        // ═══════════════════════════════════════════════════════════════

        const fullUrl = `${config.baseURL || ''}${config.url || ''}`;

        console.log('\n┌─────────────────────────────────────────────────────────────┐');
        console.log('│  🎯 DETALHES DA REQUISIÇÃO                                 │');
        console.log('└─────────────────────────────────────────────────────────────┘');
        console.log('');
        console.log('🔧 MÉTODO:', config.method?.toUpperCase() || 'GET');
        console.log('🌐 URL COMPLETA:', fullUrl);
        console.log('📦 ACCOUNT:', accountName || '(não definido)');
        console.log('');
        console.log('🔑 ACCESS TOKEN:');
        if (accessToken) {
            console.log('   ✅ Token presente');
            console.log('   📏 Length:', accessToken.length);
            console.log('   🔤 Início:', accessToken.substring(0, 60) + '...');
            console.log('   🔤 Final:', '...' + accessToken.substring(accessToken.length - 40));
            console.log('');
            console.log('   📋 TOKEN COMPLETO (copie para testar no Postman):');
            console.log('   ' + accessToken);
            console.log('');

            // Tentar decodificar o token
            try {
                const parts = accessToken.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    const now = Math.floor(Date.now() / 1000);
                    const isExpired = payload.exp < now;

                    console.log('   🔍 Payload do Token:');
                    console.log('      - user_id:', payload.user_id);
                    console.log('      - user_name:', payload.user_name);
                    console.log('      - exp:', payload.exp);
                    console.log('      - exp_date:', new Date(payload.exp * 1000).toLocaleString('pt-BR'));
                    console.log('');

                    if (isExpired) {
                        console.log('   ⚠️⚠️⚠️  TOKEN EXPIRADO! ⚠️⚠️⚠️');
                        console.log('      Expirou há:', Math.floor((now - payload.exp) / 60), 'minutos');
                        console.log('      ⚠️  ESTA REQUISIÇÃO VAI FALHAR!');
                    } else {
                        console.log('   ✅ Token válido');
                        console.log('      Expira em:', Math.floor((payload.exp - now) / 60), 'minutos');
                    }
                    console.log('');
                }
            } catch (e) {
                console.log('   ⚠️ Não foi possível decodificar o token');
            }
        } else {
            console.log('   ❌ Nenhum token encontrado!');
            console.log('   ⚠️  REQUISIÇÃO SEM AUTENTICAÇÃO - VAI FALHAR!');
        }

        console.log('');
        console.log('📤 HEADERS:');
        const authHeaderValue = config.headers?.Authorization;
        const authDisplay = authHeaderValue && typeof authHeaderValue === 'string'
            ? authHeaderValue.substring(0, 50) + '...'
            : 'não definido';
        console.log('   Authorization:', authDisplay);
        console.log('   Content-Type:', config.headers?.['Content-Type'] || 'não definido');

        if (config.params && Object.keys(config.params).length > 0) {
            console.log('');
            console.log('🔍 QUERY PARAMS:');
            console.log(JSON.stringify(config.params, null, 2));
        }

        if (config.data && config.method?.toLowerCase() !== 'get') {
            console.log('');
            console.log('📦 PAYLOAD (BODY):');
            try {
                if (typeof config.data === 'string') {
                    console.log(config.data.substring(0, 500));
                } else {
                    console.log(JSON.stringify(config.data, null, 2).substring(0, 500));
                }
            } catch {
                console.log('   (não foi possível serializar)');
            }
        }

        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║           ⏳ EXECUTANDO REQUISIÇÃO...                        ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('\n');

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
        console.error('\n\n');
        console.error('╔═══════════════════════════════════════════════════════════════╗');
        console.error('║               ❌ ERRO NA REQUISIÇÃO HTTP                      ║');
        console.error('╚═══════════════════════════════════════════════════════════════╝');
        console.error('');

        const fullUrl = `${error.config?.baseURL || ''}${error.config?.url || ''}`;
        const authHeader = error.config?.headers?.Authorization;
        const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : null;

        console.error('┌─────────────────────────────────────────────────────────────┐');
        console.error('│  🚨 INFORMAÇÕES DO ERRO                                    │');
        console.error('└─────────────────────────────────────────────────────────────┘');
        console.error('');
        console.error('🔧 MÉTODO:', error.config?.method?.toUpperCase() || 'N/A');
        console.error('🌐 URL COMPLETA:', fullUrl);
        console.error('❌ STATUS CODE:', error.response?.status || 'Sem resposta');
        console.error('💬 MENSAGEM:', error.message);
        console.error('');

        console.error('🔑 TOKEN USADO NA REQUISIÇÃO:');
        if (token) {
            console.error('   ✅ Token estava presente');
            console.error('   📏 Length:', token.length);
            console.error('   🔤 Início:', token.substring(0, 60) + '...');
            console.error('   🔤 Final:', '...' + token.substring(token.length - 40));
            console.error('');
            console.error('   📋 TOKEN COMPLETO (teste no Postman para comparar):');
            console.error('   ' + token);
            console.error('');

            // Tentar decodificar
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    const now = Math.floor(Date.now() / 1000);
                    const isExpired = payload.exp < now;

                    console.error('   🔍 Payload do Token:');
                    console.error('      - user_id:', payload.user_id);
                    console.error('      - user_name:', payload.user_name);
                    console.error('      - exp:', payload.exp);
                    console.error('      - exp_date:', new Date(payload.exp * 1000).toLocaleString('pt-BR'));
                    console.error('');

                    if (isExpired) {
                        console.error('   ⚠️⚠️⚠️  TOKEN ESTAVA EXPIRADO! ⚠️⚠️⚠️');
                        console.error('      🔴 ESTA É A CAUSA DO ERRO!');
                        console.error('      Expirou há:', Math.floor((now - payload.exp) / 60), 'minutos');
                        console.error('      ✅ SOLUÇÃO: Limpe o cache e faça login novamente!');
                    } else {
                        console.error('   ✅ Token estava válido (não é problema de expiração)');
                    }
                    console.error('');
                }
            } catch (e) {
                console.error('   ⚠️ Não foi possível decodificar o token');
            }
        } else {
            console.error('   ❌ Nenhum token foi enviado!');
            console.error('   🔴 ESTA É A CAUSA DO ERRO!');
        }
        console.error('');

        // Payload da REQUEST
        console.error('\n📤 PAYLOAD DA REQUEST:');
        if (error.config?.data) {
            try {
                const requestPayload = typeof error.config.data === 'string'
                    ? JSON.parse(error.config.data)
                    : error.config.data;
                console.error(JSON.stringify(requestPayload, null, 2));
            } catch {
                console.error(error.config.data);
            }
        } else {
            console.error('(vazio ou sem payload)');
        }

        // Status Code
        console.error('\n❌ STATUS CODE:', error.response?.status || 'N/A');

        // Payload da RESPONSE
        console.error('\n📥 PAYLOAD DA RESPONSE:');
        if (error.response?.data) {
            try {
                // Detectar se é HTML (erro do Django)
                const dataStr = typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data);

                const isHTML = dataStr.includes('<!DOCTYPE') || dataStr.includes('<html') || dataStr.includes('ProgrammingError');

                if (isHTML) {
                    console.error('🚨 RESPOSTA É HTML (ERRO DO DJANGO)! 🚨');
                    console.error('');
                    console.error('Tamanho do HTML:', dataStr.length, 'caracteres');
                    console.error('');
                    console.error('╔═══════════════════════════════════════════════════════════════╗');
                    console.error('║         HTML DO ERRO DO DJANGO (preview 2000 chars)         ║');
                    console.error('║   (Copie e salve em erro.html para ver no navegador)        ║');
                    console.error('╚═══════════════════════════════════════════════════════════════╝');
                    console.error('');
                    const htmlPreview = dataStr.slice(0, 2000);
                    console.error(htmlPreview + (dataStr.length > 2000 ? '\n...[HTML truncado - ' + (dataStr.length - 2000) + ' chars restantes]' : ''));
                    console.error('');
                    console.error('╔═══════════════════════════════════════════════════════════════╗');
                    console.error('║                    FIM DO HTML DO ERRO                       ║');
                    console.error('╚═══════════════════════════════════════════════════════════════╝');
                    console.error('');

                    // Tentar extrair o erro específico
                    const errorMatch = dataStr.match(/Exception Type: (\w+) at (.+?)\n/);
                    const valueMatch = dataStr.match(/Exception Value: (.+?)\n/);

                    if (errorMatch) {
                        console.error('🔴 Tipo do erro Django:', errorMatch[1]);
                        console.error('🔴 Local do erro:', errorMatch[2]);
                    }
                    if (valueMatch) {
                        console.error('🔴 Mensagem do erro:', valueMatch[1]);
                    }
                } else {
                    console.error(JSON.stringify(error.response.data, null, 2));
                }
            } catch {
                console.error(error.response.data);
            }
        } else {
            console.error('(sem resposta do servidor)');
        }

        // Mensagem de erro
        console.error('\n💬 MENSAGEM:', error.message || 'Sem mensagem');

        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
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
            // ✅ VERIFICAR SE APESAR DO ERRO 500, OS DADOS FORAM RETORNADOS
            const responseData = error.response?.data as any;
            const hasValidData = responseData && (
                (typeof responseData === 'object' &&
                    (Array.isArray(responseData.results) ||
                        Array.isArray(responseData.activities) ||
                        Array.isArray(responseData))) ||
                (typeof responseData === 'string' && responseData.includes('<!DOCTYPE html>'))
            );

            // Se a resposta HTML (erro do Django) mas não tem dados válidos, tentar retry
            const isHtmlError = typeof responseData === 'string' && responseData.includes('<!DOCTYPE html>');

            if (isHtmlError && !hasValidData) {
                const retryCount = (originalRequest._retryCount || 0) + 1;
                const maxRetries = 1; // Reduzido de 3 para 1

                if (retryCount <= maxRetries) {
                    console.log(`[ApiClient] Erro 500 (HTML), tentativa ${retryCount}/${maxRetries} para:`, originalRequest.url);
                    originalRequest._retryCount = retryCount;

                    // Backoff: apenas 1s
                    const delay = 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));

                    return apiClient(originalRequest);
                } else {
                    console.error(`[ApiClient] Máximo de tentativas atingido (${maxRetries}) para:`, originalRequest.url);
                }
            } else if (hasValidData && !isHtmlError) {
                // ✅ Se tem dados válidos mesmo com erro 500, retornar os dados silenciosamente
                console.warn(`[ApiClient] ⚠️ Erro 500 mas dados válidos recebidos para:`, originalRequest.url, '- retornando dados');
                return Promise.resolve(error.response);
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
                timeout: REFRESH_TOKEN_TIMEOUT,
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
