import apiClient from "../Context/ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setDynamicApiUrl } from "../config/apiConfig";

export interface UserPreferences {
    language: string;
}

export default class PreferencesService {
    static async getPreferences(accessToken: string): Promise<UserPreferences> {
        try {
            console.log('[PreferencesService] === INÍCIO getPreferences ===');
            const accountName = await AsyncStorage.getItem("account") || "default";
            console.log('[PreferencesService] Account name:', accountName);

            const dynamicBaseUrl = await setDynamicApiUrl(accountName);
            console.log('[PreferencesService] Dynamic base URL:', dynamicBaseUrl);

            const endpoint = `${dynamicBaseUrl}/me/preferences`;
            console.log('[PreferencesService] Endpoint completo:', endpoint);
            console.log('[PreferencesService] Token presente:', !!accessToken);

            const response = await apiClient.get(endpoint, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

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

            const accountName = await AsyncStorage.getItem("account") || "default";
            console.log('[PreferencesService] Account name:', accountName);

            const dynamicBaseUrl = await setDynamicApiUrl(accountName);
            console.log('[PreferencesService] Dynamic base URL:', dynamicBaseUrl);

            let endpoint = `${dynamicBaseUrl}/me/preferences`;
            console.log('[PreferencesService] Endpoint completo:', endpoint);
            console.log('[PreferencesService] Token presente:', !!accessToken);

            // Primeiro, tentar GET para ver as preferências atuais e entender os valores válidos
            try {
                console.log('[PreferencesService] Fazendo GET para ver preferências atuais...');
                const currentPreferences = await apiClient.get(endpoint, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                console.log('[PreferencesService] Preferências atuais:', currentPreferences.data);
            } catch (getError: any) {
                console.log('[PreferencesService] GET falhou, mas continuando...', getError.response?.status);
            }

            // Mapear valores para o formato correto aceito pelo backend
            let mappedPreferences = { ...preferences };
            if (preferences.language) {
                // Mapear para os valores corretos do backend
                if (preferences.language === 'pt') {
                    mappedPreferences.language = 'pt-BR'; // Português com hífen
                }
                // 'en' já está correto
            }

            console.log('[PreferencesService] Preferências mapeadas:', mappedPreferences);

            // Se não tem language, usar as preferências originais
            console.log('[PreferencesService] Usando PATCH com preferências originais...');
            const response = await apiClient.patch(endpoint, mappedPreferences, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

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