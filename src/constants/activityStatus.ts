/**
 * Constantes e tipos para status de atividades e equipamentos
 * Baseado no fluxo definido em fluxoatividades.md
 */

// Status de Equipamento (ActivityEquipment)
export enum EquipmentStatus {
  CREATED = "created",
  OPEN = "open",
  PENDING = "pending",
  WAITING_BUDGET_APPROVAL = "waiting_budget_approval",
  BUDGET_APPROVAL = "budget_approval",
  BUDGET_DISAPPROVAL = "budget_disapproval",
  COMPLETED = "completed",
  WAITING_WORK_APPROVAL = "waiting_work_approval",
  CLOSED = "closed"
}

// Status de Atividade (Activity)
export enum ActivityStatus {
  CREATED = "created",
  OPEN = "open",
  WAITING_BUDGET_APPROVAL = "waiting_budget_approval",
  BUDGET_APPROVAL = "budget_approval",
  BUDGET_DISAPPROVAL = "budget_disapproval"
}

// Tipo union para status de equipamento
export type EquipmentStatusType = EquipmentStatus | string;

// Tipo union para status de atividade
export type ActivityStatusType = ActivityStatus | string;

// Configuração de status: tradução, cor e ícone
export interface StatusConfig {
  translation: string;
  color: string;
  icon: string;
}

// Mapeamento de traduções para status de equipamento
export const EQUIPMENT_STATUS_TRANSLATIONS: Record<string, string> = {
  [EquipmentStatus.CREATED]: "Criado",
  [EquipmentStatus.OPEN]: "Aberto",
  [EquipmentStatus.PENDING]: "Pendente",
  [EquipmentStatus.WAITING_BUDGET_APPROVAL]: "Aguardando Aprovação de Orçamento",
  [EquipmentStatus.BUDGET_APPROVAL]: "Orçamento Aprovado",
  [EquipmentStatus.BUDGET_DISAPPROVAL]: "Orçamento Reprovado",
  [EquipmentStatus.COMPLETED]: "Concluído",
  [EquipmentStatus.WAITING_WORK_APPROVAL]: "Aguardando Aprovação de Registro",
  [EquipmentStatus.CLOSED]: "Fechado",
};

// Mapeamento de traduções para status de atividade
export const ACTIVITY_STATUS_TRANSLATIONS: Record<string, string> = {
  [ActivityStatus.CREATED]: "Criado",
  [ActivityStatus.OPEN]: "Aberto",
  [ActivityStatus.WAITING_BUDGET_APPROVAL]: "Aguardando Aprovação de Orçamento",
  [ActivityStatus.BUDGET_APPROVAL]: "Orçamento Aprovado",
  [ActivityStatus.BUDGET_DISAPPROVAL]: "Orçamento Reprovado",
};

// Mapeamento de cores para status de equipamento
export const EQUIPMENT_STATUS_COLORS: Record<string, string> = {
  [EquipmentStatus.CREATED]: "#6c757d",
  [EquipmentStatus.OPEN]: "#007bff",
  [EquipmentStatus.PENDING]: "#ffc107",
  [EquipmentStatus.WAITING_BUDGET_APPROVAL]: "#6f42c1",
  [EquipmentStatus.BUDGET_APPROVAL]: "#17a2b8",
  [EquipmentStatus.BUDGET_DISAPPROVAL]: "#dc3545",
  [EquipmentStatus.COMPLETED]: "#20c997",
  [EquipmentStatus.WAITING_WORK_APPROVAL]: "#fd7e14",
  [EquipmentStatus.CLOSED]: "#28a745",
};

// Mapeamento de cores para status de atividade
export const ACTIVITY_STATUS_COLORS: Record<string, string> = {
  [ActivityStatus.CREATED]: "#6c757d",
  [ActivityStatus.OPEN]: "#007bff",
  [ActivityStatus.WAITING_BUDGET_APPROVAL]: "#6f42c1",
  [ActivityStatus.BUDGET_APPROVAL]: "#17a2b8",
  [ActivityStatus.BUDGET_DISAPPROVAL]: "#dc3545",
};

