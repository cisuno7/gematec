import axios from "axios";
import { getApiBaseUrl } from "../config/apiConfig";

// Cliente axios sem interceptores para login
const createLoginClient = (account: string) => {
  return axios.create({
    baseURL: getApiBaseUrl(account),
    timeout: 10000,
  });
};

export default class AuthService {
  static async login(account: string, email: string, password: string) {
    try {
      const apiClient = createLoginClient(account);
      const endpoint = `/api/token`;
      
      console.log('Tentando autenticar no endpoint:', `${getApiBaseUrl(account)}${endpoint}`);
      console.log('Payload:', { email, password });

      const response = await apiClient.post(endpoint, { email, password });

      console.log('Resposta bem-sucedida da API:', response.data);
      return {
        access: response.data.access,
        refresh: response.data.refresh,
      };
    } catch (error: any) {
      console.error('Erro ao realizar a requisição de login:', error);

      if (error.response) {
        console.error('Detalhes do erro na resposta da API:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });

        if (error.response.status === 401) {
          throw new Error('Usuário ou senha inválidos. Verifique suas credenciais.');
        } else if (error.response.status === 403) {
          throw new Error('Permissão negada. Você não tem autorização para acessar este recurso.');
        } else if (error.response.status === 404) {
          throw new Error('Endpoint não encontrado.');
        } else if (error.response.status === 500) {
          throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
        } else {
          throw new Error(`Erro inesperado: ${error.response.status}.`);
        }
      } else if (error.request) {
        console.error('Nenhuma resposta recebida do servidor:', error.request);
        throw new Error('Erro ao conectar ao servidor. Verifique sua conexão com a internet.');
      } else {
        console.error('Erro na configuração da requisição:', error.message);
        throw new Error(`Erro inesperado: ${error.message}`);
      }
    }
  }

  static async refreshAccessToken(account: string, refreshToken: string) {
    try {
      console.log('Iniciando renovação do access token...');
      console.log(`Refresh Token: ${refreshToken}`);

      const apiClient = createLoginClient(account);
      const response = await apiClient.post(`/api/token/refresh`, {
        refresh: refreshToken,
      });

      console.log('Novo access token recebido:', response.data.access);
      return {
        access: response.data.access,
        refresh: response.data.refresh || refreshToken, // Caso não retorne novo refresh token
      };
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

  static async revokeToken(account: string, refreshToken: string): Promise<void> {
    try {
      console.log('Revogando refresh token...');
      
      const apiClient = createLoginClient(account);
      await apiClient.post(`/api/token/blacklist`, { 
        refresh: refreshToken 
      });
      
      console.log('Token revogado com sucesso');
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

  static async updatePersonalData(account: string, accessToken: string, updatedData: { name?: string; birthdate?: string; rh_factor?: string }) {
    try {
      const apiClient = createLoginClient(account);
      const endpoint = `/api/me`;
      console.log('Atualizando dados pessoais no endpoint:', `${getApiBaseUrl(account)}${endpoint}`);
      console.log('Dados enviados:', updatedData);

      const response = await apiClient.patch(endpoint, updatedData, {
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

  static async getPersonalData(account: string, accessToken: string) {
    try {
      console.log('Iniciando requisição para dados pessoais...');
      const apiClient = createLoginClient(account);
      const endpoint = `/api/me`;
      console.log('Endpoint usado:', `${getApiBaseUrl(account)}${endpoint}`);
      console.log('Token de acesso:', accessToken);

      const response = await apiClient.get(endpoint, {
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

  static async updatePassword(account: string, accessToken: string, password: string, passwordConfirmation: string) {
    try {
      const apiClient = createLoginClient(account);
      const response = await apiClient.patch(`/api/me/password`, {
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



