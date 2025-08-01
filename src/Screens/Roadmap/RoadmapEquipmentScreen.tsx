import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoadmapActivity } from '../../Models/Roadmap';
import { RoadmapService } from '../../Services/RoadmapService';
import { OfflineService } from '../../Services/OfflineService';
import NetInfo from '@react-native-community/netinfo';

interface RoadmapEquipmentScreenProps {
    navigation: any;
    route: {
        params: {
            activity: RoadmapActivity;
        };
    };
}

interface Equipment {
    id: number;
    name: string;
    type: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    questions_count: number;
    answered_questions_count: number;
}

const RoadmapEquipmentScreen: React.FC<RoadmapEquipmentScreenProps> = ({
    navigation,
    route,
}) => {
    const { activity } = route.params;
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadEquipment = async () => {
        try {
            setLoading(true);
            const equipmentData = await RoadmapService.getActivityEquipment(activity.id);
            setEquipment(equipmentData);
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao carregar equipamentos');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            // Limpa o cache para forçar atualização
            const cacheKey = `roadmap_equipment_${activity.id}`;
            await OfflineService.cacheData(cacheKey, null);
            await loadEquipment();
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao atualizar equipamentos');
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadEquipment();
    }, []);

    const getStatusColor = (status: Equipment['status']) => {
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

    const getStatusText = (status: Equipment['status']) => {
        switch (status) {
            case 'pending':
                return 'Pendente';
            case 'in_progress':
                return 'Em Andamento';
            case 'completed':
                return 'Concluído';
            case 'cancelled':
                return 'Cancelado';
            default:
                return 'Desconhecido';
        }
    };

    const getProgressPercentage = (equipment: Equipment) => {
        if (equipment.questions_count === 0) return 0;
        return Math.round((equipment.answered_questions_count / equipment.questions_count) * 100);
    };

    const handleEquipmentPress = (equipment: Equipment) => {
        navigation.navigate('RoadmapEquipmentQuestionsScreen', {
            activity,
            equipment,
        });
    };

    const renderEquipmentItem = ({ item }: { item: Equipment }) => {
        const progressPercentage = getProgressPercentage(item);
        
        return (
            <TouchableOpacity
                style={styles.equipmentItem}
                onPress={() => handleEquipmentPress(item)}
            >
                <View style={styles.equipmentHeader}>
                    <View style={styles.equipmentInfo}>
                        <Text style={styles.equipmentName}>{item.name}</Text>
                        <Text style={styles.equipmentType}>{item.type}</Text>
                        {item.brand && item.model && (
                            <Text style={styles.equipmentDetails}>
                                {item.brand} - {item.model}
                            </Text>
                        )}
                        {item.serial_number && (
                            <Text style={styles.equipmentDetails}>
                                S/N: {item.serial_number}
                            </Text>
                        )}
                    </View>
                    <View style={styles.equipmentStatus}>
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: getStatusColor(item.status) }
                            ]}
                        >
                            <Text style={styles.statusText}>
                                {getStatusText(item.status)}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressInfo}>
                        <Text style={styles.progressText}>
                            Questões: {item.answered_questions_count}/{item.questions_count}
                        </Text>
                        <Text style={styles.progressPercentage}>
                            {progressPercentage}%
                        </Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${progressPercentage}%` }
                            ]}
                        />
                    </View>
                </View>

                <View style={styles.equipmentFooter}>
                    <Ionicons name="chevron-forward" size={20} color="#007BFF" />
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.loadingText}>Carregando equipamentos...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Equipamentos</Text>
                <Text style={styles.subtitle}>{activity.title}</Text>
            </View>

            <FlatList
                data={equipment}
                renderItem={renderEquipmentItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#007BFF']}
                        tintColor="#007BFF"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="construct-outline" size={64} color="#6C757D" />
                        <Text style={styles.emptyText}>Nenhum equipamento encontrado</Text>
                        <Text style={styles.emptySubtext}>
                            Esta atividade não possui equipamentos associados
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E9ECEF',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#6C757D',
    },
    listContainer: {
        padding: 16,
    },
    equipmentItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    equipmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    equipmentInfo: {
        flex: 1,
        marginRight: 12,
    },
    equipmentName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#212529',
        marginBottom: 4,
    },
    equipmentType: {
        fontSize: 14,
        color: '#007BFF',
        fontWeight: '500',
        marginBottom: 4,
    },
    equipmentDetails: {
        fontSize: 12,
        color: '#6C757D',
        marginBottom: 2,
    },
    equipmentStatus: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 80,
        alignItems: 'center',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    progressContainer: {
        marginBottom: 12,
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressText: {
        fontSize: 14,
        color: '#495057',
    },
    progressPercentage: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007BFF',
    },
    progressBar: {
        height: 6,
        backgroundColor: '#E9ECEF',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#007BFF',
        borderRadius: 3,
    },
    equipmentFooter: {
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E9ECEF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6C757D',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6C757D',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#ADB5BD',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
});

export default RoadmapEquipmentScreen; 