import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
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
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import EquipamentService from '../../Services/EquipamentService';
import ActivityService from '../../Services/ActivityService';
import BrandService from '../../Services/BrandService';
import EquipmentTypeService from '../../Services/EquipmentTypeService';
import ClientService from '../../Services/ClientService';
import { Equipment } from '../../Models/Equipament';
import CustomPicker from '../../Components/CustomPicker';
import DynamicEquipmentFields from '../../Components/DynamicEquipmentFields';
import { RootStackParamList } from '../../Routers/AppRouter';
import ResponsiveContainer from '../../Components/ResponsiveContainer';
import { useResponsive } from '../../hooks/useResponsive';
import apiClient from '../../Context/ApiClient';
import { useNewActivityFlow } from '../../Context/NewActivityFlowContext';

type AddMultipleEquipmentsRoute = RouteProp<RootStackParamList, 'AddMultipleEquipmentsScreen'>;

const EMPTY_FIELDS: { [key: string]: any } = {};
const EQUIPMENTS_PER_PAGE = 20;

const AddMultipleEquipmentsScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<AddMultipleEquipmentsRoute>();
    const { height: windowHeight } = useResponsive();
    const { state: flowState, resetFlow } = useNewActivityFlow();

    const activityIdFromRoute = route.params?.activityId as number | undefined;
    const activityTypeIdFromRoute = route.params?.activityTypeId as number | undefined;
    const clientIdFromRoute = route.params?.clientId as number | undefined;
    const sectorIdFromRoute = route.params?.sectorId as number | undefined;
    const activityNameFromRoute = route.params?.activityName as string | undefined;
    const clientNameFromRoute = route.params?.clientName as string | undefined;
    const fromNewActivityFlow = route.params?.fromNewActivityFlow === true;

    const effectiveActivityTypeId = (flowState?.activityType?.id ?? activityTypeIdFromRoute) as number | undefined;
    const effectiveBudgetPolicy = flowState?.activityType?.budgetPolicy;
    const effectiveClientId = (flowState?.existingClient?.clientId ?? clientIdFromRoute) as number | undefined;
    const effectiveClientName = (flowState?.existingClient?.clientName ?? clientNameFromRoute) as string | undefined;
    const effectiveSectorId = (flowState?.existingClient?.sectorId ?? sectorIdFromRoute) as number | undefined;

    const isNewClientFlow = fromNewActivityFlow && flowState?.clientMode === 'new';

    const [activityId, setActivityId] = useState<number | undefined>(activityIdFromRoute);

    // Guards contra toques duplos e corrida de criação
    const creatingActivityPromiseRef = React.useRef<Promise<number> | null>(null);
    const isSubmittingRef = React.useRef(false);

    async function createActivityIfNeeded(params: { clientId: number; activityTypeId: number; activityName?: string }): Promise<number> {
        if (activityId) return activityId;
        if (creatingActivityPromiseRef.current) return creatingActivityPromiseRef.current;

        const today = new Date();
        const timestamp = new Date().getTime();
        const uniqueSuffix = timestamp.toString().slice(-6);
        const generatedName = params.activityName || `Atividade ${effectiveClientName || ''} ${today.toLocaleDateString('pt-BR')} #${uniqueSuffix}`.trim();

        const p = (async () => {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) throw new Error('Token não encontrado.');
            const payload = {
                name: generatedName,
                activity_type_id: params.activityTypeId,
                client_id: params.clientId,
                observation: ''
            };
            console.log('[AddMultipleEquipmentsScreen] (helper) Criando atividade com payload:', payload);
            const created = await new ActivityService().createActivity(payload, String(token));
            if (!created?.id) throw new Error('Falha ao criar atividade');
            setActivityId(created.id);
            return created.id as number;
        })();
        creatingActivityPromiseRef.current = p;
        try {
            return await p;
        } finally {
            creatingActivityPromiseRef.current = null;
        }
    }

    const [equipments, setEquipments] = useState<Equipment[]>([]); // inclui pendentes (id<0) + carregados do backend
    const [selectedEquipmentsIds, setSelectedEquipmentsIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
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

    const searchDebounceRef = useRef<any>(null);

    const loadEquipments = useCallback(async (opts?: { refreshing?: boolean; page?: number; append?: boolean; search?: string }) => {
        const refreshingNow = !!opts?.refreshing;
        const append = !!opts?.append;
        const targetPage = opts?.page ?? 1;
        const targetSearch = (opts?.search ?? search).trim();

        if (refreshingNow) setRefreshing(true);
        else if (append) setLoadingMore(true);
        else setLoading(true);

        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) throw new Error('Token não encontrado');

            // Novo cliente: não há equipamentos existentes para buscar
            if (isNewClientFlow) {
                setPage(1);
                setTotalCount(0);
                setEquipments(prev => prev.filter(eq => eq.id < 0)); // manter apenas pendentes
                return;
            }

            // Cliente existente: sempre filtrar via backend por client_id + sector_id
            if (!effectiveClientId || !effectiveSectorId) {
                setPage(1);
                setTotalCount(0);
                setEquipments(prev => prev.filter(eq => eq.id < 0));
                return;
            }

            const filters: any = {
                page: targetPage,
                per_page: EQUIPMENTS_PER_PAGE,
                status: 'active',
                client_id: effectiveClientId,
                sector_id: effectiveSectorId,
                ...(targetSearch ? { search: targetSearch } : {}),
            };

            const response = await EquipamentService.fetchEquipments(String(token), filters as any);
            const list = (response.results || []) as any[];
            const count = Number(response.count ?? list.length) || 0;

            setTotalCount(count);
            setPage(targetPage);
            setEquipments(prev => {
                const pending = prev.filter(eq => eq.id < 0);
                const currentServer = prev.filter(eq => eq.id >= 0);
                const nextServer = append ? [...currentServer, ...list] : list;
                return [...pending, ...nextServer] as any;
            });
        } catch (error: any) {
            // manter pendentes, limpar lista do backend
            setEquipments(prev => prev.filter(eq => eq.id < 0));
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [search, effectiveClientId, effectiveSectorId, isNewClientFlow]);

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
            console.error('[AddMultipleEquipmentsScreen] Erro ao carregar metadados:', error);
        } finally {
            setLoadingMeta(false);
        }
    }, []);

    // Busca server-side: filtramos localmente apenas os pendentes (para não sumirem na tela)
    const displayEquipments = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return equipments;
        return equipments.filter(eq => {
            if (eq.id >= 0) return true; // já vem filtrado do backend
            return (eq.tag || '').toLowerCase().includes(q);
        });
    }, [equipments, search]);

    useEffect(() => {
        // Reset visual ao entrar na tela / trocar contexto de atividade
        setSelectedEquipmentsIds([]);
        setSearch('');
        setShowCreate(false);
        setNewTag('');
        setNewBrandId('');
        setNewEquipmentTypeId('');
        setNewDynamicFields(EMPTY_FIELDS);
        setPendingNewEquipments([]);
        setEquipments([]);
        setPage(1);
        setTotalCount(0);
        loadMeta();
        // carregar primeira página (se aplicável)
        loadEquipments({ page: 1, append: false, search: '' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveClientId, effectiveSectorId, activityIdFromRoute, activityTypeIdFromRoute]);

    useEffect(() => {
        // debounce para busca server-side
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            loadEquipments({ page: 1, append: false, search });
        }, 350);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [search, loadEquipments]);

    // Teclado: padding para conteúdo e elevação do footer
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

    // Dimensões reativas já são fornecidas pelo `useResponsive()` (rotação inclusa)

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
        const filteredIds = displayEquipments.map(eq => eq.id);
        const setSel = new Set(selectedEquipmentsIds);
        const allSelected = filteredIds.every(id => setSel.has(id));
        if (allSelected) {
            setSelectedEquipmentsIds(selectedEquipmentsIds.filter(id => !filteredIds.includes(id)));
        } else {
            setSelectedEquipmentsIds(Array.from(new Set([...selectedEquipmentsIds, ...filteredIds])));
        }
    };

    const canLoadMore = useMemo(() => {
        // não conta pendentes; paginação é baseada no backend
        if (loadingMore || loading || refreshing) return false;
        if (!totalCount) return false;
        return page * EQUIPMENTS_PER_PAGE < totalCount;
    }, [loadingMore, loading, refreshing, page, totalCount]);

    const handleConfirm = async () => {
        if (selectedEquipmentsIds.length === 0) {
            Alert.alert('Atenção', 'Selecione pelo menos um equipamento');
            return;
        }

        if (isSubmittingRef.current) return; // evitar duplo clique
        isSubmittingRef.current = true;
        setAdding(true);

        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) throw new Error('Token não encontrado.');

            const activityTypeId = effectiveActivityTypeId;
            if (!activityTypeId) throw new Error('Tipo de atividade inválido.');

            const selectedSet = new Set(selectedEquipmentsIds);
            const isPendingId = (id: number) => id < 0;
            const existingIds = selectedEquipmentsIds.filter(id => !isPendingId(id));
            const pendingSelected = pendingNewEquipments.filter(p => selectedSet.has(p.tempId));

            const activityService = new ActivityService();

            // 1) Determinar cliente e setor efetivos
            let finalClientId: number | undefined = effectiveClientId;
            let finalClientName: string | undefined = effectiveClientName;
            let finalSectorId: number | undefined = effectiveSectorId;

            const cleanPhoneNumber = (p: string) => (p || '').replace(/\D/g, '');

            const resolveSectorIdForNewClient = async (clientIdNum: number, sectorName: string, subsectorName?: string): Promise<number> => {
                const normalize = (s: string) => (s || '').trim().toLowerCase();
                const wantedSector = normalize(sectorName);
                const wantedSub = normalize(subsectorName || '');

                const createSector = async (name: string, parentId?: number) => {
                    const payload: any = {
                        name: name.trim(),
                        parent_id: parentId ?? null,
                        ignores_auto_activity_mapping: false,
                    };
                    const resp = await apiClient.post(`/clients/${clientIdNum}/sectors`, payload, {
                        headers: { Authorization: `Bearer ${String(token)}` }
                    });
                    return resp.data;
                };

                const listAllSectors = async () => {
                    const r = await ClientService.getClientSectors(clientIdNum.toString(), String(token));
                    return (r.results || r || []) as any[];
                };

                let all = await listAllSectors();
                let parent = all.find((s: any) => normalize(s.name) === wantedSector) || all.find((s: any) => normalize(s.complete_name || '') === wantedSector);
                if (!parent) {
                    parent = await createSector(sectorName);
                    all = await listAllSectors();
                }
                if (!wantedSub) return parent.id;

                const childrenResp = await ClientService.getClientSectors(clientIdNum.toString(), String(token), undefined, parent.id);
                const children: any[] = childrenResp.results || childrenResp || [];
                let child = children.find((s: any) => normalize(s.name) === wantedSub) || children.find((s: any) => normalize(s.complete_name || '') === wantedSub);
                if (!child) {
                    child = await createSector(subsectorName || '', parent.id);
                }
                return child.id;
            };

            // 1.1) Novo cliente: criar cliente agora (ordem obrigatória)
            if (isNewClientFlow) {
                const draft = flowState?.newClientDraft;
                if (!draft) throw new Error('Dados do cliente não encontrados. Volte e preencha novamente.');

                const clientPayload: any = {
                    name: draft.name.trim(),
                    email: draft.email.trim(),
                    document: (draft.document || '').trim(),
                    phone: cleanPhoneNumber((draft.phone || '').trim()),
                    company_name: "",
                    company_state_registration: "",
                    company_opening_at: null,
                    is_active: true,
                    additional_fields: {
                        sector_name: draft.sectorName.trim(),
                        subsector_name: (draft.subsectorName || '').trim(),
                        contact_name: draft.contactName.trim(),
                    }
                };

                const createdClient = await ClientService.createClient(clientPayload, String(token));
                if (!createdClient?.id) throw new Error('Falha ao criar cliente.');
                finalClientId = Number(createdClient.id);
                finalClientName = String(createdClient.name || draft.name);

                // Garantir sector_id (obrigatório no nosso fluxo)
                finalSectorId = await resolveSectorIdForNewClient(finalClientId, draft.sectorName, draft.subsectorName);
            }

            // 1.2) Cliente existente: validar client/sector obrigatórios
            if (!finalClientId) throw new Error('Cliente inválido.');
            if (!finalSectorId) throw new Error('Setor inválido.');

            // 2) Criar atividade (se ainda não existir)
            const today = new Date();
            const timestamp = new Date().getTime();
            const uniqueSuffix = timestamp.toString().slice(-6);
            const generatedName = activityNameFromRoute
                || `Atividade ${finalClientName || ''} ${today.toLocaleDateString('pt-BR')} #${uniqueSuffix}`.trim();

            const effectiveActivityId = await createActivityIfNeeded({
                clientId: finalClientId,
                activityTypeId: activityTypeId,
                activityName: generatedName,
            });
            console.log('[AddMultipleEquipmentsScreen] effectiveActivityId obtido =', effectiveActivityId);

            // 2.1) Validar existência da atividade no backend antes do vínculo (mantém robustez do fluxo atual)
            try {
                await ActivityService.fetchActivityDetails(effectiveActivityId, { token: String(token) });
            } catch (e: any) {
                console.warn('[AddMultipleEquipmentsScreen] Validação da atividade falhou:', e?.message);
                throw new Error(`Falha ao validar a atividade (ID ${effectiveActivityId}). Tente novamente em instantes.`);
            }

            // 3) Criar/vincular equipamentos (sempre com sector_id)
            const sectorNum = Number(finalSectorId);

            const normalizeFields = (fields: any) => {
                const out: any = {};
                if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return out;
                Object.entries(fields).forEach(([k, v]: any) => {
                    const label = v?.label ?? k;
                    const value = v?.value ?? null;
                    const justification = v?.justification ?? '';
                    out[k] = { label, value, justification };
                });
                return out;
            };

            // 2.1) Se houver equipamentos NOVOS (pendentes), criar via endpoint múltiplo
            if (pendingSelected.length > 0) {
                const equipmentsPayload = pendingSelected.map(p => {
                    const t = (p.tag || '').trim();
                    return {
                        client_id: finalClientId,
                        sector_id: sectorNum,
                        brand_id: Number(p.brand_id),
                        equipment_type_id: Number(p.equipment_type_id),
                        ...(t ? { tag: t } : {}),
                        additional_fields: normalizeFields(p.additional_fields),
                    };
                });

                console.log('[AddMultipleEquipmentsScreen] 🔗 Criando e vinculando equipamentos NOVOS em lote (POST /activities/:id/equipments)');
                console.log('[AddMultipleEquipmentsScreen] Payload múltiplo:', JSON.stringify(equipmentsPayload, null, 2));
                await activityService.addEquipmentsPayloadToActivity(
                    effectiveActivityId,
                    equipmentsPayload,
                    String(token)
                );
            }

            // 2.2) Se houver equipamentos EXISTENTES (IDs reais), vincular por IDs
            if (existingIds.length > 0) {
                console.log('[AddMultipleEquipmentsScreen] 🔗 Vinculando equipamentos EXISTENTES por IDs:', existingIds);
                await activityService.addMultipleEquipmentsToActivity(
                    effectiveActivityId,
                    existingIds,
                    String(token)
                );
            }

            if (pendingSelected.length === 0 && existingIds.length === 0) {
                throw new Error('Nenhum equipamento selecionado para adicionar.');
            }

            const total = existingIds.length + pendingSelected.length;
            const plural = total !== 1 ? 's' : '';
            Alert.alert(
                'Sucesso',
                `${total} equipamento${plural} adicionado${plural} com sucesso!`,
                [{
                    text: 'OK',
                    onPress: () => {
                        console.log('[AddMultipleEquipmentsScreen] 🎯 Navegando para ActivityEquipmentListScreen');
                        console.log('[AddMultipleEquipmentsScreen] 📋 Parâmetros sendo enviados:', {
                            activityId: effectiveActivityId,
                            activityName: generatedName || 'Atividade',
                            clientId: finalClientId || undefined,
                            clientName: finalClientName || undefined,
                            budgetPolicy: effectiveBudgetPolicy,
                            fromNewActivityFlow: fromNewActivityFlow || undefined,
                        });

                        navigation.navigate('ActivityEquipmentListScreen', {
                            activityId: effectiveActivityId,
                            activityName: generatedName || 'Atividade',
                            clientId: finalClientId || undefined,
                            clientName: finalClientName || undefined,
                            budgetPolicy: effectiveBudgetPolicy,
                            fromNewActivityFlow: fromNewActivityFlow || undefined,
                        });
                        if (fromNewActivityFlow) {
                            try { resetFlow(); } catch { }
                        }
                    }
                }]
            );
        } catch (error: any) {
            Alert.alert('Erro', `${error?.message || 'Falha ao adicionar equipamentos'}`);
        } finally {
            isSubmittingRef.current = false;
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
                client_id: effectiveClientId || null,
                sector: { id: 0, name: '', complete_name: '' },
                client: { id: effectiveClientId || 0, name: effectiveClientId ? 'Cliente atual' : 'Novo cliente' },
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
                placeholder="Buscar por tag..."
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

    const renderCreateForm = useMemo(() => {
        // Calcula altura máxima responsiva para campos dinâmicos
        const maxDynamicFieldsHeight = Math.max(200, windowHeight * 0.25);
        
        return (
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
                                    searchable={true}
                                />
                                <CustomPicker
                                    selectedValue={newEquipmentTypeId}
                                    onValueChange={handleEquipmentTypeChange}
                                    items={equipmentTypeItems}
                                    placeholder="Selecione o tipo de equipamento"
                                    style={styles.picker}
                                    searchable={true}
                                />

                                <View style={{ maxHeight: maxDynamicFieldsHeight }}>
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
                                        <Text style={styles.cancelButtonText}>Limpar</Text>
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
        );
    }, [
        showCreate,
        loadingMeta,
        newTag,
        newBrandId,
        newEquipmentTypeId,
        newDynamicFields,
        brands,
        equipmentTypes,
        windowHeight,
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

    const listFooterSpacer = useMemo(() => (
        <View style={{ height: 160 + keyboardPadding }} />
    ), [keyboardPadding]);

    const headerTitle = useMemo(() => {
        return fromNewActivityFlow ? 'Criar Atividade' : 'Adicionar Equipamentos';
    }, [fromNewActivityFlow]);

    return (
        <ResponsiveContainer withPadding={false} style={styles.screenContainer}>
            <View style={styles.header}>
                <Text style={styles.title}>{headerTitle}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
            </View>

            <View style={styles.topContent}>
                {renderSearchBar()}
                {renderCreateForm}
            </View>

            <FlatList
                style={styles.listContainer}
                contentContainerStyle={styles.scrollContent}
                data={displayEquipments}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderEquipment}
                initialNumToRender={10}
                removeClippedSubviews={false}
                ListHeaderComponent={displayEquipments.length > 0 ? (
                    <View style={styles.listHeader}>
                        <TouchableOpacity
                            style={styles.selectAllButton}
                            onPress={selectAll}
                        >
                            <View style={[
                                styles.checkbox,
                                displayEquipments.every(eq => selectedEquipmentsIds.includes(eq.id)) && styles.checkboxSelected
                            ]}>
                                {displayEquipments.every(eq => selectedEquipmentsIds.includes(eq.id)) && (
                                    <MaterialIcons name="check" size={18} color="#fff" />
                                )}
                            </View>
                            <Text style={styles.selectAllText}>
                                {displayEquipments.every(eq => selectedEquipmentsIds.includes(eq.id)) ? 'Desmarcar todos' : 'Selecionar todos'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : undefined}
                ListFooterComponent={() => (
                    <View>
                        {canLoadMore ? (
                            <TouchableOpacity
                                style={[styles.selectAllButton, { paddingHorizontal: 16, paddingVertical: 12 }]}
                                onPress={() => loadEquipments({ page: page + 1, append: true, search })}
                                disabled={loadingMore}
                            >
                                {loadingMore ? (
                                    <ActivityIndicator size="small" color="#667eea" />
                                ) : (
                                    <>
                                        <MaterialIcons name="expand-more" size={22} color="#667eea" />
                                        <Text style={[styles.selectAllText, { marginLeft: 8 }]}>Carregar mais</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : null}
                        {listFooterSpacer}
                    </View>
                )}
                ListEmptyComponent={() => (
                    !loading && displayEquipments.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="devices" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>
                                {search ? 'Nenhum equipamento encontrado' : (isNewClientFlow ? 'Adicione equipamentos novos para continuar' : 'Nenhum equipamento disponível')}
                            </Text>
                            {!search && effectiveClientId && !isNewClientFlow && (
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
                        onRefresh={() => loadEquipments({ refreshing: true, page: 1, append: false, search })}
                        colors={['#667eea']}
                    />
                }
                onEndReachedThreshold={0.4}
                onEndReached={() => {
                    if (canLoadMore) {
                        loadEquipments({ page: page + 1, append: true, search });
                    }
                }}
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
                        onPress={() => navigation.goBack()}
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
                                <Text style={styles.addButtonText}>{fromNewActivityFlow ? 'Criar Atividade' : 'Adicionar'}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ResponsiveContainer>
    );
};

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
        zIndex: 10,
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
        marginHorizontal: 12,
        marginVertical: 12,
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
        marginBottom: 0,
    },
    scrollContent: {
        paddingBottom: 180,
        flexGrow: 1,
    },
    topContent: {
        paddingTop: 0,
    },
    createContainer: {
        marginHorizontal: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#fafafa',
        maxWidth: '100%',
    },
    createHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        minHeight: 48,
    },
    createTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    createContent: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#333',
        minHeight: 44,
    },
    picker: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
        minHeight: 48,
    },
    inlineActions: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
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
        left: 0,
        right: 0,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 20 : 12,
        backgroundColor: '#fff',
        flexShrink: 0,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 100,
    },
    summary: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        flexWrap: 'wrap',
    },
    summaryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    button: {
        flex: 1,
        minHeight: 44,
        height: 44,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 10,
        minWidth: 100,
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    cancelButtonText: {
        fontSize: 14,
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
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});

export default AddMultipleEquipmentsScreen;


