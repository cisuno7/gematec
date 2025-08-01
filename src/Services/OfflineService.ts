import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineRequest } from '../Models/Offline';

const PENDING_REQUESTS_KEY = 'pending_requests';
const CACHE_KEY_PREFIX = 'cache_';

export class OfflineService {

    // --- Gerenciamento da Fila de Requisições Pendentes ---

    static async getPendingRequests(): Promise<OfflineRequest[]> {
        try {
            const requestsJson = await AsyncStorage.getItem(PENDING_REQUESTS_KEY);
            return requestsJson ? JSON.parse(requestsJson) : [];
        } catch (error) {
            console.error('[OfflineService] Erro ao obter requisições pendentes:', error);
            return [];
        }
    }

    static async addRequestToQueue(request: Omit<OfflineRequest, 'id' | 'timestamp'>): Promise<void> {
        try {
            const pendingRequests = await this.getPendingRequests();
            const newRequest: OfflineRequest = {
                ...request,
                id: `${Date.now()}_${Math.random()}`,
                timestamp: Date.now(),
            };
            pendingRequests.push(newRequest);
            await AsyncStorage.setItem(PENDING_REQUESTS_KEY, JSON.stringify(pendingRequests));
        } catch (error) {
            console.error('[OfflineService] Erro ao adicionar requisição à fila:', error);
        }
    }

    static async removeRequestFromQueue(requestId: string): Promise<void> {
        try {
            let pendingRequests = await this.getPendingRequests();
            pendingRequests = pendingRequests.filter(req => req.id !== requestId);
            await AsyncStorage.setItem(PENDING_REQUESTS_KEY, JSON.stringify(pendingRequests));
        } catch (error) {
            console.error('[OfflineService] Erro ao remover requisição da fila:', error);
        }
    }

    static async clearQueue(): Promise<void> {
        try {
            await AsyncStorage.removeItem(PENDING_REQUESTS_KEY);
        } catch (error) {
            console.error('[OfflineService] Erro ao limpar a fila:', error);
        }
    }

    // --- Gerenciamento de Cache de Dados ---

    static async cacheData<T>(key: string, data: T): Promise<void> {
        try {
            const cacheKey = `${CACHE_KEY_PREFIX}${key}`;
            const dataJson = JSON.stringify(data);
            await AsyncStorage.setItem(cacheKey, dataJson);
        } catch (error) {
            console.error(`[OfflineService] Erro ao fazer cache dos dados para a chave ${key}:`, error);
        }
    }

    static async getCachedData<T>(key: string): Promise<T | null> {
        try {
            const cacheKey = `${CACHE_KEY_PREFIX}${key}`;
            const dataJson = await AsyncStorage.getItem(cacheKey);
            return dataJson ? JSON.parse(dataJson) : null;
        } catch (error) {
            console.error(`[OfflineService] Erro ao obter dados do cache para a chave ${key}:`, error);
            return null;
        }
    }

    static async clearCache(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
            await AsyncStorage.multiRemove(cacheKeys);
        } catch (error) {
            console.error('[OfflineService] Erro ao limpar o cache:', error);
        }
    }
}
