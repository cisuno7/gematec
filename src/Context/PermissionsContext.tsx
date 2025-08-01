// file: src/Context/PermissionsContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from "@react-native-async-storage/async-storage";
import PermissionsService from "../Services/PermissionsService";

interface PermissionContextType {
  permissions: string[];
  setPermissions: (permissions: string[]) => void;
  hasPermission: (permission: string) => boolean;
  loadPermissions: (accessToken: string) => Promise<void>;
  isLoading: boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: [],
  setPermissions: () => { },
  hasPermission: () => false,
  loadPermissions: async () => { },
  isLoading: false,
});

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Carregar permissões do storage local na inicialização
  useEffect(() => {
    console.log("[PermissionProvider] === INÍCIO useEffect ===");
    const loadStoredPermissions = async () => {
      try {
        console.log("[PermissionProvider] Inicializando - carregando permissões do storage local...");
        const storedPermissions = await PermissionsService.loadPermissionsFromStorage();
        console.log("[PermissionProvider] Permissões encontradas no storage:", storedPermissions);

        if (storedPermissions.length > 0) {
          setPermissions(storedPermissions);
          console.log("[PermissionProvider] Permissões carregadas do storage local:", storedPermissions.length, "permissões");
        } else {
          console.log("[PermissionProvider] Nenhuma permissão encontrada no storage local");
        }
      } catch (error) {
        console.error("[PermissionProvider] Erro ao carregar permissões do storage:", error);
      }
    };

    loadStoredPermissions();
    console.log("[PermissionProvider] === FIM useEffect ===");
  }, []);

  const loadPermissions = async (accessToken: string) => {
    console.log("[PermissionProvider] === INÍCIO loadPermissions ===");
    console.log("[PermissionProvider] Token recebido:", accessToken ? "Presente" : "Ausente");

    try {
      setIsLoading(true);
      console.log("[PermissionProvider] Carregando permissões do backend...");

      const fetchedPermissions = await PermissionsService.fetchPermissions(accessToken);
      console.log("[PermissionProvider] Definindo permissões no estado:", fetchedPermissions.length, "permissões");
      setPermissions(fetchedPermissions);

      console.log("[PermissionProvider] Permissões carregadas com sucesso:", fetchedPermissions);
    } catch (error: any) {
      console.error("[PermissionProvider] Erro ao carregar permissões:", error);

      // Se falhar ao carregar do backend, tenta carregar do storage local
      try {
        const storedPermissions = await PermissionsService.loadPermissionsFromStorage();
        if (storedPermissions.length > 0) {
          setPermissions(storedPermissions);
          console.log("[PermissionProvider] Usando permissões do storage local como fallback");
        }
      } catch (storageError) {
        console.error("[PermissionProvider] Erro ao carregar permissões do storage como fallback:", storageError);
      }
    } finally {
      setIsLoading(false);
      console.log("[PermissionProvider] === FIM loadPermissions ===");
    }
  };

  const savePermissions = async (newPermissions: string[]) => {
    try {
      await PermissionsService.savePermissionsToStorage(newPermissions);
      setPermissions(newPermissions);
    } catch (error) {
      console.error("[PermissionProvider] Erro ao salvar permissões:", error);
      // Mesmo com erro no storage, atualiza o estado local
      setPermissions(newPermissions);
    }
  };

  const hasPermission = (permission: string): boolean => {
    console.log("[PermissionProvider] Verificando permissão:", permission);
    console.log("[PermissionProvider] Permissões atuais:", permissions);

    if (!Array.isArray(permissions) || permissions === undefined) {
      console.error("[PermissionProvider] Permissões não são um array ou estão indefinidas:", permissions);
      return false;
    }

    const hasPermission = permissions.includes(permission);
    console.log("[PermissionProvider] Resultado da verificação:", hasPermission);
    return hasPermission;
  };

  return (
    <PermissionContext.Provider value={{
      permissions,
      setPermissions: savePermissions,
      hasPermission,
      loadPermissions,
      isLoading
    }}>
      {children}
    </PermissionContext.Provider>
  );
};

export default PermissionContext;
