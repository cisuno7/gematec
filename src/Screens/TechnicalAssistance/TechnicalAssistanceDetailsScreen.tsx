import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TextInput,
    TouchableOpacity,
    FlatList,
    Alert,
    Dimensions,
    RefreshControl,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TechnicalAssistanceService from "../../Services/TechnicalAssistanceService";
import { RootStackParamList } from "../../Routers/AppRouter";
import { Picker } from "@react-native-picker/picker";
import { RadioButton } from "react-native-paper";
import { usePermissions } from "../../Context/PermissionsContext";
import { TechnicalAssistance, Question } from "../../Models/TechnicalAssistance";
import NetInfo from '@react-native-community/netinfo';
import OfflineService from '../../Services/OfflineService';
import { useLanguage } from "../../Context/LanguageContext";
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const TECHNICAL_ASSISTANCE_CACHE_KEY_PREFIX = 'technical_assistance_';

type TechnicalAssistanceDetailsScreenRouteProp = RouteProp<RootStackParamList, "TechnicalAssistanceDetails">;
type TechnicalAssistanceDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, "TechnicalAssistanceDetails">;

interface TechnicalAssistanceDetailsScreenProps {
    route: TechnicalAssistanceDetailsScreenRouteProp;
    navigation: TechnicalAssistanceDetailsScreenNavigationProp;
}

