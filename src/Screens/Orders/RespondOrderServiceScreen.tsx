import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Alert,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
    Image as RNImage,
    TouchableOpacity,
    Dimensions,
    RefreshControl,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../../Routers/AppRouter";
import ServiceOrderService from "../../Services/ServiceOrderService";
import { usePermissions } from "../../Context/PermissionsContext";
import { Answer, UploadedImage, Question, ServiceOrder } from "../../Models/ServiceOrder";
import { Picker } from "@react-native-picker/picker";
import { RadioButton } from "react-native-paper";
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import OfflineService from '../../Services/OfflineService';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface RespondOrderScreenProps {
    route: RouteProp<RootStackParamList, "RespondOrderScreen">;
    navigation: DrawerNavigationProp<RootStackParamList, "RespondOrderScreen">;
}

const RespondOrderScreen: React.FC<RespondOrderScreenProps> = ({ route, navigation }) => {
    const [answers, setAnswers] = useState<{ [key: string]: { question_id: number; value: string; meta?: { justification?: string } } }>({});
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [questionsLoaded, setQuestionsLoaded] = useState(false);
    const { hasPermission } = usePermissions();
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const { serviceOrderId } = route.params;

    const fetchData = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token não encontrado");

            const serviceOrderData = await ServiceOrderService.fetchServiceOrderDetails(token, serviceOrderId);
            setServiceOrder(serviceOrderData);

            const mappedAnswers = (serviceOrderData.answers || []).reduce((acc, item) => {
                acc[item.question_id] = {
                    question_id: item.question_id,
                    value: item.answer.toString(),
                    meta: item.justification ? { justification: item.justification } : undefined
                };
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
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [serviceOrderId]);

    const onRefresh = () => {
        fetchData(true);
    };

    const handleAnswerChange = (id: number, value: string, justification?: string) => {
        setAnswers((prev) => ({
            ...prev,
            [id]: { question_id: id, value, meta: justification ? { justification } : undefined },
        }));
    };

    const submitAnswers = async (status: "open" | "pending") => {
        setSaving(true);
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
            setSaving(false);
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
            allowsMultipleSelection: true,
            selectionLimit: 5,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setNewImages(prev => [...prev, ...result.assets]);
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

    const removeNewImage = (index: number) => {
        setNewImages(prev => prev.filter((_, i) => i !== index));
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
                <Text style={styles.headerTitle}>Responder OS</Text>
                <Text style={styles.headerSubtitle}>#{serviceOrderId}</Text>
            </View>
        </View>
    );

    const renderEquipmentInfo = () => {
        if (!serviceOrder) return null;

        return (
            <View style={styles.equipmentCard}>
                <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.cardHeader}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <MaterialIcons name="assignment" size={24} color="#fff" />
                    <Text style={styles.cardTitle}>Informações do Equipamento</Text>
                </LinearGradient>

                <View style={styles.cardContent}>
                    <View style={styles.infoRow}>
                        <Ionicons name="business" size={16} color="#667eea" />
                        <Text style={styles.infoLabel}>Cliente:</Text>
                        <Text style={styles.infoValue}>{serviceOrder.client?.name || "N/A"}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="qr-code" size={16} color="#667eea" />
                        <Text style={styles.infoLabel}>Tag:</Text>
                        <Text style={styles.infoValue}>{serviceOrder.equipment?.tag || "N/A"}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialIcons name="build" size={16} color="#667eea" />
                        <Text style={styles.infoLabel}>Tipo:</Text>
                        <Text style={styles.infoValue}>{serviceOrder.equipment?.equipmentType?.name || "N/A"}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderQuestion = (question: Question & { answer_type: string; meta: any }) => {
        const answer = answers[question.id]?.value || "";
        const justification = answers[question.id]?.meta?.justification || "";

        return (
            <View style={styles.questionCard}>
                <View style={styles.questionHeader}>
                    <MaterialIcons name="quiz" size={20} color="#667eea" />
                    <Text style={styles.questionTitle}>{question.title}</Text>
                </View>

                {question.description && (
                    <Text style={styles.questionDescription}>{question.description}</Text>
                )}

                <View style={styles.questionContent}>
                    {(() => {
                        switch (question.answer_type) {
                            case "text":
                                return (
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Resposta:</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Digite sua resposta..."
                                            value={answer}
                                            onChangeText={(text) => handleAnswerChange(question.id, text.slice(0, 300))}
                                            maxLength={300}
                                            multiline
                                            numberOfLines={4}
                                        />
                                        <Text style={styles.charCount}>
                                            {answer?.length || 0}/300 caracteres
                                        </Text>
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
                                                value={answer}
                                                onChangeText={(text) => handleAnswerChange(question.id, text)}
                                            />
                                            <View style={styles.unitContainer}>
                                                <Text style={styles.unitText}>{question.meta?.unit || "N/A"}</Text>
                                            </View>
                                        </View>
                                    </View>
                                );

                            case "select":
                                return (
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Selecione uma opção:</Text>
                                        <View style={styles.pickerContainer}>
                                            <Picker
                                                selectedValue={answer}
                                                onValueChange={(value) => handleAnswerChange(question.id, value)}
                                                style={styles.picker}
                                            >
                                                <Picker.Item label="Selecione..." value="" />
                                                {question.meta?.options?.map((option: string) => (
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
                                        {question.meta?.options?.map((option: string) => (
                                            <TouchableOpacity
                                                key={option}
                                                style={[styles.radioOption, answer === option && styles.radioOptionSelected]}
                                                onPress={() => handleAnswerChange(question.id, option)}
                                            >
                                                <RadioButton
                                                    value={option}
                                                    status={answer === option ? "checked" : "unchecked"}
                                                    onPress={() => handleAnswerChange(question.id, option)}
                                                    color="#667eea"
                                                />
                                                <Text style={[styles.radioText, answer === option && styles.radioTextSelected]}>
                                                    {option}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                );

                            case "radio_with_justification":
                                const showJustification = answer === question.meta?.justification_target;
                                return (
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Escolha uma opção:</Text>
                                        {question.meta?.options?.map((option: string) => (
                                            <TouchableOpacity
                                                key={option}
                                                style={[styles.radioOption, answer === option && styles.radioOptionSelected]}
                                                onPress={() => {
                                                    handleAnswerChange(question.id, option);
                                                    if (option === question.meta.justification_target) {
                                                        handleAnswerChange(question.id, option, justification);
                                                    } else {
                                                        handleAnswerChange(question.id, option, undefined);
                                                    }
                                                }}
                                            >
                                                <RadioButton
                                                    value={option}
                                                    status={answer === option ? "checked" : "unchecked"}
                                                    onPress={() => {
                                                        handleAnswerChange(question.id, option);
                                                        if (option === question.meta.justification_target) {
                                                            handleAnswerChange(question.id, option, justification);
                                                        } else {
                                                            handleAnswerChange(question.id, option, undefined);
                                                        }
                                                    }}
                                                    color="#667eea"
                                                />
                                                <Text style={[styles.radioText, answer === option && styles.radioTextSelected]}>
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
                                                    value={justification}
                                                    onChangeText={(text) => handleAnswerChange(question.id, answer, text.slice(0, 300))}
                                                    maxLength={300}
                                                    multiline
                                                    numberOfLines={3}
                                                />
                                                <Text style={styles.charCount}>
                                                    {justification?.length || 0}/300 caracteres
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );

                            default:
                                return <Text style={styles.unsupportedText}>Tipo de questão não suportado</Text>;
                        }
                    })()}
                </View>
            </View>
        );
    };

    const renderImagesSection = () => (
        <View style={styles.imagesSection}>
            <View style={styles.sectionHeader}>
                <MaterialIcons name="photo-library" size={24} color="#667eea" />
                <Text style={styles.sectionTitle}>Imagens</Text>
            </View>

            {/* Imagens Existentes */}
            {images.length > 0 && (
                <View style={styles.existingImagesContainer}>
                    <Text style={styles.subsectionTitle}>Imagens Existentes</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.imageRow}>
                            {images.map((img, index) => (
                                <View key={index} style={styles.imageContainer}>
                                    <RNImage source={{ uri: img.url }} style={styles.image} />
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            )}

            {/* Novas Imagens */}
            <View style={styles.newImagesContainer}>
                <Text style={styles.subsectionTitle}>Adicionar Novas Imagens</Text>

                <View style={styles.uploadButtonsContainer}>
                    <TouchableOpacity style={styles.uploadButton} onPress={handleTakePhoto}>
                        <Ionicons name="camera" size={24} color="#667eea" />
                        <Text style={styles.uploadButtonText}>Tirar Foto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.uploadButton} onPress={handleChoosePhoto}>
                        <Ionicons name="images" size={24} color="#667eea" />
                        <Text style={styles.uploadButtonText}>Galeria</Text>
                    </TouchableOpacity>
                </View>

                {newImages.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.imageRow}>
                            {newImages.map((img, index) => (
                                <View key={index} style={styles.imageContainer}>
                                    <RNImage source={{ uri: img.uri }} style={styles.image} />
                                    <TouchableOpacity
                                        style={styles.removeImageButton}
                                        onPress={() => removeNewImage(index)}
                                    >
                                        <Ionicons name="close-circle" size={20} color="#e74c3c" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                )}
            </View>
        </View>
    );

    const renderActionButtons = () => (
        <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
                style={[styles.actionButton, styles.saveDraftButton]}
                onPress={() => submitAnswers("pending")}
                disabled={saving}
            >
                <MaterialIcons name="save" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Salvar Rascunho</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={() => submitAnswers("open")}
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
                <Text style={styles.loadingText}>Carregando ordem de serviço...</Text>
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

                {!questionsLoaded ? (
                    <View style={styles.loadingQuestionsContainer}>
                        <ActivityIndicator size="large" color="#667eea" />
                        <Text style={styles.loadingText}>Carregando perguntas...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.questionsSection}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="quiz" size={24} color="#667eea" />
                                <Text style={styles.sectionTitle}>Questionário</Text>
                            </View>

                            {serviceOrder?.questions?.length ? (
                                serviceOrder.questions.map((question) => renderQuestion(question as any))
                            ) : (
                                <View style={styles.emptyQuestionsContainer}>
                                    <MaterialIcons name="quiz" size={60} color="#ccc" />
                                    <Text style={styles.emptyQuestionsText}>
                                        Nenhuma pergunta disponível
                                    </Text>
                                </View>
                            )}
                        </View>

                        {renderImagesSection()}
                    </>
                )}
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
        alignItems: 'center',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginLeft: 8,
        marginRight: 8,
        minWidth: 60,
    },
    infoValue: {
        fontSize: 14,
        color: '#6c757d',
        flex: 1,
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
    unsupportedText: {
        fontSize: 14,
        color: '#e74c3c',
        fontStyle: 'italic',
    },
    imagesSection: {
        marginBottom: 20,
    },
    existingImagesContainer: {
        marginBottom: 20,
    },
    newImagesContainer: {
        marginBottom: 20,
    },
    subsectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 12,
    },
    uploadButtonsContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    uploadButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    uploadButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#667eea',
        marginLeft: 8,
    },
    imageRow: {
        flexDirection: 'row',
        paddingVertical: 8,
    },
    imageContainer: {
        marginRight: 12,
        position: 'relative',
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 10,
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
    loadingQuestionsContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6c757d',
        marginTop: 16,
    },
});

export default RespondOrderScreen;