export interface WorkUserSummary {
    id: number;
    name: string;
    email: string;
}

export interface WorkListItem {
    id: number;
    name: string;
    opened_by: WorkUserSummary;
    opened_at: string;
    signed_at: string | null;
}

export interface WorkListResponse {
    links: {
        next: string | null;
        previous: string | null;
    };
    count: number;
    results: WorkListItem[];
}

export interface WorkEquipmentBrand {
    id: number;
    name: string;
}

export interface WorkEquipmentClient {
    id: number;
    name: string;
}

export interface WorkEquipmentSector {
    id: number;
    complete_name: string;
}

export interface WorkEquipmentType {
    id: number;
    name: string;
}

export interface WorkEquipment {
    id: number;
    qrcode: string;
    tag: string;
    brand: WorkEquipmentBrand;
    client: WorkEquipmentClient;
    sector: WorkEquipmentSector;
    equipment_type: WorkEquipmentType;
    is_active: boolean;
}

export interface WorkActivityEquipmentVersion {
    id: number;
    activity_plan_version_id: number;
    status: string;
    equipment: WorkEquipment;
    opened_at: string | null;
    opened_by: WorkUserSummary | null;
    closed_at: string | null;
    closed_by: WorkUserSummary | null;
}

export interface WorkActivityType {
    id: number;
    name: string;
}

export interface WorkActivityClient {
    id: number;
    name: string;
}

export interface WorkActivitySummary {
    id: number;
    name: string;
    activity_type: WorkActivityType;
    client: WorkActivityClient;
    status: string;
    start_date: string;
    end_date: string;
}

export interface WorkDetail {
    id: number;
    name: string;
    opened_by: WorkUserSummary;
    opened_at: string;
    activity: WorkActivitySummary;
    activity_equipment_versions: WorkActivityEquipmentVersion[];
    signed_at: string | null;
    signature: string | null;
    signed_by?: WorkUserSummary | null;
    approved_by?: WorkUserSummary | null;
}

export interface CreateWorkPayload {
    name: string;
    activity_equipment_versions_ids: number[];
}

export interface UpdateWorkPayload {
    name: string;
    activity_equipment_versions_ids: number[];
}

export interface ApproveWorkPayload {
    signature: string;
}

export interface DeleteWorkPayload {
    name: string;
}


