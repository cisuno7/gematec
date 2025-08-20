import apiClient from "../Context/ApiClient";
import { ServiceOrder, Answer, UploadedImage } from "../Models/ServiceOrder";
import { setDynamicApiUrl } from "../config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from '@react-native-community/netinfo';
import OfflineService from './OfflineService';

const SERVICE_ORDER_DETAILS_CACHE_KEY_PREFIX = 'service_order_details_';

interface FetchServiceOrdersParams {
    token: string;
    filters: {
        search?: string;
        equipmentType?: string;  // Ajustado para equipmentType
        brand?: string;
        status?: string;
        sector_id?: number;
        client_id?: number;
    };
    page: number;
}

class ServiceOrderService {
    static async fetchServiceOrders({ token, filters, page }: FetchServiceOrdersParams): Promise<{ results: ServiceOrder[]; count: number }> {
        try {
            console.log('[ServiceOrderService] Buscando ordens de serviço com filtros:', filters);

            const accountName = await AsyncStorage.getItem("account") || "default";
            const dynamicBaseUrl = await setDynamicApiUrl(accountName);
            const url = `${dynamicBaseUrl}/service_orders?page=${page}&per_page=10`;
            const params = {
                search: filters.search || '',
                equipmentType: filters.equipmentType || '',  // Ajustado
                brand: filters.brand || '',
                status: filters.status || 'open',
                sector_id: filters.sector_id || '',
                client_id: filters.client_id || '',
            };

            console.log('[ServiceOrderService] URL:', url);
            console.log('[ServiceOrderService] Parâmetros:', params);

            const response = await apiClient.get(url, { headers: { Authorization: `Bearer ${token}` }, params });

            console.log('[ServiceOrderService] Ordens de serviço carregadas com sucesso:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[ServiceOrderService] Erro ao buscar ordens de serviço:', error);

            if (error.response) {
                console.error('[ServiceOrderService] Erro no servidor:');
                console.error('Status:', error.response.status);
                console.error('Dados:', error.response.data);
                console.error('Headers:', error.response.headers);

                if (error.response.status === 400) {
                    const errorMessage = error.response.data?.message || error.response.data?.error || "Dados inválidos";
                    throw new Error(`Erro de validação: ${errorMessage}`);
                } else if (error.response.status === 401) {
                    throw new Error("Token de acesso inválido ou expirado.");
                } else if (error.response.status === 404) {
                    throw new Error("Recurso não encontrado.");
                } else if (error.response.status === 422) {
                    const validationErrors = error.response.data?.errors || {};
                    const errorMessages = Object.values(validationErrors).flat().join(", ");
                    throw new Error(`Erro de validação: ${errorMessages}`);
                } else {
                    throw new Error(error.response.data?.message || "Erro inesperado no servidor.");
                }
            } else if (error.request) {
                console.error('[ServiceOrderService] Erro de rede:', error.request);
                throw new Error("Erro de conexão. Verifique sua internet.");
            } else {
                console.error('[ServiceOrderService] Erro inesperado:', error.message);
                throw new Error(`Erro inesperado: ${error.message}`);
            }
        }
    }

