import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ServicesService from '../Services/ServicesService';
import { Service } from '../Models/Service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SendToBudgetModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    activityId: number;
    activityEquipmentId: number;
}

const SendToBudgetModal: React.FC<SendToBudgetModalProps> = ({
    visible,
    onClose,
    onSuccess,
    activityId,
    activityEquipmentId
}) => {
    const [services, setServices] = useState<Service[]>([]);
    const [filteredServices, setFilteredServices] = useState<Service[]>([]);
    const [selectedServicesIds, setSelectedServicesIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const insets = useSafeAreaInsets();

    // Debounce para busca
    useEffect(() => {
        const timer = setTimeout(() => {
            filterServices(search);
        }, 300);

        return () => clearTimeout(timer);
    }, [search, services]);

    const filterServices = (searchText: string) => {
        if (!searchText.trim()) {
            setFilteredServices(services);
        } else {
            const filtered = services.filter(service =>
                service.name.toLowerCase().includes(searchText.toLowerCase())
            );
            setFilteredServices(filtered);
        }
    };

    const loadServices = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) throw new Error('Token não encontrado');

            console.log('[SendToBudgetModal] Carregando serviços globais...');
            const response = await ServicesService.fetchGlobalServices(token, 1, '');

            console.log('[SendToBudgetModal] Serviços carregados:', response.results.length);
            setServices(response.results);
            setFilteredServices(response.results);
        } catch (error: any) {
            console.error('[SendToBudgetModal] Erro ao carregar serviços:', error);
            Alert.alert('Erro', error.message || 'Erro ao carregar serviços');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            loadServices();
            setSelectedServicesIds([]);
            setSearch('');
        }
    }, [visible]);

    const toggleService = (serviceId: number) => {
        setSelectedServicesIds(prev => {
            if (prev.includes(serviceId)) {
                return prev.filter(id => id !== serviceId);
            } else {
                return [...prev, serviceId];
            }
        });
    };

    const calculateTotal = (): number => {
        return selectedServicesIds.reduce((total, id) => {
            const service = services.find(s => s.id === id);
            return total + (service?.amount || 0);
        }, 0);
    };

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value / 100); // Valor está em centavos
    };

    const handleSendToBudget = async () => {
        if (selectedServicesIds.length === 0) {
            Alert.alert('Atenção', 'Selecione pelo menos um serviço');
            return;
        }

        setSending(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) throw new Error('Token não encontrado');

            console.log('[SendToBudgetModal] Enviando para orçamento...', {
                activityId,
                activityEquipmentId,
                servicesIds: selectedServicesIds
            });

            await ServicesService.sendEquipmentToBudget(
                activityId,
                activityEquipmentId,
                selectedServicesIds,
                token
            );

            console.log('[SendToBudgetModal] Enviado com sucesso!');
            Alert.alert(
                'Sucesso',
                'Equipamento enviado para orçamento com sucesso!',
                [{
                    text: 'OK', onPress: () => {
                        onSuccess();
                        onClose();
                    }
                }]
            );
        } catch (error: any) {
            console.error('[SendToBudgetModal] Erro ao enviar:', error);
            Alert.alert('Erro', error.message || 'Erro ao enviar para orçamento');
        } finally {
            setSending(false);
        }
    };

    const renderService = ({ item }: { item: Service }) => {
        const isSelected = selectedServicesIds.includes(item.id);

        return (
            <TouchableOpacity
                style={[styles.serviceItem, isSelected && styles.serviceItemSelected]}
                onPress={() => toggleService(item.id)}
                activeOpacity={0.7}
            >
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected ? (
                        <MaterialIcons name="check" size={20} color="#fff" />
                    ) : (
                        <View style={styles.checkboxEmpty} />
                    )}
                </View>
                <View style={styles.serviceInfo}>
                    <Text style={[styles.serviceName, isSelected && styles.serviceNameSelected]}>{item.name}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={[styles.modalContainer, { paddingBottom: Math.max(16, insets.bottom) }]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>Selecionar Serviços</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <MaterialIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        <View style={styles.searchContainer}>
                            <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar serviços..."
                                placeholderTextColor="#999"
                                value={search}
                                onChangeText={setSearch}
                            />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch('')}>
                                    <MaterialIcons name="clear" size={20} color="#999" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Services List */}
                        <View style={styles.listContainer}>
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#667eea" />
                                    <Text style={styles.loadingText}>Carregando serviços...</Text>
                                </View>
                            ) : filteredServices.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <MaterialIcons name="search-off" size={48} color="#ccc" />
                                    <Text style={styles.emptyText}>
                                        {search ? 'Nenhum serviço encontrado' : 'Nenhum serviço disponível'}
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={filteredServices}
                                    renderItem={renderService}
                                    keyExtractor={(item) => item.id.toString()}
                                    maxToRenderPerBatch={10}
                                    windowSize={5}
                                    removeClippedSubviews={true}
                                    keyboardShouldPersistTaps="handled"
                                    contentContainerStyle={{ paddingBottom: 24 }}
                                />
                            )}
                        </View>

                        {/* Footer */}
                        <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom) }]}>
                            <View style={styles.summary}>
                                <Text style={styles.summaryText}>
                                    {selectedServicesIds.length} selecionado{selectedServicesIds.length !== 1 ? 's' : ''}
                                </Text>
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={onClose}
                                    disabled={sending}
                                >
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        styles.sendButton,
                                        (selectedServicesIds.length === 0 || sending) && styles.sendButtonDisabled
                                    ]}
                                    onPress={handleSendToBudget}
                                    disabled={selectedServicesIds.length === 0 || sending}
                                >
                                    {sending ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <MaterialIcons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                                            <Text style={styles.sendButtonText}>Enviar Orçamento</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '94%',
        minHeight: '60%',
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    listContainer: {
        flex: 1,
        minHeight: 200,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
        color: '#999',
    },
    serviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    serviceItemSelected: {
        backgroundColor: '#f0f4ff',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#ccc',
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    checkboxSelected: {
        borderColor: '#667eea',
        backgroundColor: '#667eea',
    },
    checkboxEmpty: {
        width: 20,
        height: 20,
        backgroundColor: 'transparent',
    },
    serviceInfo: {
        flex: 1,
    },
    serviceName: {
        fontSize: 16,
        color: '#333',
        flex: 1,
        marginRight: 8,
    },
    serviceNameSelected: {
        color: '#667eea',
        fontWeight: '600',
    },
    // serviceAmount removido da UI
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        padding: 16,
    },
    summary: {
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    summaryText: {
        fontSize: 14,
        color: '#666',
    },
    // summaryTotal removido da UI
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    sendButton: {
        backgroundColor: '#667eea',
    },
    sendButtonDisabled: {
        backgroundColor: '#ccc',
    },
    sendButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});

export default SendToBudgetModal;