// Mapeamento de ícones para status de equipamento
export const EQUIPMENT_STATUS_ICONS: Record<string, string> = {
  [EquipmentStatus.CREATED]: "add-circle",
  [EquipmentStatus.OPEN]: "play-circle",
  [EquipmentStatus.PENDING]: "schedule",
  [EquipmentStatus.WAITING_BUDGET_APPROVAL]: "hourglass-outline",
  [EquipmentStatus.BUDGET_APPROVAL]: "checkmark-circle",
  [EquipmentStatus.BUDGET_DISAPPROVAL]: "close-circle",
  [EquipmentStatus.COMPLETED]: "checkmark-done-circle",
  [EquipmentStatus.WAITING_WORK_APPROVAL]: "time-outline",
  [EquipmentStatus.CLOSED]: "checkmark-circle",
};

// Mapeamento de ícones para status de atividade
export const ACTIVITY_STATUS_ICONS: Record<string, string> = {
  [ActivityStatus.CREATED]: "add-circle",
  [ActivityStatus.OPEN]: "play-circle",
  [ActivityStatus.WAITING_BUDGET_APPROVAL]: "hourglass-outline",
  [ActivityStatus.BUDGET_APPROVAL]: "checkmark-circle",
  [ActivityStatus.BUDGET_DISAPPROVAL]: "close-circle",
};

// Configuração completa de status de equipamento
export const EQUIPMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  [EquipmentStatus.CREATED]: {
    translation: EQUIPMENT_STATUS_TRANSLATIONS[EquipmentStatus.CREATED],
    color: EQUIPMENT_STATUS_COLORS[EquipmentStatus.CREATED],
    icon: EQUIPMENT_STATUS_ICONS[EquipmentStatus.CREATED],
  },
  [EquipmentStatus.OPEN]: {
    translation: EQUIPMENT_STATUS_TRANSLATIONS[EquipmentStatus.OPEN],
    color: EQUIPMENT_STATUS_COLORS[EquipmentStatus.OPEN],
    icon: EQUIPMENT_STATUS_ICONS[EquipmentStatus.OPEN],
  },
  [EquipmentStatus.PENDING]: {
    translation: EQUIPMENT_STATUS_TRANSLATIONS[EquipmentStatus.PENDING],
    color: EQUIPMENT_STATUS_COLORS[EquipmentStatus.PENDING],
    icon: EQUIPMENT_STATUS_ICONS[EquipmentStatus.PENDING],
  },
  [EquipmentStatus.WAITING_BUDGET_APPROVAL]: {
    translation: EQUIPMENT_STATUS_TRANSLATIONS[EquipmentStatus.WAITING_BUDGET_APPROVAL],
    color: EQUIPMENT_STATUS_COLORS[EquipmentStatus.WAITING_BUDGET_APPROVAL],
    icon: EQUIPMENT_STATUS_ICONS[EquipmentStatus.WAITING_BUDGET_APPROVAL],
  },
  [EquipmentStatus.BUDGET_APPROVAL]: {
    translation: EQUIPMENT_STATUS_TRANSLATIONS[EquipmentStatus.BUDGET_APPROVAL],
    color: EQUIPMENT_STATUS_COLORS[EquipmentStatus.BUDGET_APPROVAL],
    icon: EQUIPMENT_STATUS_ICONS[EquipmentStatus.BUDGET_APPROVAL],
  },
  [EquipmentStatus.BUDGET_DISAPPROVAL]: {
    translation: EQUIPMENT_STATUS_TRANSLATIONS[EquipmentStatus.BUDGET_DISAPPROVAL],
    color: EQUIPMENT_STATUS_COLORS[EquipmentStatus.BUDGET_DISAPPROVAL],
    icon: EQUIPMENT_STATUS_ICONS[EquipmentStatus.BUDGET_DISAPPROVAL],
  },
  [EquipmentStatus.COMPLETED]: {
    translation: EQUIPMENT_STATUS_TRANSLATIONS[EquipmentStatus.COMPLETED],
    color: EQUIPMENT_STATUS_COLORS[EquipmentStatus.COMPLETED],
    icon: EQUIPMENT_STATUS_ICONS[EquipmentStatus.COMPLETED],
  },
  [EquipmentStatus.WAITING_WORK_APPROVAL]: {
    translation: EQUIPMENT_STATUS_TRANSLATIONS[EquipmentStatus.WAITING_WORK_APPROVAL],
    color: EQUIPMENT_STATUS_COLORS[EquipmentStatus.WAITING_WORK_APPROVAL],
    icon: EQUIPMENT_STATUS_ICONS[EquipmentStatus.WAITING_WORK_APPROVAL],
  },
  [EquipmentStatus.CLOSED]: {
    translation: EQUIPMENT_STATUS_TRANSLATIONS[EquipmentStatus.CLOSED],
    color: EQUIPMENT_STATUS_COLORS[EquipmentStatus.CLOSED],
    icon: EQUIPMENT_STATUS_ICONS[EquipmentStatus.CLOSED],
  },
};

