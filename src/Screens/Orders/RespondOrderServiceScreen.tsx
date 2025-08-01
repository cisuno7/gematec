import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert, ActivityIndicator, StyleSheet, ScrollView, Image as RNImage } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../../Routers/AppRouter";
import ServiceOrderService from "../../Services/ServiceOrderService";
import { usePermissions } from "../../Context/PermissionsContext";
import { Answer, UploadedImage, Question, ServiceOrder } from "../../Models/ServiceOrder";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { OfflineService } from '../../Services/OfflineService';

interface RespondOrderScreenProps {
    route: RouteProp<RootStackParamList, "RespondOrderScreen">;
    navigation: DrawerNavigationProp<RootStackParamList, "RespondOrderScreen">;
}

const RespondOrderScreen: React.FC<RespondOrderScreenProps> = ({ route, navigation }) => {
    const [answers, setAnswers] = useState<{ [key: string]: { question_id: number; value: string; meta?: { justification?: string } } }>({});
    const [loading, setLoading] = useState(false);
    const [questionsLoaded, setQuestionsLoaded] = useState(false);
    const { hasPermission, permissions } = usePermissions();
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>([]); // State for newly captured images
    const { serviceOrderId } = route.params;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const token = await AsyncStorage.getItem("access_token");
                if (!token) throw new Error("Token não encontrado");

                const serviceOrderData = await ServiceOrderService.fetchServiceOrderDetails(token, serviceOrderId);
                setServiceOrder(serviceOrderData);

                const mappedAnswers = (serviceOrderData.answers || []).reduce((acc, item) => {
                    acc[item.question_id] = { question_id: item.question_id, value: item.answer.toString(), meta: item.justification ? { justification: item.justification } : undefined };
                    return acc;
                }, {} as { [key: string]: { question_id: number; value: string; meta?: { justification?: string } } });
                setAnswers(mappedAnswers);

                const imagesData = await ServiceOrderService.fetchImages(token, serviceOrderId);
                setImages(imagesData || []);

                setQuestionsLoaded(true);
            } catch (error: any) {
                Alert.alert("Erro", error.message || "Não foi possível carregar os dados.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serviceOrderId]);

    const handleAnswerChange = (id: number, value: string, justification?: string) => {
        setAnswers((prev) => ({
            ...prev,
            [id]: { question_id: id, value, meta: justification ? { justification } : undefined },
        }));
    };

    const submitAnswers = async (status: "open" | "pending") => {
        setLoading(true);
        try {
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const payload = {
                status,
                answers: Object.values(answers).map((ans) => ({
                    question_id: ans.question_id,
                    value: ans.value,
                    meta: ans.meta || {},
                })),
            };

            if (isConnected) {
                await ServiceOrderService.submitAnswers(token, serviceOrderId, payload);
                // If online, also upload new images immediately
                if (newImages.length > 0) {
                    const formData = new FormData();
                    newImages.forEach((image, index) => {
                        formData.append('images', {
                            uri: image.uri,
                            name: image.fileName || `photo_${Date.now()}_${index}.jpg`,
                            type: image.mimeType || 'image/jpeg',
                        } as any);
                    });
                    await ServiceOrderService.uploadServiceOrderImages(token, serviceOrderId, formData);
                }
                Alert.alert("Sucesso", "Respostas e imagens salvas com sucesso!");
            } else {
                await OfflineService.addRequestToQueue({
                    type: 'answer',
                    payload: {
                        context: { serviceOrderId: serviceOrderId, equipmentId: serviceOrder?.equipment.id },
                        answers: payload.answers,
                        status: status,
                    },
                });
                // Add new images to offline queue
                for (const image of newImages) {
                    await OfflineService.addRequestToQueue({
                        type: 'upload',
                        payload: {
                            context: { serviceOrderId: serviceOrderId, equipmentId: serviceOrder?.equipment.id },
                            image: {
                                uri: image.uri,
                                name: image.fileName || `photo_${Date.now()}.jpg`,
                                type: image.mimeType || 'image/jpeg',
                            },
                        },
                    });
                }
                Alert.alert("Modo Offline", "As respostas e imagens foram salvas e serão enviadas quando houver conexão.");
            }
            navigation.goBack();
        } catch (error: any) {
            Alert.alert("Erro", error.message || "Falha ao salvar respostas.");
        } finally {
            setLoading(false);
        }
    };

    const handleChoosePhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão Necessária', 'É preciso permitir o acesso à galeria para escolher fotos.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setNewImages(prev => [...prev, result.assets[0]]);
        }
    };

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão Necessária', 'É preciso permitir o acesso à câmera para tirar fotos.');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setNewImages(prev => [...prev, result.assets[0]]);
        }
    };

    const renderQuestion = (question: Question & { answer_type: string; meta: any }) => {
        switch (question.answer_type) {
            case "text":
                return (
                    <TextInput
                        style={styles.input}
                        value={answers[question.id]?.value || ""}
                        onChangeText={(text) => handleAnswerChange(question.id, text.slice(0, 300))}
                        placeholder="Digite sua resposta"
                        maxLength={300}
                    />
                );
            case "measure":
                return (
                    <View style={styles.row}>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={answers[question.id]?.value || ""}
                            onChangeText={(text) => handleAnswerChange(question.id, text)}
                            placeholder="Digite o valor"
                        />
                        <Text>{question.meta.unit || "N/A"}</Text>
                    </View>
                );
            case "select":
                return (
                    <Picker
                        selectedValue={answers[question.id]?.value || ""}
                        onValueChange={(value) => handleAnswerChange(question.id, value)}
                        style={styles.picker}
                    >
                        <Picker.Item label="Selecione uma opção" value="" />
                        {question.meta.options.map((option: string) => (
                            <Picker.Item key={option} label={option} value={option} />
                        ))}
                    </Picker>
                );
            case "radio":
                return (
                    <View>
                        {question.meta.options.map((option: string) => (
                            <Button
                                key={option}
                                title={option}
                                onPress={() => handleAnswerChange(question.id, option)}
                                color={answers[question.id]?.value === option ? "#007BFF" : "#ccc"}
                            />
                        ))}
                    </View>
                );
            case "radio_with_justification":
                return (
                    <View>
                        {question.meta.options.map((option: string) => (
                            <Button
                                key={option}
                                title={option}
                                onPress={() => handleAnswerChange(question.id, option, option === question.meta.justification_target ? answers[question.id]?.meta?.justification : undefined)}
                                color={answers[question.id]?.value === option ? "#007BFF" : "#ccc"}
                            />
                        ))}
                        {answers[question.id]?.value === question.meta.justification_target && (
                            <TextInput
                                style={styles.input}
                                placeholder="Justifique"
                                value={answers[question.id]?.meta?.justification || ""}
                                onChangeText={(text) => handleAnswerChange(question.id, answers[question.id]?.value || "", text.slice(0, 300))}
                                maxLength={300}
                            />
                        )}
                    </View>
                );
            default:
                return <Text>Tipo de questão não suportado</Text>;
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Responder Ordem de Serviço</Text>
            {serviceOrder && (
                <View style={styles.infoContainer}>
                    <Text>Cliente: {serviceOrder.client.name}</Text>
                    <Text>Tag: {serviceOrder.equipment.tag}</Text>
                </View>
            )}
            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : !questionsLoaded ? (
                <Text>Carregando perguntas...</Text>
            ) : (
                <>
                    {serviceOrder?.questions?.length ? (
                        serviceOrder.questions.map((question) => (
                            <View key={question.id} style={styles.questionContainer}>
                                <Text style={styles.questionTitle}>{question.title}</Text>
                                {question.description && <Text style={styles.questionDescription}>{question.description}</Text>}
                                {renderQuestion(question as any)}
                            </View>
                        ))
                    ) : (
                        <Text>Nenhuma pergunta disponível.</Text>
                    )}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Imagens Existentes</Text>
                        {images.length > 0 ? (
                            <View style={styles.imageGrid}>
                                {images.map((img, index) => (
                                    <RNImage key={index} source={{ uri: img.url }} style={styles.image} />
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.emptyText}>Nenhuma imagem existente.</Text>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Novas Imagens</Text>
                        <View style={styles.buttonRow}>
                            <Button title="Tirar Foto" onPress={handleTakePhoto} disabled={loading} />
                            <Button title="Escolher da Galeria" onPress={handleChoosePhoto} disabled={loading} />
                        </View>
                        {newImages.length > 0 ? (
                            <View style={styles.imageGrid}>
                                {newImages.map((img, index) => (
                                    <RNImage key={index} source={{ uri: img.uri }} style={styles.image} />
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.emptyText}>Nenhuma nova imagem adicionada.</Text>
                        )}
                    </View>
                </>
            )}
            <Button title="Salvar" onPress={() => submitAnswers("open")} disabled={loading} />
            <Button title="Salvar como Rascunho" onPress={() => submitAnswers("pending")} disabled={loading} />
            <Button title="Cancelar" onPress={() => navigation.goBack()} color="red" disabled={loading} />
            {loading && <ActivityIndicator size="large" color="#0000ff" />}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16, backgroundColor: "#f5f5f5" },
    title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
    infoContainer: { marginBottom: 16 },
    questionContainer: { marginBottom: 12, padding: 12, backgroundColor: "#fff", borderRadius: 8 },
    questionTitle: { fontSize: 16, fontWeight: "bold" },
    questionDescription: { fontSize: 14, color: "#666", marginBottom: 8 },
    input: { borderWidth: 1, borderColor: "#ccc", padding: 8, borderRadius: 4, marginBottom: 10 },
    picker: { height: 50, marginBottom: 10 },
    row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
    image: { width: 100, height: 100, marginBottom: 10, marginRight: 10 },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    emptyText: { fontSize: 14, color: "#666", textAlign: "center", marginVertical: 10 },
    errorText: { fontSize: 16, color: "#FF0000", textAlign: "center", marginTop: 20 },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
});

export default RespondOrderScreen;