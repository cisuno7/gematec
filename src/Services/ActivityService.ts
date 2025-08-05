import axios from "axios";
import { Activity } from "../Models/Activity";
import apiClient from "../Context/ApiClient";
import { ActivityDynamicField } from "../Models/ActivityDynamicField";
import { ActivityAnswer } from "../Models/ActivityAnswer";
import { UploadFile } from "../Models/UploadFile";

export default class ActivityService {
    // 1. Buscar atividades globais com filtros
    static async fetchAllActivities(params: {
        page?: number;
        per_page?: number;
        activity_type_slug?: string;
        status?: string[];
        token: string;
    }): Promise<{ results: Activity[]; count: number }> {
        try {
            const query: any = {
                page: params.page,
                per_page: params.per_page,
                activity_type_slug: params.activity_type_slug,
            };
            if (params.status) {
                params.status.forEach((s, i) => (query[`status[${i}]`] = s));
            }

            console.log('[ActivityService] Tentando buscar atividades em /activities');
            const response = await apiClient.get('/activities', {
                headers: { Authorization: `Bearer ${params.token}` },
                params: query,
            });
            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar em /activities:', error);

            // Se falhar, tentar endpoint alternativo
            try {
                console.log('[ActivityService] Tentando endpoint alternativo /activity');
                const response = await apiClient.get('/activity', {
                    headers: { Authorization: `Bearer ${params.token}` },
                    params: query,
                });
                return response.data;
            } catch (altError: any) {
                console.error('[ActivityService] Erro também no endpoint alternativo:', altError);
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
        const response = await apiClient.get(`/activities/${activityId}/equipments`, {
            headers: { Authorization: `Bearer ${params.token}` },
        });
        return response.data;
    }

    // 3. Iniciar/fechar atividade em equipamento
    static async patchActivityEquipment(
        activityId: number,
        activityEquipmentId: number,
        data: any,
        token: string
    ): Promise<any> {
        const response = await apiClient.patch(`/activities/${activityId}/equipments/${activityEquipmentId}`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    }

    // 4. Buscar questões do questionário
    static async fetchActivityQuestions(activityPlanId: number, versionId: number, token: string): Promise<ActivityDynamicField[]> {
        const response = await apiClient.get(`/activity_plans/${activityPlanId}/versions/${versionId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data.fields; // Ajuste conforme resposta real da API
    }

    // 5. Enviar respostas do questionário
    static async postActivityAnswers(
        activityId: number,
        activityEquipmentId: number,
        answers: ActivityAnswer[],
        token: string
    ): Promise<any> {
        // Se houver upload, deve ser form-data
        const formData = new FormData();
        answers.forEach((answer, idx) => {
            formData.append(`answers[${idx}][question_id]`, answer.question_id);
            formData.append(`answers[${idx}][value]`, answer.value);
            if (answer.justification) {
                formData.append(`answers[${idx}][justification]`, answer.justification);
            }
            if (answer.uploads) {
                answer.uploads.forEach((file, fileIdx) => {
                    formData.append(`answers[${idx}][uploads][${fileIdx}]`, {
                        uri: file.uri,
                        name: file.name,
                        type: file.type,
                    } as any);
                });
            }
        });
        const response = await apiClient.post(`/activities/${activityId}/equipments/${activityEquipmentId}/answers`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
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
        try {
            console.log('[ActivityService] Buscando tipos de atividade...');

            const response = await apiClient.get('/activity_types', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    equipment_insertion_policy: "manual",
                    creation_policy: "common",
                    is_active: true,
                },
            });

            console.log('[ActivityService] Tipos de atividade carregados:', response.data);
            return response.data.results || response.data;
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar tipos de atividade:', error);

            if (error.response) {
                console.error('[ActivityService] Erro no servidor:');
                console.error('Status:', error.response.status);
                console.error('Dados:', error.response.data);

                if (error.response.status === 401) {
                    throw new Error("Token de acesso inválido ou expirado.");
                } else if (error.response.status === 404) {
                    throw new Error("Endpoint de tipos de atividade não encontrado.");
                } else {
                    throw new Error(error.response.data?.message || "Erro ao carregar tipos de atividade.");
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

    // Método já existente (mantido)
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

            // Tentar primeiro o endpoint específico do equipamento
            try {
                console.log('[ActivityService] Tentando endpoint específico do equipamento');
                const response = await apiClient.get(`/equipments/${equipmentId}/activities`, {
                    headers: {
                        Authorization: `Bearer ${params.token}`,
                    },
                    params: {
                        page: params?.page,
                        per_page: params?.per_page,
                        activity_type: params?.activity_type,
                    },
                });
                console.log('[ActivityService] Sucesso com endpoint específico do equipamento');
                return response.data;
            } catch (specificError: any) {
                console.log('[ActivityService] Endpoint específico falhou, tentando endpoint geral com filtro');

                // Se falhar, tentar endpoint geral com filtro
                const response = await apiClient.get(`/activities`, {
                    headers: {
                        Authorization: `Bearer ${params.token}`,
                    },
                    params: {
                        page: params?.page,
                        per_page: params?.per_page,
                        activity_type: params?.activity_type,
                        equipment_id: equipmentId, // Filtrar por equipamento
                    },
                });
                console.log('[ActivityService] Sucesso com endpoint geral');
                return response.data;
            }
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar atividades:', error);

            // Tentar endpoint alternativo como última opção
            try {
                console.log('[ActivityService] Tentando endpoint alternativo /activity');
                const response = await apiClient.get(`/activity`, {
                    headers: {
                        Authorization: `Bearer ${params.token}`,
                    },
                    params: {
                        page: params?.page,
                        per_page: params?.per_page,
                        activity_type: params?.activity_type,
                        equipment_id: equipmentId,
                    },
                });
                return response.data;
            } catch (altError: any) {
                console.error('[ActivityService] Erro também no endpoint alternativo:', altError);
                // Se falhar, retornar estrutura vazia
                return {
                    results: [],
                    count: 0,
                    links: { next: null, previous: null }
                };
            }
        }
    }
}