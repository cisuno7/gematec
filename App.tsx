// src/App.tsx
import 'react-native-gesture-handler';
import React, { useRef, useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import AppRouter from './src/Routers/AppRouter';
import { PermissionProvider } from './src/Context/PermissionsContext';
import { UserProvider } from './src/Context/UserContext';
import { LanguageProvider } from './src/Context/LanguageContext';
import { NavigationProvider } from './src/Context/NavigationContext';
import { RootStackParamList } from './src/Routers/AppRouter';
import { useSyncManager } from './src/hooks/useSyncManager';

const App = () => {
    const navigationRef = useNavigationContainerRef<RootStackParamList>();

    // Configurar notificações
    useEffect(() => {
        const configureNotifications = async () => {
            // Configurar comportamento das notificações
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
            });

            // Solicitar permissões
            const { status } = await Notifications.requestPermissionsAsync();
            console.log('[App] Status das permissões de notificação:', status);
        };

        configureNotifications();
    }, []);

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