// Configuração completa de status de atividade
export const ACTIVITY_STATUS_CONFIG: Record<string, StatusConfig> = {
  [ActivityStatus.CREATED]: {
    translation: ACTIVITY_STATUS_TRANSLATIONS[ActivityStatus.CREATED],
    color: ACTIVITY_STATUS_COLORS[ActivityStatus.CREATED],
    icon: ACTIVITY_STATUS_ICONS[ActivityStatus.CREATED],
  },
  [ActivityStatus.OPEN]: {
    translation: ACTIVITY_STATUS_TRANSLATIONS[ActivityStatus.OPEN],
    color: ACTIVITY_STATUS_COLORS[ActivityStatus.OPEN],
    icon: ACTIVITY_STATUS_ICONS[ActivityStatus.OPEN],
  },
  [ActivityStatus.WAITING_BUDGET_APPROVAL]: {
    translation: ACTIVITY_STATUS_TRANSLATIONS[ActivityStatus.WAITING_BUDGET_APPROVAL],
    color: ACTIVITY_STATUS_COLORS[ActivityStatus.WAITING_BUDGET_APPROVAL],
    icon: ACTIVITY_STATUS_ICONS[ActivityStatus.WAITING_BUDGET_APPROVAL],
  },
  [ActivityStatus.BUDGET_APPROVAL]: {
    translation: ACTIVITY_STATUS_TRANSLATIONS[ActivityStatus.BUDGET_APPROVAL],
    color: ACTIVITY_STATUS_COLORS[ActivityStatus.BUDGET_APPROVAL],
    icon: ACTIVITY_STATUS_ICONS[ActivityStatus.BUDGET_APPROVAL],
  },
  [ActivityStatus.BUDGET_DISAPPROVAL]: {
    translation: ACTIVITY_STATUS_TRANSLATIONS[ActivityStatus.BUDGET_DISAPPROVAL],
    color: ACTIVITY_STATUS_COLORS[ActivityStatus.BUDGET_DISAPPROVAL],
    icon: ACTIVITY_STATUS_ICONS[ActivityStatus.BUDGET_DISAPPROVAL],
  },
};

/**
 * Obtém configuração de status de equipamento
 */
export function getEquipmentStatusConfig(status: string): StatusConfig {
  const normalizedStatus = status.toLowerCase();
  const config = EQUIPMENT_STATUS_CONFIG[normalizedStatus];
  
  if (config) {
    return config;
  }
  
  // Fallback para status não mapeados
  return {
    translation: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
    color: "#6c757d",
    icon: "help-circle-outline",
  };
}

/**
 * Obtém configuração de status de atividade
 */
export function getActivityStatusConfig(status: string): StatusConfig {
  const normalizedStatus = status.toLowerCase();
  const config = ACTIVITY_STATUS_CONFIG[normalizedStatus];
  
  if (config) {
    return config;
  }
  
  // Fallback para status não mapeados
  return {
    translation: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
    color: "#6c757d",
    icon: "help-circle-outline",
  };
}

/**
 * Valida se uma transição de status de equipamento é permitida
 * Baseado no fluxo definido em fluxoatividades.md
 */
