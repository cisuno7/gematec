import axios from "axios";
import { buildApiUrlForAccount } from "../config/apiConfig";
import { RoadmapResponse, RoadmapActivity } from '../Models/Roadmap';
import { OfflineService } from './OfflineService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENT_ROADMAP_CACHE_KEY = 'current_roadmap';
const ROADMAP_EQUIPMENT_CACHE_KEY_PREFIX = 'roadmap_equipment_';
const ROADMAP_QUESTIONS_CACHE_KEY_PREFIX = 'roadmap_questions_';

export class RoadmapService {
    /**
     * Obtém o token de autenticação do AsyncStorage
     */
    private static async getAuthToken(): Promise<string | null> {
        try {
            const token = await AsyncStorage.getItem('access_token');
            console.log('[RoadmapService] Token obtido:', token ? 'Token presente' : 'Token não encontrado');
            return token;
        } catch (error) {
            console.error('[RoadmapService] Erro ao obter token de autenticação:', error);
            return null;
        }
    }

    /**
     * Cria os headers de autenticação para as requisições
     */
    private static async getAuthHeaders(): Promise<{ Authorization: string } | {}> {
        const token = await this.getAuthToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    /**
     * Valida se a resposta da API contém dados válidos
     */
    private static validateRoadmapResponse(data: any): RoadmapResponse {
        if (!data || typeof data !== 'object') {
            throw new Error('Resposta inválida da API');
        }

        // Verifica se é uma resposta paginada
        if (data.results && Array.isArray(data.results)) {
            // Converte a estrutura paginada para o formato esperado
            return {
                activities: data.results,
                total: data.count || 0,
                date: new Date().toISOString().split('T')[0] // Data atual como fallback
            } as RoadmapResponse;
        }

        // Verifica se tem a estrutura direta com activities
        if (Array.isArray(data.activities)) {
            return data as RoadmapResponse;
        }

        throw new Error('Dados de atividades inválidos');
    }

    /**
     * Busca o roteiro atual do técnico para o dia.
     * Primeiro tenta buscar do cache, se não encontrar, busca na API e atualiza o cache.
     */
    static async getCurrentRoadmap(): Promise<RoadmapResponse> {
        try {
            // Tenta obter do cache primeiro
            const cachedRoadmap = await OfflineService.getCachedData<RoadmapResponse>(CURRENT_ROADMAP_CACHE_KEY);
            if (cachedRoadmap) {
                console.log('[RoadmapService] Roteiro atual carregado do cache.');
                return this.validateRoadmapResponse(cachedRoadmap);
            }

            // Se não houver cache, busca na API
            const apiUrl = await buildApiUrlForAccount();
            const endpoint = `${apiUrl}/roadmaps`;
            const headers = await this.getAuthHeaders();

            console.log('[RoadmapService] Buscando roteiro atual da API:', endpoint);
            console.log('[RoadmapService] Headers enviados:', headers);

            const response = await axios.get(endpoint, { headers });

            console.log('[RoadmapService] Resposta da API:', JSON.stringify(response.data, null, 2));

            // Valida a resposta
            const validatedData = this.validateRoadmapResponse(response.data);

            // Salva os dados no cache para uso offline
            await OfflineService.cacheData(CURRENT_ROADMAP_CACHE_KEY, validatedData);
            console.log('[RoadmapService] Roteiro atual salvo no cache.');

            return validatedData;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao buscar roteiro atual:', error);

            // Em caso de erro de rede, tenta usar o cache como fallback
            const cachedRoadmap = await OfflineService.getCachedData<RoadmapResponse>(CURRENT_ROADMAP_CACHE_KEY);
            if (cachedRoadmap) {
                console.warn('[RoadmapService] Usando roteiro do cache como fallback devido a erro de rede.');
                return this.validateRoadmapResponse(cachedRoadmap);
            }

            this.handleApiError(error);
        }
    }

    /**
     * Busca o roteiro para uma data específica
     */
    static async getRoadmapByDate(date: string): Promise<RoadmapResponse> {
        try {
            // Valida o formato da data
            if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                throw new Error('Formato de data inválido. Use YYYY-MM-DD');
            }

            const apiUrl = await buildApiUrlForAccount();
            const endpoint = `${apiUrl}/roadmaps/${date}`;
            const headers = await this.getAuthHeaders();

            console.log('[RoadmapService] Endpoint de roteiro por data:', endpoint);

            const response = await axios.get(endpoint, { headers });
            return this.validateRoadmapResponse(response.data);
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao buscar roteiro por data:', error);
            this.handleApiError(error);
        }
    }

