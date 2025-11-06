// src/App.tsx
import 'react-native-gesture-handler';
import React, { useRef, useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import AppRouter from './src/Routers/AppRouter';
import { PermissionProvider } from './src/Context/PermissionsContext';
import { UserProvider } from './src/Context/UserContext';
import { LanguageProvider } from './src/Context/LanguageContext';
import { NavigationProvider } from './src/Context/NavigationContext';
import { ThemeProvider } from './src/Context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/Routers/AppRouter';
import { useSyncManager } from './src/hooks/useSyncManager';

const App = () => {
    const navigationRef = useNavigationContainerRef<RootStackParamList>();

    // Carregar fontes dos ícones
    const [fontsLoaded] = useFonts({
        ...MaterialIcons.font,
        ...Ionicons.font,
        ...FontAwesome.font,
    });

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

    // Aguardar carregamento das fontes
    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#667eea" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <ThemeProvider>
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
            </ThemeProvider>
        </SafeAreaProvider>
    );
};

export default App;