// file: src/Services/SignatureService.ts
import apiClient from "../Context/ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default class SignatureService {
    /**
     * Verifica se o usuário precisa fornecer sua assinatura
     * Baseado na propriedade needs_signature do endpoint /me
     */
    static async checkNeedsSignature(accessToken: string): Promise<boolean> {
        try {
            console.log('[SignatureService] Verificando se usuário precisa de assinatura...');

            const response = await apiClient.get('/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const data = response.data || {};
            const rawNeeds = (data as any).needs_signature
                ?? (data as any).user?.needs_signature
                ?? (data as any).me?.needs_signature;
            const needsSignature = rawNeeds === true || rawNeeds === 'true' || rawNeeds === 1 || rawNeeds === '1';
            console.log('[SignatureService] needs_signature (computed):', needsSignature, 'raw:', rawNeeds);

            return needsSignature;
        } catch (error: any) {
            console.error('[SignatureService] Erro ao verificar needs_signature:', error);

            if (error.response) {
                console.error('[SignatureService] Detalhes do erro:', {
                    status: error.response.status,
                    data: error.response.data,
                });

                if (error.response.status === 401) {
                    throw new Error('Token expirado ou inválido.');
                } else if (error.response.status === 403) {
                    throw new Error('Permissão negada.');
                } else if (error.response.status === 404) {
                    throw new Error('Endpoint não encontrado.');
                }
            }

            throw new Error('Erro ao verificar se assinatura é necessária.');
        }
    }

    /**
     * Salva a assinatura do usuário
     * Conforme especificação atualizada: PATCH /api/me/signature
     * Body: { "signature": "data:image/jpeg;base64,..." }
     */
    static async saveSignature(signatureBase64: string): Promise<void> {
        try {
            console.log('[SignatureService] Salvando assinatura do usuário...');

            // Validar formato base64 (apenas JPEG conforme Postman.md)
            const validDataUrl = /^data:image\/(jpeg|jpg);base64,/i.test(signatureBase64);
            if (!validDataUrl) {
                throw new Error('Formato inválido. Envie em data:image/jpeg;base64,<dados>.');
            }

            const body = { signature: signatureBase64 } as const;
            // Seguir exatamente o Postman.md: PATCH /me/signatures (plural)
            let response = await apiClient.patch('/me/signatures', body);

            console.log('[SignatureService] Assinatura salva com sucesso. Status:', response.status);
            console.log('[SignatureService] Response data:', response.data);
            try {
                await AsyncStorage.removeItem('needs_signature_pending');
            } catch { }

        } catch (error: any) {
            console.error('[SignatureService] Erro ao salvar assinatura:', error);

            // Se for um erro de validação local, repassar a mensagem original
            if (!error?.response && typeof error?.message === 'string' && error.message) {
                throw new Error(error.message);
            }

            // Fallbacks comuns: barra final e versão antiga
            // 1) Se houver redirecionamento/404/405, tentar com barra final
            try {
                const status = error.response?.status;
                const shouldTryTrailingSlash = status === 301 || status === 308 || status === 404 || status === 405;
                if (shouldTryTrailingSlash) {
                    console.log('[SignatureService] Tentando fallback com barra final: POST /me/signitures/');
                    const body = { signature: signatureBase64 } as const;
                    try { await AsyncStorage.removeItem('needs_signature_pending'); } catch { }
                    return;
                }
            } catch (fallbackErr: any) {
                console.warn('[SignatureService] Fallback POST /me/signatures/ falhou:', fallbackErr?.response?.status);
                // 2) Versão antiga: PATCH /me/signature (singular)
                if (fallbackErr?.response?.status === 405 || fallbackErr?.response?.status === 404) {
                    try {
                        console.log('[SignatureService] Tentando versão antiga: PATCH /me/signature');
                        const body = { signature: signatureBase64 } as const;
                        const resp3 = await apiClient.patch('/me/signature', body);
                        console.log('[SignatureService] Fallback PATCH funcionou. Status:', resp3.status);
                        try { await AsyncStorage.removeItem('needs_signature_pending'); } catch { }
                        return;
                    } catch (postErr: any) {
                        console.warn('[SignatureService] Versão antiga PATCH /me/signature também falhou:', postErr?.response?.status);
                        // Continua para tratamento padrão abaixo
                    }
                }
            }

            if (error.response) {
                console.error('[SignatureService] Detalhes do erro:', {
                    status: error.response.status,
                    data: error.response.data,
                    url: error.config?.url
                });

                const serverMessage =
                    (error.response.data && (error.response.data.message || error.response.data.detail || error.response.data.error))
                    || undefined;

                if (error.response.status === 400) {
                    throw new Error(serverMessage || 'Dados da assinatura inválidos. Verifique o formato da imagem.');
                } else if (error.response.status === 401) {
                    throw new Error('Token expirado ou inválido.');
                } else if (error.response.status === 403) {
                    throw new Error('Permissão negada para salvar assinatura.');
                } else if (error.response.status === 413) {
                    throw new Error('Imagem da assinatura muito grande. Reduza o tamanho.');
                } else if (error.response.status === 415) {
                    throw new Error(serverMessage || 'Tipo de imagem não suportado. Envie JPEG ou PNG.');
                } else if (error.response.status === 404) {
                    throw new Error('Endpoint de assinatura não encontrado.');
                } else if (error.response.status === 405) {
                    throw new Error('Método não permitido para este endpoint.');
                } else if (error.response.status === 500) {
                    throw new Error('Erro interno do servidor. Tente novamente.');
                }
            }

            throw new Error('Erro ao salvar assinatura. Tente novamente.');
        }
    }
}
