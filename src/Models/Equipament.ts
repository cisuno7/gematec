export interface Equipment {
  id: number;  // Ajustado para number, conforme backend
  tag: string;
  patrimony: string;
  serial_number?: string;
  description?: string;  // Novo campo
  capacity?: number;  // Alterado de string para number para consistência com Float
  capacity_unit_id?: number;  // Novo campo
  compressor_type_id?: number;  // Novo campo
  cooling_fluid_type_id?: number;  // Novo campo
  condenser_model?: string;  // Novo campo
  condenser_serial_number?: string;  // Novo campo
  evaporator_model?: string;  // Novo campo
  evaporator_serial_number?: string;  // Novo campo
  voltage?: number;  // Existente, correto como Float
  electric_power?: number;  // Novo campo
  phase_id?: number;  // Novo campo
  is_leased?: boolean;  // Novo campo
  has_warranty?: boolean;  // Novo campo
  has_automation?: boolean;  // Novo campo
  condenser_type_id?: number;  // Existente
  coil_type_id?: number;  // Existente
  evaporator_type_id?: number;  // Existente
  electric_current?: number;  // Existente
  sector_id: number | null;
  equipment_type_id: number | null;
  brand_id: number | null;
  client_id: number | null;
  sector: { id: number; name: string; complete_name?: string };  // Objeto completo
  client: { id: number; name: string; email?: string; document?: string; phone?: string };  // Objeto completo
  brand: { id: number; name: string } | null;  // Permitir null
  technology_id?: number; // Alterado para technology_id
  technology?: { id: number; name: string }; // Adicionado para o objeto completo retornado pelo backend
  equipment_type: { id: number; name: string };  // Usar equipment_type para consistência com backend
  coil_type: { id: number; name: string };  // Objeto completo
  evaporator_type: { id: number; name: string };  // Objeto completo
  condenser_type: { id: number; name: string };  // Objeto completo
  compressor_type?: { id: number; name: string };  // Novo campo
  cooling_fluid_type?: { id: number; name: string };  // Novo campo
  phase?: { id: number; name: string };  // Novo campo
}