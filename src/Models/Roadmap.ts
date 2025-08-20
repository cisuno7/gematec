export interface RoadmapActivity {
    id: number;
    activityId?: number; // ID da atividade original
    title: string;
    description?: string;
    clientName: string;
    equipmentName?: string;
    address: string;
    scheduledTime: string;
    status: 'created' | 'open' | 'pending' | 'close' | 'archived' | 'in_progress' | 'completed' | 'cancelled';
    type: 'maintenance' | 'repair' | 'inspection' | 'installation';
    estimatedDuration?: number; // em minutos
    createdAt: string;
    updatedAt: string;
}

export interface RoadmapResponse {
    activities: RoadmapActivity[];
    total: number;
    date: string;
}