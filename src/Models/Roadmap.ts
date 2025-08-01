export interface RoadmapActivity {
    id: number;
    title: string;
    description?: string;
    clientName: string;
    equipmentName?: string;
    address: string;
    scheduledTime: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    type: 'maintenance' | 'repair' | 'inspection' | 'installation';
    estimatedDuration?: number; // em minutos
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface RoadmapResponse {
    activities: RoadmapActivity[];
    total: number;
    date: string;
}