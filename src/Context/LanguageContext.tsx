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
    'common.ok': 'OK',
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
    'common.ok': 'OK',
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
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
      // Se não conseguir carregar do backend, mantém o idioma local ou padrão
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