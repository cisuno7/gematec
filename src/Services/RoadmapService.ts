import apiClient from "../Context/ApiClient";
import { RoadmapResponse, RoadmapActivity } from '../Models/Roadmap';
import OfflineService from './OfflineService';
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
    private static async validateRoadmapResponse(data: any): Promise<RoadmapResponse> {
        console.log('[RoadmapService] === VALIDANDO RESPOSTA ===');
        console.log('[RoadmapService] Tipo de data:', typeof data);
        console.log('[RoadmapService] Data recebida:', JSON.stringify(data, null, 2));

        if (!data || typeof data !== 'object') {
            console.error('[RoadmapService] Data inválida:', data);
            throw new Error('Resposta inválida da API');
        }

        // Função para mapear tipos de atividade do back-end para o front-end
        const mapActivityType = (activityType: any): 'maintenance' | 'repair' | 'inspection' | 'installation' => {
            console.log('[RoadmapService] Mapeando tipo de atividade:', activityType);

            if (!activityType) {
                console.log('[RoadmapService] Tipo de atividade vazio, usando default: maintenance');
                return 'maintenance';
            }

            // Se for um objeto com slug (estrutura completa do tipo de atividade)
            if (typeof activityType === 'object' && activityType.slug) {
                console.log('[RoadmapService] Tipo de atividade é objeto com slug:', activityType.slug);
                switch (activityType.slug) {
                    case 'pmoc':
                        return 'maintenance';
                    case 'service_order':
                        return 'repair';
                    case 'technical_assistance':
                        return 'inspection';
                    case 'installation':
                        return 'installation';
                    case 'instalation':
                        return 'installation';
                    default:
                        console.log('[RoadmapService] Slug desconhecido, usando default: maintenance');
                        return 'maintenance';
                }
            }

            // Se for uma string (slug direto)
            if (typeof activityType === 'string') {
                console.log('[RoadmapService] Tipo de atividade é string:', activityType);
                switch (activityType) {
                    case 'pmoc':
                        return 'maintenance';
                    case 'service_order':
                        return 'repair';
                    case 'technical_assistance':
                        return 'inspection';
                    case 'installation':
                        return 'installation';
                    case 'instalation':
                        return 'installation';
                    default:
                        console.log('[RoadmapService] String desconhecida, usando default: maintenance');
                        return 'maintenance';
                }
            }

            // Se for um objeto com name (estrutura alternativa)
            if (typeof activityType === 'object' && activityType.name) {
                console.log('[RoadmapService] Tipo de atividade é objeto com name:', activityType.name);
                const name = activityType.name.toLowerCase();
                if (name.includes('pmoc')) return 'maintenance';
                if (name.includes('serviço') || name.includes('service') || name.includes('ordem')) return 'repair';
                if (name.includes('assistência') || name.includes('assistance') || name.includes('técnica')) return 'inspection';
                if (name.includes('instalação') || name.includes('instalacao') || name.includes('installation') || name.includes('instala')) return 'installation';
            }

            console.log('[RoadmapService] Tipo de atividade não reconhecido, usando default: maintenance');
            return 'maintenance';
        };

        // Função para processar e mapear atividades
        const processActivities = (activities: any[]) => {
            return activities.map(activity => {
                // Verificar se os dados estão aninhados em um objeto 'activity'
                const activityData = activity.activity || activity;

                console.log('[RoadmapService] === PROCESSANDO ATIVIDADE ===');
                console.log('[RoadmapService] Dados brutos da atividade:', JSON.stringify(activity, null, 2));
                console.log('[RoadmapService] Dados extraídos:', {
                    id: activityData.id,
                    name: activityData.name,
                    title: activityData.title,
                    activity_type: activityData.activity_type,
                    type: activityData.type,
                    status: activityData.status,
                    client: activityData.client,
                    start_date: activityData.start_date,
                    end_date: activityData.end_date
                });

                console.log('[RoadmapService] Mapeando tipo de atividade...');
                console.log('[RoadmapService] activity_type:', activityData.activity_type);
                console.log('[RoadmapService] type:', activityData.type);
                const mappedType = mapActivityType(activityData.activity_type || activityData.type);
                console.log('[RoadmapService] Tipo mapeado:', mappedType);

                // Extrair o nome base da atividade (remover timestamp e tag do equipamento)
                const extractBaseName = (fullName: string) => {
                    if (!fullName) return 'Atividade sem título';

                    console.log('[RoadmapService] Extraindo nome base de:', fullName);

                    // Remover timestamp (formato: YYYY-MM-DDTHH-MM-SS)
                    const withoutTimestamp = fullName.replace(/\s\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/, '');
                    console.log('[RoadmapService] Sem timestamp:', withoutTimestamp);

                    // Remover tag do equipamento (formato: " - TAG")
                    const withoutTag = withoutTimestamp.replace(/\s-\s[A-Z0-9]+$/, '');
                    console.log('[RoadmapService] Sem tag:', withoutTag);

                    const result = withoutTag.trim() || 'Atividade sem título';
                    console.log('[RoadmapService] Nome base final:', result);

                    return result;
                };

                console.log('[RoadmapService] Extraindo título...');
                console.log('[RoadmapService] activityData.name:', activityData.name);
                console.log('[RoadmapService] activityData.title:', activityData.title);
                const mappedTitle = extractBaseName(activityData.name || activityData.title);
                console.log('[RoadmapService] Título extraído:', mappedTitle);
                const mappedStatus = activityData.status || 'created';

                console.log('[RoadmapService] Atividade mapeada:', {
                    id: activityData.id,
                    title: mappedTitle,
                    type: mappedType,
                    status: mappedStatus
                });

                return {
                    ...activity,
                    id: activity.id, // Usar o ID do roadmap, não da atividade
                    activityId: activityData.id, // ID da atividade original
                    type: mappedType,
                    title: mappedTitle,
                    status: mappedStatus,
                    clientName: activityData.client?.name || 'Cliente não informado',
                    address: activityData.address || 'Endereço não informado',
                    scheduledTime: activityData.start_date || activity.start_date || new Date().toISOString(),
                    createdAt: activityData.created_at || new Date().toISOString(),
                    updatedAt: activityData.updated_at || new Date().toISOString()
                };
            });
        };

        // Verifica se é uma resposta paginada com roadmaps
        if (data.results && Array.isArray(data.results)) {
            console.log('[RoadmapService] Resposta paginada detectada');
            console.log('[RoadmapService] Número de resultados:', data.results.length);

            // Se os resultados são roadmaps (não atividades), precisamos buscar as atividades
            if (data.results.length > 0 && data.results[0].start_date) {
                console.log('[RoadmapService] Roadmaps encontrados, buscando atividades...');
                console.log('[RoadmapService] Primeiro roadmap:', JSON.stringify(data.results[0], null, 2));

                // Buscar atividades do primeiro roadmap
                try {
                    const firstRoadmap = data.results[0];
                    const activitiesResponse = await this.getRoadmapActivities(firstRoadmap.id);
                    console.log('[RoadmapService] Atividades do roadmap obtidas:', activitiesResponse.activities.length);
                    return activitiesResponse;
                } catch (error) {
                    console.error('[RoadmapService] Erro ao buscar atividades do roadmap:', error);
                    // Retorna estrutura vazia se não conseguir buscar as atividades
                    const emptyResponse = {
                        activities: [],
                        total: 0,
                        date: new Date().toISOString().split('T')[0]
                    } as RoadmapResponse;
                    console.log('[RoadmapService] Retornando resposta vazia devido a erro');
                    return emptyResponse;
                }
            }

            // Se são atividades diretas
            console.log('[RoadmapService] Atividades diretas detectadas');
            const processedActivities = processActivities(data.results);
            const response = {
                activities: processedActivities,
                total: data.count || 0,
                date: new Date().toISOString().split('T')[0]
            } as RoadmapResponse;
            console.log('[RoadmapService] Retornando atividades processadas:', response.activities.length);
            return response;
        }

        // Verifica se tem a estrutura direta com activities
        if (Array.isArray(data.activities)) {
            console.log('[RoadmapService] Estrutura direta com activities detectada');
            console.log('[RoadmapService] Número de atividades:', data.activities.length);
            console.log('[RoadmapService] Primeira atividade antes do processamento:', JSON.stringify(data.activities[0], null, 2));
            const processedActivities = processActivities(data.activities);
            console.log('[RoadmapService] Primeira atividade após processamento:', JSON.stringify(processedActivities[0], null, 2));
            return {
                ...data,
                activities: processedActivities
            } as RoadmapResponse;
        }

        // Verifica se a resposta é um array direto de atividades
        if (Array.isArray(data)) {
            console.log('[RoadmapService] Array direto de atividades detectado');
            console.log('[RoadmapService] Número de atividades:', data.length);
            const processedActivities = processActivities(data);
            return {
                activities: processedActivities,
                total: data.length,
                date: new Date().toISOString().split('T')[0]
            } as RoadmapResponse;
        }

        console.error('[RoadmapService] Estrutura de dados não reconhecida');
        console.error('[RoadmapService] Chaves disponíveis:', Object.keys(data));
        throw new Error('Dados de atividades inválidos');
    }

    /**
     * Busca o roteiro atual do técnico para o dia.
     * Primeiro tenta buscar do cache, se não encontrar, busca na API e atualiza o cache.
     */
    static async getCurrentRoadmap(forceRefresh: boolean = false): Promise<RoadmapResponse> {
        try {
            console.log('[RoadmapService] === INICIANDO getCurrentRoadmap ===');

            // Tenta obter do cache primeiro (se não for forceRefresh)
            if (!forceRefresh) {
                const cachedRoadmap = await OfflineService.getCachedData<RoadmapResponse>(CURRENT_ROADMAP_CACHE_KEY);
                if (cachedRoadmap && cachedRoadmap.activities && cachedRoadmap.activities.length > 0) {
                    console.log('[RoadmapService] Roteiro atual carregado do cache.');
                    console.log('[RoadmapService] Cache data:', JSON.stringify(cachedRoadmap, null, 2));
                    // Sempre reprocessar os dados do cache para garantir mapeamento correto
                    return await this.validateRoadmapResponse(cachedRoadmap);
                } else if (cachedRoadmap) {
                    console.log('[RoadmapService] Cache encontrado mas vazio, buscando da API...');
                    // Limpa o cache vazio para forçar busca da API
                    await OfflineService.cacheData(CURRENT_ROADMAP_CACHE_KEY, null);
                } else {
                    console.log('[RoadmapService] Cache não encontrado, buscando da API...');
                }
            } else {
                console.log('[RoadmapService] Force refresh ativado, ignorando cache...');
                // Limpa o cache para forçar busca da API
                await OfflineService.cacheData(CURRENT_ROADMAP_CACHE_KEY, null);
            }

            // Se não houver cache, busca na API
            console.log('[RoadmapService] Buscando roteiro atual da API: /me/roadmap');

            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.get('/me/roadmap');

            console.log('[RoadmapService] Status da resposta:', response.status);
            console.log('[RoadmapService] Headers da resposta:', response.headers);
            console.log('[RoadmapService] Resposta da API:', JSON.stringify(response.data, null, 2));

            // Valida a resposta da API
            const validatedData = await this.validateRoadmapResponse(response.data);

            // Salva no cache
            await OfflineService.cacheData(CURRENT_ROADMAP_CACHE_KEY, validatedData);
            console.log('[RoadmapService] Roteiro salvo no cache.');

            return validatedData;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao buscar roteiro atual:', error);

            // Em caso de erro de rede, tenta usar o cache como fallback
            const cachedRoadmap = await OfflineService.getCachedData<RoadmapResponse>(CURRENT_ROADMAP_CACHE_KEY);
            if (cachedRoadmap) {
                console.warn('[RoadmapService] Usando roteiro do cache como fallback devido a erro de rede.');
                return await this.validateRoadmapResponse(cachedRoadmap);
            }

            this.handleApiError(error);
        }
    }

    /**
     * Busca as atividades de um roadmap específico
     */
    static async getRoadmapActivities(roadmapId: number): Promise<RoadmapResponse> {
        try {
            console.log('[RoadmapService] Buscando atividades do roadmap:', `/roadmaps/${roadmapId}/activities`);

            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.get(`/roadmaps/${roadmapId}/activities`);
            console.log('[RoadmapService] Atividades do roadmap:', JSON.stringify(response.data, null, 2));

            // Valida e retorna as atividades
            const validatedData = await this.validateRoadmapResponse(response.data);

            // Salva no cache
            await OfflineService.cacheData(CURRENT_ROADMAP_CACHE_KEY, validatedData);

            return validatedData;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao buscar atividades do roadmap:', error);
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

            console.log('[RoadmapService] Buscando roteiro por data:', `/roadmaps/${date}`);

            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.get(`/roadmaps/${date}`);
            return await this.validateRoadmapResponse(response.data);
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


            console.log('[RoadmapService] Buscando equipamentos da atividade:', `/roadmaps/activities/${activityId}/equipment`);

            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.get(`/roadmaps/activities/${activityId}/equipment`);
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


            console.log('[RoadmapService] Buscando questões:', `/roadmaps/activities/${activityId}/equipment/${equipmentId}/questions`);


            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.get(`/roadmaps/activities/${activityId}/equipment/${equipmentId}/questions`);
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




            console.log('[RoadmapService] Enviando respostas do equipamento:', `/roadmaps/activities/${activityId}/equipment/${equipmentId}/answers`);

            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.post(`/roadmaps/activities/${activityId}/equipment/${equipmentId}/answers`, { answers });

            // Limpa o cache para forçar atualização
            await this.clearEquipmentCache(activityId, equipmentId);

            return response.data;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao enviar respostas do equipamento:', error);
            this.handleApiError(error);
        }
    }



    /**
     * Atualiza o status de uma atividade do roteiro
     */
    static async updateActivityStatus(activityId: number, status: string): Promise<RoadmapActivity> {
        try {
            console.log('[RoadmapService] === ATUALIZANDO STATUS ===');
            console.log('[RoadmapService] Activity ID recebido:', activityId);
            console.log('[RoadmapService] Status recebido:', status);

            // Valida os parâmetros
            if (!activityId || activityId <= 0) {
                throw new Error('ID da atividade inválido');
            }

            const validStatuses = ['created', 'open', 'pending', 'close', 'archived', 'in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Status inválido. Use um dos seguintes: ${validStatuses.join(', ')}`);
            }




            // Tentar diferentes endpoints possíveis
            const possibleEndpoints = [
                `/activities/${activityId}/status`,
                `/roadmaps/activities/${activityId}/status`,
                `/activities/${activityId}`,
                `/roadmaps/activities/${activityId}`
            ];

            console.log('[RoadmapService] Tentando endpoints possíveis:', possibleEndpoints);

            let response;
            let endpointUsed = '';

            for (const endpoint of possibleEndpoints) {
                try {
                    console.log('[RoadmapService] Tentando endpoint:', endpoint);
                    response = await apiClient.patch(endpoint, { status });
                    endpointUsed = endpoint;
                    console.log('[RoadmapService] Endpoint funcionou:', endpoint);
                    break;
                } catch (error: any) {
                    console.log('[RoadmapService] Endpoint falhou:', endpoint, 'Status:', error.response?.status);
                    if (error.response?.status === 404) {
                        continue; // Tentar próximo endpoint
                    } else {
                        throw error; // Outro erro, não continuar
                    }
                }
            }

            if (!response) {
                throw new Error('Nenhum endpoint válido encontrado para atualização de status');
            }

            console.log('[RoadmapService] Endpoint usado:', endpointUsed);
            console.log('[RoadmapService] Payload enviado:', { status });

            console.log('[RoadmapService] Resposta da API:', response.data);

            // Limpa o cache do roteiro atual para forçar atualização
            await OfflineService.clearCache();

            return response.data;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao atualizar status da atividade:', error);
            this.handleApiError(error);
        }
    }

    /**
     * Adiciona notas a uma atividade do roadmap
     */
    static async addNotesToActivity(activityId: number, notes: string): Promise<RoadmapActivity> {
        try {
            console.log('[RoadmapService] === ADICIONANDO NOTAS ===');
            console.log('[RoadmapService] Activity ID:', activityId);
            console.log('[RoadmapService] Notes:', notes);

            // Valida os parâmetros
            if (!activityId || activityId <= 0) {
                throw new Error('ID da atividade inválido');
            }

            if (!notes || notes.trim() === '') {
                throw new Error('Notas não podem estar vazias');
            }

            // Tentar diferentes endpoints possíveis
            const possibleEndpoints = [
                `/activities/${activityId}/notes`,
                `/roadmaps/activities/${activityId}/notes`,
                `/activities/${activityId}`,
                `/roadmaps/activities/${activityId}`
            ];

            console.log('[RoadmapService] Tentando endpoints possíveis:', possibleEndpoints);

            let response;
            let endpointUsed = '';

            for (const endpoint of possibleEndpoints) {
                try {
                    console.log('[RoadmapService] Tentando endpoint:', endpoint);

                    // Para endpoints específicos de notas, usar POST; para endpoints gerais, usar PATCH
                    const method = endpoint.includes('/notes') ? 'post' : 'patch';
                    const payload = endpoint.includes('/notes') ? { notes } : { notes };

                    response = await apiClient[method](endpoint, payload);
                    endpointUsed = endpoint;
                    console.log('[RoadmapService] Endpoint funcionou:', endpoint);
                    break;
                } catch (error: any) {
                    console.log('[RoadmapService] Endpoint falhou:', endpoint, 'Status:', error.response?.status);
                    if (error.response?.status === 404) {
                        continue; // Tentar próximo endpoint
                    } else {
                        throw error; // Outro erro, não continuar
                    }
                }
            }

            if (!response) {
                throw new Error('Nenhum endpoint válido encontrado para adição de notas');
            }

            console.log('[RoadmapService] Endpoint usado:', endpointUsed);
            console.log('[RoadmapService] Payload enviado:', { notes });
            console.log('[RoadmapService] Resposta da API:', response.data);

            // Limpa o cache do roteiro atual para forçar atualização
            await OfflineService.clearCache();

            return response.data;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao adicionar notas à atividade:', error);
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
                    // Para 404 no roadmap, retorna resposta vazia em vez de erro
                    throw new Error('Nenhum roteiro encontrado para o dia atual.');
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