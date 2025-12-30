import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoadmapService } from '../../Services/RoadmapService';
import { RoadmapActivity } from '../../Models/Roadmap';
import { useLanguage } from '../../Context/LanguageContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OfflineService from '../../Services/OfflineService';
import ResponsiveContainer from '../../Components/ResponsiveContainer';
import ResponsiveText from '../../Components/ResponsiveText';
import { useResponsive } from '../../hooks/useResponsive';

interface RoadmapScreenProps {
    navigation: any;
}

const CURRENT_ROADMAP_CACHE_KEY = 'current_roadmap_cache';

const RoadmapScreen: React.FC<RoadmapScreenProps> = ({ navigation }) => {
    const { t } = useLanguage();
    const r = useResponsive();
    const [activities, setActivities] = useState<RoadmapActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentDate] = useState(new Date());

    const loadRoadmap = async () => {
        try {
            console.log('[RoadmapScreen] === INICIANDO loadRoadmap ===');
            setLoading(true);

            const response = await RoadmapService.getCurrentRoadmap();
            console.log('[RoadmapScreen] 📦 Dados recebidos do RoadmapService');
            console.log('[RoadmapScreen] 📊 Estatísticas:', {
                hasActivities: !!response.activities,
                activitiesCount: response.activities?.length || 0,
                fromCache: response.fromCache,
                offline: response.offline,
                hasError: !!response.error
            });

            // Os dados já foram processados no RoadmapService
            const validActivities = response.activities;

            console.log('[RoadmapScreen] ✅ Atividades processadas:', validActivities.length);
            setActivities(validActivities);

            // Mostrar feedback se os dados vieram do cache
            if (response.fromCache || response.offline) {
                console.warn('[RoadmapScreen] ⚠️ Dados carregados do CACHE (modo offline)');
                Alert.alert(
                    'Modo Offline',
                    'Roteiro carregado do cache local. Os dados podem estar desatualizados. Conecte-se à internet e puxe para baixo para atualizar.',
                    [{ text: 'Entendi' }]
                );
            } else {
                console.log('[RoadmapScreen] ✅ Dados carregados do SERVIDOR (atualizados)');
            }
        } catch (error: any) {
            console.error('[RoadmapScreen] ❌❌❌ ERRO ao carregar roteiro ❌❌❌');
            console.error('[RoadmapScreen] 🔴 Tipo do erro:', typeof error);
            console.error('[RoadmapScreen] 🔴 Nome do erro:', error?.constructor?.name);
            console.error('[RoadmapScreen] 🔴 Mensagem do erro:', error.message);
            console.error('[RoadmapScreen] 🔴 Stack:', error.stack);

            // Se não há roteiros para o dia, não mostrar erro
            if (error.message && error.message.includes('Nenhum roteiro encontrado')) {
                console.log('[RoadmapScreen] ℹ️ Nenhum roteiro para o dia atual (comportamento esperado)');
                setActivities([]);
                // Não mostrar alerta de erro, apenas informativo
            } else if (error.message && error.message.includes('Sem conexão')) {
                console.error('[RoadmapScreen] 🌐 Erro de conexão sem cache disponível');
                setActivities([]);
                Alert.alert(
                    'Sem Conexão',
                    'Não foi possível carregar o roteiro. Verifique sua conexão com a internet e tente novamente.',
                    [{ text: 'OK' }]
                );
            } else {
                // Outros erros
                setActivities([]);
                Alert.alert(
                    'Erro ao Carregar Roteiro',
                    error.message || 'Erro inesperado ao carregar roteiro. Por favor, tente novamente.',
                    [
                        {
                            text: 'Ver Detalhes',
                            onPress: () => {
                                Alert.alert(
                                    'Detalhes do Erro',
                                    `Tipo: ${error?.constructor?.name || 'Desconhecido'}\n\nMensagem: ${error.message || 'Sem mensagem'}`
                                );
                            }
                        },
                        { text: 'OK' }
                    ]
                );
            }
        } finally {
            setLoading(false);
            console.log('[RoadmapScreen] === FINALIZANDO loadRoadmap ===');
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            console.log('[RoadmapScreen] === INICIANDO REFRESH (Pull to Refresh) ===');
            console.log('[RoadmapScreen] 🔄 Forçando atualização do servidor...');
            
            // Força a busca da API usando forceRefresh
            const response = await RoadmapService.getCurrentRoadmap(true);
            
            console.log('[RoadmapScreen] 📦 Dados do refresh recebidos');
            console.log('[RoadmapScreen] 📊 Estatísticas do refresh:', {
                activitiesCount: response.activities?.length || 0,
                fromCache: response.fromCache,
                offline: response.offline,
                hasError: !!response.error
            });

            // Os dados já foram processados no RoadmapService
            const validActivities = response.activities;

            console.log('[RoadmapScreen] ✅ Atividades validadas do refresh:', validActivities.length);
            setActivities(validActivities);

            // Feedback ao usuário sobre o refresh
            if (response.fromCache || response.offline) {
                console.warn('[RoadmapScreen] ⚠️ Refresh usou CACHE (sem conexão)');
                Alert.alert(
                    'Dados Locais',
                    'Não foi possível atualizar do servidor. Mostrando dados locais salvos anteriormente.',
                    [{ text: 'OK' }]
                );
            } else {
                console.log('[RoadmapScreen] ✅ Refresh do SERVIDOR bem-sucedido!');
                // Pequeno feedback visual de sucesso (opcional)
            }
        } catch (error: any) {
            console.error('[RoadmapScreen] ❌❌❌ ERRO no refresh ❌❌❌');
            console.error('[RoadmapScreen] 🔴 Tipo:', error?.constructor?.name);
            console.error('[RoadmapScreen] 🔴 Mensagem:', error.message);
            
            // Tratamento específico por tipo de erro
            if (error.message && error.message.includes('Nenhum roteiro encontrado')) {
                console.log('[RoadmapScreen] ℹ️ Nenhum roteiro disponível (404)');
                setActivities([]);
                // Não mostrar erro, apenas limpar a lista
            } else if (error.message && error.message.includes('Token inválido')) {
                Alert.alert(
                    'Sessão Expirada',
                    'Sua sessão expirou. Por favor, faça login novamente.',
                    [{ text: 'OK' }]
                );
            } else if (error.message && error.message.includes('conexão') || error.message.includes('conectar')) {
                Alert.alert(
                    'Erro de Conexão',
                    'Não foi possível conectar ao servidor. Verifique sua internet.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert(
                    'Erro ao Atualizar',
                    error.message || 'Erro ao atualizar roteiro. Tente novamente.',
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setRefreshing(false);
            console.log('[RoadmapScreen] === FINALIZANDO REFRESH ===');
        }
    };

    useEffect(() => {
        loadRoadmap();
    }, []);

    const getStatusColor = (status: RoadmapActivity['status']) => {
        switch (status) {
            case 'created':
                return '#6C757D';
            case 'open':
                return '#17A2B8';
            case 'pending':
                return '#FFA500';
            case 'close':
                return '#28A745';
            case 'archived':
                return '#DC3545';
            case 'in_progress':
                return '#007BFF';
            case 'completed':
                return '#28A745';
            case 'cancelled':
                return '#DC3545';
            default:
                return '#6C757D';
        }
    };

    const getStatusText = (status: RoadmapActivity['status']) => {
        switch (status) {
            case 'created':
                return 'Criado';
            case 'open':
                return 'Aberto';
            case 'pending':
                return t('roadmap.pending');
            case 'close':
                return 'Fechado';
            case 'archived':
                return 'Arquivado';
            case 'in_progress':
                return t('roadmap.inProgress');
            case 'completed':
                return t('roadmap.completed');
            case 'cancelled':
                return t('roadmap.cancelled');
            default:
                console.warn(`[RoadmapScreen] Status desconhecido: ${status}`);
                return 'Criado'; // Fallback para created
        }
    };



    const getTypeIcon = (type: RoadmapActivity['type']) => {
        switch (type) {
            case 'maintenance':
                return 'construct';
            case 'repair':
                return 'hammer';
            case 'inspection':
                return 'search';
            case 'installation':
                return 'cube';
            default:
                return 'document';
        }
    };

    const getTypeText = (type: RoadmapActivity['type']) => {
        switch (type) {
            case 'maintenance':
                return t('roadmap.maintenance');
            case 'repair':
                return t('roadmap.repair');
            case 'inspection':
                return t('roadmap.inspection');
            case 'installation':
                return t('roadmap.installation');
            default:
                console.warn(`[RoadmapScreen] Tipo desconhecido: ${type}`);
                return t('roadmap.maintenance'); // Fallback para maintenance
        }
    };

    const formatTime = (timeString: string) => {
        try {
            const date = new Date(timeString);
            return format(date, 'HH:mm', { locale: ptBR });
        } catch {
            return '--:--';
        }
    };

    const handleActivityPress = (activity: RoadmapActivity) => {
        navigation.navigate('RoadmapDetailsScreen', { activity });
    };

    const renderActivityItem = ({ item }: { item: RoadmapActivity }) => (
        <TouchableOpacity
            style={styles.activityCard}
            onPress={() => handleActivityPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.activityHeader}>
                <View style={styles.activityTitleContainer}>
                    <Ionicons
                        name={getTypeIcon(item.type) as any}
                        size={r.responsiveFontSize(20, { max: 1.5 })}
                        color="#007BFF"
                        style={styles.typeIcon}
                    />
                    <ResponsiveText variant="subtitle" style={styles.activityTitle} numberOfLines={2}>
                        {item.title}
                    </ResponsiveText>
                </View>
                <View style={styles.statusContainer}>
                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(item.status) }
                        ]}
                    >
                        <ResponsiveText variant="caption" maxFontSizeMultiplier={1.3} style={styles.statusText}>
                            {getStatusText(item.status)}
                        </ResponsiveText>
                    </View>
                </View>
            </View>

            <View style={styles.activityInfo}>
                <View style={styles.infoRow}>
                    <Ionicons name="business" size={r.responsiveFontSize(16, { max: 1.5 })} color="#666" />
                    <ResponsiveText variant="body" style={styles.infoText} numberOfLines={1}>
                        {item.clientName}
                    </ResponsiveText>
                </View>

                {item.equipmentName && (
                    <View style={styles.infoRow}>
                        <Ionicons name="hardware-chip" size={r.responsiveFontSize(16, { max: 1.5 })} color="#666" />
                        <ResponsiveText variant="body" style={styles.infoText} numberOfLines={1}>
                            {item.equipmentName}
                        </ResponsiveText>
                    </View>
                )}

                <View style={styles.infoRow}>
                    <Ionicons name="location" size={r.responsiveFontSize(16, { max: 1.5 })} color="#666" />
                    <ResponsiveText variant="body" style={styles.infoText} numberOfLines={1}>
                        {item.address}
                    </ResponsiveText>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="time" size={r.responsiveFontSize(16, { max: 1.5 })} color="#666" />
                    <ResponsiveText variant="body" style={styles.infoText}>
                        {formatTime(item.scheduledTime)}
                    </ResponsiveText>
                </View>
            </View>

            <View style={styles.activityFooter}>
                <View style={styles.typeContainer}>
                    <ResponsiveText variant="caption" maxFontSizeMultiplier={1.3} style={styles.typeText}>
                        {getTypeText(item.type)}
                    </ResponsiveText>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={r.responsiveFontSize(64, { max: 1.5 })} color="#ccc" />
            <ResponsiveText variant="subtitle" style={styles.emptyTitle}>
                {t('roadmap.noActivitiesFound')}
            </ResponsiveText>
            <ResponsiveText variant="body" style={styles.emptySubtitle}>
                {t('roadmap.noActivitiesSubtitle')}
            </ResponsiveText>
        </View>
    );

    if (loading) {
        return (
            <ResponsiveContainer withPadding={false} style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007BFF" />
                <ResponsiveText variant="body" style={styles.loadingText}>
                    {t('roadmap.loading')}
                </ResponsiveText>
            </ResponsiveContainer>
        );
    }

    return (
        <ResponsiveContainer withPadding={false} style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerInfo}>
                    <ResponsiveText variant="title" style={styles.headerTitle} numberOfLines={2}>
                        {t('roadmap.dayRoadmap')}
                    </ResponsiveText>
                    <ResponsiveText variant="body" style={styles.headerDate} numberOfLines={1}>
                        {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </ResponsiveText>
                    <ResponsiveText variant="caption" style={styles.headerSubtitle}>
                        {activities.length} {t('roadmap.activitiesCount')}
                    </ResponsiveText>
                </View>
                <TouchableOpacity
                    style={[styles.refreshButton, { minHeight: r.verticalScale(44), minWidth: r.verticalScale(44) }]}
                    onPress={onRefresh}
                    disabled={refreshing}
                >
                    <Ionicons
                        name="refresh-outline"
                        size={32}
                        color="#fff"
                    />
                </TouchableOpacity>
            </View>

            <FlatList
                data={activities}
                renderItem={renderActivityItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={[styles.listContainer, { paddingBottom: r.height * 0.1 }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
            />
        </ResponsiveContainer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        backgroundColor: 'transparent',
    },
    header: {
        backgroundColor: '#007BFF',
        padding: 20,
        paddingTop: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
    },
    headerInfo: {
        flex: 1,
        minWidth: 200,
    },
    refreshButton: {
        padding: 10,
        marginLeft: 10,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 40,
        minHeight: 40,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
        backgroundColor: 'transparent',
    },
    headerDate: {
        color: '#fff',
        opacity: 0.9,
        marginBottom: 5,
        backgroundColor: 'transparent',
    },
    headerSubtitle: {
        color: '#fff',
        opacity: 0.8,
        backgroundColor: 'transparent',
    },
    listContainer: {
        padding: 16,
    },
    activityCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    activityTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    typeIcon: {
        marginRight: 8,
    },
    activityTitle: {
        fontWeight: '600',
        color: '#333',
        flex: 1,
        backgroundColor: 'transparent',
    },
    statusContainer: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontWeight: '600',
        color: '#fff',
        backgroundColor: 'transparent',
    },
    activityInfo: {
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        flexShrink: 1,
    },
    infoText: {
        color: '#666',
        marginLeft: 8,
        flex: 1,
        backgroundColor: 'transparent',
    },
    activityFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priorityContainer: {
        alignItems: 'flex-start',
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    priorityText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        backgroundColor: 'transparent',
    },
    typeContainer: {
        alignItems: 'flex-end',
    },
    typeText: {
        color: '#666',
        fontStyle: 'italic',
        backgroundColor: 'transparent',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontWeight: '600',
        color: '#666',
        marginTop: 16,
        marginBottom: 8,
        backgroundColor: 'transparent',
    },
    emptySubtitle: {
        color: '#999',
        textAlign: 'center',
        backgroundColor: 'transparent',
    },
});

export default RoadmapScreen;