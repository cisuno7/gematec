import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../Routers/AppRouter";
import { API_BASE_URL } from "../../config/apiConfig";
import * as FileSystem from "expo-file-system";
import WorkService from "../../Services/WorkService";
import { WorkDetail } from "../../Models/Work";
import { usePermissions } from "../../Context/PermissionsContext";
import { useLanguage } from "../../Context/LanguageContext";

interface WorkDetailScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "WorkDetailScreen">;
    route: RouteProp<RootStackParamList, "WorkDetailScreen">;
}

const WorkDetailScreen: React.FC<WorkDetailScreenProps> = ({ route, navigation }) => {
    const { activityId, workId } = route.params;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [work, setWork] = useState<WorkDetail | null>(null);
    const { hasPermission, isLoading: isPermLoading } = usePermissions();
    const canView = hasPermission("view_activitywork") || hasPermission("list_me_activityworks");
    const { t } = useLanguage();

    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");
            const response = await WorkService.retrieve(activityId, workId, token);
            setWork(response);
        } catch (e: any) {
            setError(e.message || "Falha ao carregar registro de trabalho");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            load();
        }, [])
    );

    const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

    const resolveSignatureUri = (w: WorkDetail | null): string | null => {
        if (!w) return null;
        const anyWork: any = w as any;
        let raw: any = (w as any).signature;
        if (raw == null) raw = anyWork.signature_url || anyWork.signatureUri || anyWork.signature_image || anyWork.signatureData || anyWork.signature_base64 || anyWork.signature_path || anyWork.signature_file || anyWork.signatureLink || anyWork.signature_link;
        // Procura por qualquer campo string contendo 'signature' se ainda não achou
        if (!raw) {
            for (const [k, v] of Object.entries(anyWork)) {
                if (typeof v === 'string' && k.toLowerCase().includes('signature') && v.length > 10) {
                    raw = v;
                    break;
                }
            }
        }
        // Caso assinatura venha como objeto { url: string }
        if (raw && typeof raw === 'object' && (raw as any).url) {
            raw = (raw as any).url;
        }
        if (!raw || typeof raw !== 'string') return null;
        const trimmed = raw.trim();
        if (trimmed.startsWith('data:image')) {
            return trimmed;
        }
        // Heurística: base64 JPEG comum começa com /9j/
        if (/^\s*\/9j\//.test(trimmed)) {
            return `data:image/jpeg;base64,${trimmed}`;
        }
        // Heurística: base64 PNG comum começa com iVBOR
        if (/^\s*iVBOR/.test(trimmed)) {
            return `data:image/png;base64,${trimmed}`;
        }
        if (/^https?:\/\//i.test(trimmed)) {
            return trimmed;
        }
        if (trimmed.startsWith('/')) {
            // Se o caminho não parece uma rota de API, usar a origem sem /api
            const isApiPath = /^\/(api|v1|v2)\//.test(trimmed);
            const base = isApiPath ? API_BASE_URL : API_ORIGIN;
            return `${base}${trimmed}`;
        }
        // Assume base64 sem prefixo
        return `data:image/png;base64,${trimmed}`;
    };

    const [signatureDisplayUri, setSignatureDisplayUri] = useState<string | null>(null);
    const signatureUri = resolveSignatureUri(work);

    useEffect(() => {
        let isCancelled = false;
        const prepare = async () => {
            if (!signatureUri) {
                setSignatureDisplayUri(null);
                return;
            }
            if (/^https?:\/\//i.test(signatureUri)) {
                // Só usa download com Authorization se for o mesmo host da API
                const apiHostMatch = API_ORIGIN.match(/^https?:\/\/([^/]+)/i);
                const apiHost = apiHostMatch ? apiHostMatch[1] : null;
                const sigHostMatch = signatureUri.match(/^https?:\/\/([^/]+)/i);
                const sigHost = sigHostMatch ? sigHostMatch[1] : null;

                if (apiHost && sigHost && sigHost.toLowerCase() === apiHost.toLowerCase()) {
                    try {
                        const token = await AsyncStorage.getItem("access_token");
                        const cachePath = `${FileSystem.cacheDirectory}work_signature_${activityId}_${workId}.png`;
                        await FileSystem.downloadAsync(signatureUri, cachePath, {
                            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                        } as any);
                        if (!isCancelled) setSignatureDisplayUri(cachePath);
                    } catch (err) {
                        if (!isCancelled) setSignatureDisplayUri(signatureUri);
                    }
                } else {
                    // URL externa (ex.: S3) → usa direto sem Authorization
                    setSignatureDisplayUri(signatureUri);
                }
            } else {
                setSignatureDisplayUri(signatureUri);
            }
        };
        prepare();
        return () => { isCancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signatureUri]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{work?.name || t('work.detail.title')}</Text>
                </View>
            </View>

            {isPermLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007BFF" />
                    <Text style={styles.loadingText}>{t('work.loadingPermissions')}</Text>
                </View>
            ) : !canView ? (
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={48} color="#dc3545" />
                    <Text style={styles.errorText}>{t('work.noPermissionView')}</Text>
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
                </View>
            ) : work ? (
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        <Text style={styles.title}>{t('work.generalData')}</Text>
                        <Text>{t('work.fields.name')}: {work.name}</Text>
                        <Text>{t('work.openedAt')}: {work.opened_at}</Text>
                        <Text>{t('work.signedAt')}: {work.signed_at || "—"}</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.title}>{t('work.activity')}</Text>
                        <Text>{t('work.fields.name')}: {work.activity.name}</Text>
                        <Text>{t('work.client')}: {work.activity.client?.name}</Text>
                        <Text>{t('work.status')}: {work.activity.status}</Text>
                        <Text>{t('work.startDate')}: {work.activity.start_date}</Text>
                        <Text>{t('work.endDate')}: {work.activity.end_date}</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.title}>{t('work.equipmentVersions')}</Text>
                        {work.activity_equipment_versions.map((v) => (
                            <View key={v.id} style={styles.versionItem}>
                                <Text style={styles.versionTitle}>#{v.id} • {v.equipment.tag}</Text>
                                <Text>{t('work.type')}: {v.equipment.equipment_type?.name}</Text>
                                <Text>{t('work.brand')}: {v.equipment.brand?.name}</Text>
                                <Text>{t('work.sector')}: {v.equipment.sector?.complete_name}</Text>
                                <Text>{t('work.status')}: {v.status}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Seção de Assinatura */}
                    <View style={styles.card}>
                        <Text style={styles.title}>{t('work.signature')}</Text>
                        {signatureDisplayUri ? (
                            <View style={{ marginTop: 12 }}>
                                <View style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: '#eee', borderRadius: 8, overflow: 'hidden' }}>
                                    <Image
                                        source={{ uri: signatureDisplayUri }}
                                        style={{ width: '100%', height: 180, backgroundColor: '#fff' }}
                                        resizeMode="contain"
                                    />
                                </View>
                                {work.signed_at && (
                                    <Text style={styles.signatureMeta}>{t('work.signedAt')}: {work.signed_at}</Text>
                                )}
                                {(work as any).signed_by && (
                                    <Text style={styles.signatureMeta}>{t('work.signedBy')}: {(work as any).signed_by.name} • {(work as any).signed_by.email}</Text>
                                )}
                                {(work as any).approved_by && (
                                    <Text style={styles.signatureMeta}>{t('work.approvedBy')}: {(work as any).approved_by.name} • {(work as any).approved_by.email}</Text>
                                )}
                            </View>
                        ) : (
                            <View style={styles.signaturePlaceholder}>
                                <Text style={{ color: '#999' }}>{t('work.signature.missing')}</Text>
                            </View>
                        )}

                        {!work.signed_at && (
                            <TouchableOpacity
                                style={{ backgroundColor: '#007BFF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 }}
                                onPress={() => navigation.navigate('WorkApproveScreen', { activityId, workId })}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>{t('work.approve') || 'Assinar'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8f9fa" },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 24, flexGrow: 1 },
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
    loadingContainer: { alignItems: "center", padding: 40 },
    loadingText: { marginTop: 8, color: "#666" },
    errorContainer: { alignItems: "center", padding: 40 },
    errorText: { marginTop: 12, color: "#dc3545" },
    card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
    title: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
    versionItem: { marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#eee", paddingTop: 8 },
    versionTitle: { fontWeight: "600", marginBottom: 4 },
    signaturePlaceholder: { height: 180, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', borderWidth: StyleSheet.hairlineWidth, borderColor: '#eee', borderRadius: 8, marginTop: 12 },
    signatureMeta: { marginTop: 8, color: '#666' },
});

export default WorkDetailScreen;


