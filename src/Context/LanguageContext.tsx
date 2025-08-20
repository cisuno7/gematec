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
    'pt-BR': {
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

        // Dashboard
        'dashboard.dailySummary': 'Resumo do Dia',
        'dashboard.quickActions': 'Ações Rápidas',
        'dashboard.moreOptions': 'Mais Opções',
        'dashboard.pendingActivities': 'Atividades Pendentes',
        'dashboard.openActivities': 'Atividades Abertas',
        'dashboard.totalActivities': 'Total Atividades',

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
        'common.confirm': 'Confirmar',
        'common.clear': 'Limpar',
        'common.retry': 'Tentar novamente',

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
        'technicalAssistance.title': 'Assistência Técnica',
        'technicalAssistance.assistance': 'assistência',
        'technicalAssistance.loading': 'Carregando assistências técnicas...',

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
        'pmoc.subtitle': 'Plano de Manutenção Operacional Contínua',
        'pmoc.tryAdjustFilters': 'Tente ajustar os filtros de busca',
        'pmoc.noPmocsRegistered': 'Não há PMOCs registrados no momento',

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
        'serviceOrder.order': 'ordem',
        'serviceOrder.orders': 'ordens',
        'serviceOrder.found': 'encontrada',
        'serviceOrder.foundPlural': 'encontradas',

        // Activity
        'activity.title': 'Atividades',
        'activity.noPermission': 'Você não tem permissão para visualizar atividades',
        'activity.all': 'Todos',
        'activity.open': 'Aberto',
        'activity.pending': 'Pendente',
        'activity.closed': 'Fechado',
        'activity.pmoc': 'PMOC',
        'activity.serviceOrder': 'Ordem de Serviço',
        'activity.technicalAssistance': 'Assistência Técnica',
        'activity.installation': 'Instalação',
        'activity.loading': 'Carregando atividades...',
        'activity.noActivitiesFound': 'Nenhuma atividade encontrada',

        // Activity Equipment List Screen
        'activityEquipmentList.title': 'Equipamentos Vinculados',
        'activityEquipmentList.filters': 'Filtros',
        'activityEquipmentList.search': 'Buscar',
        'activityEquipmentList.searchPlaceholder': 'Buscar por tag, fabricante ou tipo...',
        'activityEquipmentList.status': 'Status',
        'activityEquipmentList.sector': 'Setor',
        'activityEquipmentList.subsector': 'Subsetor',
        'activityEquipmentList.showOnlyStarted': 'Mostrar apenas iniciados',
        'activityEquipmentList.created': 'Criado',
        'activityEquipmentList.inProgress': 'Em Andamento',
        'activityEquipmentList.completed': 'Concluído',
        'activityEquipmentList.startActivity': 'Iniciar Atividade',
        'activityEquipmentList.viewDetails': 'Ver Detalhes',
        'activityEquipmentList.equipmentInfo': 'Informações do Equipamento',
        'activityEquipmentList.manufacturer': 'Fabricante',
        'activityEquipmentList.type': 'Tipo',
        'activityEquipmentList.location': 'Localização',
        'activityEquipmentList.noEquipmentsFound': 'Nenhum equipamento encontrado',
        'activityEquipmentList.loading': 'Carregando equipamentos...',
        'activityEquipmentList.error': 'Erro ao carregar equipamentos',
        'activityEquipmentList.retry': 'Tentar Novamente',

        // Activity Questionnaire Screen
        'activityQuestionnaire.title': 'Questionário',
        'activityQuestionnaire.equipmentInfo': 'Informações do Equipamento',
        'activityQuestionnaire.equipmentTag': 'Tag',
        'activityQuestionnaire.manufacturer': 'Fabricante',
        'activityQuestionnaire.type': 'Tipo',
        'activityQuestionnaire.sector': 'Setor',
        'activityQuestionnaire.activityStatus': 'Status da Atividade',
        'activityQuestionnaire.activityNotStarted': 'Atividade Não Iniciada',
        'activityQuestionnaire.activityStarted': 'Atividade Iniciada',
        'activityQuestionnaire.activityCompleted': 'Atividade Concluída',
        'activityQuestionnaire.questionnaire': 'Questionário',
        'activityQuestionnaire.startActivity': 'Iniciar Atividade',
        'activityQuestionnaire.saveAnswers': 'Salvar Respostas',
        'activityQuestionnaire.completeActivity': 'Concluir Atividade',
        'activityQuestionnaire.loading': 'Carregando questionário...',
        'activityQuestionnaire.error': 'Erro ao carregar questionário',
        'activityQuestionnaire.retry': 'Tentar Novamente',
        'activityQuestionnaire.startSuccess': 'Atividade iniciada com sucesso!',
        'activityQuestionnaire.startError': 'Falha ao iniciar atividade. Tente novamente.',
        'activityQuestionnaire.saveSuccess': 'Respostas salvas com sucesso!',
        'activityQuestionnaire.saveError': 'Falha ao salvar respostas. Tente novamente.',
        'activityQuestionnaire.completeSuccess': 'Atividade concluída com sucesso!',
        'activityQuestionnaire.completeError': 'Falha ao concluir atividade. Tente novamente.',
        'activityQuestionnaire.validationError': 'Por favor, preencha todos os campos obrigatórios.',

        // Validation Messages
        'validation.required': 'Campo obrigatório',
        'validation.minLength': 'Mínimo {min} caracteres',
        'validation.maxLength': 'Máximo {max} caracteres',
        'validation.minValue': 'Mínimo {min}',
        'validation.maxValue': 'Máximo {max}',
        'validation.requiredJustification': 'Justificativa obrigatória',
        'validation.requiredUpload': 'Upload obrigatório',

        // Clients
        'clients.noPermission': 'Você não tem permissão para visualizar clientes.',
        'clients.loadError': 'Não foi possível carregar os clientes.',
        'clients.title.withContract': 'Clientes com Contrato',
        'clients.title.withoutContract': 'Clientes Avulsos',
        'clients.searchPlaceholder': 'Pesquisar cliente (mín. 3 caracteres)',
        'clients.empty': 'Nenhum cliente encontrado.',
        'clients.view': 'Visualizar',
        'clients.sectors': 'Setores',
        'clients.name': 'Nome',
        'clients.email': 'Email',
        'clients.document': 'Documento',
        'clients.previous': 'Anterior',
        'clients.next': 'Próxima',
        'clients.sectorsLoadError': 'Erro ao carregar setores do cliente.',

        // Client Details
        'clientDetails.loading': 'Carregando detalhes do cliente...',
        'clientDetails.notFound': 'Cliente não encontrado.',
        'clientDetails.basicInfo': 'Informações Básicas',
        'clientDetails.fantasyName': 'Nome Fantasia',
        'clientDetails.stateRegistration': 'Registro Estadual',
        'clientDetails.openingDate': 'Data de Abertura',
        'clientDetails.totalSectors': 'Total de Setores',
        'clientDetails.totalEquipments': 'Total de Equipamentos',
        'clientDetails.contracts': 'Contratos',
        'clientDetails.noContracts': 'Nenhum contrato encontrado.',
        'clientDetails.contacts': 'Contatos',
        'clientDetails.noContacts': 'Nenhum contato encontrado.',
        'clientDetails.addresses': 'Endereços',
        'clientDetails.noAddresses': 'Nenhum endereço encontrado.',
        'clientDetails.listSectors': '📁 Listar Setores',
        'clientDetails.cityStateCountry': 'Cidade/Estado/País',
        'clientDetails.neighborhood': 'Bairro',
        'clientDetails.address': 'Endereço',
        'clientDetails.number': 'Número',
        'clientDetails.postalCode': 'CEP',
        'clientDetails.start': 'Início',
        'clientDetails.end': 'Fim',
        'clientDetails.frequency': 'Frequência',

        // Sectors
        'sectors.noPermission': 'Você não tem permissão para visualizar setores.',
        'sectors.loading': 'Carregando setores...',
        'sectors.loadingDetails': 'Carregando detalhes do setor...',
        'sectors.notFound': 'Setor não encontrado.',
        'sectors.loadError': 'Erro ao carregar setores.',
        'sectors.rootTitle': 'Setores Pais',
        'sectors.listEquipments': '🔧 Listar Equipamentos',
        'sectors.viewSector': '👁️ Visualizar Setor',
        'sectors.noRootFound': 'Nenhum setor pai encontrado para este cliente.',
        'sectors.infoTitle': 'Informações do Setor',
        'sectors.name': 'Nome',
        'sectors.fullName': 'Nome Completo',
        'sectors.level': 'Nível',
        'sectors.equipments': 'Equipamentos',
        'sectors.subsectors': 'Subsetores',
        'sectors.subsectorsTitle': 'Subsetores',
        'sectors.noSubsectors': 'Nenhum subsetor encontrado.',
        'sectors.infoNote': 'ℹ️ Informação: Esta opção lista equipamentos que não estão alocados em nenhum setor filho.',

        // Equipment
        'equipment.noPermission': 'Você não tem permissão para visualizar equipamentos.',
        'equipment.loading': 'Carregando equipamentos...',
        'equipment.loadError': 'Não foi possível carregar os equipamentos.',
        'equipment.title': 'Equipamentos',
        'equipment.clientSector': 'Setor do Cliente',
        'equipment.resetFilters': '🔄 Limpar Filtros',
        'equipment.empty': 'Nenhum equipamento encontrado',
        'equipment.add': 'Adicionar Equipamento',
        'equipment.tagMissing': 'Sem Tag',
        'equipment.patrimonyMissing': 'Sem Patrimônio',
        'equipment.manufacturerNA': 'Fabricante N/A',
        'equipment.typeNA': 'Tipo N/A',
        'equipment.active': 'Ativo',
        'equipment.inactive': 'Inativo',

        // Activity History
        'activityHistory.title': 'Histórico de Atividades',
        'activityHistory.headerSubtitleEquipment': 'Equipamento específico',
        'activityHistory.headerSubtitleAll': 'Todas as atividades',
        'activityHistory.filters': 'Filtros',
        'activityHistory.activityType': 'Tipo de Atividade',
        'activityHistory.status': 'Status',
        'activityHistory.loading': 'Carregando atividades...',
        'activityHistory.noneFound': 'Nenhuma atividade encontrada',
        'activityHistory.tryAdjustFilters': 'Tente ajustar os filtros ou verifique se há atividades disponíveis',
        'activityHistory.viewDetails': 'Ver Detalhes',
        'activityHistory.viewWork': 'Visualizar trabalho',
        'activityHistory.start': 'Início',
        'activityHistory.end': 'Fim',
        'activityHistory.deadline': 'Prazo',

        // Roadmap Details
        'roadmapDetails.generalInfo': 'Informações Gerais',
        'roadmapDetails.client': 'Cliente',
        'roadmapDetails.equipment': 'Equipamento',
        'roadmapDetails.type': 'Tipo',
        'roadmapDetails.estimatedDuration': 'Duração Estimada',
        'roadmapDetails.description': 'Descrição',
        'roadmapDetails.systemInfo': 'Informações do Sistema',
        'roadmapDetails.createdAt': 'Criado em',
        'roadmapDetails.updatedAt': 'Atualizado em',
        'roadmapDetails.viewEquipments': 'Ver Equipamentos',
        'roadmapDetails.notInformed': 'Não informado',

        // Roadmap Equipment
        'roadmapEquipment.loading': 'Carregando equipamentos...',
        'roadmapEquipment.title': 'Equipamentos',
        'roadmapEquipment.noneFound': 'Nenhum equipamento encontrado',
        'roadmapEquipment.noneAssociated': 'Esta atividade não possui equipamentos associados',
        'roadmapEquipment.questions': 'Questões',

        // Work
        'work.title': 'Registros de Trabalho',
        'work.activityPrefix': 'Atividade: ',
        'work.assigned': 'Assinado',
        'work.pending': 'Pendente',
        'work.view': 'Ver',
        'work.edit': 'Editar',
        'work.approve': 'Aprovar',
        'work.delete': 'Excluir',
        'work.openedAt': 'Abertura',
        'work.noWorksFound': 'Nenhum registro encontrado',
        'work.loadingPermissions': 'Carregando permissões...',
        'work.noPermissionList': 'Você não tem permissão para listar registros de trabalho.',
        'work.noPermissionView': 'Você não tem permissão para visualizar registros de trabalho.',
        'work.noPermissionCreate': 'Você não tem permissão para criar registros de trabalho.',
        'work.noPermissionEdit': 'Você não tem permissão para editar registros de trabalho.',
        'work.noPermissionApprove': 'Você não tem permissão para aprovar registros de trabalho.',
        'work.create.title': 'Criar Registro de Trabalho',
        'work.edit.title': 'Editar Registro de Trabalho',
        'work.detail.title': 'Detalhes do Trabalho',
        'work.approve.title': 'Assinatura de Aprovação',
        'work.approve.description': 'Assine no espaço abaixo',
        'work.deleteConfirmTitle': 'Excluir registro',
        'work.deleteConfirmMessage': 'Confirma a exclusão deste registro de trabalho?',
        'work.fields.name': 'Nome',
        'work.fields.equipmentVersionIds': 'IDs de versões de equipamento (separados por vírgula)',
        'work.placeholder.nameExample': 'Ex.: Atividade ABC 1',
        'work.placeholder.equipmentVersionIds': 'Ex.: 1,2,3',
        'work.requiredDataTitle': 'Dados obrigatórios',
        'work.requiredDataMsg': 'Informe o nome e pelo menos um ID de versão de equipamento.',
        'work.create.successMessage': 'Registro criado com sucesso.',
        'work.create.errorMessage': 'Falha ao criar registro',
        'work.update.successMessage': 'Registro atualizado com sucesso.',
        'work.update.errorMessage': 'Falha ao atualizar registro',
        'work.approve.successMessage': 'Registro aprovado com sucesso.',
        'work.approve.errorMessage': 'Falha ao aprovar registro.',
        'work.generalData': 'Dados Gerais',
        'work.activity': 'Atividade',
        'work.equipmentVersions': 'Versões de Equipamento',
        'work.signedAt': 'Assinado em',
        'work.signedBy': 'Assinado por',
        'work.approvedBy': 'Aprovado por',
        'work.signature': 'Assinatura',
        'work.signature.missing': 'Sem assinatura',
        'work.client': 'Cliente',
        'work.status': 'Status',
        'work.startDate': 'Início',
        'work.endDate': 'Fim',
        'work.type': 'Tipo',
        'work.brand': 'Marca',
        'work.sector': 'Setor',
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

        // Dashboard
        'dashboard.dailySummary': 'Daily Summary',
        'dashboard.quickActions': 'Quick Actions',
        'dashboard.moreOptions': 'More Options',
        'dashboard.pendingActivities': 'Pending Activities',
        'dashboard.openActivities': 'Open Activities',
        'dashboard.totalActivities': 'Total Activities',

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
        'common.found': 'found',
        'common.confirm': 'Confirm',
        'common.clear': 'Clear',
        'common.retry': 'Try Again',

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
        'technicalAssistance.title': 'Technical Assistance',
        'technicalAssistance.assistance': 'assistance',
        'technicalAssistance.loading': 'Loading technical assistance...',

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
        'pmoc.subtitle': 'Operational Maintenance Continuous Plan',
        'pmoc.tryAdjustFilters': 'Try adjusting the search filters',
        'pmoc.noPmocsRegistered': 'There are no PMOCs registered at the moment',

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
        'serviceOrder.order': 'order',
        'serviceOrder.orders': 'orders',
        'serviceOrder.found': 'found',
        'serviceOrder.foundPlural': 'found',

        // Activity
        'activity.title': 'Activities',
        'activity.noPermission': 'You do not have permission to view activities',
        'activity.all': 'All',
        'activity.open': 'Open',
        'activity.pending': 'Pending',
        'activity.closed': 'Closed',
        'activity.pmoc': 'PMOC',
        'activity.serviceOrder': 'Service Order',
        'activity.technicalAssistance': 'Technical Assistance',
        'activity.installation': 'Installation',
        'activity.loading': 'Loading activities...',
        'activity.noActivitiesFound': 'No activities found',

        // Activity Equipment List Screen
        'activityEquipmentList.title': 'Linked Equipment',
        'activityEquipmentList.filters': 'Filters',
        'activityEquipmentList.search': 'Search',
        'activityEquipmentList.searchPlaceholder': 'Search by tag, manufacturer or type...',
        'activityEquipmentList.status': 'Status',
        'activityEquipmentList.sector': 'Sector',
        'activityEquipmentList.subsector': 'Subsector',
        'activityEquipmentList.showOnlyStarted': 'Show only started',
        'activityEquipmentList.created': 'Created',
        'activityEquipmentList.inProgress': 'In Progress',
        'activityEquipmentList.completed': 'Completed',
        'activityEquipmentList.startActivity': 'Start Activity',
        'activityEquipmentList.viewDetails': 'View Details',
        'activityEquipmentList.equipmentInfo': 'Equipment Information',
        'activityEquipmentList.manufacturer': 'Manufacturer',
        'activityEquipmentList.type': 'Type',
        'activityEquipmentList.location': 'Location',
        'activityEquipmentList.noEquipmentsFound': 'No equipment found',
        'activityEquipmentList.loading': 'Loading equipment...',
        'activityEquipmentList.error': 'Error loading equipment',
        'activityEquipmentList.retry': 'Try Again',

        // Activity Questionnaire Screen
        'activityQuestionnaire.title': 'Questionnaire',
        'activityQuestionnaire.equipmentInfo': 'Equipment Information',
        'activityQuestionnaire.equipmentTag': 'Tag',
        'activityQuestionnaire.manufacturer': 'Manufacturer',
        'activityQuestionnaire.type': 'Type',
        'activityQuestionnaire.sector': 'Sector',
        'activityQuestionnaire.activityStatus': 'Activity Status',
        'activityQuestionnaire.activityNotStarted': 'Activity Not Started',
        'activityQuestionnaire.activityStarted': 'Activity Started',
        'activityQuestionnaire.activityCompleted': 'Activity Completed',
        'activityQuestionnaire.questionnaire': 'Questionnaire',
        'activityQuestionnaire.startActivity': 'Start Activity',
        'activityQuestionnaire.saveAnswers': 'Save Answers',
        'activityQuestionnaire.completeActivity': 'Complete Activity',
        'activityQuestionnaire.loading': 'Loading questionnaire...',
        'activityQuestionnaire.error': 'Error loading questionnaire',
        'activityQuestionnaire.retry': 'Try Again',
        'activityQuestionnaire.startSuccess': 'Activity started successfully!',
        'activityQuestionnaire.startError': 'Failed to start activity. Try again.',
        'activityQuestionnaire.saveSuccess': 'Answers saved successfully!',
        'activityQuestionnaire.saveError': 'Failed to save answers. Try again.',
        'activityQuestionnaire.completeSuccess': 'Activity completed successfully!',
        'activityQuestionnaire.completeError': 'Failed to complete activity. Try again.',
        'activityQuestionnaire.validationError': 'Please fill in all required fields.',

        // Validation Messages
        'validation.required': 'Required field',
        'validation.minLength': 'Minimum {min} characters',
        'validation.maxLength': 'Maximum {max} characters',
        'validation.minValue': 'Minimum {min}',
        'validation.maxValue': 'Maximum {max}',
        'validation.requiredJustification': 'Required justification',
        'validation.requiredUpload': 'Required upload',

        // Clients
        'clients.noPermission': 'You do not have permission to view clients.',
        'clients.loadError': 'Could not load clients.',
        'clients.title.withContract': 'Clients with Contract',
        'clients.title.withoutContract': 'Individual Clients',
        'clients.searchPlaceholder': 'Search client (min 3 characters)',
        'clients.empty': 'No clients found.',
        'clients.view': 'View',
        'clients.sectors': 'Sectors',
        'clients.name': 'Name',
        'clients.email': 'Email',
        'clients.document': 'Document',
        'clients.previous': 'Previous',
        'clients.next': 'Next',
        'clients.sectorsLoadError': 'Error loading client sectors.',

        // Client Details
        'clientDetails.loading': 'Loading client details...',
        'clientDetails.notFound': 'Client not found.',
        'clientDetails.basicInfo': 'Basic Information',
        'clientDetails.fantasyName': 'Trade Name',
        'clientDetails.stateRegistration': 'State Registration',
        'clientDetails.openingDate': 'Opening Date',
        'clientDetails.totalSectors': 'Total Sectors',
        'clientDetails.totalEquipments': 'Total Equipment',
        'clientDetails.contracts': 'Contracts',
        'clientDetails.noContracts': 'No contracts found.',
        'clientDetails.contacts': 'Contacts',
        'clientDetails.noContacts': 'No contacts found.',
        'clientDetails.addresses': 'Addresses',
        'clientDetails.noAddresses': 'No addresses found.',
        'clientDetails.listSectors': '📁 List Sectors',
        'clientDetails.cityStateCountry': 'City/State/Country',
        'clientDetails.neighborhood': 'Neighborhood',
        'clientDetails.address': 'Address',
        'clientDetails.number': 'Number',
        'clientDetails.postalCode': 'ZIP code',
        'clientDetails.start': 'Start',
        'clientDetails.end': 'End',
        'clientDetails.frequency': 'Frequency',

        // Sectors
        'sectors.noPermission': 'You do not have permission to view sectors.',
        'sectors.loading': 'Loading sectors...',
        'sectors.loadingDetails': 'Loading sector details...',
        'sectors.notFound': 'Sector not found.',
        'sectors.loadError': 'Error loading sectors.',
        'sectors.rootTitle': 'Parent Sectors',
        'sectors.listEquipments': '🔧 List Equipment',
        'sectors.viewSector': '👁️ View Sector',
        'sectors.noRootFound': 'No parent sector found for this client.',
        'sectors.infoTitle': 'Sector Information',
        'sectors.name': 'Name',
        'sectors.fullName': 'Full Name',
        'sectors.level': 'Level',
        'sectors.equipments': 'Equipment',
        'sectors.subsectors': 'Subsectors',
        'sectors.subsectorsTitle': 'Subsectors',
        'sectors.noSubsectors': 'No subsectors found.',
        'sectors.infoNote': 'ℹ️ Info: This option lists equipment not allocated to any child sector.',

        // Equipment
        'equipment.noPermission': 'You do not have permission to view equipment.',
        'equipment.loading': 'Loading equipment...',
        'equipment.loadError': 'Could not load equipment.',
        'equipment.title': 'Equipment',
        'equipment.clientSector': 'Client Sector',
        'equipment.resetFilters': '🔄 Clear Filters',
        'equipment.empty': 'No equipment found',
        'equipment.add': 'Add Equipment',
        'equipment.tagMissing': 'No Tag',
        'equipment.patrimonyMissing': 'No Patrimony',
        'equipment.manufacturerNA': 'Manufacturer N/A',
        'equipment.typeNA': 'Type N/A',
        'equipment.active': 'Active',
        'equipment.inactive': 'Inactive',

        // Activity History
        'activityHistory.title': 'Activity History',
        'activityHistory.headerSubtitleEquipment': 'Specific equipment',
        'activityHistory.headerSubtitleAll': 'All activities',
        'activityHistory.filters': 'Filters',
        'activityHistory.activityType': 'Activity Type',
        'activityHistory.status': 'Status',
        'activityHistory.loading': 'Loading activities...',
        'activityHistory.noneFound': 'No activities found',
        'activityHistory.tryAdjustFilters': 'Try adjusting the filters or check for available activities',
        'activityHistory.viewDetails': 'View Details',
        'activityHistory.viewWork': 'View work',
        'activityHistory.start': 'Start',
        'activityHistory.end': 'End',
        'activityHistory.deadline': 'Deadline',

        // Roadmap Details
        'roadmapDetails.generalInfo': 'General Information',
        'roadmapDetails.client': 'Client',
        'roadmapDetails.equipment': 'Equipment',
        'roadmapDetails.type': 'Type',
        'roadmapDetails.estimatedDuration': 'Estimated Duration',
        'roadmapDetails.description': 'Description',
        'roadmapDetails.systemInfo': 'System Information',
        'roadmapDetails.createdAt': 'Created at',
        'roadmapDetails.updatedAt': 'Updated at',
        'roadmapDetails.viewEquipments': 'View Equipment',
        'roadmapDetails.notInformed': 'Not informed',

        // Roadmap Equipment
        'roadmapEquipment.loading': 'Loading equipment...',
        'roadmapEquipment.title': 'Equipment',
        'roadmapEquipment.noneFound': 'No equipment found',
        'roadmapEquipment.noneAssociated': 'This activity has no associated equipment',
        'roadmapEquipment.questions': 'Questions',

        // Work
        'work.title': 'Work Records',
        'work.activityPrefix': 'Activity: ',
        'work.assigned': 'Signed',
        'work.pending': 'Pending',
        'work.view': 'View',
        'work.edit': 'Edit',
        'work.approve': 'Approve',
        'work.delete': 'Delete',
        'work.openedAt': 'Opened at',
        'work.noWorksFound': 'No records found',
        'work.loadingPermissions': 'Loading permissions...',
        'work.noPermissionList': 'You do not have permission to list work records.',
        'work.noPermissionView': 'You do not have permission to view work records.',
        'work.noPermissionCreate': 'You do not have permission to create work records.',
        'work.noPermissionEdit': 'You do not have permission to edit work records.',
        'work.noPermissionApprove': 'You do not have permission to approve work records.',
        'work.create.title': 'Create Work Record',
        'work.edit.title': 'Edit Work Record',
        'work.detail.title': 'Work Details',
        'work.approve.title': 'Approval Signature',
        'work.approve.description': 'Sign in the area below',
        'work.deleteConfirmTitle': 'Delete record',
        'work.deleteConfirmMessage': 'Do you confirm the deletion of this work record?',
        'work.fields.name': 'Name',
        'work.fields.equipmentVersionIds': 'Equipment version IDs (comma-separated)',
        'work.placeholder.nameExample': 'Ex.: Activity ABC 1',
        'work.placeholder.equipmentVersionIds': 'Ex.: 1,2,3',
        'work.requiredDataTitle': 'Required data',
        'work.requiredDataMsg': 'Enter the name and at least one equipment version ID.',
        'work.create.successMessage': 'Record created successfully.',
        'work.create.errorMessage': 'Failed to create record',
        'work.update.successMessage': 'Record updated successfully.',
        'work.update.errorMessage': 'Failed to update record',
        'work.approve.successMessage': 'Record approved successfully.',
        'work.approve.errorMessage': 'Failed to approve record.',
        'work.generalData': 'General Data',
        'work.activity': 'Activity',
        'work.equipmentVersions': 'Equipment Versions',
        'work.signedAt': 'Signed at',
        'work.signedBy': 'Signed by',
        'work.approvedBy': 'Approved by',
        'work.signature': 'Signature',
        'work.signature.missing': 'No signature',
        'work.client': 'Client',
        'work.status': 'Status',
        'work.startDate': 'Start',
        'work.endDate': 'End',
        'work.type': 'Type',
        'work.brand': 'Brand',
        'work.sector': 'Sector',
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
    const [currentLanguage, setCurrentLanguage] = useState<string>('pt-BR');

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
        const languageTranslations = translations[currentLanguage] || translations['pt-BR'];
        return languageTranslations[key] || key;
    };

    const loadUserPreferences = async (accessToken: string) => {
        try {
            const preferences = await PreferencesService.getPreferences(accessToken);
            if (preferences.language && translations[preferences.language]) {
                await setLanguage(preferences.language);
                console.log(`[LanguageContext] Preferências carregadas: ${preferences.language}`);
            } else {
                console.warn(`[LanguageContext] Idioma não suportado: ${preferences.language}, usando padrão pt-BR`);
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
            // Fallback: se o backend não implementar o endpoint, salva localmente mesmo assim
            const status = (error as any)?.response?.status;
            if (status === 404 || status === 405 || status === 501) {
                console.warn('[LanguageContext] Endpoint de preferências indisponível no backend. Aplicando idioma localmente.');
                await setLanguage(language);
                // Cria um erro especial para indicar que foi aplicado localmente
                const fallbackError = new Error('FALLBACK_APPLIED');
                (fallbackError as any).isFallback = true;
                throw fallbackError;
            }
            // Em erros de rede, também aplicamos localmente para não bloquear o usuário
            if (!(error as any)?.response) {
                console.warn('[LanguageContext] Erro de rede ao salvar preferências. Aplicando idioma localmente.');
                await setLanguage(language);
                const fallbackError = new Error('FALLBACK_APPLIED');
                (fallbackError as any).isFallback = true;
                throw fallbackError;
            }
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