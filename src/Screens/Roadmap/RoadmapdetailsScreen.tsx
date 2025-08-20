import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoadmapActivity } from '../../Models/Roadmap';
import { RoadmapService } from '../../Services/RoadmapService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NetInfo from '@react-native-community/netinfo';
import OfflineService from '../../Services/OfflineService';
import { useLanguage } from '../../Context/LanguageContext';


interface RoadmapActivityDetailsScreenProps {
    navigation: any;
    route: {
        params: {
            activity: RoadmapActivity;
        };
    };
}

const RoadmapActivityDetailsScreen: React.FC<RoadmapActivityDetailsScreenProps> = ({
    navigation,
    route,
}) => {
    const { activity } = route.params;
    const { t } = useLanguage();
    const [currentActivity, setCurrentActivity] = useState(activity);

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
                return 'Criado';
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
                return t('activity.title');
        }
    };

    const formatDateTime = (dateTimeString: string) => {
        try {
            const date = new Date(dateTimeString);
            return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
        } catch {
            return 'Data inválida';
        }
    };

    const formatDuration = (minutes?: number) => {
        if (!minutes) return t('roadmapDetails.notInformed');
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}min`;
        }
        return `${mins}min`;
    };









    const renderInfoSection = (title: string, children: React.ReactNode) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );

    const renderInfoRow = (icon: string, label: string, value: string) => (
        <View style={styles.infoRow}>
            <Ionicons name={icon as any} size={20} color="#007BFF" style={styles.infoIcon} />
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header com título e status */}
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <Ionicons
                            name={getTypeIcon(currentActivity.type) as any}
                            size={32}
                            color="#007BFF"
                            style={styles.typeIcon}
                        />
                        <Text style={styles.title}>{currentActivity.title}</Text>
                    </View>
                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(currentActivity.status) }
                        ]}
                    >
                        <Text style={styles.statusText}>{getStatusText(currentActivity.status)}</Text>
                    </View>
                </View>

                {/* Informações básicas */}
                {renderInfoSection(t('roadmapDetails.generalInfo'), (
                    <View style={styles.sectionContent}>
                        {renderInfoRow('business', t('roadmapDetails.client'), currentActivity.clientName)}
                        {currentActivity.equipmentName &&
                            renderInfoRow('hardware-chip', t('roadmapDetails.equipment'), currentActivity.equipmentName)
                        }
                        {renderInfoRow('construct', t('roadmapDetails.type'), getTypeText(currentActivity.type))}

                        {currentActivity.estimatedDuration &&
                            renderInfoRow('timer', t('roadmapDetails.estimatedDuration'), formatDuration(currentActivity.estimatedDuration))
                        }
                    </View>
                ))}

                {/* Descrição */}
                {currentActivity.description && renderInfoSection(t('roadmapDetails.description'), (
                    <View style={styles.sectionContent}>
                        <Text style={styles.descriptionText}>{currentActivity.description}</Text>
                    </View>
                ))}



                {/* Informações do sistema */}
                {renderInfoSection(t('roadmapDetails.systemInfo'), (
                    <View style={styles.sectionContent}>
                        {renderInfoRow('calendar', t('roadmapDetails.createdAt'), formatDateTime(currentActivity.createdAt))}
                        {renderInfoRow('refresh', t('roadmapDetails.updatedAt'), formatDateTime(currentActivity.updatedAt))}
                    </View>
                ))}
            </ScrollView>

            {/* Botões de ação */}
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.equipmentButton]}
                    onPress={() => {
                        navigation.navigate('ActivityEquipmentListScreen', {
                            activityId: currentActivity.activityId || currentActivity.id,
                            activityName: currentActivity.title,
                            clientName: currentActivity.clientName
                        });
                    }}
                >
                    <Ionicons name="hardware-chip" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>{t('roadmapDetails.viewEquipments')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.workButton]}
                    onPress={() => {
                        navigation.navigate('WorkListScreen', {
                            activityId: currentActivity.activityId || currentActivity.id,
                            activityName: currentActivity.title,
                        });
                    }}
                >
                    <Ionicons name="document-text" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>{t('activityHistory.viewWork')}</Text>
                </TouchableOpacity>
            </View>




        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: '#fff',
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    typeIcon: {
        marginRight: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    section: {
        backgroundColor: '#fff',
        marginTop: 12,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    sectionContent: {
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    descriptionText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
    },

    actionButtons: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 8,
        marginHorizontal: 4,
    },


    equipmentButton: {
        backgroundColor: '#17A2B8',
    },
    workButton: {
        backgroundColor: '#007BFF',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '90%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },

    cancelButton: {
        marginTop: 16,
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#6C757D',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: '#28A745',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelModalButton: {
        backgroundColor: '#6C757D',
    },
    cancelModalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default RoadmapActivityDetailsScreen;