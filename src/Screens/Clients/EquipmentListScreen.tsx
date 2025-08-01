import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import { usePermissions } from "../../Context/PermissionsContext";
import { useLanguage } from "../../Context/LanguageContext";

interface EquipmentListScreenProps {
    route: RouteProp<RootStackParamList, "EquipmentListScreen">;
    navigation: DrawerNavigationProp<RootStackParamList>;
}

const EquipmentListScreen: React.FC<EquipmentListScreenProps> = ({ route, navigation }) => {
    const { hasPermission } = usePermissions();
    const { t } = useLanguage();
    const { clientId, sectorId } = route.params;

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // TODO: Implementar busca de equipamentos
        setLoading(false);
    }, [sectorId]);

    if (!hasPermission("equipments.list_equipments")) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Você não tem permissão para visualizar equipamentos.</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.loadingText}>Carregando equipamentos...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Equipamentos do Setor</Text>
                <Text style={styles.infoText}>
                    Esta funcionalidade será implementada em breve.
                </Text>
                <Text style={styles.infoText}>
                    Client ID: {clientId}
                </Text>
                <Text style={styles.infoText}>
                    Sector ID: {sectorId}
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    section: {
        backgroundColor: "#fff",
        margin: 10,
        borderRadius: 10,
        padding: 15,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 15,
    },
    infoText: {
        fontSize: 14,
        color: "#666",
        marginBottom: 10,
        textAlign: "center",
    },
    loadingText: {
        textAlign: "center",
        marginTop: 10,
        color: "#666",
    },
    errorText: {
        fontSize: 16,
        color: "#FF0000",
        textAlign: "center",
        marginTop: 20,
    },
});

export default EquipmentListScreen; 