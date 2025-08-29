import apiClient from "../Context/ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";


export interface UserPreferences {
    language: string;
}

export default class PreferencesService {
    static async getPreferences(accessToken: string): Promise<UserPreferences> {
        try {
            console.log('[PreferencesService] === INÍCIO getPreferences ===');
            console.log('[PreferencesService] Buscando preferências do usuário');
            console.log('[PreferencesService] Token presente:', !!accessToken);

            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.get('/me/preferences');

            console.log('[PreferencesService] Resposta recebida:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[PreferencesService] Erro em getPreferences:', error);
            console.error('[PreferencesService] Detalhes do erro:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
                url: error.config?.url
            });
            throw error;
        }
    }

    static async updatePreferences(accessToken: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
        try {
            console.log('[PreferencesService] === INÍCIO updatePreferences ===');
            console.log('[PreferencesService] Preferências a serem salvas:', preferences);

            console.log('[PreferencesService] Atualizando preferências do usuário');
            console.log('[PreferencesService] Token presente:', !!accessToken);

            // Primeiro, tentar GET para ver as preferências atuais e entender os valores válidos
            try {
                console.log('[PreferencesService] Fazendo GET para ver preferências atuais...');
                // apiClient já configura automaticamente a URL dinâmica e Authorization
                const currentPreferences = await apiClient.get('/me/preferences');
                console.log('[PreferencesService] Preferências atuais:', currentPreferences.data);
            } catch (getError: any) {
                console.log('[PreferencesService] GET falhou, mas continuando...', getError.response?.status);
            }

            // Mapear para o formato esperado pelo backend conforme documentação
            const requestBody: any = {};

            if (preferences.language) {
                // O endpoint espera o campo "idioma" conforme especificação
                if (preferences.language === 'pt-BR' || preferences.language === 'pt') {
                    requestBody.idioma = 'pt'; // ou valor correto para português
                } else if (preferences.language === 'en') {
                    requestBody.idioma = 'en';
                } else {
                    requestBody.idioma = preferences.language;
                }
            }

            console.log('[PreferencesService] Corpo da requisição (conforme spec):', requestBody);

            // Usar PUT conforme especificação do endpoint
            console.log('[PreferencesService] Usando PUT conforme documentação...');
            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.put('/me/preferences', requestBody);

            console.log('[PreferencesService] Resposta recebida:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[PreferencesService] Erro em updatePreferences:', error);
            console.error('[PreferencesService] Detalhes do erro:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
                url: error.config?.url
            });
            throw error;
        }
    }
}