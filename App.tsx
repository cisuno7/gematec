import 'react-native-gesture-handler';
import React from "react";
import { NavigationContainer } from '@react-navigation/native';
import AppRouter from "./src/Routers/AppRouter";
import { PermissionProvider } from "./src/Context/PermissionsContext";
import { UserProvider } from "./src/Context/UserContext";
import { LanguageProvider } from "./src/Context/LanguageContext";

const App = () => {
    return (
        <LanguageProvider>
            <PermissionProvider>
                <UserProvider>
                    <NavigationContainer>
                        <AppRouter />
                    </NavigationContainer>
                </UserProvider>
            </PermissionProvider>
        </LanguageProvider>
    );
};

export default App;