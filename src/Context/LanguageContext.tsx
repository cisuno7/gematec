import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PreferencesService from "../Services/PreferencesService";

export interface Translations {
    [key: string]: string;
}

export interface LanguageContextType {
    currentLanguage: string;
    setLanguage: (language: string) => void;
    t: (key: string) => string;
    loadUserPreferences: (accessToken: string) => Promise<void>;
    saveLanguagePreference: (accessToken: string, language: string) => Promise<void>;
}

const translations: { [language: string]: Translations } = {
    'pt-br': {
        // Navigation/Menu
        'menu.home': 'Início',
        'menu.personalData': 'Meus Dados',
        'menu.preferences': 'Preferências',
        'menu.manuals': 'Manuais',
        'menu.logout': 'Sair',
        'menu.operacional': 'Operacional',
        'menu.clientsWithContract': 'Clientes com Contrato',
        'menu.clientsWithoutContract': 'Clientes Avulsos',
        'menu.equipments': 'Equipamentos',
        'menu.activities': 'Atividades',
        'menu.pmocs': 'PMOCs',
        'menu.serviceOrders': 'Ordens de Serviço',
        'menu.technicalAssistance': 'Assistência Técnica',
        'menu.roadmaps': 'Roteiro',
        'menu.installation': 'Instalação',
        'menu.technicalSupport': 'Suporte ao Técnico',
        'menu.equipmentQrCode': 'Leitor de QR Code',
        'menu.basicRegistrations': 'Cadastros Básicos',
        'menu.functions': 'Funções',
        'menu.manufacturers': 'Fabricantes',
        'menu.coilTypes': 'Tipos de Serpentina',
        'menu.equipmentTypes': 'Tipos de Equipamento',
        'menu.compressorTypes': 'Tipo de Compressor',
        'menu.coolingFluidTypes': 'Tipo de Fluido Refrigerante',
        'menu.condenserTypes': 'Tipo de Condensadora',
        'menu.evaporatorTypes': 'Tipo de Evaporadora',
        'menu.phases': 'Fases',
        'menu.technologies': 'Tecnologias',
        'menu.capacityUnits': 'Unidades de Capacidade',
        'menu.administrative': 'Administrativo',
        'menu.support': 'Suporte',
        'menu.createEquipment': 'Criação de Equipamento',
        'menu.filterEquipment': 'Filtragem de Equipamentos',
        'menu.viewActivities': 'Visualizar Atividades',
        'menu.documentation': 'Documentação',

        // Home Screen
        'home.welcomeToSystem': 'Bem-vindo ao Sistema',
        'home.quickActions': 'Ações Rápidas',
        'home.comingSoon': 'Em Breve',

        // Preferences Screen
        'preferences.title': 'Preferências',
        'preferences.language': 'Idioma',
        'preferences.save': 'Salvar',
        'preferences.cancel': 'Cancelar',
        'preferences.loading': 'Carregando...',
        'preferences.saveSuccess': 'Preferências salvas com sucesso!',
        'preferences.saveError': 'Erro ao salvar preferências',
        'preferences.loadError': 'Erro ao carregar preferências',

        // Languages
        'language.portuguese': 'Português',
        'language.english': 'Inglês',

        // Common
        'common.welcome': 'Bem-vindo',
        'common.error': 'Erro',
        'common.success': 'Sucesso',
        'common.loading': 'Carregando...',
        'common.save': 'Salvar',
        'common.cancel': 'Cancelar',
        'common.close': 'Fechar',
        'common.ok': 'OK',
        'common.previous': 'Anterior',
        'common.next': 'Próxima',
        'common.page': 'Página',
        'common.of': 'de',

        // Manuais
        'manuals.noPermission': 'Você não tem permissão para visualizar manuais.',
        'manuals.loadError': 'Não foi possível carregar os manuais.',
        'manuals.categoriesLoadError': 'Não foi possível carregar as categorias.',
        'manuals.fileUrlNotAvailable': 'URL do arquivo não disponível.',
        'manuals.downloadSuccess': 'Manual baixado com sucesso!',
        'manuals.downloadError': 'Não foi possível baixar o manual.',
        'manuals.manual': 'Manual',
        'manuals.category': 'Categoria',
        'manuals.searchPlaceholder': 'Pesquisar manual (mín. 3 caracteres)',
        'manuals.allCategories': 'Todas as Categorias',
        'manuals.noManualsFound': 'Nenhum manual encontrado.',

        // Permissões
        'permissions.accessDenied': 'Acesso Negado',
        'permissions.requiresAllPermissions': 'Você precisa de todas as permissões necessárias para acessar este recurso.',
        'permissions.requiresAnyPermission': 'Você precisa de pelo menos uma das permissões necessárias para acessar este recurso.',

        // Technical Assistance
        'technicalAssistance.searchPlaceholder': 'Pesquisar (nome, email ou tag)',
        'technicalAssistance.newTechnicalAssistance': 'Nova Assistência Técnica',
        'technicalAssistance.client': 'Cliente',
        'technicalAssistance.email': 'Email',
        'technicalAssistance.tag': 'Tag',
        'technicalAssistance.type': 'Tipo',
        'technicalAssistance.manufacturer': 'Fabricante',
        'technicalAssistance.status': 'Status',
        'technicalAssistance.date': 'Data',
        'technicalAssistance.equipmentInfo': 'Informações do Equipamento',
        'technicalAssistance.sector': 'Setor',
        'technicalAssistance.patrimony': 'Patrimônio',
        'technicalAssistance.serialNumber': 'Número de Série',
        'technicalAssistance.equipmentType': 'Tipo de Equipamento',
        'technicalAssistance.evaporatorType': 'Tipo de Evaporadora',
        'technicalAssistance.coilType': 'Tipo de Serpentina',
        'technicalAssistance.condenserType': 'Tipo de Coifa',
        'technicalAssistance.capacity': 'Capacidade',
        'technicalAssistance.voltage': 'Voltagem',
        'technicalAssistance.electricCurrent': 'Corrente Elétrica',
        'technicalAssistance.activityPlan': 'Plano de Atividade',
        'technicalAssistance.uploadSection': 'Seção de Uploads',
        'technicalAssistance.saveAsDraft': 'Salvar como Rascunho',
        'technicalAssistance.save': 'Salvar',
        'technicalAssistance.cancel': 'Cancelar',
        'technicalAssistance.selectOption': 'Selecione uma opção',
        'technicalAssistance.notFound': 'Assistência técnica não encontrada.',
        'technicalAssistance.loadError': 'Não foi possível carregar a assistência técnica.',
        'technicalAssistance.offlineData': 'Dados não disponíveis offline. Conecte-se à internet para carregar.',
        'technicalAssistance.technology': 'Tecnologia',

        // Roadmap
        'roadmap.noActivitiesFound': 'Nenhuma atividade encontrada',
        'roadmap.noActivitiesSubtitle': 'Não há atividades programadas para hoje',
        'roadmap.loading': 'Carregando roteiro...',
        'roadmap.dayRoadmap': 'Roteiro do Dia',
        'roadmap.activitiesCount': 'atividades encontradas',
        'roadmap.pending': 'Pendente',
        'roadmap.inProgress': 'Em Andamento',
        'roadmap.completed': 'Concluída',
        'roadmap.cancelled': 'Cancelada',
        'roadmap.low': 'Baixa',
        'roadmap.medium': 'Média',
        'roadmap.high': 'Alta',
        'roadmap.maintenance': 'Manutenção',
        'roadmap.repair': 'Reparo',
        'roadmap.inspection': 'Inspeção',
        'roadmap.installation': 'Instalação',

        // Technical Assistance - Filtros
        'technicalAssistance.allTypes': 'Todos os tipos',
        'technicalAssistance.allManufacturers': 'Todos os fabricantes',
        'technicalAssistance.allStatus': 'Todos os status',
        'technicalAssistance.open': 'Aberto',
        'technicalAssistance.pending': 'Pendente',
        'technicalAssistance.closed': 'Fechado',

        // PMOC
        'pmoc.title': 'PMOCs',
        'pmoc.newPmoc': 'Novo PMOC',
        'pmoc.client': 'Cliente',
        'pmoc.sector': 'Setor',
        'pmoc.equipment': 'Equipamento',
        'pmoc.startDate': 'Data de Início',
        'pmoc.frequency': 'Frequência (dias)',
        'pmoc.status': 'Status',
        'pmoc.createdAt': 'Criado em',
        'pmoc.actions': 'Ações',
        'pmoc.createSuccess': 'PMOC criado com sucesso!',
        'pmoc.createError': 'Erro ao criar PMOC',
        'pmoc.loadError': 'Erro ao carregar PMOCs',
        'pmoc.noPermission': 'Você não tem permissão para visualizar PMOCs.',
        'pmoc.searchPlaceholder': 'Pesquisar por nome ou email...',
        'pmoc.allStatus': 'Todos',
        'pmoc.noPmocsFound': 'Nenhum PMOC encontrado.',

        // Service Orders
        'serviceOrder.title': 'Ordens de Serviço',
        'serviceOrder.newOrder': 'Nova Ordem de Serviço',
        'serviceOrder.client': 'Cliente',
        'serviceOrder.email': 'Email',
        'serviceOrder.tag': 'Tag',
        'serviceOrder.type': 'Tipo',
        'serviceOrder.brand': 'Marca',
        'serviceOrder.status': 'Status',
        'serviceOrder.date': 'Data',
        'serviceOrder.loading': 'Carregando permissões...',
        'serviceOrder.noPermission': 'Você não tem permissão para visualizar ordens de serviço.',
        'serviceOrder.loadError': 'Erro ao carregar ordens de serviço',
        'serviceOrder.tokenError': 'Token de acesso não encontrado',
        'serviceOrder.unknownError': 'Erro desconhecido',
        'serviceOrder.nameNotAvailable': 'Nome não disponível',
        'serviceOrder.emailNotAvailable': 'Email não disponível',
        'serviceOrder.tagNotAvailable': 'Tag não disponível',
        'serviceOrder.typeNotAvailable': 'Tipo não disponível',
        'serviceOrder.brandNotAvailable': 'Marca não disponível',
    },
    'en': {
        // Navigation/Menu
        'menu.home': 'Home',
        'menu.personalData': 'Personal Data',
        'menu.preferences': 'Preferences',
        'menu.manuals': 'Manuals',
        'menu.logout': 'Logout',
        'menu.operacional': 'Operational',
        'menu.clientsWithContract': 'Clients with Contract',
        'menu.clientsWithoutContract': 'Individual Clients',
        'menu.equipments': 'Equipment',
        'menu.activities': 'Activities',
        'menu.pmocs': 'PMOCs',
        'menu.serviceOrders': 'Service Orders',
        'menu.technicalAssistance': 'Technical Assistance',
        'menu.roadmaps': 'Roadmap',
        'menu.installation': 'Installation',
        'menu.technicalSupport': 'Technical Support',
        'menu.equipmentQrCode': 'QR Code Reader',
        'menu.basicRegistrations': 'Basic Registrations',
        'menu.functions': 'Functions',
        'menu.manufacturers': 'Manufacturers',
        'menu.coilTypes': 'Coil Types',
        'menu.equipmentTypes': 'Equipment Types',
        'menu.compressorTypes': 'Compressor Types',
        'menu.coolingFluidTypes': 'Cooling Fluid Types',
        'menu.condenserTypes': 'Condenser Types',
        'menu.evaporatorTypes': 'Evaporator Types',
        'menu.phases': 'Phases',
        'menu.technologies': 'Technologies',
        'menu.capacityUnits': 'Capacity Units',
        'menu.administrative': 'Administrative',
        'menu.support': 'Support',
        'menu.createEquipment': 'Create Equipment',
        'menu.filterEquipment': 'Filter Equipment',
        'menu.viewActivities': 'View Activities',
        'menu.documentation': 'Documentation',

        // Home Screen
        'home.welcomeToSystem': 'Welcome to System',
        'home.quickActions': 'Quick Actions',
        'home.comingSoon': 'Coming Soon',

        // Preferences Screen
        'preferences.title': 'Preferences',
        'preferences.language': 'Language',
        'preferences.save': 'Save',
        'preferences.cancel': 'Cancel',
        'preferences.loading': 'Loading...',
        'preferences.saveSuccess': 'Preferences saved successfully!',
        'preferences.saveError': 'Error saving preferences',
        'preferences.loadError': 'Error loading preferences',

        // Languages
        'language.portuguese': 'Portuguese',
        'language.english': 'English',

        // Common
        'common.welcome': 'Welcome',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.loading': 'Loading...',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.close': 'Close',
        'common.ok': 'OK',
        'common.previous': 'Previous',
        'common.next': 'Next',
        'common.page': 'Page',
        'common.of': 'of',

        // Manuais
        'manuals.noPermission': 'You do not have permission to view manuals.',
        'manuals.loadError': 'Could not load manuals.',
        'manuals.categoriesLoadError': 'Could not load categories.',
        'manuals.fileUrlNotAvailable': 'File URL not available.',
        'manuals.downloadSuccess': 'Manual downloaded successfully!',
        'manuals.downloadError': 'Could not download manual.',
        'manuals.manual': 'Manual',
        'manuals.category': 'Category',
        'manuals.searchPlaceholder': 'Search manual (min. 3 characters)',
        'manuals.allCategories': 'All Categories',
        'manuals.noManualsFound': 'No manuals found.',

        // Permissions
        'permissions.accessDenied': 'Access Denied',
        'permissions.requiresAllPermissions': 'You need all required permissions to access this resource.',
        'permissions.requiresAnyPermission': 'You need at least one of the required permissions to access this resource.',

        // Technical Assistance
        'technicalAssistance.searchPlaceholder': 'Search (name, email or tag)',
        'technicalAssistance.newTechnicalAssistance': 'New Technical Assistance',
        'technicalAssistance.client': 'Client',
        'technicalAssistance.email': 'Email',
        'technicalAssistance.tag': 'Tag',
        'technicalAssistance.type': 'Type',
        'technicalAssistance.manufacturer': 'Manufacturer',
        'technicalAssistance.status': 'Status',
        'technicalAssistance.date': 'Date',
        'technicalAssistance.equipmentInfo': 'Equipment Information',
        'technicalAssistance.sector': 'Sector',
        'technicalAssistance.patrimony': 'Patrimony',
        'technicalAssistance.serialNumber': 'Serial Number',
        'technicalAssistance.equipmentType': 'Equipment Type',
        'technicalAssistance.evaporatorType': 'Evaporator Type',
        'technicalAssistance.coilType': 'Coil Type',
        'technicalAssistance.condenserType': 'Condenser Type',
        'technicalAssistance.capacity': 'Capacity',
        'technicalAssistance.voltage': 'Voltage',
        'technicalAssistance.electricCurrent': 'Electric Current',
        'technicalAssistance.activityPlan': 'Activity Plan',
        'technicalAssistance.uploadSection': 'Upload Section',
        'technicalAssistance.saveAsDraft': 'Save as Draft',
        'technicalAssistance.save': 'Save',
        'technicalAssistance.cancel': 'Cancel',
        'technicalAssistance.selectOption': 'Select an option',
        'technicalAssistance.notFound': 'Technical assistance not found.',
        'technicalAssistance.loadError': 'Could not load technical assistance.',
        'technicalAssistance.offlineData': 'Data not available offline. Connect to the internet to load.',
        'technicalAssistance.technology': 'Technology',

        // Roadmap
        'roadmap.noActivitiesFound': 'No activities found',
        'roadmap.noActivitiesSubtitle': 'There are no activities scheduled for today',
        'roadmap.loading': 'Loading roadmap...',
        'roadmap.dayRoadmap': 'Day Roadmap',
        'roadmap.activitiesCount': 'activities found',
        'roadmap.pending': 'Pending',
        'roadmap.inProgress': 'In Progress',
        'roadmap.completed': 'Completed',
        'roadmap.cancelled': 'Cancelled',
        'roadmap.low': 'Low',
        'roadmap.medium': 'Medium',
        'roadmap.high': 'High',
        'roadmap.maintenance': 'Maintenance',
        'roadmap.repair': 'Repair',
        'roadmap.inspection': 'Inspection',
        'roadmap.installation': 'Installation',

        // Technical Assistance - Filters
        'technicalAssistance.allTypes': 'All types',
        'technicalAssistance.allManufacturers': 'All manufacturers',
        'technicalAssistance.allStatus': 'All status',
        'technicalAssistance.open': 'Open',
        'technicalAssistance.pending': 'Pending',
        'technicalAssistance.closed': 'Closed',

        // PMOC
        'pmoc.title': 'PMOCs',
        'pmoc.newPmoc': 'New PMOC',
        'pmoc.client': 'Client',
        'pmoc.sector': 'Sector',
        'pmoc.equipment': 'Equipment',
        'pmoc.startDate': 'Start Date',
        'pmoc.frequency': 'Frequency (days)',
        'pmoc.status': 'Status',
        'pmoc.createdAt': 'Created at',
        'pmoc.actions': 'Actions',
        'pmoc.createSuccess': 'PMOC created successfully!',
        'pmoc.createError': 'Error creating PMOC',
        'pmoc.loadError': 'Error loading PMOCs',
        'pmoc.noPermission': 'You do not have permission to view PMOCs.',
        'pmoc.searchPlaceholder': 'Search by name or email...',
        'pmoc.allStatus': 'All',
        'pmoc.noPmocsFound': 'No PMOCs found.',

        // Service Orders
        'serviceOrder.title': 'Service Orders',
        'serviceOrder.newOrder': 'New Service Order',
        'serviceOrder.client': 'Client',
        'serviceOrder.email': 'Email',
        'serviceOrder.tag': 'Tag',
        'serviceOrder.type': 'Type',
        'serviceOrder.brand': 'Brand',
        'serviceOrder.status': 'Status',
        'serviceOrder.date': 'Date',
        'serviceOrder.loading': 'Loading permissions...',
        'serviceOrder.noPermission': 'You do not have permission to view service orders.',
        'serviceOrder.loadError': 'Error loading service orders',
        'serviceOrder.tokenError': 'Access token not found',
        'serviceOrder.unknownError': 'Unknown error',
        'serviceOrder.nameNotAvailable': 'Name not available',
        'serviceOrder.emailNotAvailable': 'Email not available',
        'serviceOrder.tagNotAvailable': 'Tag not available',
        'serviceOrder.typeNotAvailable': 'Type not available',
        'serviceOrder.brandNotAvailable': 'Brand not available',
    },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState<string>('pt-br');

    useEffect(() => {
        const loadSavedLanguage = async () => {
            try {
                const savedLanguage = await AsyncStorage.getItem('user_language');
                if (savedLanguage && translations[savedLanguage]) {
                    setCurrentLanguage(savedLanguage);
                }
            } catch (error) {
                console.error('Error loading saved language:', error);
            }
        };
        loadSavedLanguage();
    }, []);

    const setLanguage = async (language: string) => {
        try {
            await AsyncStorage.setItem('user_language', language);
            setCurrentLanguage(language);
        } catch (error) {
            console.error('Error saving language:', error);
        }
    };

    const t = (key: string): string => {
        const languageTranslations = translations[currentLanguage] || translations['pt-br'];
        return languageTranslations[key] || key;
    };

    const loadUserPreferences = async (accessToken: string) => {
        try {
            const preferences = await PreferencesService.getPreferences(accessToken);
            if (preferences.language && translations[preferences.language]) {
                await setLanguage(preferences.language);
                console.log(`[LanguageContext] Preferências carregadas: ${preferences.language}`);
            } else {
                console.warn(`[LanguageContext] Idioma não suportado: ${preferences.language}, usando padrão pt-br`);
            }
        } catch (error) {
            console.error('[LanguageContext] Erro ao carregar preferências do usuário:', error);
            // Se não conseguir carregar do backend, mantém o idioma local ou padrão
            const savedLanguage = await AsyncStorage.getItem('user_language');
            if (savedLanguage && translations[savedLanguage]) {
                setCurrentLanguage(savedLanguage);
            }
        }
    };

    const saveLanguagePreference = async (accessToken: string, language: string) => {
        try {
            await PreferencesService.updatePreferences(accessToken, { language });
            await setLanguage(language);
        } catch (error) {
            console.error('Error saving language preference:', error);
            throw error;
        }
    };

    return (
        <LanguageContext.Provider
            value={{
                currentLanguage,
                setLanguage,
                t,
                loadUserPreferences,
                saveLanguagePreference,
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
};