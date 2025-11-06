import AsyncStorage from "@react-native-async-storage/async-storage";

interface CacheItem<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

export default class CacheService {
    private static readonly DEFAULT_EXPIRY = 30 * 60 * 1000; // 30 minutos
    private static readonly CACHE_PREFIX = "@cache_";
    private static memoryCache: Map<string, CacheItem<any>> = new Map();

    // Cache keys
    static readonly KEYS = {
        BRANDS: "brands",
        EQUIPMENT_TYPES: "equipment_types",
        CLIENTS_WITH_CONTRACT: "clients_with_contract",
        CLIENTS_WITHOUT_CONTRACT: "clients_without_contract",
        EQUIPMENT_TEMPLATE: "equipment_template",
        MENU: "menu",
    };

    /**
     * Salva dados no cache com expiração
     */
    static async set<T>(key: string, data: T, expiryMs: number = this.DEFAULT_EXPIRY): Promise<void> {
        const now = Date.now();
        const cacheItem: CacheItem<T> = {
            data,
            timestamp: now,
            expiresAt: now + expiryMs
        };

        // Salvar na memória
        this.memoryCache.set(key, cacheItem);

        // Salvar no AsyncStorage
        try {
            await AsyncStorage.setItem(
                `${this.CACHE_PREFIX}${key}`,
                JSON.stringify(cacheItem)
            );
        } catch (error) {
            console.error(`[CacheService] Erro ao salvar cache ${key}:`, error);
        }
    }

    /**
     * Busca dados do cache
     */
    static async get<T>(key: string): Promise<T | null> {
        const now = Date.now();

        // Primeiro tenta da memória
        const memoryItem = this.memoryCache.get(key);
        if (memoryItem && memoryItem.expiresAt > now) {
            console.log(`[CacheService] Cache hit (memory): ${key}`);
            return memoryItem.data as T;
        }

        // Se não está na memória, tenta do AsyncStorage
        try {
            const stored = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${key}`);
            if (stored) {
                const cacheItem: CacheItem<T> = JSON.parse(stored);
                if (cacheItem.expiresAt > now) {
                    console.log(`[CacheService] Cache hit (storage): ${key}`);
                    // Restaura na memória
                    this.memoryCache.set(key, cacheItem);
                    return cacheItem.data;
                } else {
                    console.log(`[CacheService] Cache expired: ${key}`);
                    await this.remove(key);
                }
            }
        } catch (error) {
            console.error(`[CacheService] Erro ao buscar cache ${key}:`, error);
        }

        console.log(`[CacheService] Cache miss: ${key}`);
        return null;
    }

    /**
     * Remove item do cache
     */
    static async remove(key: string): Promise<void> {
        this.memoryCache.delete(key);
        try {
            await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
        } catch (error) {
            console.error(`[CacheService] Erro ao remover cache ${key}:`, error);
        }
    }

    /**
     * Limpa todo o cache
     */
    static async clearAll(): Promise<void> {
        this.memoryCache.clear();
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX));
            await AsyncStorage.multiRemove(cacheKeys);
            console.log(`[CacheService] Cache limpo: ${cacheKeys.length} items removidos`);
        } catch (error) {
            console.error("[CacheService] Erro ao limpar cache:", error);
        }
    }

    /**
     * Pré-carrega dados essenciais
     */
    static async preloadEssentials(token: string): Promise<void> {
        console.log("[CacheService] Iniciando pré-carregamento de dados essenciais");

        // Importar serviços necessários
        const { default: apiClient } = require("../Context/ApiClient");
        const { default: ClientService } = require("./ClientService");

        // Carregar em paralelo
        await Promise.allSettled([
            // Brands
            (async () => {
                try {
                    const response = await apiClient.get("/brands");
                    const brands = response.data.results || response.data || [];
                    await this.set(this.KEYS.BRANDS, brands, 60 * 60 * 1000); // 1 hora
                    console.log(`[CacheService] Brands carregadas: ${brands.length}`);
                } catch (error) {
                    console.error("[CacheService] Erro ao carregar brands:", error);
                }
            })(),

            // Equipment Types
            (async () => {
                try {
                    const response = await apiClient.get("/equipment_types");
                    const types = response.data.results || response.data || [];
                    await this.set(this.KEYS.EQUIPMENT_TYPES, types, 60 * 60 * 1000); // 1 hora
                    console.log(`[CacheService] Equipment types carregados: ${types.length}`);
                } catch (error) {
                    console.error("[CacheService] Erro ao carregar equipment types:", error);
                }
            })(),

            // Equipment Template - REMOVIDO: templates agora são específicos por tipo de equipamento
            // Templates devem ser carregados apenas quando um tipo específico é selecionado
            // usando EquipmentService.getEquipmentTemplateByEquipmentType(equipmentTypeId, token)

            // Clientes com contrato
            (async () => {
                try {
                    const response = await ClientService.getClients(true, 1, token, "");
                    await this.set(this.KEYS.CLIENTS_WITH_CONTRACT, response.results || [], 30 * 60 * 1000); // 30 minutos
                    console.log(`[CacheService] Clientes com contrato: ${response.results?.length || 0}`);
                } catch (error) {
                    console.error("[CacheService] Erro ao carregar clientes com contrato:", error);
                }
            })(),
        ]);

        console.log("[CacheService] Pré-carregamento concluído");
    }
}
