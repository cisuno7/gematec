// src/config/apiConfig.ts

// URLs base para os ambientes
const API_BASE_URLS = {
    production: "keosstg001.xyz/api",
    homologation: "keosstg001.xyz/api",
};

// Escolha do ambiente (pode ser configurado por variável de ambiente ou constante)
const ENVIRONMENT = "homologation"; // Mude para "production" quando for para produção

// Palavras reservadas que não podem ser usadas como conta
export const RESERVED_WORDS = [
    'admin',
    'api',
    'www',
    'mail',
    'ftp',
    'localhost',
    'public',
    'default',
    'postgres',
    'root',
    'test',
];

// Regex para validar nome da conta
export const ACCOUNT_NAME_REGEX = /^[a-z0-9_]+$/;

// Tamanho máximo do nome da conta
export const MAX_ACCOUNT_NAME_LENGTH = 64;

// URL base sem conta
export const BASE_DOMAIN = API_BASE_URLS[ENVIRONMENT as keyof typeof API_BASE_URLS];

// Função para gerar URL da API baseada na conta
export const getApiBaseUrl = (account?: string): string => {
    if (!account) {
        // URL padrão sem conta (para casos específicos)
        return `https://${BASE_DOMAIN}`;
    }
    return `https://${account}.${BASE_DOMAIN}`;
};

// URL base exportada (manter compatibilidade, mas será substituída pela função dinâmica)
export const API_BASE_URL = `https://${BASE_DOMAIN}`;

// Função para validar nome da conta
export const validateAccountName = (account: string): { isValid: boolean; error?: string } => {
    if (!account || account.trim() === '') {
        return { isValid: false, error: 'Nome da conta é obrigatório' };
    }

    if (account.length > MAX_ACCOUNT_NAME_LENGTH) {
        return { isValid: false, error: `Nome da conta deve ter no máximo ${MAX_ACCOUNT_NAME_LENGTH} caracteres` };
    }

    if (!ACCOUNT_NAME_REGEX.test(account)) {
        return { isValid: false, error: 'Nome da conta deve conter apenas letras minúsculas, números e underlines' };
    }

    if (RESERVED_WORDS.includes(account.toLowerCase())) {
        return { isValid: false, error: 'Este nome de conta não está disponível' };
    }

    return { isValid: true };
};