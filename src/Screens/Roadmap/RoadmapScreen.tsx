import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoadmapService } from '../../Services/RoadmapService';
import { RoadmapActivity } from '../../Models/Roadmap';
import { useLanguage } from '../../Context/LanguageContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OfflineService from '../../Services/OfflineService';

interface RoadmapScreenProps {
    navigation: any;
}

const { width } = Dimensions.get('window');
const CURRENT_ROADMAP_CACHE_KEY = 'current_roadmap_cache';

const RoadmapScreen: React.FC<RoadmapScreenProps> = ({ navigation }) => {
    const { t } = useLanguage();
    const [activities, setActivities] = useState<RoadmapActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentDate] = useState(new Date());

    const loadRoadmap = async () => {
        try {
            console.log('[RoadmapScreen] === INICIANDO loadRoadmap ===');
            setLoading(true);

            const response = await RoadmapService.getCurrentRoadmap();
            console.log('[RoadmapScreen] Dados recebidos:', response);
            console.log('[RoadmapScreen] Atividades recebidas:', response.activities);
            console.log('[RoadmapScreen] Número de atividades:', response.activities?.length || 0);

            // Os dados já foram processados no RoadmapService
            const validActivities = response.activities;

            console.log('[RoadmapScreen] Atividades validadas:', validActivities);
            console.log('[RoadmapScreen] Número de atividades validadas:', validActivities.length);
            setActivities(validActivities);
        } catch (error: any) {
            console.error('[RoadmapScreen] Erro ao carregar roteiro:', error);
            console.error('[RoadmapScreen] Tipo do erro:', typeof error);
            console.error('[RoadmapScreen] Mensagem do erro:', error.message);

            // Se não há roteiros para o dia, não mostrar erro
            if (error.message && error.message.includes('Nenhum roteiro encontrado')) {
                console.log('[RoadmapScreen] Nenhum roteiro para o dia atual');
                setActivities([]);
            } else {
                Alert.alert('Erro', error.message || 'Erro ao carregar roteiro');
            }
        } finally {
            setLoading(false);
            console.log('[RoadmapScreen] === FINALIZANDO loadRoadmap ===');
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            console.log('[RoadmapScreen] === INICIANDO REFRESH ===');
            // Força a busca da API usando forceRefresh
            const response = await RoadmapService.getCurrentRoadmap(true);
            console.log('[RoadmapScreen] Dados do refresh recebidos:', response);
            console.log('[RoadmapScreen] Atividades do refresh:', response.activities?.length || 0);

            // Os dados já foram processados no RoadmapService
            const validActivities = response.activities;

            console.log('[RoadmapScreen] Atividades validadas do refresh:', validActivities.length);
            setActivities(validActivities);
        } catch (error: any) {
            console.error('[RoadmapScreen] Erro no refresh:', error);
            Alert.alert('Erro', error.message || 'Erro ao atualizar roteiro');
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
                        size={20}
                        color="#007BFF"
                        style={styles.typeIcon}
                    />
                    <Text style={styles.activityTitle} numberOfLines={2}>
                        {item.title}
                    </Text>
                </View>
                <View style={styles.statusContainer}>
                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(item.status) }
                        ]}
                    >
                        <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.activityInfo}>
                <View style={styles.infoRow}>
                    <Ionicons name="business" size={16} color="#666" />
                    <Text style={styles.infoText} numberOfLines={1}>
                        {item.clientName}
                    </Text>
                </View>

                {item.equipmentName && (
                    <View style={styles.infoRow}>
                        <Ionicons name="hardware-chip" size={16} color="#666" />
                        <Text style={styles.infoText} numberOfLines={1}>
                            {item.equipmentName}
                        </Text>
                    </View>
                )}

                <View style={styles.infoRow}>
                    <Ionicons name="location" size={16} color="#666" />
                    <Text style={styles.infoText} numberOfLines={1}>
                        {item.address}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="time" size={16} color="#666" />
                    <Text style={styles.infoText}>
                        {formatTime(item.scheduledTime)}
                    </Text>
                </View>
            </View>

            <View style={styles.activityFooter}>
                <View style={styles.typeContainer}>
                    <Text style={styles.typeText}>{getTypeText(item.type)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>{t('roadmap.noActivitiesFound')}</Text>
            <Text style={styles.emptySubtitle}>
                {t('roadmap.noActivitiesSubtitle')}
            </Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.loadingText}>{t('roadmap.loading')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{t('roadmap.dayRoadmap')}</Text>
                    <Text style={styles.headerDate}>
                        {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {activities.length} {t('roadmap.activitiesCount')}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={onRefresh}
                    disabled={refreshing}
                >
                    <Ionicons
                        name="refresh"
                        size={24}
                        color="#007BFF"
                    />
                </TouchableOpacity>
            </View>

            <FlatList
                data={activities}
                renderItem={renderActivityItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
            />
        </View>
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
        fontSize: 16,
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
    },
    headerInfo: {
        flex: 1,
    },
    refreshButton: {
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        marginLeft: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
        backgroundColor: 'transparent',
    },
    headerDate: {
        fontSize: 16,
        color: '#fff',
        opacity: 0.9,
        marginBottom: 5,
        backgroundColor: 'transparent',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.8,
        backgroundColor: 'transparent',
    },
    listContainer: {
        padding: 16,
        paddingBottom: 100,
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
        fontSize: 16,
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
        fontSize: 12,
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
    },
    infoText: {
        fontSize: 14,
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
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        backgroundColor: 'transparent',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginTop: 16,
        marginBottom: 8,
        backgroundColor: 'transparent',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        backgroundColor: 'transparent',
    },
});

export default RoadmapScreen;