const TechnicalAssistanceDetailsScreen: React.FC<TechnicalAssistanceDetailsScreenProps> = ({ route, navigation }) => {
    const { t } = useLanguage();
    const { id } = route.params;
    const { hasPermission } = usePermissions();
    const [data, setData] = useState<TechnicalAssistance | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [answers, setAnswers] = useState<{ [key: number]: { value: string; justification?: string } }>({});
    const service = new TechnicalAssistanceService();

    const fetchTechnicalAssistance = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const isConnected = await NetInfo.fetch().then(state => state.isConnected);
            let responseData;

            if (isConnected) {
                responseData = await service.fetchTechnicalAssistanceDetails(token, id);
                await OfflineService.cacheData(`${TECHNICAL_ASSISTANCE_CACHE_KEY_PREFIX}${id}`, responseData);
            } else {
                responseData = await OfflineService.getCachedData<TechnicalAssistance>(`${TECHNICAL_ASSISTANCE_CACHE_KEY_PREFIX}${id}`);
                if (!responseData) {
                    Alert.alert("Offline", "Dados não disponíveis offline. Conecte-se à internet para carregar.");
                    return;
                }
            }
            setData(responseData);
        } catch (error) {
            console.error("Erro ao buscar assistência técnica:", error);
            Alert.alert("Erro", "Não foi possível carregar a assistência técnica.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTechnicalAssistance();
    }, [id]);

    const onRefresh = () => {
        fetchTechnicalAssistance(true);
    };

    const handleAnswerChange = (questionId: number, value: string, justification?: string) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: { value, justification },
        }));
    };

    const handleSave = async (status: "pending" | "closed") => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const formattedAnswers = Object.keys(answers).map((key) => ({
                question_id: parseInt(key),
                value: answers[parseInt(key)].value,
                justification: answers[parseInt(key)].justification || undefined,
            }));

            const isConnected = await NetInfo.fetch().then(state => state.isConnected);

            if (isConnected) {
                await TechnicalAssistanceService.submitAnswers(token, id, { status, answers: formattedAnswers });
                Alert.alert("Sucesso", "Respostas salvas com sucesso!");
            } else {
                await OfflineService.addRequestToQueue({
                    type: 'answer',
                    payload: {
                        context: { technicalAssistanceId: id },
                        status,
                        answers: formattedAnswers,
                    },
                });
                Alert.alert("Modo Offline", "As respostas foram salvas e serão enviadas quando houver conexão.");
            }
            navigation.goBack();
        } catch (error: any) {
            console.error("Erro ao salvar respostas:", error.message || error);
            Alert.alert("Erro", "Falha ao salvar respostas.");
        } finally {
            setSaving(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'open':
                return { color: '#ff6b35', icon: 'alert-circle', label: 'Aberto', gradient: ['#ff6b35', '#f7931e'] as const };
            case 'pending':
                return { color: '#f39c12', icon: 'time', label: 'Pendente', gradient: ['#f39c12', '#e67e22'] as const };
            case 'closed':
                return { color: '#27ae60', icon: 'checkmark-circle', label: 'Fechado', gradient: ['#27ae60', '#2ecc71'] as const };
            default:
                return { color: '#95a5a6', icon: 'help-circle', label: 'Desconhecido', gradient: ['#95a5a6', '#7f8c8d'] as const };
        }
    };

    const renderStatusBadge = (status: string) => {
        const statusInfo = getStatusInfo(status);
        return (
            <LinearGradient
                colors={statusInfo.gradient}
                style={styles.statusBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <Ionicons name={statusInfo.icon as any} size={16} color="#fff" />
                <Text style={styles.statusText}>{statusInfo.label}</Text>
            </LinearGradient>
        );
    };

    const renderEquipmentInfo = () => {
        if (!data) return null;

        return (
            <View style={styles.equipmentCard}>
                <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.cardHeader}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <View style={styles.cardHeaderContent}>
                        <MaterialIcons name="build" size={24} color="#fff" />
                        <Text style={styles.cardHeaderTitle}>Informações do Equipamento</Text>
                    </View>
                    {renderStatusBadge(data.status)}
                </LinearGradient>

                <View style={styles.cardContent}>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Ionicons name="business" size={20} color="#667eea" />
                            <Text style={styles.infoLabel}>Cliente</Text>
                            <Text style={styles.infoValue}>{data.equipment.client?.name || "N/A"}</Text>
                        </View>

                        <View style={styles.infoItem}>
                            <Ionicons name="location" size={20} color="#667eea" />
                            <Text style={styles.infoLabel}>Setor</Text>
                            <Text style={styles.infoValue}>{data.equipment.sector?.name || "N/A"}</Text>
                        </View>

                        <View style={styles.infoItem}>
                            <Ionicons name="qr-code" size={20} color="#667eea" />
                            <Text style={styles.infoLabel}>Tag</Text>
                            <Text style={styles.infoValue}>{data.equipment.tag}</Text>
                        </View>

                        <View style={styles.infoItem}>
                            <Ionicons name="card" size={20} color="#667eea" />
                            <Text style={styles.infoLabel}>Patrimônio</Text>
                            <Text style={styles.infoValue}>{data.equipment.patrimony}</Text>
                        </View>

                        <View style={styles.infoItem}>
                            <Ionicons name="construct" size={20} color="#667eea" />
                            <Text style={styles.infoLabel}>Tipo</Text>
                            <Text style={styles.infoValue}>{data.equipment.equipment_type?.name || "N/A"}</Text>
                        </View>

                        <View style={styles.infoItem}>
                            <Ionicons name="business" size={20} color="#667eea" />
                            <Text style={styles.infoLabel}>Fabricante</Text>
                            <Text style={styles.infoValue}>{data.equipment.brand?.name || "N/A"}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderQuestion = ({ item }: { item: Question }) => {
        const answer = answers[item.id] || { value: "", justification: "" };

        return (
            <View style={styles.questionCard}>
                <View style={styles.questionHeader}>
                    <MaterialIcons name="quiz" size={20} color="#667eea" />
                    <Text style={styles.questionTitle}>{item.title}</Text>
                </View>

                {item.description && (
                    <Text style={styles.questionDescription}>{item.description}</Text>
                )}

                <View style={styles.questionContent}>
                    {(() => {
                        switch (item.answer_type) {
                            case "select":
                                return (
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Selecione uma opção:</Text>
                                        <View style={styles.pickerContainer}>
                                            <Picker
                                                selectedValue={answer.value}
                                                onValueChange={(value) => handleAnswerChange(item.id, value)}
                                                style={styles.picker}
                                            >
                                                <Picker.Item label="Selecione..." value="" />
                                                {item.meta.options?.map((option) => (
                                                    <Picker.Item key={option} label={option} value={option} />
                                                ))}
                                            </Picker>
                                        </View>
                                    </View>
                                );

                            case "radio":
                                return (
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Escolha uma opção:</Text>
                                        {item.meta.options?.map((option) => (
                                            <TouchableOpacity
                                                key={option}
                                                style={[styles.radioOption, answer.value === option && styles.radioOptionSelected]}
                                                onPress={() => handleAnswerChange(item.id, option)}
                                            >
                                                <RadioButton
                                                    value={option}
                                                    status={answer.value === option ? "checked" : "unchecked"}
                                                    onPress={() => handleAnswerChange(item.id, option)}
                                                    color="#667eea"
                                                />
                                                <Text style={[styles.radioText, answer.value === option && styles.radioTextSelected]}>
                                                    {option}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                );

                            case "radio_with_justification":
                                const showJustification = answer.value === item.meta.justification_target;
                                return (
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Escolha uma opção:</Text>
                                        {item.meta.options?.map((option) => (
                                            <TouchableOpacity
                                                key={option}
                                                style={[styles.radioOption, answer.value === option && styles.radioOptionSelected]}
                                                onPress={() => handleAnswerChange(item.id, option)}
                                            >
                                                <RadioButton
                                                    value={option}
                                                    status={answer.value === option ? "checked" : "unchecked"}
                                                    onPress={() => handleAnswerChange(item.id, option)}
                                                    color="#667eea"
                                                />
                                                <Text style={[styles.radioText, answer.value === option && styles.radioTextSelected]}>
                                                    {option}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                        {showJustification && (
                                            <View style={styles.justificationContainer}>
                                                <Text style={styles.inputLabel}>Justificativa:</Text>
                                                <TextInput
                                                    style={styles.textInput}
                                                    placeholder="Digite sua justificativa..."
                                                    value={answer.justification || ""}
                                                    onChangeText={(text) => handleAnswerChange(item.id, answer.value, text.slice(0, 300))}
                                                    maxLength={300}
                                                    multiline
                                                    numberOfLines={3}
                                                />
                                                <Text style={styles.charCount}>
                                                    {answer.justification?.length || 0}/300 caracteres
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );

                            case "measure":
                                return (
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Medida:</Text>
                                        <View style={styles.measureContainer}>
                                            <TextInput
                                                style={styles.measureInput}
                                                keyboardType="numeric"
                                                placeholder="0.00"
                                                value={answer.value}
                                                onChangeText={(text) => handleAnswerChange(item.id, text)}
                                            />
                                            <View style={styles.unitContainer}>
                                                <Text style={styles.unitText}>{item.meta.unit || "N/A"}</Text>
                                            </View>
                                        </View>
                                    </View>
                                );

                            case "text":
                                return (
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Resposta:</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Digite sua resposta..."
                                            value={answer.value}
                                            onChangeText={(text) => handleAnswerChange(item.id, text.slice(0, 300))}
                                            maxLength={300}
                                            multiline
                                            numberOfLines={4}
                                        />
                                        <Text style={styles.charCount}>
                                            {answer.value?.length || 0}/300 caracteres
                                        </Text>
                                    </View>
                                );

                            default:
                                return null;
                        }
                    })()}
                </View>
            </View>
        );
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
                <Text style={styles.headerTitle}>Assistência Técnica</Text>
                <Text style={styles.headerSubtitle}>#{id}</Text>
            </View>
        </View>
    );

    const renderActionButtons = () => (
        <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
                style={[styles.actionButton, styles.saveDraftButton]}
                onPress={() => handleSave("pending")}
                disabled={saving}
            >
                <MaterialIcons name="save" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Salvar Rascunho</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={() => handleSave("closed")}
                disabled={saving}
            >
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Finalizar</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.loadingText}>Carregando assistência técnica...</Text>
            </View>
        );
    }

    if (!data) {
        return (
            <View style={styles.errorContainer}>
                <MaterialIcons name="error" size={80} color="#e74c3c" />
                <Text style={styles.errorTitle}>Assistência técnica não encontrada</Text>
                <Text style={styles.errorSubtitle}>
                    Verifique se o ID está correto ou tente novamente mais tarde
                </Text>
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
                {renderEquipmentInfo()}

                <View style={styles.questionsSection}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="quiz" size={24} color="#667eea" />
                        <Text style={styles.sectionTitle}>Questionário</Text>
                    </View>

                    <FlatList
                        data={data.questions.sort((a, b) => a.order - b.order)}
                        renderItem={renderQuestion}
                        keyExtractor={(item) => item.id.toString()}
                        scrollEnabled={false}
                        ListEmptyComponent={
                            <View style={styles.emptyQuestionsContainer}>
                                <MaterialIcons name="quiz" size={60} color="#ccc" />
                                <Text style={styles.emptyQuestionsText}>
                                    Nenhuma pergunta disponível
                                </Text>
                            </View>
                        }
                    />
                </View>

                <View style={styles.uploadSection}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="cloud-upload" size={24} color="#667eea" />
                        <Text style={styles.sectionTitle}>Upload de Arquivos</Text>
                    </View>
                    <View style={styles.uploadPlaceholder}>
                        <MaterialIcons name="cloud-upload" size={60} color="#ccc" />
                        <Text style={styles.uploadPlaceholderText}>
                            Funcionalidade de upload em desenvolvimento
                        </Text>
                    </View>
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
    equipmentCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginTop: 20,
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
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    cardContent: {
        padding: 20,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    infoItem: {
        width: '48%',
        marginBottom: 16,
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
    },
    infoLabel: {
        fontSize: 12,
        color: '#6c757d',
        marginTop: 4,
        marginBottom: 2,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: '#2c3e50',
        fontWeight: '600',
        textAlign: 'center',
    },
    questionsSection: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginLeft: 12,
    },
    questionCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    questionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    questionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginLeft: 12,
        flex: 1,
    },
    questionDescription: {
        fontSize: 14,
        color: '#6c757d',
        paddingHorizontal: 20,
        paddingVertical: 12,
        fontStyle: 'italic',
    },
    questionContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    inputContainer: {
        marginTop: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
    },
    picker: {
        height: 50,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 4,
    },
    radioOptionSelected: {
        backgroundColor: '#e3f2fd',
    },
    radioText: {
        fontSize: 14,
        color: '#2c3e50',
        marginLeft: 8,
    },
    radioTextSelected: {
        fontWeight: '600',
        color: '#667eea',
    },
    justificationContainer: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#2c3e50',
        backgroundColor: '#fff',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: '#6c757d',
        textAlign: 'right',
        marginTop: 4,
    },
    measureContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    measureInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: '#2c3e50',
        backgroundColor: '#fff',
        marginRight: 12,
    },
    unitContainer: {
        backgroundColor: '#667eea',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
    },
    unitText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    uploadSection: {
        marginBottom: 20,
    },
    uploadPlaceholder: {
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
    uploadPlaceholderText: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
        marginTop: 16,
    },
    emptyQuestionsContainer: {
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
    emptyQuestionsText: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
        marginTop: 16,
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 40,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#e74c3c',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
    },
});

export default TechnicalAssistanceDetailsScreen;