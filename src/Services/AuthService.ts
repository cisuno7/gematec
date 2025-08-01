import axios from "axios";
import { API_BASE_URL, buildApiUrlForAccount, setDynamicApiUrl } from "../config/apiConfig";
import apiClient from "../Context/ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";


export default class AuthService {
  static async login(account: string, email: string, password: string) {
    try {
      // Montar a URL dinâmica com o subdomínio da conta
      const apiUrl = await buildApiUrlForAccount(account); // Adicione await
      const endpoint = `${apiUrl}/token`;
      console.log('[AuthService] Endpoint de login dinâmico:', endpoint);
      const response = await axios.post(endpoint, { email, password });
      return response.data;
    } catch (error: any) {
      console.error('[AuthService] Erro ao realizar a requisição de login:', error);

      // Log detalhado do erro
      if (error.config) {
        console.error('[AuthService] Configuração da requisição que falhou:', {
          url: error.config.url,
          baseURL: error.config.baseURL,
          method: error.config.method,
          headers: error.config.headers
        });
      }

      if (error.response) {
        console.error('[AuthService] Detalhes do erro na resposta da API:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });

        if (error.response.status === 401) {
          throw new Error('Usuário ou senha inválidos. Verifique suas credenciais.');
        } else if (error.response.status === 403) {
          throw new Error('Permissão negada. Você não tem autorização para acessar este recurso.');
        } else if (error.response.status === 404) {
          throw new Error(`Endpoint não encontrado:`);
        } else if (error.response.status === 500) {
          throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
        } else {
          throw new Error(`Erro inesperado: ${error.response.status}.`);
        }
      } else if (error.request) {
        console.error('[AuthService] Nenhuma resposta recebida do servidor:', error.request);
        console.error('[AuthService] URL que falhou:', error.request._url);
        throw new Error('Erro ao conectar ao servidor. Verifique sua conexão com a internet.');
      } else {
        console.error('[AuthService] Erro na configuração da requisição:', error.message);
        throw new Error(`Erro inesperado: ${error.message}`);
      }
    }
  }

  static async getAccounts(slidingToken: string): Promise<{ accounts: { id: number; name: string }[] }> {
    try {
      const endpoint = `${API_BASE_URL}/accounts`;
      const response = await apiClient.get(endpoint, {
        headers: { Authorization: `Bearer ${slidingToken}` },
      });

      // Verificar se a resposta contém a chave 'results'
      if (!response.data.results || !Array.isArray(response.data.results)) {
        throw new Error('Formato de resposta inválido: "results" não encontrado ou não é um array.');
      }

      // Mapear a chave 'results' para 'accounts'
      return {
        accounts: response.data.results.map((account: any) => ({
          id: account.id,
          name: account.name,
        })),
      };
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Token inválido ou expirado.');
        } else if (error.response.status === 403) {
          throw new Error('Permissão negada.');
        } else if (error.response.status === 404) {
          throw new Error('Endpoint não encontrado.');
        }
      }
      throw new Error(`Erro ao buscar contas: ${error.message}`);
    }
  }

  static async revoke(refreshToken: string, account: string): Promise<void> {
    try {
      const apiUrl = await buildApiUrlForAccount(account);
      const endpoint = `${apiUrl}/token/blacklist`; // Novo endpoint
      await apiClient.post(endpoint, { refresh_token: refreshToken });
    } catch (error: any) {
      console.error('Erro ao revogar o token:', error);
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Token inválido ou expirado.');
        } else if (error.response.status === 403) {
          throw new Error('Permissão negada.');
        } else if (error.response.status === 404) {
          throw new Error('Endpoint não encontrado.');
        }
      }
      throw new Error('Erro ao revogar o token.');
    }
  }
  static async refreshAccessToken(refreshToken: string) {
    try {
      console.log('Iniciando renovação do access token...');

      console.log(`Refresh Token: ${refreshToken}`);

      const response = await apiClient.post(`${API_BASE_URL}/token/refresh`, {
        refresh: refreshToken,
      });

      console.log('Novo access token recebido:', response.data.access);
      return response.data.access; // Retorna apenas o novo access_token
    } catch (error: any) {
      console.error('Erro ao renovar o token de acesso:', error);

      if (error.response) {
        console.error('Detalhes do erro na resposta da API:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });

        if (error.response.status === 401) {
          throw new Error('Refresh token inválido ou expirado.');
        } else if (error.response.status === 403) {
          throw new Error('Permissão negada ao tentar renovar o token.');
        } else if (error.response.status === 500) {
          throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
        } else {
          throw new Error(`Erro inesperado: ${error.response.status}.`);
        }
      } else if (error.request) {
        console.error('Nenhuma resposta recebida do servidor:', error.request);
        throw new Error('Erro ao conectar ao servidor para renovar o token.');
      } else {
        console.error('Erro na configuração da requisição:', error.message);
        throw new Error(`Erro inesperado: ${error.message}`);
      }
    }
  }
  static async updatePersonalData(accessToken: string, updatedData: { name?: string; birthdate?: string; rh_factor?: string; }) {
    try {
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const endpoint = `${dynamicBaseUrl}/me`;
      console.log('Atualizando dados pessoais no endpoint:', endpoint);
      console.log('Dados enviados:', updatedData);

      const response = await axios.put(endpoint, updatedData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('Resposta da atualização:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Erro durante a atualização dos dados pessoais:', error);
      if (error.response) {
        console.error('Detalhes do erro:', {
          status: error.response.status,
          data: error.response.data,
        });
        throw new Error(`Erro: ${error.response.data.detail || 'Falha ao atualizar os dados.'}`);
      }
      throw new Error('Erro ao conectar ao servidor.');
    }
  }
  static async getPersonalData(accessToken: string, token: string) {
    try {
      console.log('Iniciando requisição para dados pessoais...');
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      console.log('Endpoint usado:', `${dynamicBaseUrl}/me`);
      console.log('Token de acesso:', accessToken);

      const response = await apiClient.get(`${dynamicBaseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('Resposta do servidor:', response.data);
      return response.data; // Dados do usuário
    } catch (error: any) {
      if (error.response) {
        console.error('Erro no servidor:', error.response.status, error.response.data);
        if (error.response.status === 401) {
          throw new Error('Token expirado ou inválido.');
        } else if (error.response.status === 403) {
          throw new Error('Permissão negada.');
        } else if (error.response.status === 404) {
          throw new Error('Endpoint não encontrado.');
        }
      } else {
        console.error('Erro na requisição:', error.message);
      }
      throw new Error('Erro ao buscar dados do usuário.');
    }
  }
  static async updatePassword(accessToken: string, password: string, passwordConfirmation: string) {
    try {
      const accountName = await AsyncStorage.getItem("account") || "default";
      const dynamicBaseUrl = await setDynamicApiUrl(accountName);
      const response = await apiClient.patch(`${dynamicBaseUrl}/me/password`, {
        password,
        password_confirmation: passwordConfirmation,
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 400) {
          throw new Error('As senhas não coincidem ou são inválidas.');
        } else if (error.response.status === 401) {
          throw new Error('Token expirado ou inválido.');
        } else if (error.response.status === 403) {
          throw new Error('Permissão negada.');
        } else if (error.response.status === 404) {
          throw new Error('Endpoint não encontrado.');
        }
      }
      throw new Error('Erro ao atualizar a senha.');
    }
  }



}