    /**
     * Busca equipamentos de uma atividade do roadmap
     */
    static async getActivityEquipment(activityId: number): Promise<any[]> {
        try {
            // Tenta obter do cache primeiro
            const cacheKey = `${ROADMAP_EQUIPMENT_CACHE_KEY_PREFIX}${activityId}`;
            const cachedEquipment = await OfflineService.getCachedData<any[]>(cacheKey);
            if (cachedEquipment) {
                console.log('[RoadmapService] Equipamentos carregados do cache.');
                return cachedEquipment;
            }

            const apiUrl = await buildApiUrlForAccount();
            const endpoint = `${apiUrl}/roadmaps/activities/${activityId}/equipment`;
            const headers = await this.getAuthHeaders();

            console.log('[RoadmapService] Buscando equipamentos da atividade:', endpoint);

            const response = await axios.get(endpoint, { headers });
            const equipment = response.data;

            // Salva no cache
            await OfflineService.cacheData(cacheKey, equipment);
            console.log('[RoadmapService] Equipamentos salvos no cache.');

            return equipment;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao buscar equipamentos da atividade:', error);

            // Tenta usar cache como fallback
            const cacheKey = `${ROADMAP_EQUIPMENT_CACHE_KEY_PREFIX}${activityId}`;
            const cachedEquipment = await OfflineService.getCachedData<any[]>(cacheKey);
            if (cachedEquipment) {
                console.warn('[RoadmapService] Usando equipamentos do cache como fallback.');
                return cachedEquipment;
            }

            this.handleApiError(error);
        }
    }

    /**
     * Busca questões de um equipamento de uma atividade do roadmap
     */
    static async getEquipmentQuestions(activityId: number, equipmentId: number): Promise<any[]> {
        try {
            // Tenta obter do cache primeiro
            const cacheKey = `${ROADMAP_QUESTIONS_CACHE_KEY_PREFIX}${activityId}_${equipmentId}`;
            const cachedQuestions = await OfflineService.getCachedData<any[]>(cacheKey);
            if (cachedQuestions) {
                console.log('[RoadmapService] Questões carregadas do cache.');
                return cachedQuestions;
            }

            const apiUrl = await buildApiUrlForAccount();
            const endpoint = `${apiUrl}/roadmaps/activities/${activityId}/equipment/${equipmentId}/questions`;
            const headers = await this.getAuthHeaders();

            console.log('[RoadmapService] Buscando questões do equipamento:', endpoint);

            const response = await axios.get(endpoint, { headers });
            const questions = response.data;

            // Salva no cache
            await OfflineService.cacheData(cacheKey, questions);
            console.log('[RoadmapService] Questões salvas no cache.');

            return questions;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao buscar questões do equipamento:', error);

            // Tenta usar cache como fallback
            const cacheKey = `${ROADMAP_QUESTIONS_CACHE_KEY_PREFIX}${activityId}_${equipmentId}`;
            const cachedQuestions = await OfflineService.getCachedData<any[]>(cacheKey);
            if (cachedQuestions) {
                console.warn('[RoadmapService] Usando questões do cache como fallback.');
                return cachedQuestions;
            }

            this.handleApiError(error);
        }
    }

    /**
     * Submete respostas de questões de um equipamento
     */
    static async submitEquipmentAnswers(activityId: number, equipmentId: number, answers: any[]): Promise<void> {
        try {
            const apiUrl = await buildApiUrlForAccount();
            const endpoint = `${apiUrl}/roadmaps/activities/${activityId}/equipment/${equipmentId}/answers`;
            const headers = await this.getAuthHeaders();

            console.log('[RoadmapService] Enviando respostas do equipamento:', endpoint);

            const response = await axios.post(endpoint, { answers }, { headers });

            // Limpa o cache para forçar atualização
            await this.clearEquipmentCache(activityId, equipmentId);

            return response.data;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao enviar respostas do equipamento:', error);
            this.handleApiError(error);
        }
    }

