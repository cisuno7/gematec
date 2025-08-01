/**
 * Constantes de Permissões do Sistema
 * 
 * Este arquivo centraliza todas as permissões disponíveis no sistema,
 * facilitando a manutenção e evitando erros de digitação.
 */

export const PERMISSIONS = {
    // Equipamentos
    EQUIPMENT: {
        VIEW: 'equipment.view',
        CREATE: 'equipment.create',
        EDIT: 'equipment.edit',
        DELETE: 'equipment.delete',
        ADMIN: 'equipment.admin',
    },

    // Clientes
    CLIENT: {
        VIEW: 'client.view',
        CREATE: 'client.create',
        EDIT: 'client.edit',
        DELETE: 'client.delete',
        ADMIN: 'client.admin',
    },

    // Ordens de Serviço
    SERVICE_ORDER: {
        VIEW: 'service_order.view',
        CREATE: 'service_order.create',
        EDIT: 'service_order.edit',
        DELETE: 'service_order.delete',
        APPROVE: 'service_order.approve',
        ADMIN: 'service_order.admin',
    },

    // Manuais
    MANUAL: {
        VIEW: 'manual.view',
        CREATE: 'manual.create',
        EDIT: 'manual.edit',
        DELETE: 'manual.delete',
        ADMIN: 'manual.admin',
    },

    // PMOCs
    PMOC: {
        VIEW: 'pmoc.view',
        CREATE: 'pmoc.create',
        EDIT: 'pmoc.edit',
        DELETE: 'pmoc.delete',
        ADMIN: 'pmoc.admin',
    },

    // Atividades
    ACTIVITY: {
        VIEW: 'activity.view',
        CREATE: 'activity.create',
        EDIT: 'activity.edit',
        DELETE: 'activity.delete',
        ADMIN: 'activity.admin',
    },

    // Assistência Técnica
    TECHNICAL_ASSISTANCE: {
        VIEW: 'technical_assistance.view',
        CREATE: 'technical_assistance.create',
        EDIT: 'technical_assistance.edit',
        DELETE: 'technical_assistance.delete',
        ADMIN: 'technical_assistance.admin',
    },

    // Usuários
    USER: {
        VIEW: 'user.view',
        CREATE: 'user.create',
        EDIT: 'user.edit',
        DELETE: 'user.delete',
        ADMIN: 'user.admin',
        CHANGE_ME: 'user.change_me',
    },

    // Relatórios
    REPORT: {
        VIEW: 'report.view',
        EXPORT: 'report.export',
        ADMIN: 'report.admin',
    },

    // Configurações
    SETTINGS: {
        VIEW: 'settings.view',
        EDIT: 'settings.edit',
        ADMIN: 'settings.admin',
    },

    // QR Code
    QR_CODE: {
        SCAN: 'qr_code.scan',
        GENERATE: 'qr_code.generate',
        ADMIN: 'qr_code.admin',
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
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'admin' | 'approve' | 'export' | 'scan' | 'generate' | 'change_me'; 