import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    ScrollView,
    Dimensions,
    Alert,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrlForAccount } from '../../config/apiConfig';
import apiClient from '../../Context/ApiClient';

const { width } = Dimensions.get('window');

const CreateServiceOrderScreen = ({ navigation }: { navigation: any }) => {
    const [clients, setClients] = useState<any[]>([]);
    const [sectors, setSectors] = useState<any[]>([]);
    const [equipments, setEquipments] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [selectedSector, setSelectedSector] = useState<any>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        if (selectedClient) {
            fetchSectors(selectedClient.id);
            setCurrentStep(2);
        }
    }, [selectedClient]);

    useEffect(() => {
        if (selectedSector) {
            fetchEquipments(selectedSector.id);
            setCurrentStep(3);
        }
    }, [selectedSector]);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado");

            const apiUrl = await buildApiUrlForAccount();
            const response = await apiClient.get(`${apiUrl}/clients`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClients(response.data.results || []);
        } catch (error) {
            console.error("Erro ao buscar clientes:", error);
            Alert.alert("Erro", "Falha ao carregar clientes");
        } finally {
            setLoading(false);
        }
    };

    const fetchSectors = async (clientId: string) => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado");

            const apiUrl = await buildApiUrlForAccount();
            const response = await apiClient.get(`${apiUrl}/clients/${clientId}/sectors`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSectors(response.data.results || []);
        } catch (error) {
            console.error("Erro ao buscar setores:", error);
            Alert.alert("Erro", "Falha ao carregar setores");
        } finally {
            setLoading(false);
        }
    };

    const fetchEquipments = async (sectorId: string) => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("access_token");
            if (!token) throw new Error("Token de acesso não encontrado");

            const apiUrl = await buildApiUrlForAccount();
            const response = await apiClient.get(`${apiUrl}/equipments`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { sector_id: sectorId }
            });
            setEquipments(response.data.results || []);
        } catch (error) {
            console.error("Erro ao buscar equipamentos:", error);
            Alert.alert("Erro", "Falha ao carregar equipamentos");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateServiceOrder = async () => {
        if (selectedEquipment) {
            setCreating(true);
            try {
                const token = await AsyncStorage.getItem("access_token");
                if (!token) throw new Error("Token de acesso não encontrado");

                const apiUrl = await buildApiUrlForAccount();
                const response = await apiClient.post(`${apiUrl}/service_orders`, {
                    equipment_id: selectedEquipment.id,
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                Alert.alert(
                    "Sucesso",
                    "Ordem de serviço criada com sucesso!",
                    [
                        {
                            text: "Ver Detalhes",
                            onPress: () => navigation.navigate('ViewOrderActivityScreen', {
                                serviceOrderId: response.data.id,
                                equipmentId: selectedEquipment.id,
                            })
                        },
                        {
                            text: "Voltar",
                            onPress: () => navigation.goBack()
                        }
                    ]
                );
            } catch (error: any) {
                console.error('Erro ao criar Ordem de Serviço:', error);
                Alert.alert("Erro", error.message || "Falha ao criar ordem de serviço");
            } finally {
                setCreating(false);
            }
        }
    };

    const renderStepIndicator = () => (
        <View style={styles.stepIndicator}>
            <View style={styles.stepContainer}>
                <View style={[styles.stepCircle, currentStep >= 1 && styles.stepCircleActive]}>
                    <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
                </View>
                <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Cliente</Text>
            </View>
            <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
            <View style={styles.stepContainer}>
                <View style={[styles.stepCircle, currentStep >= 2 && styles.stepCircleActive]}>
                    <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
                </View>
                <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Setor</Text>
            </View>
            <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />
            <View style={styles.stepContainer}>
                <View style={[styles.stepCircle, currentStep >= 3 && styles.stepCircleActive]}>
                    <Text style={[styles.stepNumber, currentStep >= 3 && styles.stepNumberActive]}>3</Text>
                </View>
                <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>Equipamento</Text>
            </View>
        </View>
    );

    const renderClientCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.selectionCard, selectedClient?.id === item.id && styles.selectionCardSelected]}
            onPress={() => setSelectedClient(item)}
        >
            <View style={styles.cardHeader}>
                <Ionicons name="business" size={24} color={selectedClient?.id === item.id ? "#667eea" : "#666"} />
                <Text style={[styles.cardTitle, selectedClient?.id === item.id && styles.cardTitleSelected]}>
                    {item.name}
                </Text>
            </View>
            {item.email && (
                <Text style={styles.cardSubtitle}>{item.email}</Text>
            )}
        </TouchableOpacity>
    );

    const renderSectorCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.selectionCard, selectedSector?.id === item.id && styles.selectionCardSelected]}
            onPress={() => setSelectedSector(item)}
        >
            <View style={styles.cardHeader}>
                                 <Ionicons name="business" size={24} color={selectedSector?.id === item.id ? "#667eea" : "#666"} />
                <Text style={[styles.cardTitle, selectedSector?.id === item.id && styles.cardTitleSelected]}>
                    {item.name}
                </Text>
            </View>
            {item.description && (
                <Text style={styles.cardSubtitle}>{item.description}</Text>
            )}
        </TouchableOpacity>
    );

    const renderEquipmentCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.selectionCard, selectedEquipment?.id === item.id && styles.selectionCardSelected]}
            onPress={() => setSelectedEquipment(item)}
        >
            <View style={styles.cardHeader}>
                <MaterialIcons name="build" size={24} color={selectedEquipment?.id === item.id ? "#667eea" : "#666"} />
                <Text style={[styles.cardTitle, selectedEquipment?.id === item.id && styles.cardTitleSelected]}>
                    {item.tag || "Sem Tag"}
                </Text>
            </View>
            <View style={styles.equipmentInfo}>
                <Text style={styles.equipmentDetail}>Patrimônio: {item.patrimony || "N/A"}</Text>
                <Text style={styles.equipmentDetail}>Fabricante: {item.brand?.name || "N/A"}</Text>
                <Text style={styles.equipmentDetail}>Tipo: {item.equipment_type?.name || "N/A"}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Nova Ordem de Serviço</Text>
                <Text style={styles.headerSubtitle}>Crie uma nova ordem de serviço</Text>
            </View>
        </View>
    );

    const renderSummary = () => {
        if (!selectedEquipment) return null;

        return (
            <View style={styles.summaryCard}>
                <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.summaryHeader}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <MaterialIcons name="assignment" size={24} color="#fff" />
                    <Text style={styles.summaryTitle}>Resumo da Seleção</Text>
                </LinearGradient>

                <View style={styles.summaryContent}>
                    <View style={styles.summaryRow}>
                        <Ionicons name="business" size={16} color="#667eea" />
                        <Text style={styles.summaryLabel}>Cliente:</Text>
                        <Text style={styles.summaryValue}>{selectedClient?.name}</Text>
                    </View>

                                     <View style={styles.summaryRow}>
                     <Ionicons name="business" size={16} color="#667eea" />
                     <Text style={styles.summaryLabel}>Setor:</Text>
                     <Text style={styles.summaryValue}>{selectedSector?.name}</Text>
                 </View>

                    <View style={styles.summaryRow}>
                        <MaterialIcons name="build" size={16} color="#667eea" />
                        <Text style={styles.summaryLabel}>Equipamento:</Text>
                        <Text style={styles.summaryValue}>{selectedEquipment.tag || "Sem Tag"}</Text>
                    </View>

                    <View style={styles.summaryRow}>
                        <Ionicons name="card" size={16} color="#667eea" />
                        <Text style={styles.summaryLabel}>Patrimônio:</Text>
                        <Text style={styles.summaryValue}>{selectedEquipment.patrimony || "N/A"}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {renderHeader()}

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {renderStepIndicator()}

                <View style={styles.content}>
                    {/* Step 1: Seleção de Cliente */}
                    <View style={styles.stepSection}>
                        <View style={styles.stepHeader}>
                            <Ionicons name="business" size={24} color="#667eea" />
                            <Text style={styles.stepTitle}>Selecione um Cliente</Text>
                        </View>

                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#667eea" />
                                <Text style={styles.loadingText}>Carregando clientes...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={clients}
                                renderItem={renderClientCard}
                                keyExtractor={(item) => item.id.toString()}
                                scrollEnabled={false}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <MaterialIcons name="business" size={60} color="#ccc" />
                                        <Text style={styles.emptyText}>Nenhum cliente encontrado</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>

                    {/* Step 2: Seleção de Setor */}
                    {selectedClient && (
                        <View style={styles.stepSection}>
                                                     <View style={styles.stepHeader}>
                             <Ionicons name="business" size={24} color="#667eea" />
                             <Text style={styles.stepTitle}>Selecione um Setor</Text>
                         </View>

                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#667eea" />
                                    <Text style={styles.loadingText}>Carregando setores...</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={sectors}
                                    renderItem={renderSectorCard}
                                    keyExtractor={(item) => item.id.toString()}
                                    scrollEnabled={false}
                                    ListEmptyComponent={
                                        <View style={styles.emptyContainer}>
                                                                                         <MaterialIcons name="business" size={60} color="#ccc" />
                                            <Text style={styles.emptyText}>Nenhum setor encontrado</Text>
                                        </View>
                                    }
                                />
                            )}
                        </View>
                    )}

                    {/* Step 3: Seleção de Equipamento */}
                    {selectedSector && (
                        <View style={styles.stepSection}>
                            <View style={styles.stepHeader}>
                                <MaterialIcons name="build" size={24} color="#667eea" />
                                <Text style={styles.stepTitle}>Selecione um Equipamento</Text>
                            </View>

                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#667eea" />
                                    <Text style={styles.loadingText}>Carregando equipamentos...</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={equipments}
                                    renderItem={renderEquipmentCard}
                                    keyExtractor={(item) => item.id.toString()}
                                    scrollEnabled={false}
                                    ListEmptyComponent={
                                        <View style={styles.emptyContainer}>
                                            <MaterialIcons name="build" size={60} color="#ccc" />
                                            <Text style={styles.emptyText}>Nenhum equipamento encontrado</Text>
                                        </View>
                                    }
                                />
                            )}
                        </View>
                    )}

                    {renderSummary()}
                </View>
            </ScrollView>

            {/* Botões de Ação */}
            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="close" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.createButton, !selectedEquipment && styles.createButtonDisabled]}
                    onPress={handleCreateServiceOrder}
                    disabled={creating || !selectedEquipment}
                >
                    {creating ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <MaterialIcons name="add" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Criar OS</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
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
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        backgroundColor: '#fff',
        marginTop: 20,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    stepContainer: {
        alignItems: 'center',
    },
    stepCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e9ecef',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    stepCircleActive: {
        backgroundColor: '#667eea',
    },
    stepNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6c757d',
    },
    stepNumberActive: {
        color: '#fff',
    },
    stepLabel: {
        fontSize: 12,
        color: '#6c757d',
        fontWeight: '500',
    },
    stepLabelActive: {
        color: '#667eea',
    },
    stepLine: {
        width: 40,
        height: 2,
        backgroundColor: '#e9ecef',
        marginHorizontal: 8,
    },
    stepLineActive: {
        backgroundColor: '#667eea',
    },
    content: {
        paddingTop: 20,
    },
    stepSection: {
        marginBottom: 24,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginLeft: 12,
    },
    selectionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectionCardSelected: {
        borderColor: '#667eea',
        backgroundColor: '#f8f9ff',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginLeft: 12,
        flex: 1,
    },
    cardTitleSelected: {
        color: '#667eea',
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#6c757d',
        marginLeft: 36,
    },
    equipmentInfo: {
        marginLeft: 36,
    },
    equipmentDetail: {
        fontSize: 14,
        color: '#6c757d',
        marginBottom: 4,
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    summaryHeader: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 12,
    },
    summaryContent: {
        padding: 20,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginLeft: 8,
        marginRight: 8,
        minWidth: 80,
    },
    summaryValue: {
        fontSize: 14,
        color: '#6c757d',
        flex: 1,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6c757d',
        marginTop: 16,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#6c757d',
        marginTop: 16,
        textAlign: 'center',
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
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    createButton: {
        backgroundColor: '#667eea',
    },
    createButtonDisabled: {
        backgroundColor: '#adb5bd',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default CreateServiceOrderScreen;
