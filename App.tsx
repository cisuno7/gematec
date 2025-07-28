import 'react-native-gesture-handler';
import React, { useEffect, useState } from "react";
import { NavigationContainer } from '@react-navigation/native';
import AppRouter from "./src/Routers/AppRouter";
import { PermissionProvider } from "./src/Context/PermissionsContext";
import { UserProvider } from "./src/Context/UserContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const App = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuthentication = async () => {
            try {
                const keepLoggedIn = await AsyncStorage.getItem('keep_logged_in');
                const accessToken = await AsyncStorage.getItem('access_token');
                const refreshToken = await AsyncStorage.getItem('refresh_token');
                const account = await AsyncStorage.getItem('account');

                console.log('[App] Verificando autenticação:', {
                    keepLoggedIn,
                    hasAccessToken: !!accessToken,
                    hasRefreshToken: !!refreshToken,
                    hasAccount: !!account,
                });

                if (keepLoggedIn === 'true' && accessToken && refreshToken && account) {
                    console.log('[App] Usuário mantido logado');
                    setIsAuthenticated(true);
                } else {
                    console.log('[App] Condições para manter logado não atendidas, limpando dados');
                    // Limpar tokens se as condições não forem atendidas
                    await AsyncStorage.removeItem('access_token');
                    await AsyncStorage.removeItem('refresh_token');
                    await AsyncStorage.removeItem('account');
                    await AsyncStorage.removeItem('keep_logged_in');
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Erro ao verificar a autenticação:', error);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthentication();
    }, []);

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <PermissionProvider>
            <UserProvider>
                <NavigationContainer>
                    <AppRouter isAuthenticated={isAuthenticated} />
                </NavigationContainer>
            </UserProvider>
        </PermissionProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default App;