import { ActivityStatusType } from "../constants/activityStatus";

export interface Activity {
    id: number;
    type: "pmoc" | "service_order" | "technical_assistance"; // Tipos específicos
    created_at: string; // Data de abertura (comum a todos)
    status: ActivityStatusType; // Status conforme novo fluxo
    name?: string; // Nome da atividade
    start_date?: string; // Data de início
    end_date?: string; // Data de fim
    preview_date?: string; // Data de preview
    is_overdue?: boolean; // Indicador de atraso
    client?: { // Opcional, usado em PMOC
        id: number;
        name: string;
        email?: string;
        document?: string;
        phone?: string;
    };
    deadline?: string; // Opcional, usado em PMOC
    equipment?: { // Opcional, usado em Service Order e Technical Assistance
        id: number;
        tag?: string;
        patrimony?: string;
        equipment_type?: { id: number; name: string };
        brand?: { id: number; name: string };
        technology?: string;
    };
    count_equipment?: number; // Opcional, usado em PMOC
    count_equipment_close?: number; // Opcional, usado em PMOC
    activity_type?: { // Tipo de atividade completo
        id: number;
        name: string;
        slug: string;
        budget_policy?: string;
        creation_policy?: string;
        equipment_insertion_policy?: string;
        closure_policy?: string;
        lifetime_policy?: string;
        is_active?: boolean;
    };
    budget_policy?: string; // Política de orçamento: "spot", "contract", "always", "on_request"
}