import apiClient from "../Context/ApiClient";
import { RoadmapResponse, RoadmapActivity } from '../Models/Roadmap';
import OfflineService from './OfflineService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CURRENT_ROADMAP_CACHE_KEY = 'current_roadmap';

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

            // Mapear diretamente os itens de results para a estrutura de activities esperada pela UI
            const processedActivities = processActivities(data.results);
            const response = {
                activities: processedActivities,
                total: data.count || 0,
                date: new Date().toISOString().split('T')[0]
            } as RoadmapResponse;
            console.log('[RoadmapService] Retornando atividades processadas:', response.activities.length);
            return response;
        }

        // Verifica se tem a estrutura direta com results ou activities (fallback)
        const activitiesArray = data.results || data.activities || [];
        if (Array.isArray(activitiesArray) && activitiesArray.length > 0) {
            console.log('[RoadmapService] Estrutura com atividades detectada');
            console.log('[RoadmapService] Número de atividades:', activitiesArray.length);
            console.log('[RoadmapService] Primeira atividade antes do processamento:', JSON.stringify(activitiesArray[0], null, 2));
            const processedActivities = processActivities(activitiesArray);
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
        console.log('[RoadmapService] === INICIANDO getCurrentRoadmap ===');
        console.log('[RoadmapService] 🔄 Force refresh:', forceRefresh);

        // Verificar conectividade com detalhes completos
        const networkState = await NetInfo.fetch();
        console.log('[RoadmapService] 🌐 Estado completo da rede:', {
            isConnected: networkState.isConnected,
            type: networkState.type,
            isInternetReachable: networkState.isInternetReachable,
            details: networkState.details
        });

        // Tentar buscar do servidor se houver conectividade
        const shouldTryOnline = networkState.isConnected || networkState.isInternetReachable;

        console.log('[RoadmapService] 📡 Decisão de busca:', {
            shouldTryOnline,
            reason: shouldTryOnline ? 'Rede disponível - tentando servidor' : 'Sem conexão - usando cache'
        });

        // Se não houver conexão e não for forçado, tentar cache primeiro
        if (!shouldTryOnline && !forceRefresh) {
            console.log('[RoadmapService] 📴 Sem conexão - buscando do cache...');
            const cachedRoadmap = await OfflineService.getCachedData<RoadmapResponse>(CURRENT_ROADMAP_CACHE_KEY);
            if (cachedRoadmap && cachedRoadmap.activities && cachedRoadmap.activities.length > 0) {
                console.log('[RoadmapService] ✅ Roteiro carregado do CACHE (offline)');
                console.log('[RoadmapService] 📦 Atividades no cache:', cachedRoadmap.activities.length);
                const validated = await this.validateRoadmapResponse(cachedRoadmap);
                return { ...validated, fromCache: true, offline: true };
            } else {
                console.warn('[RoadmapService] ⚠️ Sem conexão e sem cache disponível');
                throw new Error('Sem conexão com a internet. Por favor, conecte-se para carregar o roteiro.');
            }
        }

        try {
            // Tenta obter do cache primeiro (se não for forceRefresh)
            if (!forceRefresh) {
                const cachedRoadmap = await OfflineService.getCachedData<RoadmapResponse>(CURRENT_ROADMAP_CACHE_KEY);
                if (cachedRoadmap && cachedRoadmap.activities && cachedRoadmap.activities.length > 0) {
                    console.log('[RoadmapService] 💾 Cache encontrado com', cachedRoadmap.activities.length, 'atividades');
                    console.log('[RoadmapService] 🔄 Mas vamos buscar do servidor para atualizar...');
                    // Não retornar aqui - continuar para buscar do servidor
                } else if (cachedRoadmap) {
                    console.log('[RoadmapService] ⚠️ Cache encontrado mas vazio, buscando da API...');
                    await OfflineService.cacheData(CURRENT_ROADMAP_CACHE_KEY, null);
                } else {
                    console.log('[RoadmapService] 📭 Cache não encontrado, buscando da API...');
                }
            } else {
                console.log('[RoadmapService] 🔄 Force refresh ativado, ignorando cache e limpando...');
                await OfflineService.cacheData(CURRENT_ROADMAP_CACHE_KEY, null);
            }

            // Buscar na API
            console.log('[RoadmapService] 🚀 Buscando roteiro atual da API: /me/roadmap');

            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.get('/me/roadmaps');

            console.log('[RoadmapService] ✅ Resposta recebida do servidor!');
            console.log('[RoadmapService] 📊 Status da resposta:', response.status);
            console.log('[RoadmapService] 📦 Dados recebidos:', {
                hasData: !!response.data,
                dataType: typeof response.data,
                hasActivities: !!response.data?.activities,
                activitiesCount: response.data?.activities?.length || 0
            });

            // Valida a resposta da API
            console.log('[RoadmapService] 🔍 Validando dados recebidos...');
            const validatedData = await this.validateRoadmapResponse(response.data);
            console.log('[RoadmapService] ✅ Dados validados:', {
                activitiesCount: validatedData.activities.length
            });

            // Salva no cache
            await OfflineService.cacheData(CURRENT_ROADMAP_CACHE_KEY, validatedData);
            console.log('[RoadmapService] 💾 Roteiro salvo no cache.');

            return { ...validatedData, fromCache: false, offline: false };
        } catch (error: any) {
            console.error('[RoadmapService] ❌❌❌ ERRO ao buscar roteiro atual ❌❌❌');
            console.error('[RoadmapService] 🔴 Tipo do erro:', error?.constructor?.name || typeof error);
            console.error('[RoadmapService] 🔴 Mensagem:', error?.message);

            if (error.response) {
                console.error('[RoadmapService] 🔴 Status HTTP:', error.response.status);
                console.error('[RoadmapService] 🔴 Dados da resposta:', error.response.data);

                // Tratamento especial para 404 (sem roteiro para o dia)
                if (error.response.status === 404) {
                    console.log('[RoadmapService] ℹ️ Nenhum roteiro encontrado para hoje (404)');
                    // Retornar resposta vazia em vez de erro
                    return {
                        activities: [],
                        total: 0,
                        date: new Date().toISOString(),
                        fromCache: false,
                        offline: false
                    };
                }
            } else if (error.request) {
                console.error('[RoadmapService] 🔴 Requisição enviada mas sem resposta do servidor');
                console.error('[RoadmapService] 🔴 Request:', error.request);
            }

            // Em caso de erro de rede, tenta usar o cache como fallback
            console.warn('[RoadmapService] 🔄 Tentando usar cache como fallback...');
            const cachedRoadmap = await OfflineService.getCachedData<RoadmapResponse>(CURRENT_ROADMAP_CACHE_KEY);
            if (cachedRoadmap && cachedRoadmap.activities) {
                console.warn('[RoadmapService] ✅ Usando roteiro do CACHE como fallback');
                console.log('[RoadmapService] 📦 Atividades no cache:', cachedRoadmap.activities.length);
                const validated = await this.validateRoadmapResponse(cachedRoadmap);
                return { ...validated, fromCache: true, offline: true, error: error.message };
            }

            console.error('[RoadmapService] ❌ Sem cache disponível para fallback');
            this.handleApiError(error);
        }
    }

    /**
     * Busca roadmaps por mês e ano conforme documentação roadmap.md
     */
    static async getRoadmapsByMonth(month: number, year: number): Promise<any> {
        try {
            console.log('[RoadmapService] Buscando roadmaps por mês/ano conforme doc:', `/roadmaps?month=${month}&year=${year}`);

            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.get('/roadmaps', {
                params: { month, year }
            });

            console.log('[RoadmapService] Roadmaps recebidos:', JSON.stringify(response.data, null, 2));

            // Salva no cache
            await OfflineService.cacheData(CURRENT_ROADMAP_CACHE_KEY, response.data);

            return response.data;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao buscar atividades do roadmap:', error);
            this.handleApiError(error);
        }
    }

    /**
     * Cria um novo roadmap conforme documentação roadmap.md
     */
    static async createRoadmap(activity_id: number, start_date: string, end_date: string): Promise<any> {
        try {
            console.log('[RoadmapService] Criando roadmap conforme doc:', { activity_id, start_date, end_date });

            const payload = {
                activity_id,
                start_date,
                end_date
            };

            const response = await apiClient.post('/roadmaps', payload);
            console.log('[RoadmapService] Roadmap criado:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao criar roadmap:', error);
            this.handleApiError(error);
        }
    }

    /**
     * Atualiza um roadmap conforme documentação roadmap.md
     */
    static async updateRoadmap(roadmap_id: number, activity_id: number, start_date: string, end_date: string): Promise<any> {
        try {
            console.log('[RoadmapService] Atualizando roadmap conforme doc:', { roadmap_id, activity_id, start_date, end_date });

            const payload = {
                activity_id,
                start_date,
                end_date
            };

            const response = await apiClient.put(`/roadmaps/${roadmap_id}`, payload);
            console.log('[RoadmapService] Roadmap atualizado:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao atualizar roadmap:', error);
            this.handleApiError(error);
        }
    }

    /**
     * Deleta um roadmap conforme documentação roadmap.md
     */
    static async deleteRoadmap(roadmap_id: number, activity_id: number, start_date: string, end_date: string): Promise<any> {
        try {
            console.log('[RoadmapService] Deletando roadmap conforme doc:', { roadmap_id, activity_id, start_date, end_date });

            const payload = {
                activity_id,
                start_date,
                end_date
            };

            const response = await apiClient.delete(`/roadmaps/${roadmap_id}`, { data: payload });
            console.log('[RoadmapService] Roadmap deletado com sucesso');
            return response.data;
        } catch (error: any) {
            console.error('[RoadmapService] Erro ao deletar roadmap:', error);
            this.handleApiError(error);
        }
    }

    // ===============================================================
    // ENDPOINTS NÃO DOCUMENTADOS REMOVIDOS conforme solicitação
    // Use apenas os endpoints documentados no roadmap.md
    // ===============================================================





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




            // Usar apenas endpoints de activities (documentados)
            const possibleEndpoints = [
                `/activities/${activityId}/status`,
                `/activities/${activityId}`
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

            // Usar apenas endpoints de activities (documentados)
            const possibleEndpoints = [
                `/activities/${activityId}/notes`,
                `/activities/${activityId}`
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
     * Trata erros da API de forma consistente
     */
    private static handleApiError(error: any): never {
        console.log('[RoadmapService] 🔍 Analisando erro para gerar mensagem apropriada...');

        if (error.response) {
            const status = error.response.status;
            console.log('[RoadmapService] 📡 Erro com resposta HTTP:', status);

            switch (status) {
                case 401:
                    console.error('[RoadmapService] 🔐 Erro de autenticação (401)');
                    throw new Error('Token inválido ou expirado. Faça login novamente.');
                case 403:
                    console.error('[RoadmapService] 🚫 Erro de permissão (403)');
                    throw new Error('Você não tem permissão para acessar o roteiro.');
                case 404:
                    console.log('[RoadmapService] ℹ️ Roteiro não encontrado (404)');
                    throw new Error('Nenhum roteiro encontrado para o dia atual.');
                case 422:
                    console.error('[RoadmapService] ⚠️ Dados inválidos (422)');
                    throw new Error('Dados inválidos enviados para o servidor.');
                case 500:
                case 502:
                case 503:
                case 504:
                    console.error('[RoadmapService] 🔥 Erro do servidor (5xx):', status);
                    throw new Error('Erro no servidor. Tente novamente em alguns instantes.');
                default:
                    console.error('[RoadmapService] ❓ Erro HTTP desconhecido:', status);
                    throw new Error(`Erro do servidor: ${status}. Por favor, tente novamente.`);
            }
        } else if (error.request) {
            console.error('[RoadmapService] 🌐 Erro de rede - sem resposta do servidor');
            throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
        } else {
            console.error('[RoadmapService] ⚠️ Erro inesperado:', error.message);
            throw new Error(error.message || 'Erro inesperado ao carregar roteiro.');
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