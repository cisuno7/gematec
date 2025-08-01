import axios from "axios";
import { Activity } from "../Models/Activity";
import apiClient from "../Context/ApiClient";
import { API_BASE_URL } from "../config/apiConfig";
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
        const url = `${API_BASE_URL}/activities`;
        const query: any = {
            page: params.page,
            per_page: params.per_page,
            activity_type_slug: params.activity_type_slug,
        };
        if (params.status) {
            params.status.forEach((s, i) => (query[`status[${i}]`] = s));
        }
        const response = await apiClient.get(url, {
            headers: { Authorization: `Bearer ${params.token}` },
            params: query,
        });
        return response.data;
    }

    // 2. Buscar equipamentos vinculados a uma atividade
    static async fetchActivityEquipments(activityId: number, params: { token: string }): Promise<any> {
        const url = `${API_BASE_URL}/activities/${activityId}/equipments`;
        const response = await apiClient.get(url, {
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
        const url = `${API_BASE_URL}/activities/${activityId}/equipments/${activityEquipmentId}`;
        const response = await apiClient.patch(url, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    }

    // 4. Buscar questões do questionário
    static async fetchActivityQuestions(activityPlanId: number, versionId: number, token: string): Promise<ActivityDynamicField[]> {
        const url = `${API_BASE_URL}/activity_plans/${activityPlanId}/versions/${versionId}`;
        const response = await apiClient.get(url, {
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
        const url = `${API_BASE_URL}/activities/${activityId}/equipments/${activityEquipmentId}/answers`;
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
        const response = await apiClient.post(url, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    }

    // 6. Criar atividade
    static async createActivity(data: any, token: string): Promise<any> {
        const url = `${API_BASE_URL}/activities`;
        const response = await apiClient.post(url, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    }

    // 7. Vincular equipamento à atividade
    static async linkEquipmentToActivity(activityId: number, data: any, token: string): Promise<any> {
        const url = `${API_BASE_URL}/activities/${activityId}/equipments`;
        const response = await apiClient.post(url, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    }

    // 8. Buscar tipos de atividade possíveis
    static async fetchActivityTypes(token: string): Promise<any[]> {
        const url = `${API_BASE_URL}/activity_types`;
        const response = await apiClient.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                equipment_insertion_policy: "manual",
                creation_policy: "common",
                is_active: true,
            },
        });
        return response.data.results || response.data;
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
            const url = `${API_BASE_URL}/equipments/${equipmentId}/activities`;
            const response = await apiClient.get(url, {
                headers: {
                    Authorization: `Bearer ${params.token}`,
                },
                params: {
                    page: params?.page,
                    per_page: params?.per_page,
                    activity_type: params?.activity_type,
                },
            });
            return response.data;
        } catch (error: any) {
            throw error;
        }
    }
}