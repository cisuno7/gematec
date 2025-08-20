export interface DynamicField {
    id?: number;
    name?: string;
    key?: string; // Campo usado pelo backend
    label?: string; // Label usado pelo backend
    type: 'text' | 'number' | 'select' | 'date' | 'boolean' | 'measure' | 'radio' | 'radio_with_justification';
    required?: boolean;
    options?: string[]; // Para campos do tipo select, radio, radio_with_justification
    default_value?: any;
    order?: number;
    help_text?: string; // Campo adicional do backend
    unit?: string; // Para campos do tipo measure
    justification_target?: string; // Para campos do tipo radio_with_justification
    rules?: {
        required?: boolean;
        max_length?: number;
        min_length?: number;
        min_value?: number;
        max_value?: number;
    };
}

export interface EquipmentTemplate {
    id: number;
    name: string;
    description?: string;
    fields: DynamicField[];
    created_at: string;
    updated_at: string;
}

export default class EquipmentTemplateModel implements EquipmentTemplate {
    id: number;
    name: string;
    description?: string;
    fields: DynamicField[];
    created_at: string;
    updated_at: string;

    constructor(data: any) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.fields = data.fields || [];
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Método para obter campos obrigatórios
    getRequiredFields(): DynamicField[] {
        return this.fields.filter(field => field.required);
    }

    // Método para obter campos opcionais
    getOptionalFields(): DynamicField[] {
        return this.fields.filter(field => !field.required);
    }

    // Método para obter campos ordenados
    getOrderedFields(): DynamicField[] {
        return this.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // Método para validar dados de equipamento baseado no template
    validateEquipmentData(data: any): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        this.getRequiredFields().forEach(field => {
            const key = field.name as keyof typeof data;
            const value = data[key as any];
            if (value === undefined || value === null || value === '') {
                errors.push(`Campo "${field.name}" é obrigatório`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
} 