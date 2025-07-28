import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../Routers/AppRouter";
import AuthService from "../Services/AuthService";
import { useUser } from "../Context/UserContext";
import { usePermissions } from "../Context/PermissionsContext";
import { useLanguage } from "../Context/LanguageContext";
import { decodeToken } from "../Services/PermissionsService";

interface AccountSelectionScreenProps {
    route: RouteProp<RootStackParamList, "AccountSelectionScreen">;
    navigation: DrawerNavigationProp<RootStackParamList, "AccountSelectionScreen">;
}

interface Account {
    id: number;
    name: string;
}

const AccountSelectionScreen: React.FC<AccountSelectionScreenProps> = ({ navigation }) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState("");
    const [loading, setLoading] = useState(true);
    const { setAccountId, setUsername } = useUser();
    const { setPermissions } = usePermissions();
    const { loadUserPreferences } = useLanguage();

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                setLoading(true);
                const slidingToken = await AsyncStorage.getItem("sliding_token");
                if (!slidingToken) {
                    Alert.alert("Erro", "Token de autenticação não encontrado. Faça login novamente.");
                    navigation.navigate("LoginScreen");
                    return;
                }

                const response = await AuthService.getAccounts(slidingToken);
                setAccounts(response.accounts || []);
            } catch (error: any) {
                Alert.alert("Erro", error.message || "Não foi possível carregar as contas.");
                navigation.navigate("LoginScreen");
            } finally {
                setLoading(false);
            }
        };

        fetchAccounts();
    }, [navigation]);

    const handleSelectAccount = async () => {
        if (!selectedAccount) {
            Alert.alert("Erro", "Por favor, selecione uma conta.");
            return;
        }

        try {
            setLoading(true);
            const slidingToken = await AsyncStorage.getItem("sliding_token");
            if (!slidingToken) {
                Alert.alert("Erro", "Token de autenticação não encontrado. Faça login novamente.");
                navigation.navigate("LoginScreen");
                return;
            }

            const response = await AuthService.switchAccount(slidingToken, parseInt(selectedAccount));
            await AsyncStorage.setItem("access_token", response.access);
            await AsyncStorage.setItem("refresh_token", response.refresh);
            console.log("Access Token para inspeção:", response.access);
            // Recuperar a preferência "Manter-me logado"
            const keepLoggedInString = await AsyncStorage.getItem('keep_logged_in');
            const keepLoggedIn = keepLoggedInString ? JSON.parse(keepLoggedInString) : false;
            // Salvar o refresh_token apenas se "Manter-me logado" estiver marcado
            if (keepLoggedIn) {
                await AsyncStorage.setItem("refresh_token", response.refresh);
            } else {
                // Se não for para manter logado, garantir que o refresh_token não persista
                await AsyncStorage.removeItem("refresh_token");
            }
            // Decodificar o access token para obter permissões
            const decodedToken = decodeToken(response.access);
            const permissions = decodedToken.permissions || [];
            const usernameFromToken = decodedToken.user_name || "Usuário";
            await AsyncStorage.setItem("permissions", JSON.stringify(permissions));
            setPermissions(permissions);
            setUsername(usernameFromToken);
            // Armazenar o accountId no contexto
            setAccountId(parseInt(selectedAccount));

            // Carregar preferências do usuário (incluindo idioma)
            try {
                await loadUserPreferences(response.access);
            } catch (error) {
                console.log('Erro ao carregar preferências do usuário, usando padrão:', error);
            }

            // Redirecionar para a tela inicial
            navigation.navigate("HomeScreen");
        } catch (error: any) {
            Alert.alert("Erro", error.message || "Não foi possível selecionar a conta.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#007BFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Selecione uma Conta</Text>
            <Picker
                selectedValue={selectedAccount}
                onValueChange={(value) => setSelectedAccount(value)}
                style={styles.picker}
            >
                <Picker.Item label="Selecione uma conta" value="" />
                {accounts.map((account) => (
                    <Picker.Item key={account.id} label={account.name} value={account.id.toString()} />
                ))}
            </Picker>
            <TouchableOpacity
                style={[styles.button, !selectedAccount && styles.disabledButton]}
                onPress={handleSelectAccount}
                disabled={!selectedAccount || loading}
            >
                <Text style={styles.buttonText}>Selecionar Conta</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
    },
    picker: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 5,
        marginBottom: 20,
        backgroundColor: '#FFFFFF',
    },
    button: {
        backgroundColor: "#007BFF",
        padding: 15,
        borderRadius: 5,
        alignItems: "center",
    },
    disabledButton: {
        backgroundColor: "#ccc",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default AccountSelectionScreen;