    static async fetchServiceOrderDetails(token: string, serviceOrderId: number): Promise<ServiceOrder> {
        try {
            console.log('[ServiceOrderService] Buscando detalhes da ordem de serviço:', serviceOrderId);
            
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);
            let serviceOrderData;

            if (isConnected) {
                const accountName = await AsyncStorage.getItem("account") || "default";
                const dynamicBaseUrl = await setDynamicApiUrl(accountName);
                const url = `${dynamicBaseUrl}/service_orders/${serviceOrderId}`;
                
                console.log('[ServiceOrderService] URL para buscar detalhes:', url);
                
                const response = await apiClient.get(url, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                serviceOrderData = response.data;
                
                console.log('[ServiceOrderService] Detalhes carregados com sucesso:', serviceOrderData);
                await OfflineService.cacheData(`${SERVICE_ORDER_DETAILS_CACHE_KEY_PREFIX}${serviceOrderId}`, serviceOrderData);
            } else {
                console.log('[ServiceOrderService] Modo offline, buscando do cache');
                serviceOrderData = await OfflineService.getCachedData<ServiceOrder>(`${SERVICE_ORDER_DETAILS_CACHE_KEY_PREFIX}${serviceOrderId}`);
                if (!serviceOrderData) {
                    throw new Error("Dados não disponíveis offline. Conecte-se à internet para carregar.");
                }
            }
            return serviceOrderData;
        } catch (error: any) {
            console.error('[ServiceOrderService] Erro ao buscar detalhes da ordem de serviço:', error);
            
            if (error.response) {
                console.error('[ServiceOrderService] Erro no servidor:');
                console.error('Status:', error.response.status);
                console.error('Dados:', error.response.data);
                console.error('Headers:', error.response.headers);
                
                if (error.response.status === 400) {
                    const errorMessage = error.response.data?.message || error.response.data?.error || "Dados inválidos";
                    throw new Error(`Erro de validação: ${errorMessage}`);
                } else if (error.response.status === 401) {
                    throw new Error("Token de acesso inválido ou expirado.");
                } else if (error.response.status === 404) {
                    throw new Error("Ordem de serviço não encontrada.");
                } else if (error.response.status === 422) {
                    const validationErrors = error.response.data?.errors || {};
                    const errorMessages = Object.values(validationErrors).flat().join(", ");
                    throw new Error(`Erro de validação: ${errorMessages}`);
                } else {
                    throw new Error(error.response.data?.message || "Erro inesperado no servidor.");
                }
            } else if (error.request) {
                console.error('[ServiceOrderService] Erro de rede:', error.request);
                throw new Error("Erro de conexão. Verifique sua internet.");
            } else {
                console.error('[ServiceOrderService] Erro inesperado:', error.message);
                throw new Error(`Erro inesperado: ${error.message}`);
            }
        }
    }

    static async fetchAnswers(token: string, serviceOrderId: number): Promise<Answer[]> {
        try {
            const accountName = await AsyncStorage.getItem("account") || "default";
            const dynamicBaseUrl = await setDynamicApiUrl(accountName);
            const response = await apiClient.get(`${dynamicBaseUrl}/service_orders/${serviceOrderId}/answers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar respostas:', error);
            throw error;
        }
    }

    static async uploadImages(token: string, pmocId: number, equipmentVersionId: number, formData: FormData): Promise<UploadedImage[]> {
        try {
            const accountName = await AsyncStorage.getItem("account") || "default";
            const dynamicBaseUrl = await setDynamicApiUrl(accountName);
            const response = await apiClient.post(`${dynamicBaseUrl}/pmocs/${pmocId}/equipments/${equipmentVersionId}/images`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao fazer upload de imagens:', error);
            throw error;
        }
    }

    static async uploadServiceOrderImages(token: string, serviceOrderId: number, formData: FormData): Promise<UploadedImage[]> {
        try {
            const accountName = await AsyncStorage.getItem("account") || "default";
            const dynamicBaseUrl = await setDynamicApiUrl(accountName);
            const response = await apiClient.post(`${dynamicBaseUrl}/service_orders/${serviceOrderId}/images`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao fazer upload de imagens para a Ordem de Serviço:', error);
            throw error;
        }
    }

    static async fetchImages(token: string, serviceOrderId: number): Promise<UploadedImage[]> {
        try {
            const accountName = await AsyncStorage.getItem("account") || "default";
            const dynamicBaseUrl = await setDynamicApiUrl(accountName);
            const response = await apiClient.get(`${dynamicBaseUrl}/service_orders/${serviceOrderId}/images`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar imagens:', error);
            throw error;
        }
    }

    static async submitAnswers(token: string, serviceOrderId: number, data: { status: string; answers: { question_id: number; value: string; meta?: { justification?: string } }[] }): Promise<void> {
        try {
            const accountName = await AsyncStorage.getItem("account") || "default";
            const dynamicBaseUrl = await setDynamicApiUrl(accountName);
            await apiClient.post(`${dynamicBaseUrl}/service_orders/${serviceOrderId}/answers`, data, {
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (error) {
            console.error('Erro ao enviar respostas:', error);
            throw error;
        }
    }

    static async createServiceOrder(token: string, data: { equipment_id: number }): Promise<{ id: number }> {
        try {
            const accountName = await AsyncStorage.getItem("account") || "default";
            const dynamicBaseUrl = await setDynamicApiUrl(accountName);
            const response = await apiClient.post(`${dynamicBaseUrl}/service_orders`, data, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao criar ordem de serviço:', error);
            throw error;
        }
    }
}

export default ServiceOrderService;

