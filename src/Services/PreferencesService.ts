import { API_BASE_URL } from "../config/apiConfig";
import apiClient from "../Context/ApiClient";

export interface UserPreferences {
  language: string;
}

export default class PreferencesService {
  static async getPreferences(accessToken: string): Promise<UserPreferences> {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/me/preferences`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar preferências:', error);
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Token expirado ou inválido.');
        } else if (error.response.status === 403) {
          throw new Error('Permissão negada.');
        } else if (error.response.status === 404) {
          throw new Error('Preferências não encontradas.');
        }
      }
      throw new Error('Erro ao buscar preferências do usuário.');
    }
  }

  static async updatePreferences(accessToken: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const response = await apiClient.patch(`${API_BASE_URL}/me/preferences`, preferences, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao atualizar preferências:', error);
      if (error.response) {
        if (error.response.status === 400) {
          throw new Error('Dados inválidos fornecidos.');
        } else if (error.response.status === 401) {
          throw new Error('Token expirado ou inválido.');
        } else if (error.response.status === 403) {
          throw new Error('Permissão negada.');
        } else if (error.response.status === 404) {
          throw new Error('Preferências não encontradas.');
        }
      }
      throw new Error('Erro ao atualizar preferências do usuário.');
    }
  }
}