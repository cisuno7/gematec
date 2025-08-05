import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TextInput,
    TouchableOpacity,
    FlatList,
    Dimensions,
    RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from 'expo-image-picker';
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import { Picker } from "@react-native-picker/picker";
import { RadioButton } from "react-native-paper";
import TechnicalAssistanceService from "../../Services/TechnicalAssistanceService";
import ServiceOrderService from "../../Services/ServiceOrderService";
import { usePermissions } from "../../Context/PermissionsContext";
import { buildApiUrlForAccount } from "../../config/apiConfig";
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ViewOrderActivityScreenProps {
    route: RouteProp<RootStackParamList, "ViewOrderActivityScreen">;
    navigation: DrawerNavigationProp<RootStackParamList, "ViewOrderActivityScreen">;
}

const ViewOrderActivityScreen: React.FC<ViewOrderActivityScreenProps> = ({
    route,
    navigation,
}) => {
    const { serviceOrderId, equipmentId, pmocId, equipmentVersionId } = route.params;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const { hasPermission } = usePermissions();
    const [serviceOrder, setServiceOrder] = useState<any>(null);
    const [answers, setAnswers] = useState<{ [key: string]: any }>({});
    const [uploadedImages, setUploadedImages] = useState<any[]>([]);

    const fetchServiceOrderDetails = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado.");

            const apiUrl = await buildApiUrlForAccount();
            const response = await fetch(`${apiUrl}/service_orders/${serviceOrderId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error("Erro ao buscar dados da O.S.");

            const data = await response.json();
            setServiceOrder(data);
        } catch (error: any) {
            Alert.alert("Erro", error.message || "Ocorreu um erro inesperado.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchServiceOrderDetails();
        fetchAnswers();
        fetchImages();
    }, []);

    const onRefresh = () => {
        fetchServiceOrderDetails(true);
        fetchAnswers();
        fetchImages();
    };

    const fetchAnswers = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado.");
            const data = await ServiceOrderService.fetchAnswers(token, serviceOrderId);
            const loadedAnswers = Array.isArray(data)
                ? data.reduce((acc: any, answer: any) => {
                    acc[answer.question_id] = answer.value;
                    if (answer.meta?.justification) acc[`${answer.question_id}_justification`] = answer.meta.justification;
                    return acc;
                }, {})
                : {};
            setAnswers(loadedAnswers);
        } catch (error) {
            console.error('Erro ao buscar respostas:', error);
        }
    };

    const fetchImages = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado.");
            const data = await ServiceOrderService.fetchImages(token, serviceOrderId);
            setUploadedImages(data || []);
        } catch (error) {
            console.error('Erro ao buscar imagens:', error);
        }
    };

    const handleImageUpload = async () => {
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado.");
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') throw new Error("Permissão para acessar a galeria negada.");

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
                allowsMultipleSelection: true,
                selectionLimit: 5,
            });

            if (result.canceled) return;

            const formData = new FormData();
            result.assets.forEach((asset, index) => {
                formData.append(`images[${index}]`, {
                    uri: asset.uri,
                    type: asset.type || 'image/jpeg',
                    name: asset.fileName || `image_${index}.jpg`,
                } as any);
            });

            const effectivePmocId = pmocId || serviceOrder?.pmocId;
            const effectiveEquipmentVersionId = equipmentVersionId || serviceOrder?.equipment?.id || equipmentId;

            if (!effectivePmocId || !effectiveEquipmentVersionId) {
                throw new Error("PMOC ID ou Equipment Version ID não disponível.");
            }

            const data = await ServiceOrderService.uploadImages(token, effectivePmocId, effectiveEquipmentVersionId, formData);
            setUploadedImages((prevImages) => [...prevImages, ...data]);
            Alert.alert("Sucesso", "Imagens enviadas com sucesso!");
        } catch (error: any) {
            Alert.alert("Erro", error.message || "Ocorreu um erro ao fazer upload.");
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
        if (!serviceOrder || !serviceOrder.equipment) return null;

        return (
            <View style={styles.equipmentCard}>
                <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.cardHeader}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <View style={styles.cardHeaderContent}>
                        <MaterialIcons name="assignment" size={24} color="#fff" />
                        <Text style={styles.cardHeaderTitle}>Informações do Equipamento</Text>
                    </View>
                    {renderStatusBadge(serviceOrder.status)}
                </LinearGradient>

                <View style={styles.cardContent}>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Ionicons name="business" size={20} color="#667eea" />
                            <Text style={styles.infoLabel}>Cliente</Text>
                            <Text style={styles.infoValue}>{serviceOrder.equipment.client?.name || "N/A"}</Text>
                        </View>

                        <View style={styles.infoItem}>
                            <Ionicons name="location" size={20} color="#667eea" />
                            <Text style={styles.infoLabel}>Setor</Text>
                            <Text style={styles.infoValue}>{serviceOrder.equipment.sector?.name || "N/A"}</Text>
                        </View>

                        <View style={styles.infoItem}>
                            <Ionicons name="qr-code" size={20} color="#667eea" />
                            <Text style={styles.infoLabel}>Tag</Text>
                            <Text style={styles.infoValue}>{serviceOrder.equipment.tag || "N/A"}</Text>
                        </View>

                        <View style={styles.infoItem}>
                            <Ionicons name="card" size={20} color="#667eea" />
                            <Text style={styles.infoLabel}>Patrimônio</Text>
                            <Text style={styles.infoValue}>{serviceOrder.equipment.patrimony || "N/A"}</Text>
                        </View>

                        <View style={styles.infoItem}>
                            <Ionicons name="construct" size={20} color="#667eea" />
                            <Text style={styles.infoLabel}>Tipo</Text>
                            <Text style={styles.infoValue}>{serviceOrder.equipment.equipment_type?.name || "N/A"}</Text>
                        </View>

                        <View style={styles.infoItem}>
                            <Ionicons name="business" size={20} color="#667eea" />
                            <Text style={styles.infoLabel}>Fabricante</Text>
                            <Text style={styles.infoValue}>{serviceOrder.equipment.brand?.name || "N/A"}</Text>
                        </View>
                    </View>

                    <View style={styles.warningContainer}>
                        <Ionicons name="warning" size={16} color="#f39c12" />
                        <Text style={styles.warningText}>
                            Os dados do equipamento são de quando a O.S foi criada, não reflete mudanças posteriores.
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderQuestion = ({ item }: { item: any }) => {
        const answer = answers[item.id] || "";
        const justification = answers[`${item.id}_justification`] || "";

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
                            case "text":
                                return (
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Resposta:</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Digite sua resposta..."
                                            value={answer}
                                            onChangeText={(text) =>
                                                setAnswers({ ...answers, [item.id]: text.slice(0, 300) })
                                            }
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
                                                onChangeText={(text) => setAnswers({ ...answers, [item.id]: text })}
                                            />
                                            <View style={styles.unitContainer}>
                                                <Text style={styles.unitText}>{item.meta?.unit || "N/A"}</Text>
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
                                                onValueChange={(itemValue) =>
                                                    setAnswers({ ...answers, [item.id]: itemValue })
                                                }
                                                style={styles.picker}
                                            >
                                                <Picker.Item label="Selecione..." value="" />
                                                {item.meta?.options?.map((option: string, index: number) => (
                                                    <Picker.Item key={index} label={option} value={option} />
                                                ))}
                                            </Picker>
                                        </View>
                                    </View>
                                );

                            case "radio":
                                return (
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Escolha uma opção:</Text>
                                        {item.meta?.options?.map((option: string, index: number) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={[styles.radioOption, answer === option && styles.radioOptionSelected]}
                                                onPress={() => setAnswers({ ...answers, [item.id]: option })}
                                            >
                                                <RadioButton
                                                    value={option}
                                                    status={answer === option ? "checked" : "unchecked"}
                                                    onPress={() => setAnswers({ ...answers, [item.id]: option })}
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
                                const showJustification = answer === item.meta?.justification_target;
                                return (
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Escolha uma opção:</Text>
                                        {item.meta?.options?.map((option: string, index: number) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={[styles.radioOption, answer === option && styles.radioOptionSelected]}
                                                onPress={() => {
                                                    setAnswers({ ...answers, [item.id]: option });
                                                    if (option === item.meta.justification_target) {
                                                        setAnswers({
                                                            ...answers,
                                                            [item.id]: option,
                                                            [`${item.id}_justification`]: justification,
                                                        });
                                                    } else {
                                                        setAnswers({
                                                            ...answers,
                                                            [item.id]: option,
                                                            [`${item.id}_justification`]: undefined,
                                                        });
                                                    }
                                                }}
                                            >
                                                <RadioButton
                                                    value={option}
                                                    status={answer === option ? "checked" : "unchecked"}
                                                    onPress={() => {
                                                        setAnswers({ ...answers, [item.id]: option });
                                                        if (option === item.meta.justification_target) {
                                                            setAnswers({
                                                                ...answers,
                                                                [item.id]: option,
                                                                [`${item.id}_justification`]: justification,
                                                            });
                                                        } else {
                                                            setAnswers({
                                                                ...answers,
                                                                [item.id]: option,
                                                                [`${item.id}_justification`]: undefined,
                                                            });
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
                                                    onChangeText={(text) =>
                                                        setAnswers({
                                                            ...answers,
                                                            [`${item.id}_justification`]: text.slice(0, 300),
                                                        })
                                                    }
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
                <Text style={styles.headerTitle}>Ordem de Serviço</Text>
                <Text style={styles.headerSubtitle}>#{serviceOrderId}</Text>
            </View>
        </View>
    );

    const renderActionButtons = () => (
        <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
                style={[styles.actionButton, styles.saveDraftButton]}
                onPress={handleSaveAsDraft}
                disabled={saving || serviceOrder?.status === "open"}
            >
                <MaterialIcons name="save" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Salvar Rascunho</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
                disabled={saving || serviceOrder?.status === "open"}
            >
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Finalizar</Text>
            </TouchableOpacity>
        </View>
    );

    const transformAnswers = () => {
        const transformedAnswers = Object.keys(answers).map((key) => {
            const question = serviceOrder?.questions?.find((q: any) => q.id === key);
            const meta =
                question?.answer_type === "radio_with_justification" &&
                    answers[key] === question?.meta?.justification_target
                    ? { justification: answers[`${key}_justification`] || "" }
                    : {};

            return {
                question_id: key,
                value: answers[key],
                meta,
            };
        });

        return transformedAnswers;
    };

    const validateAnswers = () => {
        if (!serviceOrder || !serviceOrder.questions) return true;

        for (const question of serviceOrder.questions) {
            if (question.required && !answers[question.id]) {
                Alert.alert("Erro", `A pergunta "${question.title}" precisa ser respondida.`);
                return false;
            }
            if (
                question.answer_type === "radio_with_justification" &&
                answers[question.id] === question.meta?.justification_target &&
                !answers[`${question.id}_justification`]
            ) {
                Alert.alert("Erro", `A justificativa para "${question.title}" é obrigatória.`);
                return false;
            }
        }
        return true;
    };

    const sendAnswersToBackend = async (status: string) => {
        const transformedAnswers = transformAnswers();
        try {
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado.");

            const apiUrl = await buildApiUrlForAccount();
            const response = await fetch(`${apiUrl}/service_orders/${serviceOrderId}/answers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status,
                    answers: transformedAnswers,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro ao salvar as respostas: ${errorText}`);
            }

            const data = await response.json();
            return data;
        } catch (error: any) {
            Alert.alert("Erro", error.message || "Ocorreu um erro ao salvar as respostas.");
            throw error;
        }
    };

    const handleSaveAsDraft = async () => {
        try {
            setSaving(true);
            await sendAnswersToBackend("pending");
            Alert.alert("Sucesso", "Respostas salvas como rascunho com sucesso!");
            navigation.goBack();
        } catch (error) {
            // O erro já é tratado em sendAnswersToBackend
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (validateAnswers()) {
            try {
                setSaving(true);
                await sendAnswersToBackend("open");
                Alert.alert("Sucesso", "Respostas salvas com sucesso!");
                navigation.goBack();
            } catch (error) {
                // O erro já é tratado em sendAnswersToBackend
            } finally {
                setSaving(false);
            }
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.loadingText}>Carregando ordem de serviço...</Text>
            </View>
        );
    }

    if (!serviceOrder) {
        return (
            <View style={styles.errorContainer}>
                <MaterialIcons name="error" size={80} color="#e74c3c" />
                <Text style={styles.errorTitle}>Ordem de serviço não encontrada</Text>
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
                        data={serviceOrder.questions?.sort((a: any, b: any) => a.order - b.order) || []}
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
                        <TouchableOpacity style={styles.uploadButton} onPress={handleImageUpload}>
                            <MaterialIcons name="cloud-upload" size={40} color="#667eea" />
                            <Text style={styles.uploadButtonText}>Selecionar Imagens</Text>
                        </TouchableOpacity>
                        {uploadedImages.length > 0 && (
                            <View style={styles.uploadedImagesContainer}>
                                <Text style={styles.uploadedImagesTitle}>Imagens enviadas:</Text>
                                {uploadedImages.map((image, index) => (
                                    <View key={index} style={styles.uploadedImageItem}>
                                        <MaterialIcons name="image" size={20} color="#667eea" />
                                        <Text style={styles.uploadedImageText}>{image.name}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
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
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff3cd',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    warningText: {
        fontSize: 12,
        color: '#856404',
        marginLeft: 8,
        flex: 1,
        fontStyle: 'italic',
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
        color: "#333",
        backgroundColor: "#fff",
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
    uploadButton: {
        alignItems: 'center',
        padding: 20,
        borderWidth: 2,
        borderColor: '#667eea',
        borderStyle: 'dashed',
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
    },
    uploadButtonText: {
        fontSize: 16,
        color: '#667eea',
        marginTop: 8,
        fontWeight: '600',
    },
    uploadedImagesContainer: {
        marginTop: 20,
        width: '100%',
    },
    uploadedImagesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 12,
    },
    uploadedImageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 8,
    },
    uploadedImageText: {
        fontSize: 14,
        color: '#2c3e50',
        marginLeft: 8,
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

export default ViewOrderActivityScreen;
