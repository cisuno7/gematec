/**
 * Constantes de Permissões do Sistema
 * 
 * Este arquivo centraliza todas as permissões disponíveis no sistema,
 * facilitando a manutenção e evitando erros de digitação.
 * 
 * NOTA: As permissões foram simplificadas removendo o prefixo do recurso.
 * Exemplo: 'clients.list_clients' agora é apenas 'list_clients'
 */

export const PERMISSIONS = {
    // Equipamentos
    EQUIPMENT: {
        VIEW: 'view',
        CREATE: 'create',
        EDIT: 'edit',
        DELETE: 'delete',
        ADMIN: 'admin',
    },

    // Clientes
    CLIENT: {
        VIEW: 'view',
        CREATE: 'create',
        EDIT: 'edit',
        DELETE: 'delete',
        LIST_CONTRACTS: 'list_contracts',
        CHANGE_CONTRACT: 'change_contract',
        ADMIN: 'admin',
    },

    // Ordens de Serviço
    SERVICE_ORDER: {
        VIEW: 'view',
        CREATE: 'create',
        EDIT: 'edit',
        DELETE: 'delete',
        APPROVE: 'approve',
        ADMIN: 'admin',
    },

    // Manuais
    MANUAL: {
        VIEW: 'view',
        CREATE: 'create',
        EDIT: 'edit',
        DELETE: 'delete',
        ADMIN: 'admin',
    },

    // PMOCs
    PMOC: {
        VIEW: 'view',
        CREATE: 'create',
        EDIT: 'edit',
        DELETE: 'delete',
        ADMIN: 'admin',
    },

    // Atividades
    ACTIVITY: {
        VIEW: 'view',
        CREATE: 'create',
        EDIT: 'edit',
        DELETE: 'delete',
        ADMIN: 'admin',
    },

    // Assistência Técnica
    TECHNICAL_ASSISTANCE: {
        VIEW: 'view',
        CREATE: 'create',
        EDIT: 'edit',
        DELETE: 'delete',
        ADMIN: 'admin',
    },

    // Usuários
    USER: {
        VIEW: 'view',
        CREATE: 'create',
        EDIT: 'edit',
        DELETE: 'delete',
        ADMIN: 'admin',
        CHANGE_ME: 'change_me',
    },

    // Relatórios
    REPORT: {
        VIEW: 'view',
        EXPORT: 'export',
        ADMIN: 'admin',
    },

    // Configurações
    SETTINGS: {
        VIEW: 'view',
        EDIT: 'edit',
        ADMIN: 'admin',
    },

    // QR Code
    QR_CODE: {
        SCAN: 'scan',
        GENERATE: 'generate',
        ADMIN: 'admin',
    },
} as const;

/**
 * Grupos de permissões para facilitar verificações
 */
export const PERMISSION_GROUPS = {
    // Permissões de administrador
    ADMIN: [
        PERMISSIONS.EQUIPMENT.ADMIN,
        PERMISSIONS.CLIENT.ADMIN,
        PERMISSIONS.SERVICE_ORDER.ADMIN,
        PERMISSIONS.MANUAL.ADMIN,
        PERMISSIONS.PMOC.ADMIN,
        PERMISSIONS.ACTIVITY.ADMIN,
        PERMISSIONS.TECHNICAL_ASSISTANCE.ADMIN,
        PERMISSIONS.USER.ADMIN,
        PERMISSIONS.REPORT.ADMIN,
        PERMISSIONS.SETTINGS.ADMIN,
        PERMISSIONS.QR_CODE.ADMIN,
    ],

    // Permissões de visualização
    VIEW_ONLY: [
        PERMISSIONS.EQUIPMENT.VIEW,
        PERMISSIONS.CLIENT.VIEW,
        PERMISSIONS.CLIENT.LIST_CONTRACTS,
        PERMISSIONS.SERVICE_ORDER.VIEW,
        PERMISSIONS.MANUAL.VIEW,
        PERMISSIONS.PMOC.VIEW,
        PERMISSIONS.ACTIVITY.VIEW,
        PERMISSIONS.TECHNICAL_ASSISTANCE.VIEW,
    ],

    // Permissões de criação
    CREATE: [
        PERMISSIONS.EQUIPMENT.CREATE,
        PERMISSIONS.CLIENT.CREATE,
        PERMISSIONS.SERVICE_ORDER.CREATE,
        PERMISSIONS.MANUAL.CREATE,
        PERMISSIONS.PMOC.CREATE,
        PERMISSIONS.ACTIVITY.CREATE,
        PERMISSIONS.TECHNICAL_ASSISTANCE.CREATE,
    ],

    // Permissões de edição
    EDIT: [
        PERMISSIONS.EQUIPMENT.EDIT,
        PERMISSIONS.CLIENT.EDIT,
        PERMISSIONS.SERVICE_ORDER.EDIT,
        PERMISSIONS.MANUAL.EDIT,
        PERMISSIONS.PMOC.EDIT,
        PERMISSIONS.ACTIVITY.EDIT,
        PERMISSIONS.TECHNICAL_ASSISTANCE.EDIT,
    ],

    // Permissões de exclusão
    DELETE: [
        PERMISSIONS.EQUIPMENT.DELETE,
        PERMISSIONS.CLIENT.DELETE,
        PERMISSIONS.SERVICE_ORDER.DELETE,
        PERMISSIONS.MANUAL.DELETE,
        PERMISSIONS.PMOC.DELETE,
        PERMISSIONS.ACTIVITY.DELETE,
        PERMISSIONS.TECHNICAL_ASSISTANCE.DELETE,
    ],
} as const;

/**
 * Função helper para verificar se uma permissão é válida
 */
export const isValidPermission = (permission: string): boolean => {
    const allPermissions = Object.values(PERMISSIONS).flatMap(group =>
        Object.values(group)
    );
    return allPermissions.includes(permission as any);
};

/**
 * Função helper para obter todas as permissões disponíveis
 */
export const getAllPermissions = (): string[] => {
    return Object.values(PERMISSIONS).flatMap(group =>
        Object.values(group)
    );
};

/**
 * Função helper para obter permissões de um recurso específico
 */
export const getResourcePermissions = (resource: keyof typeof PERMISSIONS): string[] => {
    return Object.values(PERMISSIONS[resource]);
};

/**
 * Tipos TypeScript para as permissões
 */
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS][keyof typeof PERMISSIONS[keyof typeof PERMISSIONS]];
export type PermissionGroup = keyof typeof PERMISSIONS;
export type PermissionAction = 'view' | 'list_contracts' | 'change_contract' | 'create' | 'edit' | 'delete' | 'admin' | 'approve' | 'export' | 'scan' | 'generate' | 'change_me'; 