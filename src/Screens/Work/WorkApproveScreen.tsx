import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, useWindowDimensions, ScrollView } from "react-native";
import SignatureCanvas from "react-native-signature-canvas";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WorkService from "../../Services/WorkService";
import { usePermissions } from "../../Context/PermissionsContext";
import { useLanguage } from "../../Context/LanguageContext";

interface WorkApproveScreenProps {
    navigation: DrawerNavigationProp<RootStackParamList, "WorkApproveScreen">;
    route: RouteProp<RootStackParamList, "WorkApproveScreen">;
}

const WorkApproveScreen: React.FC<WorkApproveScreenProps> = ({ route, navigation }) => {
    const { activityId, workId } = route.params;
    const [submitting, setSubmitting] = useState(false);
    const signatureRef = useRef<any>(null);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const { hasPermission, isLoading: isPermLoading } = usePermissions();
    const canApprove = hasPermission("approve_activitywork") || hasPermission("approval_activity");
    const { t } = useLanguage();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const sideBarWidth = Math.max(120, Math.min(240, Math.floor(width * 0.25)));
    const portraitMinHeight = Math.max(300, Math.floor(height * 0.6));

    const signatureWebStyle = `
      .m-signature-pad { box-shadow: none; border: none; margin: 0; width: 100%; height: 100%; }
      .m-signature-pad--body { border: none; }
      .m-signature-pad--footer { display: none; margin: 0; }
      body, html { width: 100%; height: 100%; margin: 0; padding: 0; }
      canvas { width: 100% !important; height: 100% !important; }
    `;

    const handleOK = async (signature: string) => {
        try {
            setSubmitting(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");
            await WorkService.approve(activityId, workId, { signature }, token);
            Alert.alert("Sucesso", "Registro aprovado com sucesso.");
            navigation.goBack();
        } catch (e: any) {
            Alert.alert("Erro", e.message || "Falha ao aprovar registro");
        } finally {
            setSubmitting(false);
        }
    };

    const handleClear = () => signatureRef.current?.clearSignature();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{t('work.approve.title')}</Text>
                </View>
            </View>

            {isPermLoading ? (
                <View style={{ alignItems: "center", padding: 40 }}>
                    <Text style={{ color: "#666" }}>{t('work.loadingPermissions')}</Text>
                </View>
            ) : !canApprove ? (
                <View style={{ alignItems: "center", padding: 40 }}>
                    <Text style={{ color: "#dc3545" }}>{t('work.noPermissionApprove')}</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} scrollEnabled={scrollEnabled} keyboardShouldPersistTaps="handled">
                    {isLandscape ? (
                        <View style={styles.landscapeRoot}>
                            <View style={styles.signatureBox}>
                                <SignatureCanvas
                                    ref={signatureRef}
                                    onOK={handleOK}
                                    onBegin={() => setScrollEnabled(false)}
                                    onEnd={() => setScrollEnabled(true)}
                                    webStyle={signatureWebStyle}
                                    descriptionText={t('work.approve.description')}
                                />
                            </View>
                            <View style={[styles.sideBar, { width: sideBarWidth }]}>
                                <TouchableOpacity style={[styles.footerButton, submitting && { opacity: 0.7, }]} onPress={() => signatureRef.current?.readSignature()} disabled={submitting}>
                                    <MaterialIcons name="check" size={20} color="#fff" />
                                    <Text style={styles.footerText}>{t('common.confirm')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.footerButtonSecondary} onPress={handleClear}>
                                    <MaterialIcons name="clear" size={20} color="#007BFF" />
                                    <Text style={styles.footerTextSecondary}>{t('common.clear')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <View style={{ flex: 1, minHeight: portraitMinHeight }}>
                                <SignatureCanvas
                                    ref={signatureRef}
                                    onOK={handleOK}
                                    onBegin={() => setScrollEnabled(false)}
                                    onEnd={() => setScrollEnabled(true)}
                                    webStyle={signatureWebStyle}
                                    descriptionText={t('work.approve.description')}
                                />
                            </View>
                            <View style={styles.footer}>
                                <TouchableOpacity style={[styles.footerButton, submitting && { opacity: 0.7 }]} onPress={() => signatureRef.current?.readSignature()} disabled={submitting}>
                                    <MaterialIcons name="check" size={20} color="#fff" />
                                    <Text style={styles.footerText}>{t('common.confirm')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.footerButtonSecondary} onPress={handleClear}>
                                    <MaterialIcons name="clear" size={20} color="#007BFF" />
                                    <Text style={styles.footerTextSecondary}>{t('common.clear')}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
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
    footer: { flexDirection: "row", justifyContent: "space-between", padding: 16, backgroundColor: "#fff", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#eee" },
    footerButton: { backgroundColor: "#007BFF", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, flexDirection: "row", alignItems: "center" },
    footerText: { color: "#fff", marginLeft: 8, fontWeight: "600" },
    footerButtonSecondary: { backgroundColor: "#e8f1ff", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, flexDirection: "row", alignItems: "center" },
    footerTextSecondary: { color: "#007BFF", marginLeft: 8, fontWeight: "600" },
    landscapeRoot: { flex: 1, flexDirection: 'row', padding: 12, gap: 12 },
    signatureBox: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: '#eee', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' },
    sideBar: { width: 160, justifyContent: 'center', gap: 12 },
});

export default WorkApproveScreen;


