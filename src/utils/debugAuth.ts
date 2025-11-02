// Utilitário para debug de autenticação
import AsyncStorage from '@react-native-async-storage/async-storage';

export class DebugAuth {
    /**
     * Exibe informações de autenticação armazenadas
     */
    static async showStoredAuth() {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 DEBUG: DADOS DE AUTENTICAÇÃO ARMAZENADOS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
            const account = await AsyncStorage.getItem('account');
            const accessToken = await AsyncStorage.getItem('access_token');
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            const keepLoggedIn = await AsyncStorage.getItem('keep_logged_in');

            console.log('📦 Account:', account || '(não definido)');
            console.log('🔑 Access Token:');
            if (accessToken) {
                console.log('  - Length:', accessToken.length);
                console.log('  - Primeiros 50 chars:', accessToken.substring(0, 50) + '...');
                console.log('  - Últimos 20 chars:', '...' + accessToken.substring(accessToken.length - 20));

                // Tentar decodificar (base64)
                try {
                    const parts = accessToken.split('.');
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1]));
                        console.log('  - Payload:', {
                            user_id: payload.user_id,
                            user_name: payload.user_name,
                            exp: payload.exp,
                            exp_date: new Date(payload.exp * 1000).toISOString(),
                            iat: payload.iat,
                            iat_date: new Date(payload.iat * 1000).toISOString(),
                        });

                        // Verificar se expirou
                        const now = Math.floor(Date.now() / 1000);
                        if (payload.exp < now) {
                            console.log('  ⚠️ TOKEN EXPIRADO!');
                            console.log('  - Expirou em:', new Date(payload.exp * 1000).toISOString());
                            console.log('  - Há:', Math.floor((now - payload.exp) / 60), 'minutos atrás');
                        } else {
                            console.log('  ✅ Token válido');
                            console.log('  - Expira em:', Math.floor((payload.exp - now) / 60), 'minutos');
                        }
                    }
                } catch (e) {
                    console.log('  ⚠️ Não foi possível decodificar o token');
                }
            } else {
                console.log('  (não definido)');
            }

            console.log('🔄 Refresh Token:', refreshToken ? `${refreshToken.substring(0, 30)}... (len: ${refreshToken.length})` : '(não definido)');
            console.log('💾 Keep Logged In:', keepLoggedIn);

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        } catch (error) {
            console.error('Erro ao ler AsyncStorage:', error);
        }
    }

    /**
     * Limpa todos os dados de autenticação
     */
    static async clearAuth() {
        console.log('🗑️ Limpando dados de autenticação...');

        try {
            await AsyncStorage.removeItem('account');
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('refresh_token');
            await AsyncStorage.removeItem('keep_logged_in');

            console.log('✅ Dados de autenticação limpos!');
        } catch (error) {
            console.error('❌ Erro ao limpar dados:', error);
        }
    }

    /**
     * Testa a construção da URL
     */
    static async testUrlConstruction() {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 DEBUG: CONSTRUÇÃO DE URL');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const account = await AsyncStorage.getItem('account');
        console.log('📦 Account:', account);

        if (account) {
            const url = `https://${account}.keosstg001.xyz/api`;
            console.log('🌐 URL construída:', url);
            console.log('✅ /api/me completo:', url + '/me');
        } else {
            console.log('⚠️ Nenhuma conta definida!');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    /**
     * Mostra todas as chaves no AsyncStorage
     */
    static async showAllKeys() {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 DEBUG: TODAS AS CHAVES NO ASYNC STORAGE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
            const keys = await AsyncStorage.getAllKeys();
            console.log(`Total de chaves: ${keys.length}`);

            for (const key of keys) {
                const value = await AsyncStorage.getItem(key);
                const preview = value && value.length > 100
                    ? value.substring(0, 100) + '...'
                    : value;
                console.log(`  - ${key}: ${preview}`);
            }

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        } catch (error) {
            console.error('Erro ao listar chaves:', error);
        }
    }

    /**
     * Executa todos os testes
     */
    static async runAllTests() {
        await this.showStoredAuth();
        await this.testUrlConstruction();
        await this.showAllKeys();
    }
}

