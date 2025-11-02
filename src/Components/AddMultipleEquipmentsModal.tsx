import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
    ScrollView,
    Platform,
    Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import EquipamentService from '../Services/EquipamentService';
import ActivityService from '../Services/ActivityService';
import BrandService from '../Services/BrandService';
import EquipmentTypeService from '../Services/EquipmentTypeService';
import { Equipment } from '../Models/Equipament';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../Context/ApiClient';
import CustomPicker from './CustomPicker';
import DynamicEquipmentFields from './DynamicEquipmentFields';

interface AddMultipleEquipmentsModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: (addedCount: number) => void;
    activityId: number;
    clientId?: number;
    sectorId?: number;
}

const EMPTY_FIELDS = {};

const AddMultipleEquipmentsModal: React.FC<AddMultipleEquipmentsModalProps> = ({
    visible,
    onClose,
    onSuccess,
    activityId,
    clientId,
    sectorId
}) => {
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [selectedEquipmentsIds, setSelectedEquipmentsIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [adding, setAdding] = useState(false);
    const [keyboardPadding, setKeyboardPadding] = useState(0);

    const [showCreate, setShowCreate] = useState(false);
    const [brands, setBrands] = useState<any[]>([]);
    const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
    const [loadingMeta, setLoadingMeta] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [newBrandId, setNewBrandId] = useState<string>('');
    const [newEquipmentTypeId, setNewEquipmentTypeId] = useState<string>('');
    const [newDynamicFields, setNewDynamicFields] = useState<{ [key: string]: any }>(EMPTY_FIELDS);
    const [pendingNewEquipments, setPendingNewEquipments] = useState<Array<{
        tempId: number;
        tag: string;
        brand_id: number;
        equipment_type_id: number;
        additional_fields: { [key: string]: any };
    }>>([]);

    const loadEquipments = useCallback(async (isRefreshing: boolean = false) => {
        if (isRefreshing) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) throw new Error('Token não encontrado');

            if (!clientId) {
                setEquipments([]);
            } else {
                const filters: any = {
                    page: 1,
                    per_page: 100,
                    is_active: true,
                    client_id: clientId
                };

                const response = await EquipamentService.fetchEquipments(String(token), filters as any);
                const list = response.results || [];
                setEquipments(list as any);
            }
        } catch (error: any) {
            setEquipments([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [clientId]);

    const loadMeta = useCallback(async () => {
        setLoadingMeta(true);
        try {
            const [brandsResponse, typesResponse] = await Promise.all([
                BrandService.fetchBrands(),
                EquipmentTypeService.fetchEquipmentTypes()
            ]);

            setBrands(brandsResponse);
            setEquipmentTypes(typesResponse);
        } catch (error) {
            console.error('[AddMultipleEquipmentsModal] Erro ao carregar metadados:', error);
        } finally {
            setLoadingMeta(false);
        }
    }, []);

    const filteredEquipments = useMemo(() => {
        if (!search.trim()) return equipments;
        const searchLower = search.toLowerCase();
        return equipments.filter(eq =>
            eq.tag?.toLowerCase().includes(searchLower) ||
            eq.client?.name?.toLowerCase().includes(searchLower) ||
            eq.sector?.complete_name?.toLowerCase().includes(searchLower)
        );
    }, [equipments, search]);

    useEffect(() => {
        if (visible) {
            loadEquipments();
            setSelectedEquipmentsIds([]);
            setSearch('');
            setShowCreate(false);
            setNewTag('');
            setNewBrandId('');
            setNewEquipmentTypeId('');
            setNewDynamicFields(EMPTY_FIELDS);
            setPendingNewEquipments([]);
            loadMeta();
        }
    }, [visible, loadEquipments, loadMeta]);

    // Ajusta padding e posição do footer conforme altura do teclado
    useEffect(() => {
        const onShow = (e: any) => {
            const h = e?.endCoordinates?.height ?? 0;
            setKeyboardPadding(h);
        };
        const onHide = () => setKeyboardPadding(0);

        const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', onShow);
        const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', onHide);

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

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

    const getCreatedEquipmentId = (created: any): number | null => {
        if (!created) return null;
        const directId = (created as any)?.id;
        const nestedId = (created as any)?.data?.id;
        const resultsFirstId = Array.isArray((created as any)?.results) ? (created as any).results[0]?.id : undefined;
        const idCandidate = Number(directId ?? nestedId ?? resultsFirstId);
        return Number.isFinite(idCandidate) ? idCandidate : null;
    };

    const handleConfirm = async () => {
        if (!activityId) {
            Alert.alert('Erro', 'ID da atividade não encontrado.');
            return;
        }

        if (clientId && pendingNewEquipments.length > 0) {
            if (!sectorId) {
                Alert.alert('Setor Obrigatório', 'É necessário selecionar um setor para criar equipamentos.');
                return;
            }
        }

        if (selectedEquipmentsIds.length === 0) {
            Alert.alert('Atenção', 'Selecione pelo menos um equipamento');
            return;
        }

        setAdding(true);

        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) throw new Error('Token não encontrado.');

            const selectedSet = new Set(selectedEquipmentsIds);
            const isPendingId = (id: number) => id < 0;
            const existingIds = selectedEquipmentsIds.filter(id => !isPendingId(id));
            const pendingSelected = pendingNewEquipments.filter(p => selectedSet.has(p.tempId));

            const activityService = new ActivityService();

            if (clientId) {
                const createdIds: number[] = [];
                if (pendingSelected.length > 0) {
                    const created = await Promise.all(pendingSelected.map(async (p) => {
                        const payload: any = {
                            client_id: parseInt(String(clientId), 10),
                            sector_id: parseInt(String(sectorId), 10),
                            brand_id: parseInt(String(p.brand_id), 10),
                            equipment_type_id: parseInt(String(p.equipment_type_id), 10),
                            tag: p.tag?.trim?.() || '',
                            additional_fields: p.additional_fields || {}
                        };

                        if (!payload.additional_fields || typeof payload.additional_fields !== 'object' || Array.isArray(payload.additional_fields)) {
                            payload.additional_fields = {};
                        }

                        const createdEq = await EquipamentService.createEquipment(String(token), payload);
                        const createdId = getCreatedEquipmentId(createdEq);
                        if (!createdId) {
                            throw new Error('Resposta inválida do servidor ao criar equipamento.');
                        }
                        return createdId;
                    }));
                    createdIds.push(...created);
                }

                const finalIds = [...existingIds, ...createdIds];
                if (finalIds.length === 0) throw new Error('Nada para adicionar.');

                await activityService.addMultipleEquipmentsToActivity(
                    activityId,
                    finalIds,
                    String(token)
                );
            } else {
                if (pendingSelected.length === 0) {
                    throw new Error('Nenhum equipamento novo informado.');
                }

                const equipmentsPayload = pendingSelected.map(p => ({
                    brand_id: parseInt(String(p.brand_id), 10),
                    equipment_type_id: parseInt(String(p.equipment_type_id), 10),
                    tag: p.tag?.trim() || '',
                    additional_fields: p.additional_fields || {}
                }));

                await activityService.addEquipmentsPayloadToActivity(
                    activityId,
                    equipmentsPayload,
                    String(token)
                );
            }

            const total = existingIds.length + pendingSelected.length;
            Alert.alert(
                'Sucesso',
                `${total} equipamento${total > 1 ? 's' : ''} adicionado${total > 1 ? 's' : ''} com sucesso!`,
                [{ text: 'OK' }]
            );

            onSuccess(total);
            onClose();
        } catch (error: any) {
            Alert.alert('Erro', error?.message || 'Falha ao adicionar equipamentos');
        } finally {
            setAdding(false);
        }
    };

    const handleAddPending = () => {
        try {
            const brandNum = parseInt(newBrandId || '');
            const typeNum = parseInt(newEquipmentTypeId || '');
            if (!Number.isFinite(brandNum) || !Number.isFinite(typeNum)) {
                Alert.alert('Atenção', 'Preencha Fabricante e Tipo de Equipamento');
                return;
            }

            const tempId = -1 * (Date.now() % 1000000);
            const brandName = (brands.find(b => String(b.id) === String(brandNum)) || {}).name || 'Fabricante';
            const typeName = (equipmentTypes.find(t => String(t.id) === String(typeNum)) || {}).name || 'Tipo';

            const displayItem: Equipment = {
                id: tempId,
                tag: newTag.trim() || 'Sem Tag',
                patrimony: '',
                sector_id: null,
                equipment_type_id: typeNum,
                brand_id: brandNum,
                client_id: clientId || null,
                sector: { id: 0, name: '', complete_name: '' },
                client: { id: clientId || 0, name: clientId ? 'Cliente atual' : 'Novo cliente' },
                brand: { id: brandNum, name: brandName },
                equipment_type: { id: typeNum, name: typeName },
                coil_type: { id: 0, name: '' },
                evaporator_type: { id: 0, name: '' },
                condenser_type: { id: 0, name: '' },
            } as any;

            setEquipments(prev => [displayItem, ...prev]);
            setSelectedEquipmentsIds(prev => [tempId, ...prev]);

            setPendingNewEquipments(prev => [
                {
                    tempId,
                    tag: newTag.trim(),
                    brand_id: brandNum,
                    equipment_type_id: typeNum,
                    additional_fields: { ...newDynamicFields }
                },
                ...prev,
            ]);

            setNewTag('');
            setNewDynamicFields(EMPTY_FIELDS);
        } catch (error: any) {
            Alert.alert('Erro', 'Falha ao adicionar equipamento pendente.');
        }
    };

    const handleTagChange = useCallback((text: string) => {
        setNewTag(text);
    }, []);

    const handleBrandChange = useCallback((value: string) => {
        setNewBrandId(value);
    }, []);

    const handleEquipmentTypeChange = useCallback((value: string) => {
        setNewEquipmentTypeId(value);
    }, []);

    const handleDynamicFieldsChange = useCallback((fields: { [key: string]: any }) => {
        setNewDynamicFields(prev => {
            // Só atualiza se mudou de verdade
            if (JSON.stringify(prev) === JSON.stringify(fields)) return prev;
            return fields;
        });
    }, []);

    const handleClearFields = useCallback(() => {
        setNewTag('');
        setNewDynamicFields(EMPTY_FIELDS);
    }, []);

    const brandItems = useMemo(() => brands.map(b => ({
        label: b.name,
        value: String(b.id)
    })), [brands]);

    const equipmentTypeItems = useMemo(() => equipmentTypes.map(t => ({
        label: t.name,
        value: String(t.id)
    })), [equipmentTypes]);

    const renderSearchBar = useCallback(() => (
        <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
                style={styles.searchInput}
                placeholder="Buscar por tag, cliente ou setor..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor="#999"
                blurOnSubmit={false}
                returnKeyType="search"
                autoFocus={false}
                onSubmitEditing={() => { }}
                showSoftInputOnFocus={true}
            />
            {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                    <MaterialIcons name="close" size={20} color="#999" />
                </TouchableOpacity>
            )}
        </View>
    ), [search]);

    const renderCreateForm = useMemo(() => (
        <View style={styles.createContainer}>
            <TouchableOpacity onPress={() => setShowCreate(v => !v)} style={styles.createHeader}>
                <Text style={styles.createTitle}>Criar novo equipamento</Text>
                <MaterialIcons name={showCreate ? 'expand-less' : 'expand-more'} size={24} color="#667eea" />
            </TouchableOpacity>

            {showCreate && (
                <View style={styles.createContent}>
                    {loadingMeta ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#667eea" />
                            <Text style={styles.loadingText}>Carregando opções...</Text>
                        </View>
                    ) : (
                        <React.Fragment key="form-stable">
                            <TextInput
                                style={styles.input}
                                placeholder="Tag (opcional)"
                                placeholderTextColor="#999"
                                value={newTag}
                                onChangeText={handleTagChange}
                                maxLength={64}
                                returnKeyType="done"
                                blurOnSubmit={false}
                                autoFocus={false}
                                onSubmitEditing={() => { }}
                                showSoftInputOnFocus={true}
                            />
                            <CustomPicker
                                selectedValue={newBrandId}
                                onValueChange={handleBrandChange}
                                items={brandItems}
                                placeholder="Selecione o fabricante"
                                style={styles.picker}
                            />
                            <CustomPicker
                                selectedValue={newEquipmentTypeId}
                                onValueChange={handleEquipmentTypeChange}
                                items={equipmentTypeItems}
                                placeholder="Selecione o tipo de equipamento"
                                style={styles.picker}
                            />

                            <View style={{ maxHeight: 320 }}>
                                <ScrollView
                                    nestedScrollEnabled={true}
                                    keyboardShouldPersistTaps="always"
                                    showsVerticalScrollIndicator={false}
                                >
                                    <DynamicEquipmentFields
                                        key={newEquipmentTypeId || 'default'}
                                        onFieldsChange={handleDynamicFieldsChange}
                                        equipmentTypeId={newEquipmentTypeId ? Number(newEquipmentTypeId) : undefined}
                                        initialValues={newDynamicFields}
                                    />
                                </ScrollView>
                            </View>

                            <View style={styles.inlineActions}>
                                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleClearFields}>
                                    <Text style={styles.cancelButtonText}>Limpar campos</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.addButton]}
                                    onPress={handleAddPending}
                                >
                                    <MaterialIcons name="add" size={18} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.addButtonText}>Criar e adicionar</Text>
                                </TouchableOpacity>
                            </View>
                        </React.Fragment>
                    )}
                </View>
            )}
        </View>
    ), [
        showCreate,
        loadingMeta,
        newTag,
        newBrandId,
        newEquipmentTypeId,
        newDynamicFields,
        brands,
        equipmentTypes,
        handleTagChange,
        handleBrandChange,
        handleEquipmentTypeChange,
        handleDynamicFieldsChange,
        handleClearFields,
        handleAddPending
    ]);

    const renderEquipment = ({ item }: { item: Equipment }) => {
        const isSelected = selectedEquipmentsIds.includes(item.id);
        const isActive = (item as any)?.is_active === true;

        return (
            <TouchableOpacity
                style={[styles.equipmentItem, isSelected && styles.equipmentItemSelected]}
                onPress={() => toggleEquipment(item.id)}
                activeOpacity={0.7}
            >
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && (
                        <MaterialIcons name="check" size={18} color="#fff" />
                    )}
                </View>
                <View style={styles.equipmentInfo}>
                    <View style={styles.equipmentHeader}>
                        <Text style={styles.equipmentTag} numberOfLines={1}>
                            {item.tag || 'Sem Tag'}
                        </Text>
                        {isActive && (
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

    // Espaçador de rodapé para garantir rolagem quando o teclado estiver aberto
    const listFooterSpacer = useMemo(() => (
        <View style={{ height: 160 + keyboardPadding }} />
    ), [keyboardPadding]);

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
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Adicionar Equipamentos</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Inputs fora do FlatList para evitar remount e perda de foco */}
                    <View style={styles.topContent}>
                        {renderSearchBar()}
                        {renderCreateForm}
                    </View>

                    <FlatList
                        style={styles.listContainer}
                        contentContainerStyle={styles.scrollContent}
                        data={filteredEquipments}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderEquipment}
                        initialNumToRender={10}
                        removeClippedSubviews={false}
                        ListHeaderComponent={filteredEquipments.length > 0 ? renderListHeader : undefined}
                        ListFooterComponent={listFooterSpacer}
                        ListEmptyComponent={() => (
                            !loading && filteredEquipments.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <MaterialIcons name="devices" size={64} color="#ccc" />
                                    <Text style={styles.emptyText}>
                                        {search ? 'Nenhum equipamento encontrado' : 'Nenhum equipamento disponível'}
                                    </Text>
                                    {!search && !clientId && (
                                        <>
                                            <Text style={styles.emptySubtext}>
                                                Cadastre equipamentos para poder adicioná-los
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.createPromptButton}
                                                onPress={() => setShowCreate(true)}
                                            >
                                                <MaterialIcons name="add-circle" size={20} color="#667eea" />
                                                <Text style={styles.createPromptText}>Criar equipamento</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                    {!search && clientId && (
                                        <Text style={styles.emptySubtext}>
                                            Cadastre equipamentos para poder adicioná-los
                                        </Text>
                                    )}
                                </View>
                            ) : loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#667eea" />
                                    <Text style={styles.loadingText}>Carregando equipamentos...</Text>
                                </View>
                            ) : null
                        )}
                        keyboardDismissMode="on-drag"
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => loadEquipments(true)}
                                colors={['#667eea']}
                            />
                        }
                    />

                    <View style={[styles.footer, { bottom: keyboardPadding }]}>
                        <View style={styles.summary}>
                            <MaterialIcons name="playlist-add-check" size={20} color="#667eea" />
                            <Text style={styles.summaryText}>
                                {selectedEquipmentsIds.length} equipamento{selectedEquipmentsIds.length !== 1 ? 's' : ''} selecionado{selectedEquipmentsIds.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setSelectedEquipmentsIds([])}
                                disabled={adding}
                            >
                                <Text style={styles.cancelButtonText}>Limpar seleção</Text>
                            </TouchableOpacity>
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
                                onPress={handleConfirm}
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
        justifyContent: 'center',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 0,
        maxHeight: '100%',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexShrink: 0,
    },
    title: {
        fontSize: 24,
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
        height: 48,
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
        paddingBottom: 160,
    },
    scrollContent: {
        paddingBottom: 160,
        flexGrow: 1,
    },
    topContent: {
        paddingTop: 0,
    },
    createContainer: {
        marginHorizontal: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#fafafa'
    },
    createHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    createTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    createContent: {
        padding: 16,
        gap: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#333',
    },
    picker: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
        height: 50,
    },
    inlineActions: {
        flexDirection: 'row',
        gap: 12,
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
        fontSize: 16,
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
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    createPromptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#f0f4ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#667eea',
    },
    createPromptText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#667eea',
        marginLeft: 8,
    },
    equipmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        minHeight: 90,
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
        fontSize: 18,
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
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
    },
    equipmentDetails: {
        fontSize: 16,
        color: '#666',
        marginBottom: 2,
    },
    equipmentLocation: {
        fontSize: 14,
        color: '#999',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        padding: 16,
        backgroundColor: '#fff',
        flexShrink: 0,
    },
    summary: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    summaryText: {
        fontSize: 16,
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
        height: 56,
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
