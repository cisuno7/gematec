import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from 'expo-router';
import AuthService from "../src/Services/AuthService";
import { useUser } from "../src/Context/UserContext";
import { usePermissions } from "../src/Context/PermissionsContext";
import { decodeToken } from "../src/Services/PermissionsService";

interface Account {
    id: number;
    name: string;
}

export default function AccountSelectionScreen() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState("");
    const [loading, setLoading] = useState(true);
    const { setAccountId } = useUser();
    const { setPermissions } = usePermissions();

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                setLoading(true);
                const slidingToken = await AsyncStorage.getItem("sliding_token");
                if (!slidingToken) {
                    Alert.alert("Erro", "Token de autenticação não encontrado. Faça login novamente.");
                    router.push('/login');
                    return;
                }

                const response = await AuthService.getAccounts(slidingToken);
                setAccounts(response.accounts || []);
            } catch (error: any) {
                Alert.alert("Erro", error.message || "Não foi possível carregar as contas.");
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };

        fetchAccounts();
    }, []);

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
                router.push('/login');
                return;
            }

            const response = await AuthService.switchAccount(slidingToken, parseInt(selectedAccount));
            await AsyncStorage.setItem("access_token", response.access);
            await AsyncStorage.setItem("refresh_token", response.refresh);

            const decodedToken: any = jwtDecode(response.access);
            const permissions = decodedToken.permissions || [];
            await AsyncStorage.setItem("permissions", JSON.stringify(permissions));
            setPermissions(permissions);

            setAccountId(parseInt(selectedAccount));

            router.push('/(tabs)');
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
}

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