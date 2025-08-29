import apiClient from "../Context/ApiClient";
import { TechnicalAssistance } from "../Models/TechnicalAssistance";
import { Equipment } from "../Models/Equipament"; // Importar Equipment para fetchEquipments
import { Answer } from "../Models/ServiceOrder"; // Importar Answer para fetchAnswers e submitAnswers
import { setDynamicApiUrl } from "../config/apiConfig";

import AsyncStorage from "@react-native-async-storage/async-storage";
export default class TechnicalAssistanceService {


    async fetchTechnicalAssistance(
        token: string,
        pagination: { page: number; per_page: number },
        filters?: {
            search?: string;
            equipment_type?: string;
            brand?: string;
            status?: string;
        }
    ): Promise<{ results: TechnicalAssistance[]; count: number }> {
        console.log('[TechnicalAssistanceService] Buscando assistências técnicas');

        // Construir parâmetros apenas com valores válidos
        const params: { [key: string]: any } = {
            page: pagination.page,
            per_page: pagination.per_page,
            activity_type: "technical_assistance", // Filtro para Technical Assistance
        };
        if (filters?.search) params.search = filters.search;
        if (filters?.equipment_type) params.equipment_type = filters.equipment_type;
        if (filters?.brand) params.brand = filters.brand;
        if (filters?.status) params.status = filters.status;

        try {
            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.get('/activities', {
                params,
            });
            console.log('[TechnicalAssistanceService] Parâmetros enviados:', params);
            console.log('[TechnicalAssistanceService] Resposta do backend:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[TechnicalAssistanceService] Erro ao buscar assistências técnicas:', error);

            if (error.response) {
                console.error('[TechnicalAssistanceService] Erro no servidor:');
                console.error('Status:', error.response.status);
                console.error('Dados:', error.response.data);
                console.error('URL:', error.config?.url);
            } else if (error.request) {
                console.error('[TechnicalAssistanceService] Nenhuma resposta recebida do servidor.');
                console.error('Detalhes da requisição:', error.request);
            } else {
                console.error('[TechnicalAssistanceService] Erro ao configurar a requisição:', error.message);
            }

            throw new Error('Erro ao carregar assistências técnicas. Tente novamente mais tarde.');
        }
    }

    async fetchClients(token: string, search: string): Promise<any> {
        try {
            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.get('/clients', {
                params: { search },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            throw new Error('Erro ao carregar clientes.');
        }
    }

    static async submitAnswers(
        token: string,
        technicalAssistanceId: number,
        data: { status?: string; answers: { question_id: number; value: string; meta?: any }[] }
    ): Promise<TechnicalAssistance> {
        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await setDynamicApiUrl(accountName);
        const endpoint = `${dynamicBaseUrl}/technical_assistances/${technicalAssistanceId}/answers`; // submitAnswers
        try {
            const response = await apiClient.post(endpoint, data, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error) {
            console.error('[TechnicalAssistanceService] Erro ao salvar respostas:', error);
            throw error;
        }
    }

    async fetchTechnicalAssistanceDetails(token: string, technicalAssistanceId: number): Promise<TechnicalAssistance> {
        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await setDynamicApiUrl(accountName);
        const endpoint = `${dynamicBaseUrl}/technical_assistances/${technicalAssistanceId}`;
        try {
            const response = await apiClient.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;  // Agora retorna TechnicalAssistance com questions
        } catch (error) {
            console.error('Erro ao buscar detalhes da assistência técnica:', error);
            throw error;
        }
    }

    async fetchSectors(token: string, clientId: number, search: string): Promise<any> {
        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await setDynamicApiUrl(accountName);
        const endpoint = `${dynamicBaseUrl}/clients/${clientId}/sectors?level=0`; // fetchSectors - apenas setores pais
        try {
            const response = await apiClient.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
                params: { search },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar setores:', error);
            throw new Error('Erro ao carregar setores.');
        }
    }

    async fetchEquipments(token: string, sectorId: number, search: string): Promise<{ results: Equipment[]; count: number }> {
        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await setDynamicApiUrl(accountName);
        const endpoint = `${dynamicBaseUrl}/sectors/${sectorId}/equipments`;
        try {
            const response = await apiClient.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
                params: { search },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar equipamentos:', error);
            throw new Error('Erro ao carregar equipamentos.');
        }
    }

    async fetchAnswers(token: string, technicalAssistanceId: number): Promise<Answer[]> {
        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await setDynamicApiUrl(accountName);
        const endpoint = `${dynamicBaseUrl}/technical_assistances/${technicalAssistanceId}/answers`; // fetchAnswers
        try {
            const response = await apiClient.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar respostas:', error);
            throw error;
        }
    }

    async createTechnicalAssistance(token: string, data: { equipment_id: number }): Promise<TechnicalAssistance> {
        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await setDynamicApiUrl(accountName);
        const endpoint = `${dynamicBaseUrl}/technical_assistances`;
        try {
            const response = await apiClient.post(endpoint, data, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao criar assistência técnica:', error);
            throw new Error('Erro ao criar assistência técnica.');
        }
    }
}