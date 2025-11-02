import apiClient from "../Context/ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default class EquipmentTypeService {
    /**
     * Busca todos os tipos de equipamento (equipment_types) com retry automático
     * Retorna array vazio em caso de erro para evitar crash do app
     */
    static async fetchEquipmentTypes(): Promise<any[]> {
        const maxRetries = 2;
        let lastError: any = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[EquipmentTypeService] 📦 Buscando equipment_types (tentativa ${attempt}/${maxRetries})...`);

                const response = await apiClient.get('/equipment_types');
                const payload = response.data;

                // Normaliza resposta: pode ser array direto ou objeto com results
                const results = Array.isArray(payload) ? payload : (payload?.results || payload?.data || []);

                console.log(`[EquipmentTypeService] ✅ Equipment types carregados: ${results.length} itens`);
                return results;
            } catch (error: any) {
                lastError = error;
                const status = error?.response?.status;
                const isHtmlError = typeof error?.response?.data === 'string' && error?.response?.data.includes('<!DOCTYPE html>');

                console.error(`[EquipmentTypeService] ❌ Erro ao buscar equipment_types (tentativa ${attempt}/${maxRetries}):`, error?.message);
                console.error('[EquipmentTypeService] Status:', status);
                console.error('[EquipmentTypeService] É HTML (Django error)?:', isHtmlError);

                // Se for erro 500 com HTML (ProgrammingError do Django)
                if (status >= 500 || isHtmlError) {
                    if (attempt < maxRetries) {
                        const delay = attempt * 500;
                        console.warn(`[EquipmentTypeService] ⚠️ Erro 500/HTML - aguardando ${delay}ms antes de retry...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue; // Tenta novamente
                    } else {
                        // Última tentativa falhou - retornar vazio em vez de crashar
                        console.warn('[EquipmentTypeService] ⚠️ Todas as tentativas falharam. Retornando array vazio para evitar crash.');
                        console.warn('[EquipmentTypeService] 💡 BACKEND DEVE CORRIGIR: ProgrammingError no endpoint /equipment_types');
                        return [];
                    }
                }

                // Outros erros (401, 403, 404, etc) não fazem retry
                console.error('[EquipmentTypeService] Erro não-500, abortando retries');
                break;
            }
        }

        // Se chegou aqui, erro não é 500 - retornar vazio mesmo assim para não crashar
        console.error('[EquipmentTypeService] Erro definitivo ao buscar equipment_types:', lastError?.message);
        console.warn('[EquipmentTypeService] Retornando array vazio para evitar crash do app');
        return [];
    }

    /**
     * Busca um tipo de equipamento específico por ID
     */
    static async fetchEquipmentTypeById(typeId: number): Promise<any | null> {
        try {
            console.log(`[EquipmentTypeService] Buscando equipment_type ID: ${typeId}`);
            const response = await apiClient.get(`/equipment_types/${typeId}`);
            console.log('[EquipmentTypeService] Equipment type encontrado:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[EquipmentTypeService] Erro ao buscar equipment_type por ID:', error?.message);

            if (error?.response?.status === 404) {
                console.warn('[EquipmentTypeService] Equipment type não encontrado (404)');
                return null;
            }

            // Outros erros: retorna null
            return null;
        }
    }
}

