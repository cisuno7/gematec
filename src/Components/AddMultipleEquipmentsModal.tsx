import React, { useState, useEffect } from 'react';
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
    RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import EquipamentService from '../Services/EquipamentService';
import ActivityService from '../Services/ActivityService';
import { Equipment } from '../Models/Equipament';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AddMultipleEquipmentsModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: (addedCount: number) => void;
    activityId: number;
    clientId?: number;
}

const AddMultipleEquipmentsModal: React.FC<AddMultipleEquipmentsModalProps> = ({
    visible,
    onClose,
    onSuccess,
    activityId,
    clientId
}) => {
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [filteredEquipments, setFilteredEquipments] = useState<Equipment[]>([]);
    const [selectedEquipmentsIds, setSelectedEquipmentsIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [adding, setAdding] = useState(false);

    // Debounce para busca
    useEffect(() => {
        const timer = setTimeout(() => {
            filterEquipments(search);
        }, 300);

        return () => clearTimeout(timer);
    }, [search, equipments]);

    const filterEquipments = (searchText: string) => {
        if (!searchText.trim()) {
            setFilteredEquipments(equipments);
        } else {
            const filtered = equipments.filter(equipment => {
                const matchesTag = equipment.tag?.toLowerCase().includes(searchText.toLowerCase());
                const matchesClient = equipment.client?.name?.toLowerCase().includes(searchText.toLowerCase());
                const matchesSector = equipment.sector?.complete_name?.toLowerCase().includes(searchText.toLowerCase());
                const matchesBrand = equipment.brand?.name?.toLowerCase().includes(searchText.toLowerCase());
                const matchesType = equipment.equipment_type?.name?.toLowerCase().includes(searchText.toLowerCase());

                return matchesTag || matchesClient || matchesSector || matchesBrand || matchesType;
            });
            setFilteredEquipments(filtered);
        }
    };

    const loadEquipments = async (isRefreshing: boolean = false) => {
        if (isRefreshing) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) throw new Error('Token não encontrado');

            console.log('[AddMultipleEquipmentsModal] Carregando equipamentos...');

            // Buscar equipamentos do cliente específico ou todos
            const filters: any = {
                page: 1,
                per_page: 100, // Carregar muitos para ter opções
                is_active: true
            };

            if (clientId) {
                filters.client_id = clientId;
            }

            const response = await EquipamentService.fetchEquipmentsList(filters, token);

            console.log('[AddMultipleEquipmentsModal] Equipamentos carregados:', response.results.length);
            setEquipments(response.results);
            setFilteredEquipments(response.results);
        } catch (error: any) {
            console.error('[AddMultipleEquipmentsModal] Erro ao carregar equipamentos:', error);
            Alert.alert('Erro', error.message || 'Erro ao carregar equipamentos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (visible) {
            loadEquipments();
            setSelectedEquipmentsIds([]);
            setSearch('');
        }
    }, [visible]);

    const toggleEquipment = (equipmentId: number) => {
        setSelectedEquipmentsIds(prev => {
            if (prev.includes(equipmentId)) {
                return prev.filter(id => id !== equipmentId);
            } else {
                return [...prev, equipmentId];
            }
        });
    };

    const selectAll = () => {
        if (selectedEquipmentsIds.length === filteredEquipments.length) {
            setSelectedEquipmentsIds([]);
        } else {
            setSelectedEquipmentsIds(filteredEquipments.map(eq => eq.id));
        }
    };

    const handleAddEquipments = async () => {
        if (selectedEquipmentsIds.length === 0) {
            Alert.alert('Atenção', 'Selecione pelo menos um equipamento');
            return;
        }

        setAdding(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) throw new Error('Token não encontrado');

            console.log('[AddMultipleEquipmentsModal] Adicionando equipamentos...', {
                activityId,
                equipmentsIds: selectedEquipmentsIds,
                count: selectedEquipmentsIds.length
            });

            const activityService = new ActivityService();
            await activityService.addMultipleEquipmentsToActivity(
                activityId,
                selectedEquipmentsIds,
                token
            );

            console.log('[AddMultipleEquipmentsModal] Equipamentos adicionados com sucesso!');

            Alert.alert(
                'Sucesso',
                `${selectedEquipmentsIds.length} equipamento${selectedEquipmentsIds.length > 1 ? 's' : ''} adicionado${selectedEquipmentsIds.length > 1 ? 's' : ''} com sucesso!`,
                [{
                    text: 'OK', onPress: () => {
                        onSuccess(selectedEquipmentsIds.length);
                        onClose();
                    }
                }]
            );
        } catch (error: any) {
            console.error('[AddMultipleEquipmentsModal] Erro ao adicionar:', error);
            Alert.alert('Erro', error.message || 'Erro ao adicionar equipamentos');
        } finally {
            setAdding(false);
        }
    };

    const renderEquipment = ({ item }: { item: Equipment }) => {
        const isSelected = selectedEquipmentsIds.includes(item.id);

        return (
            <TouchableOpacity
                style={[styles.equipmentItem, isSelected && styles.equipmentItemSelected]}
                onPress={() => toggleEquipment(item.id)}
                activeOpacity={0.7}
            >
                <View style={styles.checkbox}>
                    {isSelected && (
                        <MaterialIcons name="check" size={18} color="#fff" />
                    )}
                </View>
                <View style={styles.equipmentInfo}>
                    <View style={styles.equipmentHeader}>
                        <Text style={styles.equipmentTag} numberOfLines={1}>
                            {item.tag || 'Sem Tag'}
                        </Text>
                        {item.is_active && (
                            <View style={styles.activeBadge}>
                                <Text style={styles.activeBadgeText}>Ativo</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.equipmentDetails} numberOfLines={1}>
                        {item.brand?.name} - {item.equipment_type?.name}
                    </Text>
                    <Text style={styles.equipmentLocation} numberOfLines={1}>
                        <MaterialIcons name="business" size={12} color="#999" /> {item.client?.name}
                        {item.sector && ` • ${item.sector.complete_name}`}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderListHeader = () => {
        if (filteredEquipments.length === 0) return null;

        const allSelected = selectedEquipmentsIds.length === filteredEquipments.length;

        return (
            <View style={styles.listHeader}>
                <TouchableOpacity
                    style={styles.selectAllButton}
                    onPress={selectAll}
                >
                    <View style={[styles.checkbox, allSelected && styles.checkboxSelected]}>
                        {allSelected && (
                            <MaterialIcons name="check" size={18} color="#fff" />
                        )}
                    </View>
                    <Text style={styles.selectAllText}>
                        {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    </Text>
                </TouchableOpacity>
            </View>
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
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Adicionar Equipamentos</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Search */}
                    <View style={styles.searchContainer}>
                        <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar por tag, cliente, setor..."
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

                    {/* Equipments List */}
                    <View style={styles.listContainer}>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#667eea" />
                                <Text style={styles.loadingText}>Carregando equipamentos...</Text>
                            </View>
                        ) : filteredEquipments.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <MaterialIcons name="devices" size={48} color="#ccc" />
                                <Text style={styles.emptyText}>
                                    {search ? 'Nenhum equipamento encontrado' : 'Nenhum equipamento disponível'}
                                </Text>
                                {!search && (
                                    <Text style={styles.emptySubtext}>
                                        Cadastre equipamentos para poder adicioná-los
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <FlatList
                                data={filteredEquipments}
                                renderItem={renderEquipment}
                                keyExtractor={(item) => item.id.toString()}
                                ListHeaderComponent={renderListHeader}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={() => loadEquipments(true)}
                                        colors={['#667eea']}
                                    />
                                }
                                maxToRenderPerBatch={15}
                                windowSize={5}
                                removeClippedSubviews={true}
                                initialNumToRender={15}
                            />
                        )}
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <View style={styles.summary}>
                            <MaterialIcons name="playlist-add-check" size={20} color="#667eea" />
                            <Text style={styles.summaryText}>
                                {selectedEquipmentsIds.length} equipamento{selectedEquipmentsIds.length !== 1 ? 's' : ''} selecionado{selectedEquipmentsIds.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={onClose}
                                disabled={adding}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    styles.addButton,
                                    (selectedEquipmentsIds.length === 0 || adding) && styles.addButtonDisabled
                                ]}
                                onPress={handleAddEquipments}
                                disabled={selectedEquipmentsIds.length === 0 || adding}
                            >
                                {adding ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <MaterialIcons name="add" size={18} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.addButtonText}>Adicionar</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
        maxHeight: '90%',
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
        minHeight: 300,
    },
    listHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fafafa',
    },
    selectAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectAllText: {
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '600',
        color: '#667eea',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
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
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    equipmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    equipmentItemSelected: {
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
    equipmentInfo: {
        flex: 1,
    },
    equipmentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    equipmentTag: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        marginRight: 8,
    },
    activeBadge: {
        backgroundColor: '#28a745',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    activeBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#fff',
    },
    equipmentDetails: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    equipmentLocation: {
        fontSize: 12,
        color: '#999',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        padding: 16,
    },
    summary: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
    },
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
    addButton: {
        backgroundColor: '#667eea',
    },
    addButtonDisabled: {
        backgroundColor: '#ccc',
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});

export default AddMultipleEquipmentsModal;

