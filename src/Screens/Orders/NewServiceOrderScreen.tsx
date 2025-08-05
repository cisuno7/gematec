import React from "react";
import { View, Text, ActivityIndicator, Alert, StyleSheet, TouchableOpacity } from "react-native";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { usePermissions } from "../../Context/PermissionsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../../Context/ApiClient";
import { buildApiUrlForAccount } from "../../config/apiConfig";
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface NewServiceOrderScreenProps {
    route: RouteProp<RootStackParamList, "NewServiceOrderScreen">;
    navigation: DrawerNavigationProp<RootStackParamList, "NewServiceOrderScreen">;
}

const NewServiceOrderScreen: React.FC<NewServiceOrderScreenProps> = ({ route, navigation }) => {
    const [loading, setLoading] = React.useState(false);
    const { equipmentId } = route.params;
    const { hasPermission } = usePermissions();

    const createServiceOrder = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado");

            const apiUrl = await buildApiUrlForAccount();
            const response = await apiClient.post(`${apiUrl}/service_orders`, {
                equipment_id: equipmentId,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            Alert.alert(
                "Sucesso",
                "Ordem de Serviço criada com sucesso!",
                [
                    {
                        text: "Ver Detalhes",
                        onPress: () => navigation.navigate("ViewOrderActivityScreen", {
                            serviceOrderId: Number(response.data.id),
                            equipmentId,
                        })
                    },
                    {
                        text: "Voltar",
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        } catch (error: any) {
            Alert.alert("Erro", error.message || "Erro ao criar Ordem de Serviço");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Nova Ordem de Serviço</Text>
                    <Text style={styles.headerSubtitle}>Criar ordem para equipamento #{equipmentId}</Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.infoCard}>
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.cardHeader}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <MaterialIcons name="assignment" size={24} color="#fff" />
                        <Text style={styles.cardTitle}>Criar Ordem de Serviço</Text>
                    </LinearGradient>

                    <View style={styles.cardContent}>
                        <View style={styles.infoRow}>
                            <Ionicons name="information-circle" size={20} color="#667eea" />
                            <Text style={styles.infoText}>
                                Uma nova ordem de serviço será criada para este equipamento.
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                            <Text style={styles.infoText}>
                                Você será redirecionado para preencher o questionário.
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="time" size={20} color="#f39c12" />
                            <Text style={styles.infoText}>
                                A ordem ficará com status "Pendente" até ser finalizada.
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={[styles.createButton, loading && styles.createButtonDisabled]}
                        onPress={createServiceOrder}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <MaterialIcons name="add" size={24} color="#fff" />
                                <Text style={styles.createButtonText}>Criar Ordem de Serviço</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="close" size={20} color="#6c757d" />
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        backgroundColor: '#667eea',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 12,
    },
    cardContent: {
        padding: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    infoText: {
        fontSize: 14,
        color: '#2c3e50',
        marginLeft: 12,
        flex: 1,
        lineHeight: 20,
    },
    actionContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingBottom: 20,
    },
    createButton: {
        backgroundColor: '#667eea',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    createButtonDisabled: {
        backgroundColor: '#adb5bd',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e9ecef',
        backgroundColor: '#fff',
    },
    cancelButtonText: {
        color: '#6c757d',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
});

export default NewServiceOrderScreen;
