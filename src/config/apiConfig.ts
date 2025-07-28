// src/config/apiConfig.ts

// URLs base para os ambientes
const API_BASE_URLS = {
    production: "keosstg001.xyz/api",
    homologation: "keosstg001.xyz/api",
};

// Escolha do ambiente (pode ser configurado por variável de ambiente ou constante)
const ENVIRONMENT = "homologation"; // Mude para "production" quando for para produção

// Domínio base sem protocolo
const BASE_DOMAIN = API_BASE_URLS[ENVIRONMENT as keyof typeof API_BASE_URLS];

// URL base exportada (formato padrão sem subdomínio)
export const API_BASE_URL = `https://${BASE_DOMAIN}`;

// Função para construir URL com subdomínio baseado na conta
export const buildApiUrlForAccount = (accountName: string): string => {
    // Remove caracteres especiais e espaços do nome da conta
    const cleanAccountName = accountName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `https://${cleanAccountName}.${BASE_DOMAIN}`;
};

// Função para definir a URL base dinamicamente (caso necessário)
export const setDynamicApiUrl = (accountName?: string): string => {
    if (accountName) {
        return buildApiUrlForAccount(accountName);
    }
    return API_BASE_URL;
};