import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import AuthService from "../Services/AuthService";

interface UserContextType {
  username: string;
  setUsername: (name: string) => void;
  clientId: number | null;
  setClientId: (id: number | null) => void;
  sectorId: number | null;
  setSectorId: (id: number | null) => void;
  equipmentId: number | null;
  setEquipmentId: (id: number | null) => void;
  account: string | null;
  setAccount: (account: string | null) => void;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, account: string, keepLoggedIn: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState<string>("");
  const [clientId, setClientId] = useState<number | null>(null);
  const [sectorId, setSectorId] = useState<number | null>(null);
  const [equipmentId, setEquipmentId] = useState<number | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const storedClientId = await AsyncStorage.getItem("selectedClientId");
        const storedSectorId = await AsyncStorage.getItem("selectedSectorId");
        const storedEquipmentId = await AsyncStorage.getItem("selectedEquipmentId");
        const storedAccount = await AsyncStorage.getItem("account");
        const accessToken = await AsyncStorage.getItem('access_token');
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        const keepLoggedIn = await AsyncStorage.getItem('keep_logged_in');

        if (storedClientId) setClientId(parseInt(storedClientId));
        if (storedSectorId) setSectorId(parseInt(storedSectorId));
        if (storedEquipmentId) setEquipmentId(parseInt(storedEquipmentId));
        if (storedAccount) setAccount(storedAccount);

        if (keepLoggedIn === 'true' && accessToken && refreshToken && storedAccount) {
          console.log('[UserContext] Usuário mantido logado encontrado');
          setIsAuthenticated(true);
        } else {
          console.log('[UserContext] Condições para manter logado não atendidas');
          setIsAuthenticated(false);
          // Limpar tokens se não deve manter logado
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('refresh_token');
          await AsyncStorage.removeItem('account');
        }
      } catch (error) {
        console.error("Failed to load persisted data:", error);
        setIsAuthenticated(false);
      } finally {
        console.log("[UserContext] loadPersistedData finished. Setting isLoading to false.");
        setIsLoading(false);
      }
    };
    
    console.log("[UserContext] Calling loadPersistedData...");
    loadPersistedData();
  }, []);

  const login = async (accessToken: string, refreshToken: string, accountName: string, keepLoggedIn: boolean) => {
    try {
      await AsyncStorage.setItem('access_token', accessToken);
      await AsyncStorage.setItem('refresh_token', refreshToken);
      await AsyncStorage.setItem('account', accountName);
      await AsyncStorage.setItem('keep_logged_in', String(keepLoggedIn));
      
      setAccount(accountName);
      setIsAuthenticated(true);
      
      console.log('[UserContext] Login realizado com sucesso:', {
        account: accountName,
        keepLoggedIn,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      });
    } catch (error) {
      console.error('[UserContext] Erro ao salvar dados de login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Tenta revogar o refresh token antes de fazer logout
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      const currentAccount = await AsyncStorage.getItem('account');
      
      if (refreshToken && currentAccount) {
        try {
          await AuthService.revokeToken(currentAccount, refreshToken);
          console.log('[UserContext] Token revogado com sucesso no logout');
        } catch (revokeError) {
          console.error('[UserContext] Erro ao revogar token no logout:', revokeError);
          // Não bloquear o logout se a revogação falhar
        }
      }

      // Limpar todos os dados armazenados
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('account');
      await AsyncStorage.removeItem('keep_logged_in');
      await AsyncStorage.removeItem('permissions');
      await AsyncStorage.removeItem('selectedClientId');
      await AsyncStorage.removeItem('selectedSectorId');
      await AsyncStorage.removeItem('selectedEquipmentId');
      
      // Resetar estados
      setIsAuthenticated(false);
      setUsername("");
      setClientId(null);
      setSectorId(null);
      setEquipmentId(null);
      setAccount(null);
      
      console.log('[UserContext] Logout realizado com sucesso');
    } catch (error) {
      console.error('[UserContext] Erro durante logout:', error);
      // Mesmo com erro, tentar limpar o estado local
      setIsAuthenticated(false);
      setAccount(null);
    }
  };

  const saveUsername = async (name: string) => {
    await AsyncStorage.setItem("username", name);
    setUsername(name);
  };

  const saveAccount = async (accountName: string | null) => {
    if (accountName) {
      await AsyncStorage.setItem("account", accountName);
    } else {
      await AsyncStorage.removeItem("account");
    }
    setAccount(accountName);
  };

  return (
    <UserContext.Provider
      value={{
        username,
        setUsername: saveUsername,
        clientId,
        setClientId,
        sectorId,
        setSectorId,
        equipmentId,
        setEquipmentId,
        account,
        setAccount: saveAccount,
        isAuthenticated,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};