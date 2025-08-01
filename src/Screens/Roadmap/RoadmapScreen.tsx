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

interface RoadmapScreenProps {
    navigation: any;
}

const { width } = Dimensions.get('window');

const RoadmapScreen: React.FC<RoadmapScreenProps> = ({ navigation }) => {
    const { t } = useLanguage();
    const [activities, setActivities] = useState<RoadmapActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentDate] = useState(new Date());

    const loadRoadmap = async () => {
        try {
            setLoading(true);
            const response = await RoadmapService.getCurrentRoadmap();
            setActivities(response.activities);
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao carregar roteiro');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            // Força a busca da API limpando o cache antes
            await OfflineService.cacheData(CURRENT_ROADMAP_CACHE_KEY, null);
            await loadRoadmap();
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao atualizar roteiro');
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadRoadmap();
    }, []);

    const getStatusColor = (status: RoadmapActivity['status']) => {
        switch (status) {
            case 'pending':
                return '#FFA500';
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
            case 'pending':
                return t('roadmap.pending');
            case 'in_progress':
                return t('roadmap.inProgress');
            case 'completed':
                return t('roadmap.completed');
            case 'cancelled':
                return t('roadmap.cancelled');
            default:
                return 'Desconhecido';
        }
    };

    const getPriorityColor = (priority: RoadmapActivity['priority']) => {
        switch (priority) {
            case 'high':
                return '#DC3545';
            case 'medium':
                return '#FFA500';
            case 'low':
                return '#28A745';
            default:
                return '#6C757D';
        }
    };

    const getPriorityText = (priority: RoadmapActivity['priority']) => {
        switch (priority) {
            case 'high':
                return t('roadmap.high');
            case 'medium':
                return t('roadmap.medium');
            case 'low':
                return t('roadmap.low');
            default:
                return 'Desconhecida';
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
                return 'Atividade';
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
        navigation.navigate('RoadmapActivityDetails', { activity });
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
                <View style={styles.priorityContainer}>
                    <View
                        style={[
                            styles.priorityBadge,
                            { backgroundColor: getPriorityColor(item.priority) }
                        ]}
                    >
                        <Text style={styles.priorityText}>{getPriorityText(item.priority)}</Text>
                    </View>
                </View>

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
                <Text style={styles.headerTitle}>{t('roadmap.dayRoadmap')}</Text>
                <Text style={styles.headerDate}>
                    {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Text>
                <Text style={styles.headerSubtitle}>
                    {activities.length} {t('roadmap.activitiesCount')}
                </Text>
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
    },
    header: {
        backgroundColor: '#007BFF',
        padding: 20,
        paddingTop: 40,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    headerDate: {
        fontSize: 16,
        color: '#fff',
        opacity: 0.9,
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.8,
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
    },
    typeContainer: {
        alignItems: 'flex-end',
    },
    typeText: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
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
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
});

export default RoadmapScreen;