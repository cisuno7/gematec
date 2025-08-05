// src/config/apiConfig.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

// URLs base para os ambientes
const API_BASE_URLS = {
    production: "keosstg001.xyz/api",
    homologation: "keosstg001.xyz/api",
};

// Escolha do ambiente
const ENVIRONMENT = "homologation"; // Mude para "production" quando for para produção

// Domínio base sem protocolo
const BASE_DOMAIN = API_BASE_URLS[ENVIRONMENT as keyof typeof API_BASE_URLS];

// Função para construir URL com subdomínio baseado na conta
export const buildApiUrlForAccount = async (accountName?: string): Promise<string> => {
    if (!accountName) {
        // Tenta recuperar a conta do AsyncStorage
        const storedAccount = await AsyncStorage.getItem("account");
        accountName = storedAccount || "";
    }

    if (!accountName) {
        console.warn("[apiConfig] Nenhuma conta fornecida ou encontrada no AsyncStorage. Usando URL base padrão.");
        return `https://${BASE_DOMAIN}`;
    }

    // Remove caracteres especiais e espaços do nome da conta
    const cleanAccountName = accountName.toLowerCase().replace(/[^a-z0-9_]/g, '');
    return `https://${cleanAccountName}.keosstg001.xyz/api`; // Usa HTTPS para todos
};

// URL base padrão (usada apenas se a conta não estiver disponível)
export const API_BASE_URL = `https://${BASE_DOMAIN}`;

// Função para definir a URL base dinamicamente
export const setDynamicApiUrl = async (accountName?: string): Promise<string> => {
    return await buildApiUrlForAccount(accountName);
};