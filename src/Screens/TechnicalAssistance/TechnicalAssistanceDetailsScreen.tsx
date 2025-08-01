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
import { OfflineService } from '../../Services/OfflineService';
import { useLanguage } from "../../Context/LanguageContext";

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
    const { hasPermission, permissions } = usePermissions();
    const [data, setData] = useState<TechnicalAssistance | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<{ [key: number]: { value: string; justification?: string } }>({});
    const service = new TechnicalAssistanceService();


    useEffect(() => {
        const fetchTechnicalAssistance = async () => {
            try {
                setLoading(true);
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
            }
        };
        fetchTechnicalAssistance();
    }, [id]);

    const handleAnswerChange = (questionId: number, value: string, justification?: string) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: { value, justification },
        }));
    };



    const handleSave = async (status: "pending" | "closed") => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const formattedAnswers = Object.keys(answers).map((key) => ({
                question_id: parseInt(key),
                value: answers[parseInt(key)].value,
                justification: answers[parseInt(key)].justification || undefined,
            }));

            const isConnected = await NetInfo.fetch().then(state => state.isConnected);

            if (isConnected) {
                await service.submitAnswers(token, id, { status, answers: formattedAnswers });
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
            setLoading(false);
        }
    };

    const renderQuestion = ({ item }: { item: Question }) => {
        const answer = answers[item.id] || { value: "", justification: "" };
        switch (item.answer_type) {
            case "select":
                return (
                    <View style={styles.questionContainer}>
                        <Text style={styles.questionTitle}>{item.title}</Text>
                        {item.description && <Text style={styles.questionDescription}>{item.description}</Text>}
                        <Picker
                            selectedValue={answer.value}
                            onValueChange={(value) => handleAnswerChange(item.id, value)}
                            style={styles.input}
                        >
                            <Picker.Item label={t('technicalAssistance.selectOption')} value="" />
                            {item.meta.options?.map((option) => (
                                <Picker.Item key={option} label={option} value={option} />
                            ))}
                        </Picker>
                    </View>
                );
            case "radio":
                return (
                    <View style={styles.questionContainer}>
                        <Text style={styles.questionTitle}>{item.title}</Text>
                        {item.description && <Text style={styles.questionDescription}>{item.description}</Text>}
                        {item.meta.options?.map((option) => (
                            <View key={option} style={styles.radioOption}>
                                <RadioButton
                                    value={option}
                                    status={answer.value === option ? "checked" : "unchecked"}
                                    onPress={() => handleAnswerChange(item.id, option)}
                                />
                                <Text>{option}</Text>
                            </View>
                        ))}
                    </View>
                );
            case "radio_with_justification":
                const showJustification = answer.value === item.meta.justification_target;
                return (
                    <View style={styles.questionContainer}>
                        <Text style={styles.questionTitle}>{item.title}</Text>
                        {item.description && <Text style={styles.questionDescription}>{item.description}</Text>}
                        {item.meta.options?.map((option) => (
                            <View key={option} style={styles.radioOption}>
                                <RadioButton
                                    value={option}
                                    status={answer.value === option ? "checked" : "unchecked"}
                                    onPress={() => handleAnswerChange(item.id, option)}
                                />
                                <Text>{option}</Text>
                            </View>
                        ))}
                        {showJustification && (
                            <TextInput
                                style={styles.input}
                                placeholder="Justifique"
                                value={answer.justification || ""}
                                onChangeText={(text) => handleAnswerChange(item.id, answer.value, text.slice(0, 300))}
                                maxLength={300}
                                multiline
                            />
                        )}
                    </View>
                );
            case "measure":
                return (
                    <View style={styles.questionContainer}>
                        <Text style={styles.questionTitle}>{item.title}</Text>
                        {item.description && <Text style={styles.questionDescription}>{item.description}</Text>}
                        <View style={styles.measureContainer}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                keyboardType="numeric"
                                value={answer.value}
                                onChangeText={(text) => handleAnswerChange(item.id, text)}
                            />
                            <Text style={styles.unit}>{item.meta.unit || "N/A"}</Text>
                        </View>
                    </View>
                );
            case "text":
                return (
                    <View style={styles.questionContainer}>
                        <Text style={styles.questionTitle}>{item.title}</Text>
                        {item.description && <Text style={styles.questionDescription}>{item.description}</Text>}
                        <TextInput
                            style={styles.input}
                            value={answer.value}
                            onChangeText={(text) => handleAnswerChange(item.id, text.slice(0, 300))}
                            maxLength={300}
                            multiline
                        />
                    </View>
                );
            default:
                return null;
        }
    };

    if (loading) return <ActivityIndicator size="large" color="#007BFF" style={styles.center} />;
    if (!data) return <Text style={styles.errorText}>Assistência técnica não encontrada.</Text>;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('technicalAssistance.equipmentInfo')}</Text>
                <Text style={styles.headerText}>{t('technicalAssistance.client')}: {data.equipment.client?.name || "N/A"}</Text>
                <Text style={styles.headerText}>{t('technicalAssistance.sector')}: {data.equipment.sector?.name || "N/A"}</Text>
                <Text style={styles.headerText}>{t('technicalAssistance.tag')}: {data.equipment.tag}</Text>
                <Text style={styles.headerText}>{t('technicalAssistance.patrimony')}: {data.equipment.patrimony}</Text>
                <Text style={styles.headerText}>{t('technicalAssistance.serialNumber')}: {data.equipment.serial_number || "N/A"}</Text>
                <Text style={styles.headerText}>{t('technicalAssistance.manufacturer')}: {data.equipment.brand?.name || "N/A"}</Text>
                <Text style={styles.headerText}>
                    {t('technicalAssistance.technology')}: {data.equipment.technology ? data.equipment.technology.name : "N/A"}
                </Text>
                <Text style={styles.headerText}>{t('technicalAssistance.equipmentType')}: {data.equipment.equipment_type?.name || "N/A"}</Text>
                <Text style={styles.headerText}>{t('technicalAssistance.evaporatorType')}: {data.equipment.evaporator_type?.name || "N/A"}</Text>
                <Text style={styles.headerText}>{t('technicalAssistance.coilType')}: {data.equipment.coil_type?.name || "N/A"}</Text>
                <Text style={styles.headerText}>{t('technicalAssistance.condenserType')}: {data.equipment.condenser_type?.name || "N/A"}</Text>
                <Text style={styles.headerText}>{t('technicalAssistance.capacity')}: {data.equipment.capacity || "N/A"}</Text>
                <Text style={styles.headerText}>{t('technicalAssistance.voltage')}: {data.equipment.voltage || "N/A"}</Text>
                <Text style={styles.headerText}>{t('technicalAssistance.electricCurrent')}: {data.equipment.electric_current || "N/A"}</Text>
                <Text style={styles.headerText}>
                    {t('technicalAssistance.status')}: {data.status === "open" ? t('technicalAssistance.open') : data.status === "closed" ? t('technicalAssistance.closed') : t('technicalAssistance.pending')}
                </Text>
                <Text style={styles.noteText}>
                    {t('technicalAssistance.offlineData')}
                </Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('technicalAssistance.activityPlan')}</Text>
                <FlatList
                    data={data.questions.sort((a, b) => a.order - b.order)}
                    renderItem={renderQuestion}
                    keyExtractor={(item) => item.id.toString()}
                />
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('technicalAssistance.uploadSection')}</Text>
                <Text style={styles.placeholderText}>
                    {t('technicalAssistance.offlineData')}
                </Text>
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={() => handleSave("pending")}>
                    <Text style={styles.buttonText}>{t('technicalAssistance.saveAsDraft')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleSave("closed")}>
                    <Text style={styles.buttonText}>{t('technicalAssistance.save')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.buttonText}>{t('technicalAssistance.cancel')}</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#fff" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: { padding: 16, backgroundColor: "#f5f5f5", borderRadius: 8, marginBottom: 16 },
    headerTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 8, color: "#333" },
    headerText: { fontSize: 16, color: "#555" },
    noteText: { fontSize: 14, color: "#888", fontStyle: "italic", marginTop: 8 },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8, color: "#333" },
    questionContainer: { padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, marginBottom: 12 },
    questionTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
    questionDescription: { fontSize: 14, color: "#666", marginBottom: 8 },
    input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 4, padding: 8, marginTop: 8 },
    radioOption: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
    measureContainer: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    unit: { marginLeft: 8, fontSize: 16, color: "#555" },
    placeholderText: { fontSize: 14, color: "#888", fontStyle: "italic" },
    buttonContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
    button: { backgroundColor: "#007BFF", padding: 12, borderRadius: 8, flex: 1, marginHorizontal: 4, alignItems: "center" },
    cancelButton: { backgroundColor: "#dc3545", padding: 12, borderRadius: 8, flex: 1, marginHorizontal: 4, alignItems: "center" },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
    emptyText: { fontSize: 16, color: "#666", textAlign: "center", marginTop: 20 },
    errorText: { fontSize: 18, color: "red", textAlign: "center", marginTop: 20 },
});

export default TechnicalAssistanceDetailsScreen;