export interface DynamicField {
    id: number;
    name: string;
    type: 'text' | 'number' | 'select' | 'date' | 'boolean';
    required: boolean;
    options?: string[]; // Para campos do tipo select
    default_value?: any;
    order: number;
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
        return this.fields.sort((a, b) => a.order - b.order);
    }

    // Método para validar dados de equipamento baseado no template
    validateEquipmentData(data: any): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        this.getRequiredFields().forEach(field => {
            if (!data[field.name] || data[field.name] === '') {
                errors.push(`Campo "${field.name}" é obrigatório`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
} 