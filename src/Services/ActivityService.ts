import axios from "axios";
import { Activity } from "../Models/Activity";
import apiClient from "../Context/ApiClient";
import { ActivityDynamicField } from "../Models/ActivityDynamicField";
import { ActivityAnswer } from "../Models/ActivityAnswer";
import { UploadFile } from "../Models/UploadFile";
import NetInfo from '@react-native-community/netinfo';
import OfflineService from './OfflineService';

export default class ActivityService {
    // 1. Buscar atividades globais com filtros
    static async fetchAllActivities(params: {
        page?: number;
        per_page?: number;
        activity_type_slug?: string;
        status?: string[];
        token: string;
    }): Promise<{ results: Activity[]; count: number }> {
        // Preparar query fora do try para ser acessível no catch
        const query: any = {
            page: params.page,
            per_page: params.per_page,
            activity_type_slug: params.activity_type_slug,
        };

        // Adicionar status como parâmetros múltiplos conforme documentação da API
        if (params.status && params.status.length > 0) {
            params.status.forEach((status, index) => {
                query[`status[${index}]`] = status;
            });
        }

        try {
            // Verificar conectividade
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);

            if (isConnected) {
                console.log('[ActivityService] Modo online, buscando da API');
                console.log('[ActivityService] Buscando atividades em /activities com query:', query);
                const response = await apiClient.get('/activities', {
                    headers: { Authorization: `Bearer ${params.token}` },
                    params: query,
                });

                console.log('[ActivityService] Resposta recebida:', response.data);
                console.log('[ActivityService] Estrutura da resposta:', {
                    hasResults: !!response.data.results,
                    resultsLength: response.data.results?.length || 0,
                    count: response.data.count,
                    hasData: !!response.data
                });

                // Salvar no cache
                await OfflineService.cacheData('activities_list', response.data);
                console.log('[ActivityService] Atividades salvas no cache');

                return response.data;
            } else {
                console.log('[ActivityService] Modo offline, buscando do cache');
                const cachedActivities = await OfflineService.getCachedData<{ results: Activity[]; count: number }>('activities_list');
                if (cachedActivities) {
                    console.log('[ActivityService] Atividades carregadas do cache');
                    return cachedActivities;
                } else {
                    throw new Error("Dados não disponíveis offline. Conecte-se à internet para carregar.");
                }
            }
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar em /activities:', error);
            console.error('[ActivityService] Status:', error.response?.status);
            console.error('[ActivityService] Dados:', error.response?.data);

            // Se falhar, tentar endpoint alternativo
            try {
                console.log('[ActivityService] Tentando endpoint alternativo /activity');
                const response = await apiClient.get('/activity', {
                    headers: { Authorization: `Bearer ${params.token}` },
                    params: query,
                });

                // Salvar no cache
                await OfflineService.cacheData('activities_list', response.data);
                return response.data;
            } catch (altError: any) {
                console.error('[ActivityService] Erro também no endpoint alternativo:', altError);

                // Tentar usar cache como fallback
                const cachedActivities = await OfflineService.getCachedData<{ results: Activity[]; count: number }>('activities_list');
                if (cachedActivities) {
                    console.log('[ActivityService] Usando cache como fallback');
                    return cachedActivities;
                }

                // Retornar estrutura vazia se ambos falharem
                return {
                    results: [],
                    count: 0
                };
            }
        }
    }

    // 2. Buscar equipamentos vinculados a uma atividade
    static async fetchActivityEquipments(activityId: number, params: { token: string }): Promise<any> {
        try {
            // Verificar conectividade
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);
            const cacheKey = `activity_equipments_${activityId}`;

            if (isConnected) {
                console.log('[ActivityService] Modo online, buscando equipamentos da atividade:', activityId);
                let response;
                let lastError: any = null;

                // Tenta endpoint principal conforme documentação
                try {
                    response = await apiClient.get(`/activities/${activityId}/equipments`, {
                        headers: { Authorization: `Bearer ${params.token}` },
                    });
                } catch (e: any) {
                    lastError = e;
                    console.warn('[ActivityService] /activities/:id/equipments retornou erro', e?.response?.status);
                }

                // Fallback 1: alguns backends usam /roadmaps/activities/:id/equipment
                if (!response) {
                    try {
                        response = await apiClient.get(`/roadmaps/activities/${activityId}/equipment`, {
                            headers: { Authorization: `Bearer ${params.token}` },
                        });
                        console.log('[ActivityService] Usando fallback /roadmaps/activities/:id/equipment');
                    } catch (e: any) {
                        lastError = e;
                        console.warn('[ActivityService] Fallback /roadmaps/activities/:id/equipment falhou', e?.response?.status);
                    }
                }

                // Fallback 2: alguns backends usam singular /activities/:id/equipment
                if (!response) {
                    try {
                        response = await apiClient.get(`/activities/${activityId}/equipment`, {
                            headers: { Authorization: `Bearer ${params.token}` },
                        });
                        console.log('[ActivityService] Usando fallback /activities/:id/equipment');
                    } catch (e: any) {
                        lastError = e;
                        console.warn('[ActivityService] Fallback /activities/:id/equipment falhou', e?.response?.status);
                    }
                }

                if (!response) {
                    // Se nenhum endpoint funcionou, lança o último erro
                    if (lastError) throw lastError;
                    throw new Error('Nenhum endpoint válido para carregar equipamentos da atividade.');
                }

                console.log('[ActivityService] Equipamentos recebidos:', response.data);

                // Salvar no cache
                await OfflineService.cacheData(cacheKey, response.data);
                console.log('[ActivityService] Equipamentos salvos no cache');

                return response.data;
            } else {
                console.log('[ActivityService] Modo offline, buscando equipamentos do cache');
                const cachedEquipments = await OfflineService.getCachedData(cacheKey);
                if (cachedEquipments) {
                    console.log('[ActivityService] Equipamentos carregados do cache');
                    return cachedEquipments;
                } else {
                    throw new Error("Dados não disponíveis offline. Conecte-se à internet para carregar.");
                }
            }
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar equipamentos da atividade:', error);
            console.error('[ActivityService] Status:', error.response?.status);
            console.error('[ActivityService] Dados:', error.response?.data);

            // Se for erro de JSON parse, tentar ler o texto da resposta
            if (error.message?.includes('JSON Parse error')) {
                try {
                    const responseText = await error.response?.text();
                    console.error('[ActivityService] Resposta em texto:', responseText);
                } catch (textError) {
                    console.error('[ActivityService] Erro ao ler resposta em texto:', textError);
                }
            }

            // Tentar usar cache como fallback
            const cacheKey = `activity_equipments_${activityId}`;
            const cachedEquipments = await OfflineService.getCachedData(cacheKey);
            if (cachedEquipments) {
                console.log('[ActivityService] Usando cache como fallback');
                return cachedEquipments;
            }

            // Retornar estrutura vazia em caso de erro
            return {
                results: [],
                count: 0
            };
        }
    }

    // 3. Iniciar/fechar atividade em equipamento
    static async patchActivityEquipment(
        activityId: number,
        activityEquipmentId: number,
        data: any,
        token: string
    ): Promise<any> {
        try {
            // Verificar conectividade
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);

            if (isConnected) {
                console.log('[ActivityService] Modo online, iniciando/fechando atividade no equipamento:', {
                    activityId,
                    activityEquipmentId,
                    data
                });

                const response = await apiClient.patch(`/activities/${activityId}/equipments/${activityEquipmentId}`, data, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                console.log('[ActivityService] Resposta do patch:', response.data);
                return response.data;
            } else {
                console.log('[ActivityService] Modo offline, salvando mudança de status na fila');

                // Salvar na fila offline
                await OfflineService.addRequestToQueue({
                    type: 'activity_status_update',
                    payload: {
                        context: {
                            activityId,
                            activityEquipmentId
                        },
                        status: data.status
                    }
                });

                console.log('[ActivityService] Mudança de status salva na fila offline');
                return { success: true, offline: true };
            }
        } catch (error: any) {
            console.error('[ActivityService] Erro ao iniciar/fechar atividade:', error);
            console.error('[ActivityService] Status:', error.response?.status);
            console.error('[ActivityService] Dados:', error.response?.data);
            console.error('[ActivityService] URL:', error.config?.url);
            console.error('[ActivityService] Payload:', error.config?.data);

            throw error;
        }
    }

    // 4. Buscar questões do questionário
    static async fetchActivityQuestions(activityPlanId: number, versionId: number, token: string): Promise<ActivityDynamicField[]> {
        try {
            // Verificar conectividade
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);
            const cacheKey = `activity_questions_${activityPlanId}_${versionId}`;

            if (isConnected) {
                console.log('[ActivityService] Modo online, buscando questões para Activity Plan:', activityPlanId, 'Version:', versionId);

                const response = await apiClient.get(`/activity_plans/${activityPlanId}/versions/${versionId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                console.log('[ActivityService] Resposta da API de questões:', response.data);

                if (!response.data.questions) {
                    console.warn('[ActivityService] Campo "questions" não encontrado na resposta');
                    return [];
                }

                // Adicionar has_upload para algumas questões para teste
                const questionsWithUpload = response.data.questions.map((question: any, index: number) => ({
                    ...question,
                    has_upload: index === 0 || index === 1 // Primeira e segunda questão terão upload obrigatório
                }));

                console.log('[ActivityService] Questões com has_upload adicionado:', questionsWithUpload);

                // Salvar no cache
                await OfflineService.cacheData(cacheKey, questionsWithUpload);
                console.log('[ActivityService] Questões salvas no cache');

                return questionsWithUpload;
            } else {
                console.log('[ActivityService] Modo offline, buscando questões do cache');
                const cachedQuestions = await OfflineService.getCachedData<ActivityDynamicField[]>(cacheKey);
                if (cachedQuestions) {
                    console.log('[ActivityService] Questões carregadas do cache');
                    return cachedQuestions;
                } else {
                    throw new Error("Questões não disponíveis offline. Conecte-se à internet para carregar.");
                }
            }
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar questões:', error);
            console.error('[ActivityService] Status:', error.response?.status);
            console.error('[ActivityService] Dados:', error.response?.data);

            // Tentar usar cache como fallback
            const cacheKey = `activity_questions_${activityPlanId}_${versionId}`;
            const cachedQuestions = await OfflineService.getCachedData<ActivityDynamicField[]>(cacheKey);
            if (cachedQuestions) {
                console.log('[ActivityService] Usando cache como fallback');
                return cachedQuestions;
            }

            throw error;
        }
    }

    // 4.1. Buscar respostas salvas do questionário
    static async fetchActivityAnswers(activityId: number, activityEquipmentId: number, token: string): Promise<any> {
        try {
            // Verificar conectividade
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);
            const cacheKey = `activity_answers_${activityId}_${activityEquipmentId}`;

            if (isConnected) {
                console.log('[ActivityService] Modo online, buscando respostas salvas para Activity:', activityId, 'Equipment:', activityEquipmentId);

                const response = await apiClient.get(`/activities/${activityId}/equipments/${activityEquipmentId}/answers`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                console.log('[ActivityService] Resposta da API de respostas salvas:', response.data);

                // Salvar no cache
                await OfflineService.cacheData(cacheKey, response.data);
                console.log('[ActivityService] Respostas salvas no cache');

                return response.data;
            } else {
                console.log('[ActivityService] Modo offline, buscando respostas do cache');
                const cachedAnswers = await OfflineService.getCachedData(cacheKey);
                if (cachedAnswers) {
                    console.log('[ActivityService] Respostas carregadas do cache');
                    return cachedAnswers;
                } else {
                    console.log('[ActivityService] Nenhuma resposta encontrada no cache');
                    return [];
                }
            }
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar respostas salvas:', error);
            console.error('[ActivityService] Status:', error.response?.status);
            console.error('[ActivityService] Dados:', error.response?.data);

            // Tentar usar cache como fallback
            const cacheKey = `activity_answers_${activityId}_${activityEquipmentId}`;
            const cachedAnswers = await OfflineService.getCachedData(cacheKey);
            if (cachedAnswers) {
                console.log('[ActivityService] Usando cache como fallback');
                return cachedAnswers;
            }

            // Retornar array vazio se não houver cache
            return [];
        }
    }

    // 5. Enviar respostas do questionário
    static async postActivityAnswers(
        activityId: number,
        activityEquipmentId: number,
        answers: ActivityAnswer[],
        token: string
    ): Promise<any> {
        // Verificar conectividade
        const isConnected = await NetInfo.fetch().then(state => state.isConnected);

        if (isConnected) {
            try {
                // Enviar cada resposta individualmente conforme documentação da API
                const results = [];

                for (const answer of answers) {
                    // Verificar se há uploads para determinar o formato
                    const hasUploads = answer.uploads && answer.uploads.length > 0;

                    if (hasUploads) {
                        // Usar FormData para uploads
                        const formData = new FormData();

                        formData.append(`question_id`, answer.question_id.toString());
                        formData.append(`value`, answer.value.toString());

                        if (answer.justification) {
                            formData.append(`justificação`, answer.justification);
                        }

                        answer.uploads!.forEach((file, fileIdx) => {
                            const fileData = {
                                uri: file.uri,
                                name: file.name || `upload_${Date.now()}_${fileIdx}.jpg`,
                                type: file.type || 'image/jpeg',
                            };
                            formData.append(`uploads[${fileIdx}]`, fileData as any);
                        });

                        console.log('[ActivityService] Enviando FormData com uploads:', {
                            question_id: answer.question_id,
                            value: answer.value,
                            justification: answer.justification,
                            uploads_count: answer.uploads?.length || 0
                        });

                        const response = await apiClient.post(`/activities/${activityId}/equipments/${activityEquipmentId}/answers`, formData, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                // Deixar o axios definir o Content-Type para FormData
                            },
                        });

                        results.push(response.data);
                    } else {
                        // Usar URL-encoded para dados sem uploads
                        const urlEncodedData = new URLSearchParams();

                        urlEncodedData.append('question_id', answer.question_id.toString());
                        urlEncodedData.append('value', answer.value.toString());

                        if (answer.justification) {
                            urlEncodedData.append('justificação', answer.justification);
                        }

                        console.log('[ActivityService] Enviando URL-encoded sem uploads:', {
                            question_id: answer.question_id,
                            value: answer.value,
                            justification: answer.justification
                        });

                        const response = await apiClient.post(`/activities/${activityId}/equipments/${activityEquipmentId}/answers`, urlEncodedData, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/x-www-form-urlencoded",
                            },
                        });

                        results.push(response.data);
                    }
                }

                return results;
            } catch (error) {
                console.error('[ActivityService] Erro ao enviar respostas:', error);
                throw error;
            }
        } else {
            console.log('[ActivityService] Modo offline, salvando resposta na fila');

            // Salvar na fila offline
            await OfflineService.addRequestToQueue({
                type: 'activity_answer',
                payload: {
                    context: {
                        activityId,
                        activityEquipmentId
                    },
                    answers: answers
                }
            });

            console.log('[ActivityService] Resposta salva na fila offline');
            return { success: true, offline: true };
        }
    }

    // 6. Criar atividade
    static async createActivity(data: any, token: string): Promise<any> {
        try {
            // Buscar informações do equipamento para obter client_id
            let clientId = data.client_id;
            if (!clientId && data.equipment_id) {
                try {
                    console.log('[ActivityService] Buscando client_id do equipamento:', data.equipment_id);
                    const equipmentResponse = await apiClient.get(`/equipments/${data.equipment_id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    clientId = equipmentResponse.data.client?.id;
                    console.log('[ActivityService] Client ID obtido:', clientId);
                } catch (equipmentError) {
                    console.error('[ActivityService] Erro ao buscar equipamento:', equipmentError);
                }
            }

            // Converter formato de data de YYYY-MM-DD para DD/MM/YYYY
            const convertDateFormat = (dateString: string) => {
                if (!dateString) return null;
                const parts = dateString.split('-');
                if (parts.length === 3) {
                    return `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
                return dateString;
            };

            // Preparar dados para envio
            const payload = {
                name: data.name,
                activity_type_id: data.activity_type_id,
                client_id: clientId,
                start_date: convertDateFormat(data.start_date),
                end_date: data.end_date ? convertDateFormat(data.end_date) : convertDateFormat(data.start_date), // Se não tiver end_date, usar start_date
            };

            // Validar dados obrigatórios
            if (!payload.name || !payload.activity_type_id || !payload.start_date) {
                throw new Error("Nome, tipo de atividade e data de início são obrigatórios.");
            }

            if (!payload.client_id) {
                throw new Error("ID do cliente é obrigatório.");
            }

            console.log('[ActivityService] Criando atividade com dados:', payload);

            const response = await apiClient.post('/activities', payload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log('[ActivityService] Atividade criada com sucesso:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] Erro ao criar atividade:', error);

            if (error.response) {
                console.error('[ActivityService] Erro no servidor:');
                console.error('Status:', error.response.status);
                console.error('Dados:', error.response.data);
                console.error('Headers:', error.response.headers);

                if (error.response.status === 400) {
                    // Verificar se é erro de nome único
                    if (error.response.data?.errors && error.response.data.errors.some((err: any) => err.attr === 'name' && err.code === 'unique')) {
                        throw new Error("Já existe uma atividade com este nome. Por favor, escolha um nome diferente.");
                    }

                    const errorMessage = error.response.data?.message || error.response.data?.error || "Dados inválidos";
                    throw new Error(`Erro de validação: ${errorMessage}`);
                } else if (error.response.status === 401) {
                    throw new Error("Token de acesso inválido ou expirado.");
                } else if (error.response.status === 422) {
                    const validationErrors = error.response.data?.errors || {};
                    const errorMessages = Object.values(validationErrors).flat().join(", ");
                    throw new Error(`Erro de validação: ${errorMessages}`);
                } else {
                    throw new Error(error.response.data?.message || "Erro inesperado no servidor.");
                }
            } else if (error.request) {
                console.error('[ActivityService] Erro de rede:', error.request);
                throw new Error("Erro de conexão. Verifique sua internet.");
            } else {
                console.error('[ActivityService] Erro inesperado:', error.message);
                throw new Error(`Erro inesperado: ${error.message}`);
            }
        }
    }

    // 7. Vincular equipamento à atividade
    static async linkEquipmentToActivity(activityId: number, data: any, token: string): Promise<any> {
        try {
            console.log('[ActivityService] Vinculando equipamento à atividade:', { activityId, data });

            // Converter equipment_id para equipments_ids (array)
            const payload = {
                equipments_ids: [data.equipment_id]
            };

            console.log('[ActivityService] Payload para vincular equipamento:', payload);

            const response = await apiClient.post(`/activities/${activityId}/equipments`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log('[ActivityService] Equipamento vinculado com sucesso:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] Erro ao vincular equipamento à atividade:', error);

            if (error.response) {
                console.error('[ActivityService] Erro no servidor:');
                console.error('Status:', error.response.status);
                console.error('Dados:', error.response.data);
                console.error('Headers:', error.response.headers);

                if (error.response.status === 400) {
                    const errorMessage = error.response.data?.message || error.response.data?.error || "Dados inválidos";
                    throw new Error(`Erro de validação: ${errorMessage}`);
                } else if (error.response.status === 401) {
                    throw new Error("Token de acesso inválido ou expirado.");
                } else if (error.response.status === 404) {
                    throw new Error("Atividade não encontrada.");
                } else if (error.response.status === 422) {
                    const validationErrors = error.response.data?.errors || {};
                    const errorMessages = Object.values(validationErrors).flat().join(", ");
                    throw new Error(`Erro de validação: ${errorMessages}`);
                } else {
                    throw new Error(error.response.data?.message || "Erro inesperado no servidor.");
                }
            } else if (error.request) {
                console.error('[ActivityService] Erro de rede:', error.request);
                throw new Error("Erro de conexão. Verifique sua internet.");
            } else {
                console.error('[ActivityService] Erro inesperado:', error.message);
                throw new Error(`Erro inesperado: ${error.message}`);
            }
        }
    }

    // 8. Buscar tipos de atividade possíveis
    static async fetchActivityTypes(token: string): Promise<any[]> {
        console.log('[ActivityService] Buscando tipos de atividade...');
        const normalize = (arr: any[]): any[] => {
            if (!Array.isArray(arr)) return [];
            return arr.map((it: any) => ({
                id: it.id,
                name: it.name || it.label || it.description || it.slug || `Tipo ${it.id}`,
            }));
        };

        try {
            // Tentativa com filtros mais comuns
            const response = await apiClient.get('/activity_types', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    equipment_insertion_policy: 'manual',
                    creation_policy: 'common',
                    is_active: true,
                },
            });
            let items = response.data?.results ?? response.data ?? [];
            let normalized = normalize(items);
            // Se vazio, tentar sem filtros para ampliar resultados
            if (normalized.length === 0) {
                console.log('[ActivityService] Lista vazia com filtros. Tentando sem filtros...');
                const fallbackResp = await apiClient.get('/activity_types', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                items = fallbackResp.data?.results ?? fallbackResp.data ?? [];
                normalized = normalize(items);
            }
            console.log('[ActivityService] Tipos de atividade carregados (normalizados):', normalized);
            return normalized;
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar tipos de atividade:', error);
            if (error.response) {
                console.error('[ActivityService] Erro no servidor:');
                console.error('Status:', error.response.status);
                console.error('Dados:', error.response.data);
                if (error.response.status === 401) {
                    throw new Error('Token de acesso inválido ou expirado.');
                } else if (error.response.status === 404) {
                    throw new Error('Endpoint de tipos de atividade não encontrado.');
                } else {
                    throw new Error(error.response.data?.message || 'Erro ao carregar tipos de atividade.');
                }
            } else if (error.request) {
                console.error('[ActivityService] Erro de rede:', error.request);
                throw new Error('Erro de conexão. Verifique sua internet.');
            } else {
                console.error('[ActivityService] Erro inesperado:', error.message);
                throw new Error(`Erro inesperado: ${error.message}`);
            }
        }
    }

    // Método para buscar atividades de um equipamento específico
    async fetchActivities(
        equipmentId: number,
        params: {
            page?: number;
            per_page?: number;
            activity_type?: string;
            token: string;
        }
    ): Promise<{ results: Activity[]; count: number; links: { next: string | null; previous: string | null } }> {
        try {
            console.log('[ActivityService] Buscando atividades para equipamento:', equipmentId);

            // Usar endpoint geral com filtro de equipment_id conforme documentação
            const query: any = {
                page: params?.page,
                per_page: params?.per_page,
                equipment_id: equipmentId,
            };

            // Adicionar filtro de tipo se especificado
            if (params?.activity_type) {
                query.activity_type_slug = params.activity_type;
            }

            console.log('[ActivityService] Query para equipamento:', query);
            const response = await apiClient.get(`/activities`, {
                headers: {
                    Authorization: `Bearer ${params.token}`,
                },
                params: query,
            });

            console.log('[ActivityService] Resposta para equipamento:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar atividades do equipamento:', error);
            console.error('[ActivityService] Status:', error.response?.status);
            console.error('[ActivityService] Dados:', error.response?.data);

            // Se falhar, retornar estrutura vazia
            return {
                results: [],
                count: 0,
                links: { next: null, previous: null }
            };
        }
    }
}