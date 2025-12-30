import { EquipmentStatusType } from "../constants/activityStatus";

/**
 * Equipamento vinculado a uma atividade
 * Representa o vínculo entre uma atividade e um equipamento específico
 */
export interface ActivityEquipment {
    id: number; // ID do vínculo (activity_equipment_id)
    activity_id: number;
    equipment_id: number;
    status: EquipmentStatusType; // Status conforme novo fluxo
    created_at?: string;
    updated_at?: string;
    opened_at?: string;
    closed_at?: string;
    open_by?: { // Usuário que iniciou a atividade
        id: number;
        name: string;
    };
    equipment?: {
        id: number;
        tag?: string;
        patrimony?: string;
        name?: string;
        equipment_type?: {
            id: number;
            name: string;
        };
        brand?: {
            id: number;
            name: string;
        };
        technology?: string;
        client?: {
            id: number;
            name: string;
        };
    };
    activity?: {
        id: number;
        name: string;
        status: string;
        activity_type?: {
            id: number;
            name: string;
            slug: string;
            budget_policy?: string;
        };
    };
}