    /**
     * Adiciona notas a uma atividade do roteiro
     */
    static async addNotesToActivity(activityId: number, notes: string): Promise<RoadmapActivity> {
        try {
            // Valida os parâmetros
            if (!activityId || activityId <= 0) {
                throw new Error('ID da atividade inválido');
            }

            if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
                throw new Error('Notas não podem estar vazias');
            }

            const apiUrl = await buildApiUrlForAccount();
            const endpoint = `${apiUrl}/roadmaps/activities/${activityId}/notes`;
            const headers = await this.getAuthHeaders();

            console.log('[RoadmapService] Endpoint de adição de notas:', endpoint);

            const response = await axios.patch(endpoint, { notes }, { headers });

            // Limpa o cache do roteiro atual para forçar atualização
            await OfflineService.clearCache();

            return response.data;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao adicionar notas à atividade:', error);
            this.handleApiError(error);
        }
    }

    /**
     * Atualiza o status de uma atividade do roteiro
     */
    static async updateActivityStatus(activityId: number, status: string): Promise<RoadmapActivity> {
        try {
            // Valida os parâmetros
            if (!activityId || activityId <= 0) {
                throw new Error('ID da atividade inválido');
            }

            const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Status inválido. Use um dos seguintes: ${validStatuses.join(', ')}`);
            }

            const apiUrl = await buildApiUrlForAccount();
            const endpoint = `${apiUrl}/roadmaps/activities/${activityId}/status`;
            const headers = await this.getAuthHeaders();

            console.log('[RoadmapService] Endpoint de atualização de status:', endpoint);

            const response = await axios.patch(endpoint, { status }, { headers });

            // Limpa o cache do roteiro atual para forçar atualização
            await OfflineService.clearCache();

            return response.data;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao atualizar status da atividade:', error);
            this.handleApiError(error);
        }
    }

    /**
     * Limpa o cache de equipamentos e questões
     */
    private static async clearEquipmentCache(activityId: number, equipmentId: number): Promise<void> {
        try {
            const equipmentCacheKey = `${ROADMAP_EQUIPMENT_CACHE_KEY_PREFIX}${activityId}`;
            const questionsCacheKey = `${ROADMAP_QUESTIONS_CACHE_KEY_PREFIX}${activityId}_${equipmentId}`;

            await AsyncStorage.multiRemove([equipmentCacheKey, questionsCacheKey]);
            console.log('[RoadmapService] Cache de equipamentos e questões limpo.');
        } catch (error) {
            console.error('[RoadmapService] Erro ao limpar cache de equipamentos:', error);
        }
    }

    /**
     * Trata erros da API de forma consistente
     */
    private static handleApiError(error: any): never {
        if (error.response) {
            const status = error.response.status;
            switch (status) {
                case 401:
                    throw new Error('Token inválido ou expirado. Faça login novamente.');
                case 403:
                    throw new Error('Permissão negada para acessar este recurso.');
                case 404:
                    throw new Error('Recurso não encontrado.');
                case 422:
                    throw new Error('Dados inválidos enviados para o servidor.');
                case 500:
                    throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
                default:
                    throw new Error(`Erro do servidor: ${status}.`);
            }
        } else if (error.request) {
            throw new Error('Erro ao conectar ao servidor. Verifique sua conexão com a internet.');
        } else {
            throw new Error(`Erro inesperado: ${error.message}`);
        }
    }

    /**
     * Limpa o cache do roteiro atual
     */
    static async clearRoadmapCache(): Promise<void> {
        try {
            await OfflineService.clearCache();
            console.log('[RoadmapService] Cache do roteiro limpo com sucesso.');
        } catch (error) {
            console.error('[RoadmapService] Erro ao limpar cache do roteiro:', error);
        }
    }
}