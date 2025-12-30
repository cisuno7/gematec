import apiClient from "../Context/ApiClient";
import NetInfo from "@react-native-community/netinfo";
import OfflineService from "./OfflineService";
import {
    WorkListResponse,
    WorkDetail,
    CreateWorkPayload,
    UpdateWorkPayload,
    ApproveWorkPayload,
    DeleteWorkPayload
} from "../Models/Work";
import ActivityService from "./ActivityService";
import { EquipmentStatus } from "../constants/activityStatus";

export default class WorkService {
    static async list(activityId: number, token: string): Promise<WorkListResponse> {
        const cacheKey = `works_list_${activityId}`;
        const isConnected = await NetInfo.fetch().then(state => state.isConnected);

        if (isConnected) {
            const response = await apiClient.get(`/activities/${activityId}/works`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            await OfflineService.cacheData(cacheKey, response.data);
            return response.data as WorkListResponse;
        }

        const cached = await OfflineService.getCachedData<WorkListResponse>(cacheKey);
        if (cached) return cached;
        return { links: { next: null, previous: null }, count: 0, results: [] };
    }

    static async retrieve(activityId: number, workId: number, token: string): Promise<WorkDetail> {
        const cacheKey = `work_detail_${activityId}_${workId}`;
        const isConnected = await NetInfo.fetch().then(state => state.isConnected);

        if (isConnected) {
            try {
                const response = await apiClient.get(`/activities/${activityId}/works/${workId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                await OfflineService.cacheData(cacheKey, response.data);
                return response.data as WorkDetail;
            } catch (error: any) {
                const status = error?.response?.status;
                console.warn(`[WorkService] retrieve falhou com status ${status}. Aplicando fallback pela listagem.`);
                try {
                    const list = await this.list(activityId, token);
                    const found = list.results.find((w) => w.id === workId);
                    if (found) {
                        const minimal: WorkDetail = {
                            id: found.id,
                            name: found.name,
                            opened_by: found.opened_by,
                            opened_at: found.opened_at,
                            activity: {
                                id: activityId,
                                name: "",
                                activity_type: { id: 0, name: "" },
                                client: { id: 0, name: "" },
                                status: "",
                                start_date: "",
                                end_date: "",
                            },
                            activity_equipment_versions: [],
                            signed_at: found.signed_at,
                            signature: null,
                        } as WorkDetail;
                        await OfflineService.cacheData(cacheKey, minimal);
                        return minimal;
                    }
                } catch (fallbackError) {
                    console.error("[WorkService] Fallback retrieve pela listagem falhou:", fallbackError);
                }
                throw error;
            }
        }

        const cached = await OfflineService.getCachedData<WorkDetail>(cacheKey);
        if (cached) return cached as WorkDetail;
        throw new Error("Dados não disponíveis offline. Conecte-se à internet para carregar.");
    }

    static async create(activityId: number, payload: CreateWorkPayload, token: string): Promise<WorkDetail> {
        const isConnected = await NetInfo.fetch().then(state => state.isConnected);
        if (!isConnected) {
            await OfflineService.addRequestToQueue({
                type: "work_create",
                payload: { activityId, body: payload },
            });
            return {
                id: 0,
                name: payload.name,
                opened_by: { id: 0, name: "offline", email: "" },
                opened_at: new Date().toISOString(),
                activity: {
                    id: activityId,
                    name: "",
                    activity_type: { id: 0, name: "" },
                    client: { id: 0, name: "" },
                    status: "created",
                    start_date: "",
                    end_date: "",
                },
                activity_equipment_versions: [],
                signed_at: null,
                signature: null,
            } as any;
        }

        // Garantir ids numéricos conforme especificação
        const normalizedIds = (payload.activity_equipment_versions_ids || [])
            .map((v) => Number(v))
            .filter((v) => Number.isFinite(v));

        const body = {
            name: (payload.name || "").trim(),
            activity_equipment_versions_ids: normalizedIds,
        };

        console.log('[WorkService.create] Enviando payload:', body);

        try {
            const response = await apiClient.post(`/activities/${activityId}/works`, body, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
            });
            console.log('[WorkService.create] Resposta:', { status: response.status, hasData: !!response.data });
            
            const workDetail = response.data as WorkDetail;
            
            // Atualizar status dos equipamentos vinculados para WAITING_WORK_APPROVAL
            if (normalizedIds.length > 0) {
                console.log('[WorkService.create] Atualizando status dos equipamentos para WAITING_WORK_APPROVAL...');
                try {
                    // Buscar detalhes do registro para obter os activity_equipment_versions
                    const workData = workDetail;
                    const equipmentVersions = workData.activity_equipment_versions || [];
                    
                    // Atualizar cada equipamento vinculado
                    for (const version of equipmentVersions) {
                        if (version.id) {
                            try {
                                await ActivityService.patchActivityEquipment(
                                    activityId,
                                    version.id,
                                    { status: EquipmentStatus.WAITING_WORK_APPROVAL },
                                    token
                                );
                                console.log('[WorkService.create] Equipamento atualizado:', version.id);
                            } catch (eqError: any) {
                                console.warn('[WorkService.create] Erro ao atualizar equipamento', version.id, ':', eqError);
                                // Continuar com outros equipamentos mesmo se um falhar
                            }
                        }
                    }
                    
                    // Sincronizar status da atividade
                    await ActivityService.syncActivityStatusFromEquipments(activityId, token);
                } catch (statusError: any) {
                    console.warn('[WorkService.create] Erro ao atualizar status dos equipamentos:', statusError);
                    // Não bloquear a criação do registro se falhar a atualização de status
                }
            }
            
            return workDetail;
        } catch (error: any) {
            const status = error?.response?.status;
            const data = error?.response?.data;
            console.error('[WorkService.create] Erro ao criar registro:', { status, data });

            // Se 400, expor mensagem detalhada do backend para facilitar diagnóstico
            if (status === 400) {
                const serverMessage = typeof data === 'string' ? data : JSON.stringify(data);
                // Tentativa única com variações comuns de campo, caso o backend use outra chave
                try {
                    const altBodies = [
                        { name: body.name, activity_equipment_version_ids: normalizedIds },
                        { name: body.name, activity_equipment_versions: normalizedIds },
                    ];
                    for (const altBody of altBodies) {
                        console.warn('[WorkService.create] Tentando variação de payload por incompatibilidade de campo...', altBody);
                        const retry = await apiClient.post(`/activities/${activityId}/works`, altBody, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                                Accept: "application/json",
                            },
                        });
                        return retry.data as WorkDetail;
                    }
                } catch (retryErr: any) {
                    const rStatus = retryErr?.response?.status;
                    const rData = retryErr?.response?.data;
                    console.error('[WorkService.create] Tentativa com variações falhou:', { rStatus, rData });
                }
                throw new Error(`Falha na criação (400). Detalhes do servidor: ${serverMessage}`);
            }

            // Outros códigos repassam a mensagem padrão dos interceptors
            throw error;
        }
    }

    static async update(activityId: number, workId: number, payload: UpdateWorkPayload, token: string): Promise<WorkDetail> {
        const isConnected = await NetInfo.fetch().then(state => state.isConnected);
        if (!isConnected) {
            await OfflineService.addRequestToQueue({
                type: "work_update",
                payload: { activityId, workId, body: payload },
            });
            return { ...(await this.retrieve(activityId, workId, token)), ...payload } as any;
        }

        const response = await apiClient.put(`/activities/${activityId}/works/${workId}`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data as WorkDetail;
    }

    static async approve(activityId: number, workId: number, payload: ApproveWorkPayload, token: string): Promise<any> {
        const isConnected = await NetInfo.fetch().then(state => state.isConnected);
        if (!isConnected) {
            await OfflineService.addRequestToQueue({
                type: "work_approve",
                payload: { activityId, workId, body: payload },
            });
            return { status: "queued", message: "Aprovação registrada offline." };
        }

        const response = await apiClient.patch(`/activities/${activityId}/works/${workId}/approve`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });
        
        // Atualizar status dos equipamentos vinculados para CLOSED
        try {
            const workDetail = await this.retrieve(activityId, workId, token);
            const equipmentVersions = workDetail.activity_equipment_versions || [];
            
            console.log('[WorkService.approve] Atualizando status dos equipamentos para CLOSED...');
            
            for (const version of equipmentVersions) {
                if (version.id) {
                    try {
                        await ActivityService.patchActivityEquipment(
                            activityId,
                            version.id,
                            { status: EquipmentStatus.CLOSED },
                            token
                        );
                        console.log('[WorkService.approve] Equipamento atualizado para CLOSED:', version.id);
                    } catch (eqError: any) {
                        console.warn('[WorkService.approve] Erro ao atualizar equipamento', version.id, ':', eqError);
                    }
                }
            }
            
            // Sincronizar status da atividade
            await ActivityService.syncActivityStatusFromEquipments(activityId, token);
        } catch (statusError: any) {
            console.warn('[WorkService.approve] Erro ao atualizar status dos equipamentos:', statusError);
            // Não bloquear a aprovação se falhar a atualização de status
        }
        
        return response.data;
    }

    // Método para reprovar registro de trabalho
    static async disapprove(
        activityId: number,
        workId: number,
        token: string,
        returnToStatus?: 'pending' | 'completed'
    ): Promise<any> {
        const isConnected = await NetInfo.fetch().then(state => state.isConnected);
        if (!isConnected) {
            await OfflineService.addRequestToQueue({
                type: "work_disapprove",
                payload: { activityId, workId, returnToStatus },
            });
            return { status: "queued", message: "Reprovação registrada offline." };
        }

        try {
            // Buscar detalhes do registro antes de reprovar
            const workDetail = await this.retrieve(activityId, workId, token);
            const equipmentVersions = workDetail.activity_equipment_versions || [];
            
            // Determinar status de retorno baseado no fluxo
            // Se não especificado, tentar determinar pelo status atual dos equipamentos
            let targetStatus = returnToStatus;
            if (!targetStatus) {
                // Verificar se algum equipamento veio de BUDGET_APPROVAL (Fluxo 1)
                // Se sim, volta para COMPLETED, senão volta para PENDING (Fluxo 2)
                const equipmentsResponse = await ActivityService.fetchActivityEquipments(activityId, { token });
                const equipments = Array.isArray(equipmentsResponse)
                    ? equipmentsResponse
                    : (equipmentsResponse?.results || equipmentsResponse?.data || []);
                
                const hasBudgetApproval = equipments.some((eq: any) => 
                    eq.status?.toLowerCase() === EquipmentStatus.BUDGET_APPROVAL
                );
                
                targetStatus = hasBudgetApproval ? 'completed' : 'pending';
            }
            
            const newStatus = targetStatus === 'completed' 
                ? EquipmentStatus.COMPLETED 
                : EquipmentStatus.PENDING;
            
            console.log('[WorkService.disapprove] Reprovar registro e atualizar equipamentos para:', newStatus);
            
            // Atualizar status dos equipamentos vinculados
            for (const version of equipmentVersions) {
                if (version.id) {
                    try {
                        await ActivityService.patchActivityEquipment(
                            activityId,
                            version.id,
                            { status: newStatus },
                            token
                        );
                        console.log('[WorkService.disapprove] Equipamento atualizado para', newStatus, ':', version.id);
                    } catch (eqError: any) {
                        console.warn('[WorkService.disapprove] Erro ao atualizar equipamento', version.id, ':', eqError);
                    }
                }
            }
            
            // Sincronizar status da atividade
            await ActivityService.syncActivityStatusFromEquipments(activityId, token);
            
            // Chamar endpoint de reprovação (se existir) ou deletar o registro
            // Por enquanto, vamos assumir que reprovar = deletar o registro
            try {
                const response = await apiClient.delete(`/activities/${activityId}/works/${workId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                return response.data;
            } catch (deleteError: any) {
                // Se não houver endpoint de reprovação, apenas atualizar status dos equipamentos
                console.warn('[WorkService.disapprove] Endpoint de reprovação não disponível, apenas atualizando status dos equipamentos');
                return { status: "updated", message: "Registro reprovado e equipamentos atualizados." };
            }
        } catch (error: any) {
            console.error('[WorkService.disapprove] Erro ao reprovar registro:', error);
            throw error;
        }
    }

    static async delete(activityId: number, workId: number, payload: DeleteWorkPayload, token: string): Promise<any> {
        const isConnected = await NetInfo.fetch().then(state => state.isConnected);
        if (!isConnected) {
            await OfflineService.addRequestToQueue({
                type: "work_delete",
                payload: { activityId, workId, body: payload },
            });
            return { status: "queued", message: "Exclusão registrada offline." };
        }

        const response = await apiClient.delete(`/activities/${activityId}/works/${workId}`, {
            headers: { Authorization: `Bearer ${token}` },
            data: payload,
        });
        return response.data;
    }
}


