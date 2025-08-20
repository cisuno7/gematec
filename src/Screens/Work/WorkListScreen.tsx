import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../Routers/AppRouter";
import WorkService from "../../Services/WorkService";
import { WorkListItem } from "../../Models/Work";
import { usePermissions } from "../../Context/PermissionsContext";
import { useLanguage } from "../../Context/LanguageContext";

interface WorkListScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "WorkListScreen">;
    route: RouteProp<RootStackParamList, "WorkListScreen">;
}

const WorkListScreen: React.FC<WorkListScreenProps> = ({ route, navigation }) => {
    const { activityId, activityName } = route.params;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<WorkListItem[]>([]);
    const { hasPermission, isLoading: isPermLoading } = usePermissions();
    const { t } = useLanguage();

    const canListAll = hasPermission("list_activityworks");
    const canListMe = hasPermission("list_me_activityworks");
    const canList = canListAll || canListMe;
    const canView = hasPermission("view_activitywork") || canListMe;
    const canCreate = hasPermission("add_activitywork");
    const canEdit = hasPermission("change_activitywork");
    const canDelete = hasPermission("delete_activitywork");
    const canApprove = hasPermission("approve_activitywork") || hasPermission("approval_activity");

    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");
            const response = await WorkService.list(activityId, token);
            setItems(response.results || []);
        } catch (e: any) {
            setError(e.message || "Falha ao carregar registros de trabalho");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isPermLoading && canList) {
            load();
        }
    }, [isPermLoading, canList]);

    // Recarregar ao voltar do fluxo de aprovação/edição/criação
    useFocusEffect(
        React.useCallback(() => {
            if (!isPermLoading && canList) {
                load();
            }
        }, [isPermLoading, canList])
    );

    const onDelete = async (work: WorkListItem) => {
        Alert.alert(
            "Excluir registro",
            "Confirma a exclusão deste registro de trabalho?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("access_token");
                            if (!token) throw new Error("Token não encontrado");
                            await WorkService.delete(activityId, work.id, { name: work.name }, token);
                            await load();
                        } catch (err: any) {
                            Alert.alert("Erro", err.message || "Falha ao excluir registro");
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: WorkListItem }) => {
        const canDeleteThis = canDelete && item.signed_at == null;
        const canApproveThis = canApprove && item.signed_at == null;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <View style={[styles.badge, { backgroundColor: item.signed_at ? "#e6ffed" : "#fff8e1" }]}>
                        <Text style={[styles.badgeText, { color: item.signed_at ? "#2e7d32" : "#ff8f00" }]}>
                            {item.signed_at ? t('work.assigned') : t('work.pending')}
                        </Text>
                    </View>
                </View>
                <View style={styles.infoRow}>
                    <MaterialIcons name="person" size={16} color="#666" />
                    <Text style={styles.infoText}>{item.opened_by?.name} • {item.opened_by?.email}</Text>
                </View>
                <View style={styles.infoRow}>
                    <MaterialIcons name="event" size={16} color="#666" />
                    <Text style={styles.infoText}>{t('work.openedAt')}: {item.opened_at}</Text>
                </View>
                <View style={styles.actions}>
                    {canView && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("WorkDetailScreen", { activityId, workId: item.id })}>
                            <Ionicons name="eye" size={16} color="#007BFF" />
                            <Text style={styles.actionText}>{t('work.view')}</Text>
                        </TouchableOpacity>
                    )}
                    {canEdit && (
                        <TouchableOpacity style={[styles.actionButton, item.signed_at && styles.actionButtonDisabled]} disabled={!!item.signed_at} onPress={() => navigation.navigate("WorkEditScreen", { activityId, workId: item.id })}>
                            <MaterialIcons name="edit" size={16} color="#007BFF" />
                            <Text style={styles.actionText}>{t('work.edit')}</Text>
                        </TouchableOpacity>
                    )}
                    {canApprove && (
                        <TouchableOpacity
                            style={[styles.actionButton, (!canApproveThis || !!item.signed_at) && styles.actionButtonDisabled]}
                            disabled={!canApproveThis || !!item.signed_at}
                            onPress={() => navigation.navigate("WorkApproveScreen", { activityId, workId: item.id })}
                        >
                            <MaterialIcons name="check" size={16} color={canApproveThis && !item.signed_at ? "#007BFF" : "#999"} />
                            <Text style={[styles.actionText, (!canApproveThis || !!item.signed_at) && styles.actionTextDisabled]}>{t('work.approve')}</Text>
                        </TouchableOpacity>
                    )}
                    {canDelete && (
                        <TouchableOpacity
                            style={[styles.actionButton, (!canDeleteThis || !!item.signed_at) && styles.actionButtonDisabled]}
                            disabled={!canDeleteThis || !!item.signed_at}
                            onPress={() => onDelete(item)}
                        >
                            <MaterialIcons name="delete" size={16} color={canDeleteThis && !item.signed_at ? "#d32f2f" : "#999"} />
                            <Text style={[styles.actionText, { color: canDeleteThis && !item.signed_at ? "#d32f2f" : "#999" }]}>{t('work.delete')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{t('work.title')}</Text>
                    <Text style={styles.headerSubtitle}>{activityName ? `${t('work.activityPrefix')}${activityName}` : ""}</Text>
                </View>
                {canCreate && (
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => navigation.navigate("ActivityEquipmentListScreen", { activityId, activityName: activityName ?? "" })}
                    >
                        <MaterialIcons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>

            {isPermLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007BFF" />
                    <Text style={styles.loadingText}>{t('work.loadingPermissions')}</Text>
                </View>
            ) : !canList ? (
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={48} color="#dc3545" />
                    <Text style={styles.errorText}>{t('work.noPermissionList')}</Text>
                </View>
            ) : loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007BFF" />
                    <Text style={styles.loadingText}>{t('common.loading')}</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={48} color="#dc3545" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={load}>
                        <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => `${item.id}`}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="assignment" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>{t('work.noWorksFound')}</Text>
                        </View>
                    )}
                />
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
    headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.8)" },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 12,
    },
    loadingContainer: { alignItems: "center", padding: 40 },
    loadingText: { marginTop: 8, color: "#666" },
    errorContainer: { alignItems: "center", padding: 40 },
    errorText: { marginTop: 12, color: "#dc3545" },
    retryButton: { backgroundColor: "#007BFF", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, marginTop: 12 },
    retryButtonText: { color: "#fff" },
    emptyContainer: { alignItems: "center", padding: 40 },
    emptyText: { marginTop: 8, color: "#666" },
    card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 12, fontWeight: "600" },
    infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    infoText: { marginLeft: 6, color: "#333" },
    actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, flexWrap: "wrap" },
    actionButton: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
    actionButtonDisabled: { opacity: 0.6 },
    actionText: { marginLeft: 6, color: "#007BFF", fontWeight: "600" },
    actionTextDisabled: { color: "#999" },
});

export default WorkListScreen;


