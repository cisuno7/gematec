import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import OfflineService from './OfflineService';
import { OfflineRequest } from '../Models/Offline';
import { RoadmapService } from './RoadmapService';
import ServiceOrderService from './ServiceOrderService';
import PmocService from './PmocService';
import TechnicalAssistanceService from './TechnicalAssistanceService';
import ActivityService from './ActivityService';

export class SyncService {

    static async syncPendingRequests(): Promise<void> {
        const state = await NetInfo.fetch();
        if (!state.isConnected) {
            console.log('[SyncService] Sem conexão com a internet. Sincronização adiada.');
            return;
        }

        console.log('[SyncService] Conectado à internet. Iniciando sincronização...');
        let pendingRequests = await OfflineService.getPendingRequests();

        if (pendingRequests.length === 0) {
            console.log('[SyncService] Nenhuma requisição pendente para sincronizar.');
            return;
        }

        for (const request of pendingRequests) {
            try {
                const token = await AsyncStorage.getItem('access_token');
                if (!token) {
                    console.warn('[SyncService] Token de acesso não encontrado. Parando sincronização.');
                    break; // Para a sincronização se não houver token
                }

                let success = false;
                switch (request.type) {
                    case 'answer':
                        success = await this.handleAnswerSync(request, token);
                        break;
                    case 'upload':
                        success = await this.handleUploadSync(request, token);
                        break;
                    case 'status_update':
                        success = await this.handleStatusUpdateSync(request, token);
                        break;
                    case 'notes_update':
                        success = await this.handleNotesUpdateSync(request, token);
                        break;
                    case 'activity_answer':
                        success = await this.handleActivityAnswerSync(request, token);
                        break;
                    case 'activity_status_update':
                        success = await this.handleActivityStatusUpdateSync(request, token);
                        break;
                    case 'work_create':
                    case 'work_update':
                    case 'work_approve':
                    case 'work_delete':
                        // Ainda não implementado: sincronização de fila de Works
                        success = true;
                        break;
                    default:
                        console.warn(`[SyncService] Tipo de requisição desconhecido: ${request.type}`);
                        success = true; // Considera como sucesso para remover da fila
                }

                if (success) {
                    await OfflineService.removeRequestFromQueue(request.id);
                    console.log(`[SyncService] Requisição ${request.id} sincronizada e removida da fila.`);
                } else {
                    console.warn(`[SyncService] Falha ao sincronizar requisição ${request.id}. Mantendo na fila.`);
                    // Se falhar, para a sincronização para tentar novamente mais tarde
                    break;
                }
            } catch (error) {
                console.error(`[SyncService] Erro inesperado ao processar requisição ${request.id}:`, error);
                // Em caso de erro, para a sincronização para evitar loops infinitos ou erros repetidos
                break;
            }
        }
        console.log('[SyncService] Sincronização concluída ou interrompida devido a erro.');
    }

    private static async handleAnswerSync(request: OfflineRequest, token: string): Promise<boolean> {
        const payload = request.payload;
        const context = payload.context;

        try {
            if (context.roadmapActivityId && context.equipmentId) {
                // Resposta de questões de equipamento do roadmap
                await RoadmapService.submitEquipmentAnswers(
                    context.roadmapActivityId,
                    context.equipmentId,
                    payload.answers
                );
            } else if (context.serviceOrderId) {
                // Resposta de Ordem de Serviço
                await ServiceOrderService.submitAnswers(token, context.serviceOrderId, {
                    status: payload.status,
                    answers: payload.answers
                });
            } else if (context.pmocId && context.equipmentId) {
                // Resposta de PMOC
                await PmocService.submitAnswers(token, context.pmocId, context.equipmentId, {
                    status: payload.status,
                    answers: payload.answers
                });
            } else if (context.technicalAssistanceId) {
                // Resposta de Assistência Técnica
                await TechnicalAssistanceService.submitAnswers(token, context.technicalAssistanceId, {
                    status: payload.status,
                    answers: payload.answers
                });
            }
            return true;
        } catch (error) {
            console.error('[SyncService] Erro ao sincronizar resposta:', error);
            return false;
        }
    }

    private static async handleStatusUpdateSync(request: OfflineRequest, token: string): Promise<boolean> {
        const payload = request.payload;
        const context = payload.context;

        try {
            if (context.roadmapActivityId) {
                // Atualização de status de atividade do roadmap
                await RoadmapService.updateActivityStatus(context.roadmapActivityId, payload.status);
            }
            return true;
        } catch (error) {
            console.error('[SyncService] Erro ao sincronizar atualização de status:', error);
            return false;
        }
    }

    private static async handleNotesUpdateSync(request: OfflineRequest, token: string): Promise<boolean> {
        const payload = request.payload;
        const context = payload.context;

        try {
            if (context.roadmapActivityId) {
                // Atualização de notas de atividade do roadmap
                await RoadmapService.addNotesToActivity(context.roadmapActivityId, payload.notes);
            }
            return true;
        } catch (error) {
            console.error('[SyncService] Erro ao sincronizar atualização de notas:', error);
            return false;
        }
    }

    private static async handleUploadSync(request: OfflineRequest, token: string): Promise<boolean> {
        const payload = request.payload;
        const context = payload.context;

        try {
            const formData = new FormData();
            // Reconstroi o objeto File para o FormData
            formData.append('images', {
                uri: payload.image.uri,
                name: payload.image.name,
                type: payload.image.type,
            } as any);

            if (context.roadmapActivityId && context.equipmentId) {
                // Upload de imagens para equipamento do roadmap
                const { buildApiUrlForAccount } = require('../config/apiConfig');
                const apiUrl = await buildApiUrlForAccount();
                const endpoint = `${apiUrl}/roadmaps/activities/${context.roadmapActivityId}/equipment/${context.equipmentId}/images`;
                await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                    body: formData,
                });
            } else if (context.pmocId && context.equipmentId) {
                await PmocService.uploadImages(token, context.pmocId, context.equipmentId, formData);
            } else if (context.serviceOrderId) {
                await ServiceOrderService.uploadServiceOrderImages(token, context.serviceOrderId, formData);
            }
            return true;
        } catch (error) {
            console.error('[SyncService] Erro ao sincronizar upload:', error);
            return false;
        }
    }

    private static async handleActivityAnswerSync(request: OfflineRequest, token: string): Promise<boolean> {
        const payload = request.payload;
        const context = payload.context;

        try {
            if (context.activityId && context.activityEquipmentId) {
                // Resposta de questões de atividade
                await ActivityService.postActivityAnswers(
                    context.activityId,
                    context.activityEquipmentId,
                    payload.answers,
                    token
                );
            }
            return true;
        } catch (error) {
            console.error('[SyncService] Erro ao sincronizar resposta de atividade:', error);
            return false;
        }
    }

    private static async handleActivityStatusUpdateSync(request: OfflineRequest, token: string): Promise<boolean> {
        const payload = request.payload;
        const context = payload.context;

        try {
            if (context.activityId && context.activityEquipmentId) {
                // Atualização de status de atividade
                await ActivityService.patchActivityEquipment(
                    context.activityId,
                    context.activityEquipmentId,
                    { status: payload.status },
                    token
                );
            }
            return true;
        } catch (error) {
            console.error('[SyncService] Erro ao sincronizar atualização de status de atividade:', error);
            return false;
        }
    }
}
