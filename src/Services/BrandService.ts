import apiClient from "../Context/ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default class BrandService {
  /**
   * Busca todas as marcas (brands) com retry automático
   * Retorna array vazio em caso de erro para evitar crash do app
   */
  static async fetchBrands(): Promise<any[]> {
    const maxRetries = 2;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[BrandService] 📦 Buscando brands (tentativa ${attempt}/${maxRetries})...`);
        
        const response = await apiClient.get('/brands');
        const payload = response.data;
        
        // Normaliza resposta: pode ser array direto ou objeto com results
        const results = Array.isArray(payload) ? payload : (payload?.results || payload?.data || []);
        
        console.log(`[BrandService] ✅ Brands carregadas: ${results.length} itens`);
        return results;
      } catch (error: any) {
        lastError = error;
        const status = error?.response?.status;
        const isHtmlError = typeof error?.response?.data === 'string' && error?.response?.data.includes('<!DOCTYPE html>');
        
        console.error(`[BrandService] ❌ Erro ao buscar brands (tentativa ${attempt}/${maxRetries}):`, error?.message);
        console.error('[BrandService] Status:', status);
        console.error('[BrandService] É HTML (Django error)?:', isHtmlError);
        
        // Se for erro 500 com HTML (ProgrammingError do Django)
        if (status >= 500 || isHtmlError) {
          if (attempt < maxRetries) {
            const delay = attempt * 500;
            console.warn(`[BrandService] ⚠️ Erro 500/HTML - aguardando ${delay}ms antes de retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Tenta novamente
          } else {
            // Última tentativa falhou - retornar vazio em vez de crashar
            console.warn('[BrandService] ⚠️ Todas as tentativas falharam. Retornando array vazio para evitar crash.');
            console.warn('[BrandService] 💡 BACKEND DEVE CORRIGIR: ProgrammingError no endpoint /brands');
            return [];
          }
        }
        
        // Outros erros (401, 403, 404, etc) não fazem retry
        console.error('[BrandService] Erro não-500, abortando retries');
        break;
      }
    }

    // Se chegou aqui, erro não é 500 - retornar vazio mesmo assim para não crashar
    console.error('[BrandService] Erro definitivo ao buscar brands:', lastError?.message);
    console.warn('[BrandService] Retornando array vazio para evitar crash do app');
    return [];
  }

  /**
   * Busca uma marca específica por ID
   */
  static async fetchBrandById(brandId: number): Promise<any | null> {
    try {
      console.log(`[BrandService] Buscando brand ID: ${brandId}`);
      const response = await apiClient.get(`/brands/${brandId}`);
      console.log('[BrandService] Brand encontrada:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[BrandService] Erro ao buscar brand por ID:', error?.message);
      
      if (error?.response?.status === 404) {
        console.warn('[BrandService] Brand não encontrada (404)');
        return null;
      }
      
      // Outros erros: retorna null
      return null;
    }
  }
}


