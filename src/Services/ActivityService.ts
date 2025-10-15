import { Activity } from "../Models/Activity";
import apiClient from "../Context/ApiClient";
import { ActivityDynamicField } from "../Models/ActivityDynamicField";
import { ActivityAnswer } from "../Models/ActivityAnswer";
import { UploadFile } from "../Models/UploadFile";
import NetInfo from '@react-native-community/netinfo';
import OfflineService from './OfflineService';

type ActivitiesListResponse = {
    links?: { next?: string | null; previous?: string | null };
    count?: number;
    results?: Activity[];
    activities?: Activity[];
};

function toRelativeApiPath(url: string | null | undefined): string | null {
    console.log(`[toRelativeApiPath] Input URL: ${url}`);
    if (!url) {
        console.log(`[toRelativeApiPath] URL vazia, retornando null`);
        return null;
    }
    try {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            const u = new URL(url);
            let path = `${u.pathname}${u.search || ''}`;

            // Remover /api do início porque ApiClient já adiciona automaticamente
            if (path.startsWith('/api/')) {
                path = path.substring(4); // Remove '/api'
            }

            console.log(`[toRelativeApiPath] URL absoluta convertida: ${path}`);
            return path;
        }
        console.log(`[toRelativeApiPath] URL já relativa: ${url}`);
        return url;
    } catch (e) {
        console.error(`[toRelativeApiPath] Erro ao processar URL: ${e}`);
        return url as any;
    }
}

// Cache em memória e controle de cooldown para /activity_types
let activityTypesCache: any[] | null = null;
let activityTypesCooldownUntil: number | null = null;

export default class ActivityService {

