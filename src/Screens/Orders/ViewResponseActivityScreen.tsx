import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    Alert,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { usePermissions } from "../../Context/PermissionsContext";
import ServiceOrderService from "../../Services/ServiceOrderService";
import { API_BASE_URL } from "../../config/apiConfig";
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ViewResponseActivityScreenProps {
    route: RouteProp<RootStackParamList, "ViewResponseActivityScreen">;
    navigation: DrawerNavigationProp<RootStackParamList, "ViewResponseActivityScreen">;
}

const ViewResponseActivityScreen = ({ route, navigation }: ViewResponseActivityScreenProps) => {
    const { serviceOrderId, equipmentStatus } = route.params;
    const [answers, setAnswers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const { hasPermission } = usePermissions();
    const [isSavingDisabled, setIsSavingDisabled] = useState(false);

    useEffect(() => {
        setIsSavingDisabled(equipmentStatus === "open");
        fetchAnswers();
    }, [serviceOrderId, equipmentStatus]);

    const fetchAnswers = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");
            const data = await ServiceOrderService.fetchAnswers(token, serviceOrderId);
            setAnswers(data || []);
        } catch (error: any) {
            Alert.alert("Erro", error.message || "Erro inesperado.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        fetchAnswers(true);
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Respostas da Atividade</Text>
                <Text style={styles.headerSubtitle}>OS #{serviceOrderId}</Text>
            </View>
        </View>
    );

    const renderAnswerCard = (answer: any, index: number) => (
        <View key={answer.question_id} style={styles.answerCard}>
            <View style={styles.answerHeader}>
                <View style={styles.questionNumber}>
                    <Text style={styles.questionNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.questionTitle}>Pergunta {answer.question_id}</Text>
            </View>

            <View style={styles.answerContent}>
                <Text style={styles.answerLabel}>Resposta:</Text>
                <View style={styles.answerValueContainer}>
                    <Text style={styles.answerValue}>{answer.value || "Sem resposta"}</Text>
                </View>

                {answer.justification && (
                    <>
                        <Text style={styles.answerLabel}>Justificativa:</Text>
                        <View style={styles.answerValueContainer}>
                            <Text style={styles.answerValue}>{answer.justification}</Text>
                        </View>
                    </>
                )}
            </View>
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="quiz" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>Nenhuma resposta encontrada</Text>
            <Text style={styles.emptySubtitle}>
                As respostas desta ordem de serviço ainda não foram preenchidas
            </Text>
        </View>
    );

    const renderActionButtons = () => (
        <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
                style={[styles.actionButton, styles.saveDraftButton, isSavingDisabled && styles.actionButtonDisabled]}
                onPress={() => Alert.alert("Sucesso", "Rascunho salvo!")}
                disabled={isSavingDisabled}
            >
                <MaterialIcons name="save" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Salvar Rascunho</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.actionButton, styles.saveButton, isSavingDisabled && styles.actionButtonDisabled]}
                onPress={() => Alert.alert("Sucesso", "Respostas salvas!")}
                disabled={isSavingDisabled}
            >
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Salvar</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.loadingText}>Carregando respostas...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {renderHeader()}

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#667eea']}
                        tintColor="#667eea"
                    />
                }
            >
                <View style={styles.content}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="assignment" size={24} color="#667eea" />
                        <Text style={styles.sectionTitle}>Respostas do Plano de Atividade</Text>
                    </View>

                    {answers.length === 0 ? (
                        renderEmptyState()
                    ) : (
                        <View style={styles.answersContainer}>
                            {answers.map((answer, index) => renderAnswerCard(answer, index))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {renderActionButtons()}
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
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
    },
    content: {
        paddingTop: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginLeft: 12,
    },
    answersContainer: {
        marginBottom: 20,
    },
    answerCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    answerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    questionNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#667eea',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    questionNumberText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    questionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        flex: 1,
    },
    answerContent: {
        padding: 20,
    },
    answerLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
        marginTop: 12,
    },
    answerValueContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    answerValue: {
        fontSize: 14,
        color: '#2c3e50',
        lineHeight: 20,
    },
    emptyContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#6c757d',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#adb5bd',
        textAlign: 'center',
        lineHeight: 22,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginHorizontal: 8,
    },
    saveDraftButton: {
        backgroundColor: '#6c757d',
    },
    saveButton: {
        backgroundColor: '#667eea',
    },
    actionButtonDisabled: {
        backgroundColor: '#adb5bd',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    loadingText: {
        fontSize: 16,
        color: '#6c757d',
        marginTop: 16,
    },
});

export default ViewResponseActivityScreen;