import apiClient from "../Context/ApiClient";
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Service, ServicesResponse } from '../Models/Service';

export default class ServicesService {
    /**
     * Busca serviços globais
     * GET /api/services?scope=global
     */
    static async fetchGlobalServices(
        token: string,
        page: number = 1,
        search: string = ''
    ): Promise<ServicesResponse> {
        console.log('[ServicesService] 🔍 === BUSCANDO SERVIÇOS GLOBAIS ===');

        // Verificar conectividade
        const networkState = await NetInfo.fetch();
        console.log('[ServicesService] 🌐 Estado da rede:', {
            isConnected: networkState.isConnected,
            type: networkState.type,
            isInternetReachable: networkState.isInternetReachable
        });

        const hasConnection = networkState.isConnected || networkState.isInternetReachable;
        if (!hasConnection) {
            console.error('[ServicesService] ❌ Sem conexão com a internet');
            throw new Error('Sem conexão com a internet. Por favor, conecte-se e tente novamente.');
        }

        try {
            console.log('[ServicesService] 📦 Parâmetros da busca:', {
                scope: 'global',
                page,
                search: search || '(vazio)'
            });

            const params: any = {
                scope: 'global',
                page
            };

            if (search && search.trim()) {
                params.search = search.trim();
            }

            console.log('[ServicesService] 🚀 Enviando requisição GET /services...');
            const response = await apiClient.get('/services', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('[ServicesService] ✅ Serviços globais carregados com sucesso!');
            console.log('[ServicesService] 📊 Estatísticas:', {
                total: response.data.count,
                naPagina: response.data.results?.length || 0,
                temProxima: !!response.data.links?.next,
                temAnterior: !!response.data.links?.previous
            });

            return response.data;
        } catch (error: any) {
            console.error('[ServicesService] ❌❌❌ ERRO ao buscar serviços globais ❌❌❌');
            console.error('[ServicesService] 🔴 Tipo do erro:', error?.constructor?.name || typeof error);
            console.error('[ServicesService] 🔴 Mensagem:', error?.message);

            if (error.response) {
                console.error('[ServicesService] 🔴 Status HTTP:', error.response.status);
                console.error('[ServicesService] 🔴 Dados da resposta:', error.response.data);

                if (error.response.status === 401) {
                    throw new Error('Sua sessão expirou. Por favor, faça login novamente.');
                } else if (error.response.status === 403) {
                    throw new Error('Você não tem permissão para visualizar serviços.');
                } else if (error.response.status >= 500) {
                    throw new Error('Erro no servidor. Tente novamente em alguns instantes.');
                } else {
                    throw new Error(error.response.data?.message || 'Erro ao buscar serviços.');
                }
            } else if (error.request) {
                console.error('[ServicesService] 🌐 Erro de rede');
                throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
            } else {
                throw new Error(error.message || 'Erro inesperado ao buscar serviços.');
            }
        }
    }

    /**
     * Envia equipamento para o orçamento com serviços selecionados
     * PATCH /api/activities/:activity_id/equipments/:activity_equipment_id/services
     */
    static async sendEquipmentToBudget(
        activityId: number,
        activityEquipmentId: number,
        servicesIds: number[],
        token: string
    ): Promise<any> {
        console.log('[ServicesService] 💰 === ENVIANDO EQUIPAMENTO PARA ORÇAMENTO ===');

        // Verificar conectividade
        const networkState = await NetInfo.fetch();
        console.log('[ServicesService] 🌐 Estado da rede:', {
            isConnected: networkState.isConnected,
            type: networkState.type,
            isInternetReachable: networkState.isInternetReachable
        });

        const hasConnection = networkState.isConnected || networkState.isInternetReachable;
        if (!hasConnection) {
            console.error('[ServicesService] ❌ Sem conexão com a internet');
            throw new Error('Sem conexão com a internet. Por favor, conecte-se e tente novamente.');
        }

        try {
            // Validar dados
            if (!activityId || activityId <= 0) {
                throw new Error('ID da atividade inválido.');
            }
            if (!activityEquipmentId || activityEquipmentId <= 0) {
                throw new Error('ID do vínculo atividade-equipamento inválido.');
            }
            if (!servicesIds || servicesIds.length === 0) {
                throw new Error('Selecione pelo menos um serviço.');
            }

            const payload = {
                services_ids: servicesIds
            };

            console.log('[ServicesService] 📦 Dados do orçamento:', {
                activityId,
                activityEquipmentId,
                servicesCount: servicesIds.length,
                servicesIds
            });

            const endpoint = `/activities/${activityId}/equipments/${activityEquipmentId}/services`;
            console.log('[ServicesService] 🚀 Enviando requisição PATCH:', endpoint);

            const response = await apiClient.patch(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('[ServicesService] ✅ Equipamento enviado para orçamento com sucesso!');
            console.log('[ServicesService] 📦 Resposta do servidor:', response.data);

            return response.data;
        } catch (error: any) {
            console.error('[ServicesService] ❌❌❌ ERRO ao enviar para orçamento ❌❌❌');
            console.error('[ServicesService] 🔴 Tipo do erro:', error?.constructor?.name || typeof error);
            console.error('[ServicesService] 🔴 Mensagem:', error?.message);

            if (error.response) {
                console.error('[ServicesService] 🔴 Status HTTP:', error.response.status);
                console.error('[ServicesService] 🔴 Dados da resposta:', error.response.data);

                if (error.response.status === 400 || error.response.status === 422) {
                    const errorMsg = error.response.data?.message || 'Dados inválidos.';
                    throw new Error(errorMsg);
                } else if (error.response.status === 401) {
                    throw new Error('Sua sessão expirou. Por favor, faça login novamente.');
                } else if (error.response.status === 403) {
                    throw new Error('Você não tem permissão para enviar orçamentos.');
                } else if (error.response.status === 404) {
                    throw new Error('Atividade ou equipamento não encontrado.');
                } else if (error.response.status >= 500) {
                    throw new Error('Erro no servidor. Tente novamente em alguns instantes.');
                } else {
                    throw new Error(error.response.data?.message || 'Erro ao enviar para orçamento.');
                }
            } else if (error.request) {
                console.error('[ServicesService] 🌐 Erro de rede');
                throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
            } else {
                throw new Error(error.message || 'Erro inesperado ao enviar para orçamento.');
            }
        }
    }
}

