import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../Routers/AppRouter";
import WorkService from "../../Services/WorkService";
import { CreateWorkPayload } from "../../Models/Work";
import { usePermissions } from "../../Context/PermissionsContext";
import { useLanguage } from "../../Context/LanguageContext";

interface WorkCreateScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "WorkCreateScreen">;
    route: RouteProp<RootStackParamList, "WorkCreateScreen">;
}

const WorkCreateScreen: React.FC<WorkCreateScreenProps> = ({ route, navigation }) => {
    const { activityId } = route.params;
    const [name, setName] = useState("");
    const [equipmentVersionIds, setEquipmentVersionIds] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const { hasPermission, isLoading: isPermLoading } = usePermissions();
    const canCreate = hasPermission("add_activitywork");
    const { t } = useLanguage();

    const onSubmit = async () => {
        try {
            setSubmitting(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const ids = equipmentVersionIds
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => Number(s))
                .filter((n) => !isNaN(n));

            if (!name || ids.length === 0) {
                Alert.alert("Dados obrigatórios", "Informe o nome e pelo menos um ID de versão de equipamento.");
                return;
            }

            const payload: CreateWorkPayload = { name, activity_equipment_versions_ids: ids };
            await WorkService.create(activityId, payload, token);
            Alert.alert("Sucesso", "Registro criado com sucesso.");
            navigation.goBack();
        } catch (e: any) {
            Alert.alert("Erro", e.message || "Falha ao criar registro");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{t('work.create.title')}</Text>
                </View>
            </View>
            {isPermLoading ? (
                <View style={{ alignItems: "center", padding: 40 }}>
                    <Text style={{ color: "#666" }}>{t('work.loadingPermissions')}</Text>
                </View>
            ) : !canCreate ? (
                <View style={{ alignItems: "center", padding: 40 }}>
                    <Text style={{ color: "#dc3545" }}>{t('work.noPermissionCreate')}</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    <Text style={styles.label}>{t('work.fields.name')}</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder={t('work.placeholder.nameExample')}
                        placeholderTextColor="#999"
                        style={styles.input}
                    />
                    <Text style={styles.label}>{t('work.fields.equipmentVersionIds')}</Text>
                    <TextInput
                        value={equipmentVersionIds}
                        onChangeText={setEquipmentVersionIds}
                        placeholder={t('work.placeholder.equipmentVersionIds')}
                        placeholderTextColor="#999"
                        style={styles.input}
                    />

                    <TouchableOpacity style={[styles.submitButton, submitting && { opacity: 0.7 }]} onPress={onSubmit} disabled={submitting}>
                        <MaterialIcons name="save" size={20} color="#fff" />
                        <Text style={styles.submitText}>{submitting ? t('common.loading') : t('common.save')}</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8f9fa" },
    header: {
        backgroundColor: "#4A90E2",
        paddingTop: 50,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    headerContent: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
    label: { marginTop: 12, marginBottom: 6, color: "#333", fontWeight: "600" },
    input: { backgroundColor: "#fff", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#ddd", color: "#333" },
    submitButton: { marginTop: 16, backgroundColor: "#007BFF", padding: 12, borderRadius: 8, flexDirection: "row", justifyContent: "center", alignItems: "center" },
    submitText: { color: "#fff", marginLeft: 8, fontWeight: "600" },
});

export default WorkCreateScreen;