    // Helper para obter MIME type correto baseado na extensão do arquivo
    private static getMimeType(fileName: string): string {
        const extension = fileName.toLowerCase().split('.').pop();
        const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
        };
        return mimeTypes[extension || ''] || 'image/jpeg'; // Fallback para jpeg
    }

    // 1. Buscar atividades globais com filtros
    static async fetchAllActivities(params: {
        page?: number;
        per_page?: number;
        activity_type_slug?: string;
        activity_type_id?: number;
        status?: string[];
        token: string;
    }): Promise<{ results: Activity[]; count: number }> {
        try {
            console.log('[ActivityService] ===== FETCHALLACTIVITIES (MÉTODO ANTIGO) =====');
            console.log('[ActivityService] ⚠️ ATENÇÃO: Usando método antigo fetchAllActivities');
            console.log('[ActivityService] Buscando atividades sem paginação conforme doc');
            console.log('[ActivityService] Filtros aplicados:', { activity_type_slug: params.activity_type_slug, status: params.status });

            const response = await apiClient.get('/activities', {
                headers: { Authorization: `Bearer ${params.token}` },
                params: {
                    // Enviar apenas o que o backend aceitar; se ignorar, não quebra
                    page: params.page,
                    per_page: params.per_page,
                    status: params.status,
                },
            });

            const data = response.data;
            let results = data.results || [];
            const originalCount = data.count || results.length;

            // Aplicar filtros locais se necessário
            const hasFilters = params.activity_type_id != null || params.activity_type_slug || (params.status && params.status.length > 0);

            // Priorizar filtro por ID (mais robusto)
            if (params.activity_type_id != null) {
                const wantedId = Number(params.activity_type_id);
                console.log('[ActivityService] Filtrando por activity_type_id:', wantedId);
                results = results.filter((a: Activity) => {
                    const idFromObj = (a as any)?.activity_type?.id;
                    const idFromFlat = (a as any)?.activity_type_id;
                    return idFromObj === wantedId || idFromFlat === wantedId;
                });
                console.log(`[ActivityService] Após filtro por ID: ${results.length} atividades`);
            } else if (params.activity_type_slug) {
                console.log('[ActivityService] Filtrando por activity_type_slug:', params.activity_type_slug);

                results = results.filter((a: Activity) => {
                    const activityType = (a as any)?.activity_type;
                    const activityTypeName = activityType?.name || (a as any)?.type || '';

                    console.log(`[ActivityService] Atividade ${(a as any)?.id}: activity_type.name = "${activityTypeName}"`);

                    // Normalizar para comparação (remover acentos, espaços, case-insensitive)
                    const normalize = (str: string) => str?.toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]/g, '') || '';

                    const targetType = normalize(params.activity_type_slug!);
                    const currentType = normalize(activityTypeName);

                    // Mapeamento de slugs para nomes da API (baseado no payload real)
                    const typeMapping: { [key: string]: string[] } = {
                        'pmoc': ['pmoc'],
                        'instalacao': ['instalacao'],
                        'instalation': ['instalacao'],
                        'assistenciatecnica': ['assistenciatecnica'],
                        'technical_assistance': ['assistenciatecnica'],
                        'ordemdeservico': ['ordemdeservico'],
                        'service_order': ['ordemdeservico'],
                        // Mapeamentos adicionais comuns
                        'workorder': ['ordemdeservico'],
                        'ordem_servico': ['ordemdeservico'],
                        'ordem_de_servico': ['ordemdeservico'],
                        'order_service': ['ordemdeservico'],
                    };

                    const possibleTypes = typeMapping[targetType] || [targetType];
                    const matches = possibleTypes.some(t => currentType === t || currentType.includes(t) || t.includes(currentType));

                    if (matches) {
                        console.log(`[ActivityService] ✅ Atividade ${(a as any)?.id} corresponde ao filtro`);
                    }

                    return matches;
                });

                console.log(`[ActivityService] Após filtro de tipo: ${results.length} atividades`);
            }
            if (params.status && params.status.length > 0) {
                results = results.filter((a: Activity) => params.status!.includes(a.status));
            }

            // Se aplicamos filtros, usar o count filtrado, senão usar o count da API
            const finalCount = hasFilters ? results.length : originalCount;

            console.log('[ActivityService] Resultado:', { totalResults: results.length, finalCount, hasFilters });
            return { results, count: finalCount };

        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar atividades:', error);
            if (error.response?.status === 500) {
                return { results: [], count: 0 }; // Fallback para lista vazia
            }
            throw error;
        }
    }

    // 1.1. Buscar TODAS as páginas e agregar resultados (para métricas do dashboard)
    static async fetchAllActivitiesAllPages(params: { token: string }): Promise<Activity[]> {
        console.log('[ActivityService] ===== FETCHANDO TODAS AS PÁGINAS =====');
        const aggregated: Activity[] = [];
        let nextUrl: string | null = '/activities';
        let safety = 0;
        let pageCount = 0;

        while (nextUrl) {
            safety += 1;
            pageCount += 1;
            console.log(`[ActivityService] Buscando página ${pageCount}, URL: ${nextUrl}`);

            if (safety > 50) {
                console.warn('[ActivityService] Interrompido por segurança após 50 páginas.');
                break;
            }

            const response = await apiClient.get<ActivitiesListResponse>(nextUrl, {
                headers: { Authorization: `Bearer ${params.token}` },
            });

            const data: ActivitiesListResponse = response.data || {} as ActivitiesListResponse;
            console.log(`[ActivityService] Página ${pageCount} - Count: ${data.count}, Results: ${data.results?.length || 0}`);

            const pageResults: Activity[] = Array.isArray(data.results)
                ? data.results
                : (Array.isArray(data.activities) ? data.activities : []);

            console.log(`[ActivityService] Página ${pageCount} - Atividades adicionadas: ${pageResults.length}`);
            aggregated.push(...pageResults);

            nextUrl = toRelativeApiPath(data.links?.next) || null;
            console.log(`[ActivityService] Página ${pageCount} - Next URL: ${nextUrl}`);
        }

        console.log(`[ActivityService] ===== FINALIZADO - ${pageCount} páginas, ${aggregated.length} atividades =====`);
        return aggregated;
    }

    // 1.2. Obter contadores para o dashboard considerando paginação
    static async getDashboardCounts(params: { token: string }): Promise<{ created: number; open: number; total: number }> {
        console.log('[ActivityService] ===== INICIANDO DASHBOARD COUNTS =====');
        try {
            console.log('[ActivityService] Buscando todas as atividades...');
            const all = await ActivityService.fetchAllActivitiesAllPages({ token: params.token });
            console.log('[ActivityService] Total de atividades recebidas:', all.length);

            let created = 0;
            let open = 0;

            console.log('[ActivityService] Contando por status...');
            const statusMap: { [key: string]: number } = {};

            for (const a of all) {
                const status = (a as any)?.status;
                statusMap[status] = (statusMap[status] || 0) + 1;

                if (status === 'created') created += 1;
                else if (status === 'open') open += 1;
            }

            console.log('[ActivityService] Mapeamento completo de status:', statusMap);

            const total = all.length;
            console.log('[ActivityService] ===== RESULTADO CONTADORES =====');
            console.log(`[ActivityService] Created: ${created}, Open: ${open}, Total: ${total}`);

            return { created, open, total };
        } catch (error) {
            console.error('[ActivityService] ===== ERRO AO CALCULAR CONTADORES =====');
            console.error('[ActivityService] Erro ao calcular contadores do dashboard:', error);
            console.error('[ActivityService] Stack trace:', (error as any)?.stack);
            return { created: 0, open: 0, total: 0 };
        }
    }

    // 2. Buscar equipamentos vinculados a uma atividade
    static async fetchActivityEquipments(activityId: number, params: { token: string }): Promise<any> {
        try {
            // Verificar conectividade
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);
            const cacheKey = `activity_equipments_${activityId}`;

            if (isConnected) {
                console.log('[ActivityService] Modo online, buscando equipamentos da atividade:', activityId);
                let response;
                let lastError: any = null;

                // Tenta endpoint principal conforme documentação
                try {
                    response = await apiClient.get(`/activities/${activityId}/equipments`, {
                        headers: { Authorization: `Bearer ${params.token}` },
                    });
                } catch (e: any) {
                    lastError = e;
                    console.warn('[ActivityService] /activities/:id/equipments retornou erro', e?.response?.status);
                }

                // Fallback 1: alguns backends usam chave 'results' ou 'resultados'
                if (!response) {
                    // nada a fazer aqui; os próximos fallbacks tratam variações de rota
                }

                // Fallback 2: alguns backends usam singular /activities/:id/equipment
                if (!response) {
                    try {
                        response = await apiClient.get(`/activities/${activityId}/equipment`, {
                            headers: { Authorization: `Bearer ${params.token}` },
                        });
                        console.log('[ActivityService] Usando fallback /activities/:id/equipment');
                    } catch (e: any) {
                        lastError = e;
                        console.warn('[ActivityService] Fallback /activities/:id/equipment falhou', e?.response?.status);
                    }
                }

                if (!response) {
                    // Se nenhum endpoint funcionou, lança o último erro
                    if (lastError) throw lastError;
                    throw new Error('Nenhum endpoint válido para carregar equipamentos da atividade.');
                }

                console.log('[ActivityService] Equipamentos recebidos:', response.data);

                // Salvar no cache
                await OfflineService.cacheData(cacheKey, response.data);
                console.log('[ActivityService] Equipamentos salvos no cache');

                // Normalizar resposta: aceitar 'results' ou 'resultados'
                const payload = response.data || {};
                if (payload.resultados && !payload.results) {
                    payload.results = payload.resultados;
                }
                return payload;
            } else {
                console.log('[ActivityService] Modo offline, buscando equipamentos do cache');
                const cachedEquipments = await OfflineService.getCachedData(cacheKey);
                if (cachedEquipments) {
                    console.log('[ActivityService] Equipamentos carregados do cache');
                    return cachedEquipments;
                } else {
                    throw new Error("Dados não disponíveis offline. Conecte-se à internet para carregar.");
                }
            }
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar equipamentos da atividade:', error);
            console.error('[ActivityService] Status:', error.response?.status);
            console.error('[ActivityService] Dados:', error.response?.data);

            // Se for erro de JSON parse, tentar ler o texto da resposta
            if (error.message?.includes('JSON Parse error')) {
                try {
                    const responseText = await error.response?.text();
                    console.error('[ActivityService] Resposta em texto:', responseText);
                } catch (textError) {
                    console.error('[ActivityService] Erro ao ler resposta em texto:', textError);
                }
            }

            // Tentar usar cache como fallback
            const cacheKey = `activity_equipments_${activityId}`;
            const cachedEquipments = await OfflineService.getCachedData(cacheKey);
            if (cachedEquipments) {
                console.log('[ActivityService] Usando cache como fallback');
                return cachedEquipments;
            }

            // Retornar estrutura vazia em caso de erro
            return {
                results: [],
                count: 0
            };
        }
    }

    // 3. Iniciar/fechar atividade em equipamento
    static async patchActivityEquipment(
        activityId: number,
        activityEquipmentId: number,
        data: any,
        token: string
    ): Promise<any> {
        try {
            // Verificar conectividade
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);

            if (isConnected) {
                console.log('[ActivityService] Modo online, iniciando/fechando atividade no equipamento:', {
                    activityId,
                    activityEquipmentId,
                    data
                });

                const response = await apiClient.patch(`/activities/${activityId}/equipments/${activityEquipmentId}`, data, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                console.log('[ActivityService] Resposta do patch:', response.data);
                return response.data;
            } else {
                console.log('[ActivityService] Modo offline, salvando mudança de status na fila');

                // Salvar na fila offline
                await OfflineService.addRequestToQueue({
                    type: 'activity_status_update',
                    payload: {
                        context: {
                            activityId,
                            activityEquipmentId
                        },
                        status: data.status
                    }
                });

                console.log('[ActivityService] Mudança de status salva na fila offline');
                return { success: true, offline: true };
            }
        } catch (error: any) {
            console.error('[ActivityService] Erro ao iniciar/fechar atividade:', error);
            console.error('[ActivityService] Status:', error.response?.status);
            console.error('[ActivityService] Dados:', error.response?.data);
            console.error('[ActivityService] URL:', error.config?.url);
            console.error('[ActivityService] Payload:', error.config?.data);

            throw error;
        }
    }

    // 4. Buscar questões do questionário
    static async fetchActivityQuestions(activityPlanId: number, versionId: number, token: string): Promise<ActivityDynamicField[]> {
        try {
            // Verificar conectividade
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);
            const cacheKey = `activity_questions_${activityPlanId}_${versionId}`;

            if (isConnected) {
                console.log('[ActivityService] Modo online, buscando questões para Activity Plan:', activityPlanId, 'Version:', versionId);

                // Fazer requisição com retry automático para rate limiting
                let response: any = null;
                let retries = 0;
                const maxRetries = 3;

                while (retries < maxRetries) {
                    try {
                        response = await apiClient.get(`/activity_plans/${activityPlanId}/versions/${versionId}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        break; // Sucesso, sair do loop
                    } catch (error: any) {
                        if (error.response?.status === 429 && retries < maxRetries - 1) {
                            const waitTime = 10 + (retries * 5); // 10s, 15s, 20s
                            console.log(`[ActivityService] Rate limit atingido, aguardando ${waitTime}s antes de tentar novamente...`);
                            await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                            retries++;
                        } else {
                            throw error;
                        }
                    }
                }

                if (!response) {
                    throw new Error('Falha ao obter resposta após múltiplas tentativas');
                }

                console.log('[ActivityService] Resposta da API de questões:', response.data);

                if (!response.data.questions) {
                    console.warn('[ActivityService] Campo "questions" não encontrado na resposta');
                    return [];
                }

                // Adicionar has_upload para algumas questões para teste
                const questionsWithUpload = response.data.questions.map((question: any, index: number) => ({
                    ...question,
                    has_upload: index === 0 || index === 1 // Primeira e segunda questão terão upload obrigatório
                }));

                console.log('[ActivityService] Questões com has_upload adicionado:', questionsWithUpload);

                // Salvar no cache
                await OfflineService.cacheData(cacheKey, questionsWithUpload);
                console.log('[ActivityService] Questões salvas no cache');

                return questionsWithUpload;
            } else {
                console.log('[ActivityService] Modo offline, buscando questões do cache');
                const cachedQuestions = await OfflineService.getCachedData<ActivityDynamicField[]>(cacheKey);
                if (cachedQuestions) {
                    console.log('[ActivityService] Questões carregadas do cache');
                    return cachedQuestions;
                } else {
                    throw new Error("Questões não disponíveis offline. Conecte-se à internet para carregar.");
                }
            }
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar questões:', error);
            console.error('[ActivityService] Status:', error.response?.status);
            console.error('[ActivityService] Dados:', error.response?.data);

            // Tentar usar cache como fallback
            const cacheKey = `activity_questions_${activityPlanId}_${versionId}`;
            const cachedQuestions = await OfflineService.getCachedData<ActivityDynamicField[]>(cacheKey);
            if (cachedQuestions) {
                console.log('[ActivityService] Usando cache como fallback');
                return cachedQuestions;
            }

            throw error;
        }
    }

    // 4.1. Buscar respostas salvas do questionário
    static async fetchActivityAnswers(activityId: number, activityEquipmentId: number, token: string): Promise<any> {
        try {
            // Verificar conectividade
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);
            const cacheKey = `activity_answers_${activityId}_${activityEquipmentId}`;

            if (isConnected) {
                console.log('[ActivityService] Modo online, buscando respostas salvas para Activity:', activityId, 'Equipment:', activityEquipmentId);

                const response = await apiClient.get(`/activities/${activityId}/equipments/${activityEquipmentId}/answers`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                console.log('[ActivityService] Resposta da API de respostas salvas:', response.data);

                // Verificar estrutura da resposta
                if (response.data) {
                    console.log('[ActivityService] Estrutura da resposta:', {
                        tem_results: !!response.data.results,
                        tem_count: !!response.data.count,
                        eh_array: Array.isArray(response.data),
                        tipo: typeof response.data
                    });

                    if (response.data.results && response.data.results.length > 0) {
                        console.log('[ActivityService] Primeira resposta:', JSON.stringify(response.data.results[0], null, 2));
                    }
                }

                // Salvar no cache
                await OfflineService.cacheData(cacheKey, response.data);
                console.log('[ActivityService] Respostas salvas no cache');

                return response.data;
            } else {
                console.log('[ActivityService] Modo offline, buscando respostas do cache');
                const cachedAnswers = await OfflineService.getCachedData(cacheKey);
                if (cachedAnswers) {
                    console.log('[ActivityService] Respostas carregadas do cache');
                    return cachedAnswers;
                } else {
                    console.log('[ActivityService] Nenhuma resposta encontrada no cache');
                    return [];
                }
            }
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar respostas salvas:', error);
            console.error('[ActivityService] Status:', error.response?.status);
            console.error('[ActivityService] Dados:', error.response?.data);

            // Tentar usar cache como fallback
            const cacheKey = `activity_answers_${activityId}_${activityEquipmentId}`;
            const cachedAnswers = await OfflineService.getCachedData(cacheKey);
            if (cachedAnswers) {
                console.log('[ActivityService] Usando cache como fallback');
                return cachedAnswers;
            }

            // Retornar array vazio se não houver cache
            return [];
        }
    }

    // 5. Enviar resposta individual do questionário (conforme tarefas.md)
    static async postActivityAnswer(
        activityId: number,
        activityEquipmentId: number,
        answer: ActivityAnswer,
        token: string
    ): Promise<any> {
        // Verificar conectividade com detalhes completos
        const networkState = await NetInfo.fetch();
        console.log('[ActivityService] 🌐 Estado completo da rede:', {
            isConnected: networkState.isConnected,
            type: networkState.type,
            isInternetReachable: networkState.isInternetReachable,
            details: networkState.details
        });

        // Tentar enviar se houver qualquer indicação de conectividade
        // Tratar null como "pode tentar" (conexão ainda sendo verificada)
        const shouldTryOnline = networkState.isConnected !== false &&
            (networkState.isInternetReachable !== false);

        console.log('[ActivityService] 📡 Decisão de envio:', {
            shouldTryOnline,
            isConnected: networkState.isConnected,
            isInternetReachable: networkState.isInternetReachable,
            reason: shouldTryOnline ? 'Rede disponível' : 'Sem conexão detectada'
        });

        if (shouldTryOnline) {
            try {
                console.log('[ActivityService] 📤 Preparando envio para servidor...');
                console.log('[ActivityService] 📋 Dados da resposta:', {
                    activityId,
                    activityEquipmentId,
                    questionId: answer.question_id,
                    hasValue: answer.value !== null && answer.value !== undefined,
                    hasJustification: !!answer.justification,
                    uploadsCount: answer.uploads?.length || 0
                });

                // Usar FormData conforme documentação do Postman
                const formData = new FormData();

                // Adicionar campos de texto conforme especificação Postman.md
                formData.append('question_id', answer.question_id.toString());

                // Converter value para string (pode ser string, number ou array)
                let valueStr = '';
                if (Array.isArray(answer.value)) {
                    valueStr = JSON.stringify(answer.value);
                } else if (answer.value !== null && answer.value !== undefined) {
                    valueStr = String(answer.value);
                }
                formData.append('value', valueStr);

                // justification é obrigatório conforme spec, sempre enviar (mesmo que vazio)
                formData.append('justification', answer.justification || '');

                // Se houver uploads, adicionar arquivos ao FormData
                if (answer.uploads && answer.uploads.length > 0) {
                    console.log('[ActivityService] 📎 Adicionando', answer.uploads.length, 'uploads ao FormData');

                    answer.uploads.forEach((upload, index) => {
                        const fileName = upload.name || `upload_${Date.now()}_${index}.jpg`;
                        const mimeType = this.getMimeType(fileName);

                        formData.append(`uploads[${index}]`, {
                            uri: upload.uri,
                            name: fileName,
                            type: mimeType,
                        } as any);

                        console.log(`[ActivityService] 📷 Upload[${index}]:`, {
                            name: fileName,
                            type: mimeType,
                            originalType: upload.type,
                            uri: upload.uri?.substring(0, 50) + '...'
                        });
                    });

                    console.log('[ActivityService] ✅ Todos os uploads configurados com MIME types corretos');
                }

                console.log('[ActivityService] 🚀 Enviando requisição POST para servidor...');
                const endpoint = `/activities/${activityId}/equipments/${activityEquipmentId}/answers`;
                console.log('[ActivityService] 🎯 Endpoint:', endpoint);

                const response = await apiClient.post(
                    endpoint,
                    formData
                    // apiClient já adiciona Authorization automaticamente
                    // e detecta o Content-Type para FormData
                );

                console.log('[ActivityService] ✅ Resposta enviada com SUCESSO ao servidor!');
                console.log('[ActivityService] 📦 Resposta do servidor:', {
                    status: response.status,
                    data: response.data
                });

                return { ...response.data, offline: false, success: true };
            } catch (error: any) {
                console.error('[ActivityService] ❌ ERRO ao enviar resposta para servidor!');
                console.error('[ActivityService] 🔴 Tipo do erro:', error?.constructor?.name || typeof error);
                console.error('[ActivityService] 🔴 Mensagem:', error?.message);
                console.error('[ActivityService] 🔴 Stack trace:', error?.stack);

                if (error.response) {
                    // Erro com resposta do servidor
                    console.error('[ActivityService] 🔴 Status HTTP:', error.response.status);
                    console.error('[ActivityService] 🔴 Headers:', error.response.headers);
                    console.error('[ActivityService] 🔴 Dados da resposta:', error.response.data);
                    console.error('[ActivityService] 🔴 Endpoint tentado:', `/activities/${activityId}/equipments/${activityEquipmentId}/answers`);
                    console.error('[ActivityService] 🔴 FormData enviado (resumo):', {
                        question_id: answer.question_id,
                        value_length: (Array.isArray(answer.value) ? JSON.stringify(answer.value) : String(answer.value || '')).length,
                        has_justification: !!answer.justification,
                        uploads_count: answer.uploads?.length || 0
                    });

                    // Erros que NÃO devem ir para fila offline (problemas de dados)
                    if (error.response.status === 400 || error.response.status === 422) {
                        console.error('[ActivityService] ⚠️ Erro de validação - NÃO será salvo offline');
                        throw new Error(`Erro de validação: ${JSON.stringify(error.response.data)}`);
                    }

                    // Erros que devem ir para fila offline (problemas temporários do servidor)
                    if (error.response.status >= 500) {
                        console.warn('[ActivityService] ⚠️ Erro do servidor - salvando na fila offline');
                        await OfflineService.addRequestToQueue({
                            type: 'activity_answer',
                            payload: {
                                context: {
                                    activityId,
                                    activityEquipmentId
                                },
                                answer: answer
                            }
                        });
                        return { success: true, offline: true, queued: true };
                    }
                } else if (error.request) {
                    // Requisição foi feita mas não houve resposta
                    console.error('[ActivityService] 🔴 Requisição enviada mas sem resposta do servidor');
                    console.error('[ActivityService] 🔴 Request:', error.request);
                    console.error('[ActivityService] 🔴 Possível timeout ou servidor inacessível');
                    console.error('[ActivityService] 🔴 Network state original:', {
                        isConnected: networkState.isConnected,
                        isInternetReachable: networkState.isInternetReachable,
                        type: networkState.type
                    });
                    console.warn('[ActivityService] ⚠️ Problema de rede - salvando na fila offline');

                    // Salvar na fila offline
                    await OfflineService.addRequestToQueue({
                        type: 'activity_answer',
                        payload: {
                            context: {
                                activityId,
                                activityEquipmentId
                            },
                            answer: answer
                        }
                    });
                    return { success: true, offline: true, queued: true };
                } else {
                    // Erro ao configurar requisição
                    console.error('[ActivityService] 🔴 Erro ao configurar requisição:', error.message);
                }

                // Re-lançar erro para camadas superiores tratarem
                throw error;
            }
        } else {
            console.log('[ActivityService] 📴 Sem conexão - salvando resposta na fila offline');

            // Salvar na fila offline
            await OfflineService.addRequestToQueue({
                type: 'activity_answer',
                payload: {
                    context: {
                        activityId,
                        activityEquipmentId
                    },
                    answer: answer
                }
            });

            console.log('[ActivityService] 💾 Resposta salva na fila offline');
            return { success: true, offline: true, queued: true };
        }
    }

    // 5.1. Enviar múltiplas respostas (mantido para compatibilidade)
    static async postActivityAnswers(
        activityId: number,
        activityEquipmentId: number,
        answers: ActivityAnswer[],
        token: string
    ): Promise<any> {
        const results = [];
        for (const answer of answers) {
            try {
                const result = await ActivityService.postActivityAnswer(
                    activityId,
                    activityEquipmentId,
                    answer,
                    token
                );
                results.push(result);
            } catch (error) {
                console.error('[ActivityService] Erro ao enviar resposta individual:', error);
                // Continuar com próximas respostas mesmo se uma falhar
            }
        }
        return results;
    }

    // 6. Criar atividade (conforme especificação do tarefas.md)
    async createActivity(data: any, token: string): Promise<any> {
        console.log('[ActivityService] 🚀 === INICIANDO CRIAÇÃO DE ATIVIDADE ===');

        // Verificar conectividade
        const networkState = await NetInfo.fetch();
        console.log('[ActivityService] 🌐 Estado da rede:', {
            isConnected: networkState.isConnected,
            type: networkState.type,
            isInternetReachable: networkState.isInternetReachable
        });

        const hasConnection = networkState.isConnected || networkState.isInternetReachable;
        if (!hasConnection) {
            console.error('[ActivityService] ❌ Sem conexão com a internet');
            throw new Error('Sem conexão com a internet. Por favor, conecte-se e tente novamente.');
        }

        try {
            // Preparar dados conforme especificação
            const payload: any = {
                name: data.name,
                activity_type_id: data.activity_type_id,
                client_id: data.client_id,
                observation: data.observation || "",
            };
            // Removido start_date e end_date conforme ajuste solicitado
            // Se backend ainda aceitar "deadline", mantemos opcional, sem depender dos campos removidos
            if (data.deadline) {
                payload.deadline = data.deadline;
            }

            // Validar dados obrigatórios
            console.log('[ActivityService] 🔍 Validando dados obrigatórios...');
            if (!payload.name || !payload.activity_type_id || !payload.client_id) {
                console.error('[ActivityService] ❌ Dados obrigatórios faltando:', {
                    hasName: !!payload.name,
                    hasActivityType: !!payload.activity_type_id,
                    hasClient: !!payload.client_id
                });
                throw new Error("Nome, tipo de atividade e cliente são obrigatórios.");
            }
            console.log('[ActivityService] ✅ Validação OK');

            console.log('[ActivityService] 📦 Dados da atividade a ser criada:', {
                name: payload.name,
                activity_type_id: payload.activity_type_id,
                client_id: payload.client_id,
                hasObservation: !!payload.observation,
                hasDeadline: !!payload.deadline
            });

            console.log('[ActivityService] 🚀 Enviando requisição POST /activities...');
            const response = await apiClient.post('/activities', payload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log('[ActivityService] ✅ Atividade criada com SUCESSO!');
            console.log('[ActivityService] 📦 Resposta do servidor:', {
                id: response.data?.id,
                name: response.data?.name,
                status: response.status,
                hasData: !!response.data
            });

            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] ❌❌❌ ERRO ao criar atividade ❌❌❌');
            console.error('[ActivityService] 🔴 Tipo do erro:', error?.constructor?.name || typeof error);
            console.error('[ActivityService] 🔴 Mensagem:', error?.message);

            if (error.response) {
                console.error('[ActivityService] 🔴 Erro com resposta do servidor');
                console.error('[ActivityService] 📡 Status HTTP:', error.response.status);
                console.error('[ActivityService] 📦 Dados da resposta:', JSON.stringify(error.response.data, null, 2));
                console.error('[ActivityService] 📋 Headers:', error.response.headers);

                if (error.response.status === 400) {
                    console.error('[ActivityService] ⚠️ Erro 400 - Requisição inválida');

                    // Verificar se é erro de nome duplicado
                    if (error.response.data?.errors && Array.isArray(error.response.data.errors)) {
                        const nameError = error.response.data.errors.find((err: any) => err.attr === 'name' && err.code === 'unique');
                        if (nameError) {
                            console.error('[ActivityService] 🔴 Nome duplicado detectado');
                            throw new Error("Já existe uma atividade com este nome. Tente novamente em alguns segundos.");
                        }
                    }

                    const errorMessage = error.response.data?.message || error.response.data?.error || "Dados inválidos";
                    throw new Error(`Erro de validação: ${errorMessage}`);
                } else if (error.response.status === 401) {
                    console.error('[ActivityService] 🔐 Erro 401 - Não autorizado');
                    throw new Error("Sua sessão expirou. Por favor, faça login novamente.");
                } else if (error.response.status === 403) {
                    console.error('[ActivityService] 🚫 Erro 403 - Sem permissão');
                    throw new Error("Você não tem permissão para criar atividades.");
                } else if (error.response.status === 422) {
                    console.error('[ActivityService] ⚠️ Erro 422 - Validação falhou');
                    const validationErrors = error.response.data?.errors || {};
                    const errorMessages = Object.values(validationErrors).flat().join(", ");
                    throw new Error(`Erro de validação: ${errorMessages}`);
                } else if (error.response.status >= 500) {
                    console.error('[ActivityService] 🔥 Erro do servidor (5xx)');
                    throw new Error("Erro no servidor. Tente novamente em alguns instantes.");
                } else {
                    console.error('[ActivityService] ❓ Erro HTTP desconhecido');
                    throw new Error(error.response.data?.message || `Erro do servidor (${error.response.status}).`);
                }
            } else if (error.request) {
                console.error('[ActivityService] 🌐 Erro de rede - requisição enviada mas sem resposta');
                console.error('[ActivityService] 🔴 Request:', error.request);
                throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão com a internet.");
            } else {
                console.error('[ActivityService] ⚠️ Erro ao configurar requisição');
                console.error('[ActivityService] 🔴 Erro completo:', error);
                throw new Error(error.message || "Erro inesperado ao criar atividade.");
            }
        }
    }

    // 7. Adicionar equipamento à atividade (POST /api/activities/:id/equipments)
    async addEquipmentToActivity(activityId: number, data: any, token: string): Promise<any> {
        console.log('[ActivityService] 🔗 === ADICIONANDO EQUIPAMENTO À ATIVIDADE ===');

        // Verificar conectividade
        const networkState = await NetInfo.fetch();
        console.log('[ActivityService] 🌐 Estado da rede:', {
            isConnected: networkState.isConnected,
            type: networkState.type,
            isInternetReachable: networkState.isInternetReachable
        });

        const hasConnection = networkState.isConnected || networkState.isInternetReachable;
        if (!hasConnection) {
            console.error('[ActivityService] ❌ Sem conexão com a internet');
            throw new Error('Sem conexão com a internet. Por favor, conecte-se e tente novamente.');
        }

        try {
            console.log('[ActivityService] 📦 Dados do vínculo:', {
                activityId,
                equipmentsIds: data.equipments_ids,
                equipmentsCount: data.equipments_ids?.length || 0
            });

            console.log('[ActivityService] 🚀 Enviando requisição POST /activities/:id/equipments...');
            const response = await apiClient.post(`/activities/${activityId}/equipments`, data, {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log('[ActivityService] ✅ Equipamento adicionado com SUCESSO!');
            console.log('[ActivityService] 📦 Resposta do servidor:', {
                hasData: !!response.data,
                dataType: typeof response.data,
                isArray: Array.isArray(response.data),
                status: response.status,
                linkId: response.data?.id || response.data?.[0]?.id || response.data?.results?.[0]?.id
            });

            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] ❌❌❌ ERRO ao adicionar equipamento ❌❌❌');
            console.error('[ActivityService] 🔴 Tipo do erro:', error?.constructor?.name || typeof error);
            console.error('[ActivityService] 🔴 Mensagem:', error?.message);

            if (error.response) {
                console.error('[ActivityService] 🔴 Erro com resposta do servidor');
                console.error('[ActivityService] 📡 Status HTTP:', error.response.status);
                console.error('[ActivityService] 📦 Dados da resposta:', JSON.stringify(error.response.data, null, 2));
                console.error('[ActivityService] 📋 Headers:', error.response.headers);

                if (error.response.status === 404) {
                    console.error('[ActivityService] 🔍 Erro 404 - Atividade não encontrada');
                    throw new Error(`Atividade ID ${activityId} não encontrada no servidor.`);
                } else if (error.response.status === 400) {
                    console.error('[ActivityService] ⚠️ Erro 400 - Requisição inválida');
                    const errorMsg = error.response.data?.message || error.response.data?.error || "Dados inválidos para vincular equipamento.";
                    throw new Error(errorMsg);
                } else if (error.response.status === 401) {
                    console.error('[ActivityService] 🔐 Erro 401 - Não autorizado');
                    throw new Error("Sua sessão expirou. Por favor, faça login novamente.");
                } else if (error.response.status === 403) {
                    console.error('[ActivityService] 🚫 Erro 403 - Sem permissão');
                    throw new Error("Você não tem permissão para adicionar equipamentos a esta atividade.");
                } else if (error.response.status === 422) {
                    console.error('[ActivityService] ⚠️ Erro 422 - Validação falhou');
                    const validationErrors = error.response.data?.errors || {};
                    const errorMessages = Object.values(validationErrors).flat().join(", ");
                    throw new Error(`Erro de validação: ${errorMessages}`);
                } else if (error.response.status >= 500) {
                    console.error('[ActivityService] 🔥 Erro do servidor (5xx)');
                    throw new Error("Erro no servidor ao vincular equipamento. Tente novamente em alguns instantes.");
                } else {
                    console.error('[ActivityService] ❓ Erro HTTP desconhecido');
                    throw new Error(error.response.data?.message || `Erro ao adicionar equipamento (${error.response.status}).`);
                }
            } else if (error.request) {
                console.error('[ActivityService] 🌐 Erro de rede - requisição enviada mas sem resposta');
                console.error('[ActivityService] 🔴 Request:', error.request);
                throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão com a internet.");
            } else {
                console.error('[ActivityService] ⚠️ Erro ao configurar requisição');
                console.error('[ActivityService] 🔴 Erro completo:', error);
                throw new Error(error.message || "Erro inesperado ao adicionar equipamento.");
            }
        }
    }

    // 7.1. Adicionar múltiplos equipamentos à atividade (POST /api/activities/:id/equipments)
    async addMultipleEquipmentsToActivity(
        activityId: number,
        equipmentsIds: number[],
        token: string
    ): Promise<any> {
        console.log('[ActivityService] 🔗📦 === ADICIONANDO MÚLTIPLOS EQUIPAMENTOS À ATIVIDADE ===');

        // Verificar conectividade
        const networkState = await NetInfo.fetch();
        console.log('[ActivityService] 🌐 Estado da rede:', {
            isConnected: networkState.isConnected,
            type: networkState.type,
            isInternetReachable: networkState.isInternetReachable
        });

        const hasConnection = networkState.isConnected || networkState.isInternetReachable;
        if (!hasConnection) {
            console.error('[ActivityService] ❌ Sem conexão com a internet');
            throw new Error('Sem conexão com a internet. Por favor, conecte-se e tente novamente.');
        }

        try {
            // Validar dados
            if (!activityId || activityId <= 0) {
                throw new Error('ID da atividade inválido.');
            }
            if (!equipmentsIds || equipmentsIds.length === 0) {
                throw new Error('Selecione pelo menos um equipamento.');
            }

            console.log('[ActivityService] 📦 Dados dos vínculos:', {
                activityId,
                equipmentsCount: equipmentsIds.length,
                equipmentsIds
            });

            const payload = {
                equipments_ids: equipmentsIds
            };

            console.log('[ActivityService] 🚀 Enviando requisição POST /activities/:id/equipments...');
            const response = await apiClient.post(`/activities/${activityId}/equipments`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log('[ActivityService] ✅ Equipamentos adicionados com SUCESSO!');
            console.log('[ActivityService] 📦 Resposta do servidor:', {
                hasData: !!response.data,
                dataType: typeof response.data,
                isArray: Array.isArray(response.data),
                status: response.status,
                itemsCount: Array.isArray(response.data) ? response.data.length :
                    (response.data?.results ? response.data.results.length : '?')
            });

            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] ❌❌❌ ERRO ao adicionar múltiplos equipamentos ❌❌❌');
            console.error('[ActivityService] 🔴 Tipo do erro:', error?.constructor?.name || typeof error);
            console.error('[ActivityService] 🔴 Mensagem:', error?.message);

            if (error.response) {
                console.error('[ActivityService] 🔴 Erro com resposta do servidor');
                console.error('[ActivityService] 📡 Status HTTP:', error.response.status);
                console.error('[ActivityService] 📦 Dados da resposta:', JSON.stringify(error.response.data, null, 2));

                if (error.response.status === 404) {
                    console.error('[ActivityService] 🔍 Erro 404 - Atividade não encontrada');
                    throw new Error(`Atividade ID ${activityId} não encontrada no servidor.`);
                } else if (error.response.status === 400 || error.response.status === 422) {
                    console.error('[ActivityService] ⚠️ Erro de validação');
                    const errorMsg = error.response.data?.message || error.response.data?.error || "Dados inválidos para vincular equipamentos.";
                    throw new Error(errorMsg);
                } else if (error.response.status === 401) {
                    console.error('[ActivityService] 🔐 Erro 401 - Não autorizado');
                    throw new Error("Sua sessão expirou. Por favor, faça login novamente.");
                } else if (error.response.status === 403) {
                    console.error('[ActivityService] 🚫 Erro 403 - Sem permissão');
                    throw new Error("Você não tem permissão para adicionar equipamentos a esta atividade.");
                } else if (error.response.status >= 500) {
                    console.error('[ActivityService] 🔥 Erro do servidor (5xx)');
                    throw new Error("Erro no servidor ao vincular equipamentos. Tente novamente em alguns instantes.");
                } else {
                    console.error('[ActivityService] ❓ Erro HTTP desconhecido');
                    throw new Error(error.response.data?.message || `Erro ao adicionar equipamentos (${error.response.status}).`);
                }
            } else if (error.request) {
                console.error('[ActivityService] 🌐 Erro de rede - requisição enviada mas sem resposta');
                throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão com a internet.");
            } else {
                console.error('[ActivityService] ⚠️ Erro ao configurar requisição');
                throw new Error(error.message || "Erro inesperado ao adicionar equipamentos.");
            }
        }
    }

    // 8. Atualizar status da atividade (PATCH /api/activities/:id)
    async updateActivityStatus(activityId: number, status: string, token: string): Promise<any> {
        try {
            console.log('[ActivityService] Atualizando status da atividade:', {
                activityId,
                status
            });

            const response = await apiClient.patch(`/activities/${activityId}`,
                { status },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            console.log('[ActivityService] Status da atividade atualizado:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] Erro ao atualizar status:', error);

            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Dados:', error.response.data);

                if (error.response.status === 404) {
                    throw new Error("Atividade não encontrada.");
                } else if (error.response.status === 400) {
                    throw new Error(error.response.data?.message || "Status inválido.");
                } else if (error.response.status === 401) {
                    throw new Error("Token de acesso inválido ou expirado.");
                } else {
                    throw new Error(error.response.data?.message || "Erro ao atualizar status.");
                }
            }
            throw error;
        }
    }

    // 9. Buscar tipos de atividade possíveis de serem cadastradas pelo técnico
    async fetchActivityTypes(token: string): Promise<any[]> {
        console.log('[ActivityService] Buscando tipos de atividade...');
        const normalize = (arr: any[]): any[] => {
            if (!Array.isArray(arr)) return [];
            return arr.map((it: any) => ({
                id: it.id,
                name: it.name || `Tipo ${it.id}`,
                slug: it.slug || it.name?.toLowerCase().replace(/\s+/g, '_'),
                creationPolicy: it.creation_policy || 'common',
                equipmentInsertionPolicy: it.equipment_insertion_policy || 'manual',
                closurePolicy: it.closure_policy || 'default',
                budgetPolicy: it.budget_policy || it.budgetPolicy || 'default',
            }));
        };

        try {
            // Respeitar cooldown de throttling, usar cache se disponível
            const now = Date.now();
            if (activityTypesCooldownUntil && now < activityTypesCooldownUntil) {
                console.log('[ActivityService] Em cooldown de activity_types. Usando cache.');
                if (activityTypesCache && activityTypesCache.length) return activityTypesCache;
                const cached = await OfflineService.getCachedData<any[]>('activity_types_cache');
                if (cached && cached.length) return cached;
            }

            // Tentativa com filtros mais comuns
            const response = await apiClient.get('/activity_types', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    equipment_insertion_policy: 'manual',
                    creation_policy: 'common',
                    is_active: true,
                },
            });
            let items = response.data?.results ?? response.data ?? [];
            let normalized = normalize(items);
            // Se vazio, tentar sem filtros para ampliar resultados
            if (normalized.length === 0) {
                console.log('[ActivityService] Lista vazia com filtros. Tentando sem filtros...');
                const fallbackResp = await apiClient.get('/activity_types', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                items = fallbackResp.data?.results ?? fallbackResp.data ?? [];
                normalized = normalize(items);
            }
            console.log('[ActivityService] Tipos de atividade carregados (normalizados):', normalized);
            // Atualiza caches
            activityTypesCache = normalized;
            await OfflineService.cacheData('activity_types_cache', normalized);
            return normalized;
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar tipos de atividade:', error);
            if (error.response) {
                console.error('[ActivityService] Erro no servidor:');
                console.error('Status:', error.response.status);
                console.error('Dados:', error.response.data);
                if (error.response.status === 429) {
                    // Throttled: definir cooldown e tentar retornar cache
                    const detail: string = error.response.data?.errors?.[0]?.detail || '';
                    const match = detail.match(/available in\s+(\d+)\s+seconds/i);
                    const seconds = match ? parseInt(match[1], 10) : 30;
                    activityTypesCooldownUntil = Date.now() + (seconds * 1000);
                    console.log(`[ActivityService] Throttled. Cooldown de ${seconds}s aplicado.`);
                    if (activityTypesCache && activityTypesCache.length) return activityTypesCache;
                    const cached = await OfflineService.getCachedData<any[]>('activity_types_cache');
                    if (cached && cached.length) return cached;
                    throw new Error('Muitas requisições. Tente novamente em alguns segundos.');
                } else if (error.response.status === 401) {
                    throw new Error('Token de acesso inválido ou expirado.');
                } else if (error.response.status === 404) {
                    throw new Error('Endpoint de tipos de atividade não encontrado.');
                } else {
                    throw new Error(error.response.data?.message || 'Erro ao carregar tipos de atividade.');
                }
            } else if (error.request) {
                console.error('[ActivityService] Erro de rede:', error.request);
                // Tentar cache offline
                const cached = await OfflineService.getCachedData<any[]>('activity_types_cache');
                if (cached && cached.length) return cached;
                throw new Error('Erro de conexão. Verifique sua internet.');
            } else {
                console.error('[ActivityService] Erro inesperado:', error.message);
                throw new Error(`Erro inesperado: ${error.message}`);
            }
        }
    }

    // Método para buscar atividades de um equipamento específico
    async fetchActivities(
        equipmentId: number,
        params: {
            page?: number;
            per_page?: number;
            activity_type?: string;
            token: string;
        }
    ): Promise<{ results: Activity[]; count: number; links: { next: string | null; previous: string | null } }> {
        try {
            console.log('[ActivityService] Buscando atividades para equipamento (endpoint dedicado):', equipmentId);

            const query: any = {};
            if (params?.page) query.page = params.page;
            if (params?.per_page) {
                // Usar apenas per_page para evitar conflitos no backend
                query.per_page = params.per_page;
            }
            if (params?.activity_type) {
                // manter nome 'activity_type' conforme consumo atual
                query.activity_type = params.activity_type;
            }

            console.log('[ActivityService] Query para /equipments/:id/activities:', query);
            const response = await apiClient.get(`/equipments/${equipmentId}/activities`, {
                headers: { Authorization: `Bearer ${params.token}` },
                params: query,
            });

            const payload = response.data;
            let results: any[] = [];
            if (Array.isArray(payload)) {
                results = payload;
            } else if (Array.isArray(payload?.results)) {
                results = payload.results;
            } else if (Array.isArray(payload?.activities)) {
                results = payload.activities;
            } else if (Array.isArray(payload?.data)) {
                results = payload.data;
            }

            const count: number = typeof payload?.count === 'number' ? payload.count : results.length;
            const links = payload?.links || { next: null, previous: null };

            console.log('[ActivityService] Atividades normalizadas:', { count: count, results_len: results.length });
            return { results, count, links };
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar atividades do equipamento:', error?.message || error);
            console.error('[ActivityService] Status:', error?.response?.status);

            return { results: [], count: 0, links: { next: null, previous: null } };
        }
    }

    // Novo método para buscar detalhes de uma atividade específica
    static async fetchActivityDetails(activityId: number, params: { token: string }): Promise<any> {
        try {
            console.log(`[ActivityService] Buscando detalhes da atividade ${activityId}`);

            const response = await apiClient.get(`/activities/${activityId}`, {
                headers: { Authorization: `Bearer ${params.token}` },
            });

            console.log('[ActivityService] Detalhes da atividade recebidos:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] Erro ao buscar detalhes da atividade:', error);
            throw error;
        }
    }
}