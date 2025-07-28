// src/config/apiConfig.ts

// URLs base para os ambientes
const API_BASE_URLS = {
    production: "https://prod.keosstg001.xyz/api",
    homologation: "https://keosstg001.xyz/api",
};

// Escolha do ambiente (pode ser configurado por variável de ambiente ou constante)
const ENVIRONMENT = "homologation"; // Mude para "production" quando for para produção

// URL base exportada
export const API_BASE_URL = API_BASE_URLS[ENVIRONMENT as keyof typeof API_BASE_URLS];

/**
 * Validates an account name according to common username/account validation rules
 * 
 * Rules:
 * - Must be 3-30 characters long
 * - Can contain letters, numbers, hyphens, underscores, and periods
 * - Must start and end with a letter or number
 * - Cannot have consecutive special characters
 * - Cannot be common reserved words (admin, root, etc.)
 * 
 * @param accountName - The account name to validate
 * @returns boolean - true if valid, false otherwise
 * 
 * @example
 * validateAccountName('user123') // returns true
 * validateAccountName('john.doe') // returns true
 * validateAccountName('admin') // returns false
 * validateAccountName('user--name') // returns false
 */
export const validateAccountName = (accountName: string): boolean => {
    if (!accountName || typeof accountName !== 'string') {
        return false;
    }

    // Remove leading and trailing whitespace
    const trimmedName = accountName.trim();

    // Check length: minimum 3, maximum 30 characters
    if (trimmedName.length < 3 || trimmedName.length > 30) {
        return false;
    }

    // Allow letters, numbers, hyphens, underscores, and periods
    // Must start with a letter or number
    // Cannot start or end with hyphen, underscore, or period
    const accountNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
    
    if (!accountNameRegex.test(trimmedName)) {
        return false;
    }

    // Prevent consecutive special characters
    if (/[._-]{2,}/.test(trimmedName)) {
        return false;
    }

    // Prevent common invalid patterns
    const invalidPatterns = [
        /^admin$/i,
        /^root$/i,
        /^test$/i,
        /^user$/i,
        /^guest$/i,
        /^null$/i,
        /^undefined$/i,
    ];

    return !invalidPatterns.some(pattern => pattern.test(trimmedName));
};