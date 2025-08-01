export interface OfflineAnswer {
    question_id: number;
    value: string;
    meta?: { [key: string]: any };
    // Campos de contexto para a chamada da API
    context: {
        pmocId?: number;
        serviceOrderId?: number;
        technicalAssistanceId?: number;
        equipmentId: number;
        roadmapActivityId?: number; // Adicionado para suportar atividades do roadmap
    };
}

export interface OfflineRequest {
    id: string; // ID único para a requisição, ex: timestamp
    type: 'answer' | 'upload' | 'status_update' | 'notes_update'; // Tipos expandidos
    payload: OfflineAnswer | any; // Carga de dados
    timestamp: number;
}
