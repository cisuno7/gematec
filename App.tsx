// src/App.tsx
import 'react-native-gesture-handler';
import React, { useRef, useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import AppRouter from './src/Routers/AppRouter';
import { PermissionProvider } from './src/Context/PermissionsContext';
import { UserProvider } from './src/Context/UserContext';
import { LanguageProvider } from './src/Context/LanguageContext';
import { NavigationProvider } from './src/Context/NavigationContext';
import { RootStackParamList } from './src/Routers/AppRouter';
import { useSyncManager } from './src/hooks/useSyncManager';

const App = () => {
    const navigationRef = useNavigationContainerRef<RootStackParamList>();

    // Inicializa o gerenciador de sincronização
    useSyncManager();

    return (
        <LanguageProvider>
            <PermissionProvider>
                <UserProvider>
                    <NavigationContainer ref={navigationRef}>
                        <NavigationProvider navigation={navigationRef}>
                            <AppRouter />
                        </NavigationProvider>
                    </NavigationContainer>
                </UserProvider>
            </PermissionProvider>
        </LanguageProvider>
    );
};

export default App;