export function canTransitionEquipmentStatus(
  currentStatus: EquipmentStatusType,
  newStatus: EquipmentStatusType,
  budgetPolicy?: string
): boolean {
  const current = currentStatus.toLowerCase();
  const next = newStatus.toLowerCase();
  
  // Transições sempre permitidas (independente do estado atual)
  const alwaysAllowed = [
    EquipmentStatus.CREATED,
    EquipmentStatus.OPEN,
  ];
  
  if (alwaysAllowed.includes(next as EquipmentStatus)) {
    return true;
  }
  
  // Mapeamento de transições válidas
  const validTransitions: Record<string, string[]> = {
    [EquipmentStatus.CREATED]: [EquipmentStatus.OPEN],
    [EquipmentStatus.OPEN]: [EquipmentStatus.PENDING],
    [EquipmentStatus.PENDING]: [
      EquipmentStatus.WAITING_BUDGET_APPROVAL,
      EquipmentStatus.COMPLETED, // Fluxo 2: Continuar para Execução
    ],
    [EquipmentStatus.WAITING_BUDGET_APPROVAL]: [
      EquipmentStatus.BUDGET_APPROVAL,
      EquipmentStatus.BUDGET_DISAPPROVAL,
    ],
    [EquipmentStatus.BUDGET_DISAPPROVAL]: [EquipmentStatus.PENDING], // Volta para preencher questões
    [EquipmentStatus.BUDGET_APPROVAL]: [EquipmentStatus.COMPLETED], // Executar Atividade
    [EquipmentStatus.COMPLETED]: [EquipmentStatus.WAITING_WORK_APPROVAL], // Criar Registro
    [EquipmentStatus.WAITING_WORK_APPROVAL]: [
      EquipmentStatus.CLOSED, // Registro Aprovado
      EquipmentStatus.PENDING, // Registro Reprovado (Fluxo 2)
      EquipmentStatus.COMPLETED, // Registro Reprovado (Fluxo 1)
    ],
    [EquipmentStatus.CLOSED]: [], // Estado final, não pode transicionar
  };
  
  const allowedNext = validTransitions[current] || [];
  
  // Verificar se a transição está na lista de permitidas
  if (allowedNext.includes(next)) {
    // Validações específicas baseadas em budget_policy
    if (next === EquipmentStatus.COMPLETED && current === EquipmentStatus.PENDING) {
      // Fluxo 2: Pode executar sem orçamento apenas se budget_policy permitir
      // Se budget_policy for "spot", pode escolher continuar execução
      // Se for "contract" ou "always", deve passar por orçamento
      if (budgetPolicy === "contract" || budgetPolicy === "always") {
        return false; // Deve passar por orçamento primeiro
      }
    }
    
    if (next === EquipmentStatus.COMPLETED && current === EquipmentStatus.WAITING_WORK_APPROVAL) {
      // Registro reprovado no Fluxo 1: volta para COMPLETED
      // Isso é permitido apenas se veio de BUDGET_APPROVAL
      return true;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Obtém o próximo status válido baseado no status atual e ação do usuário
 */
export function getNextStatusForAction(
  currentStatus: EquipmentStatusType,
  action: 'send_to_budget' | 'continue_execution' | 'approve_budget' | 'disapprove_budget' | 'create_work' | 'approve_work' | 'disapprove_work',
  budgetPolicy?: string
): EquipmentStatusType | null {
  const current = currentStatus.toLowerCase();
  
  switch (action) {
    case 'send_to_budget':
      if (current === EquipmentStatus.PENDING || current === EquipmentStatus.BUDGET_DISAPPROVAL) {
        return EquipmentStatus.WAITING_BUDGET_APPROVAL;
      }
      break;
      
    case 'continue_execution':
      if (current === EquipmentStatus.PENDING) {
        // Fluxo 2: Pula etapa de orçamento
        if (budgetPolicy !== "contract" && budgetPolicy !== "always") {
          return EquipmentStatus.COMPLETED;
        }
      }
      break;
      
    case 'approve_budget':
      if (current === EquipmentStatus.WAITING_BUDGET_APPROVAL) {
        return EquipmentStatus.BUDGET_APPROVAL;
      }
      break;
      
    case 'disapprove_budget':
      if (current === EquipmentStatus.WAITING_BUDGET_APPROVAL) {
        return EquipmentStatus.BUDGET_DISAPPROVAL;
      }
      break;
      
    case 'create_work':
      if (current === EquipmentStatus.COMPLETED) {
        return EquipmentStatus.WAITING_WORK_APPROVAL;
      }
      break;
      
    case 'approve_work':
      if (current === EquipmentStatus.WAITING_WORK_APPROVAL) {
        return EquipmentStatus.CLOSED;
      }
      break;
      
    case 'disapprove_work':
      if (current === EquipmentStatus.WAITING_WORK_APPROVAL) {
        // Determinar status de retorno baseado no fluxo anterior
        // Se veio de BUDGET_APPROVAL → volta para COMPLETED (Fluxo 1)
        // Se veio de PENDING → volta para PENDING (Fluxo 2)
        // Por padrão, volta para PENDING
        return EquipmentStatus.PENDING;
      }
      break;
  }
  
  return null;
}

