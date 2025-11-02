// file: src/Context/UserContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import AuthService from "../Services/AuthService";
import { jwtDecode } from "jwt-decode";
import { useLanguage } from "./LanguageContext";
import { usePermissions } from "./PermissionsContext";
import PermissionsService from "../Services/PermissionsService";

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
  updateUserData: (data: { name?: string }) => void;
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
  const { loadUserPreferences } = useLanguage();
  console.log("[UserContext] Obtendo loadPermissions do contexto...");
  const { loadPermissions } = usePermissions();
  console.log("[UserContext] loadPermissions obtido:", typeof loadPermissions);

  const isTokenExpired = (token: string): boolean => {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      console.error("[UserContext] Erro ao decodificar token:", error);
      return true;
    }
  };

  useEffect(() => {
    const loadPersistedData = async () => {
      console.log("[UserContext] Calling loadPersistedData...");
      try {
        const storedClientId = await AsyncStorage.getItem("selectedClientId");
        const storedSectorId = await AsyncStorage.getItem("selectedSectorId");
        const storedEquipmentId = await AsyncStorage.getItem("selectedEquipmentId");
        const storedAccount = await AsyncStorage.getItem("account");
        const accessToken = await AsyncStorage.getItem("access_token");
        const refreshToken = await AsyncStorage.getItem("refresh_token");
        const keepLoggedIn = await AsyncStorage.getItem("keep_logged_in");

        if (storedClientId) setClientId(parseInt(storedClientId));
        if (storedSectorId) setSectorId(parseInt(storedSectorId));
        if (storedEquipmentId) setEquipmentId(parseInt(storedEquipmentId));
        if (storedAccount) setAccount(storedAccount);

        if (accessToken && refreshToken && storedAccount) {
          if (isTokenExpired(accessToken)) {
            console.log("[UserContext] Access token expirado. Tentando renovar...");
            try {
              const newAccessToken = await AuthService.refreshAccessToken(refreshToken);
              await AsyncStorage.setItem("access_token", newAccessToken);
              console.log("[UserContext] Token renovado com sucesso.");
              setIsAuthenticated(true);

              // Extrair username do novo token
              const decoded: any = jwtDecode(newAccessToken);
              setUsername(decoded.user_name || "");

              await loadUserPreferences(newAccessToken); // Carrega preferências após renovar
              console.log("[UserContext] Chamando loadPermissions após renovar token...");
              await loadPermissions(newAccessToken); // Carrega permissões após renovar
            } catch (error) {
              console.error("[UserContext] Falha ao renovar token:", error);
              await AsyncStorage.multiRemove(["access_token", "refresh_token", "account", "keep_logged_in"]);
              setIsAuthenticated(false);
            }
          } else {
            console.log("[UserContext] Usuário logado encontrado.");
            setIsAuthenticated(true);

            // Extrair username do token válido
            const decoded: any = jwtDecode(accessToken);
            console.log("[UserContext] Token decodificado:", decoded);
            console.log("[UserContext] user_name do token:", decoded.user_name);
            setUsername(decoded.user_name || "");

            await loadUserPreferences(accessToken); // Carrega preferências se o token for válido
            console.log("[UserContext] Chamando loadPermissions com token válido...");
            await loadPermissions(accessToken); // Carrega permissões se o token for válido
          }
        } else {
          console.log("[UserContext] Nenhum usuário logado encontrado. Limpando dados.");
          await AsyncStorage.multiRemove(["access_token", "refresh_token", "account", "keep_logged_in"]);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("[UserContext] Failed to load persisted data:", error);
        setIsAuthenticated(false);
      } finally {
        console.log("[UserContext] loadPersistedData finished. Setting isLoading to false.");
        setIsLoading(false);
      }
    };

    loadPersistedData();
  }, []);

  const login = async (accessToken: string, refreshToken: string, accountName: string, keepLoggedIn: boolean) => {
    console.log("[UserContext] === INÍCIO login ===");
    if (!accessToken || typeof accessToken !== "string" || !refreshToken || typeof refreshToken !== "string") {
      const errorMessage = `[UserContext] Tentativa de login com tokens inválidos. accessToken: ${accessToken}, refreshToken: ${refreshToken}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    try {
      await AsyncStorage.multiSet([
        ["access_token", accessToken],
        ["refresh_token", refreshToken],
        ["account", accountName],
        ["keep_logged_in", String(keepLoggedIn)],
      ]);

      setAccount(accountName);
      setIsAuthenticated(true);

      const decoded: any = jwtDecode(accessToken);
      console.log("[UserContext] Login - Token decodificado:", decoded);
      console.log("[UserContext] Login - user_name do token:", decoded.user_name);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔍 DEBUG TOKEN JWT - CAMPOS COMPLETOS:");
      console.log("📋 Token completo:", JSON.stringify(decoded, null, 2));
      console.log("📦 Account informado pelo usuário:", accountName);
      console.log("🔑 Campos do token que podem conter account:");
      console.log("   - decoded.account:", decoded.account);
      console.log("   - decoded.tenant:", decoded.tenant);
      console.log("   - decoded.schema:", decoded.schema);
      console.log("   - decoded.aud:", decoded.aud);
      console.log("   - decoded.iss:", decoded.iss);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      setUsername(decoded.user_name || "");
      // Não precisamos mais salvar permissões do token aqui, pois virão do /me/permissions
      // await AsyncStorage.setItem("permissions", decoded.permissions?.join(",") || "");

      await loadUserPreferences(accessToken); // Carrega preferências após o login bem-sucedido
      console.log("[UserContext] Chamando loadPermissions após login...");
      try {
        console.log("[UserContext] Executando loadPermissions...");
        await loadPermissions(accessToken); // Carrega permissões após o login bem-sucedido
        console.log("[UserContext] loadPermissions executado com sucesso");
      } catch (error) {
        console.error("[UserContext] Erro ao executar loadPermissions:", error);
      }

      console.log("[UserContext] Login realizado com sucesso:", {
        account: accountName,
        keepLoggedIn,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      });
      console.log("[UserContext] === FIM login ===");
    } catch (error) {
      console.error("[UserContext] Erro ao salvar dados de login:", error);
      console.log("[UserContext] === FIM login com erro ===");
      throw error;
    }
  };

  const logout = async () => {
    console.log("[UserContext] === INÍCIO LOGOUT ===");
    try {
      const refreshToken = await AsyncStorage.getItem("refresh_token");
      const currentAccount = await AsyncStorage.getItem("account");

      console.log("[UserContext] Dados para logout:", {
        hasRefreshToken: !!refreshToken,
        account: currentAccount,
        refreshTokenLength: refreshToken?.length || 0
      });

      if (refreshToken && currentAccount) {
        try {
          console.log("[UserContext] Tentando revogar token...");
          await AuthService.revoke(refreshToken, currentAccount);
          console.log("[UserContext] Token revogado com sucesso no logout");
        } catch (revokeError) {
          console.error("[UserContext] Erro ao revogar token no logout:", revokeError);
          // Continua o logout mesmo se a revogação falhar
        }
      } else {
        console.log("[UserContext] Não há refresh token ou account para revogar");
      }

      console.log("[UserContext] Limpando permissões do storage...");
      await PermissionsService.clearPermissionsFromStorage();

      console.log("[UserContext] Removendo dados do AsyncStorage...");
      await AsyncStorage.multiRemove([
        "access_token",
        "refresh_token",
        "account",
        "keep_logged_in",
        "user_permissions",
        "selectedClientId",
        "selectedSectorId",
        "selectedEquipmentId",
        "username", // Adicionando username também
      ]);

      console.log("[UserContext] Limpando estado da aplicação...");
      setIsAuthenticated(false);
      setUsername("");
      setClientId(null);
      setSectorId(null);
      setEquipmentId(null);
      setAccount(null);

      console.log("[UserContext] === LOGOUT REALIZADO COM SUCESSO ===");
    } catch (error) {
      console.error("[UserContext] Erro durante logout:", error);
      // Garante que o usuário seja deslogado mesmo se houver erro
      setIsAuthenticated(false);
      setAccount(null);
      setUsername("");
      setClientId(null);
      setSectorId(null);
      setEquipmentId(null);
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

  const updateUserData = (data: { name?: string }) => {
    if (data.name) {
      setUsername(data.name);
      AsyncStorage.setItem("username", data.name);
    }
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
        updateUserData,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
