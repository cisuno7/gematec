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
import { OfflineService } from '../../Services/OfflineService';


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
    const [loading, setLoading] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [notes, setNotes] = useState(activity.notes || '');
    const [currentActivity, setCurrentActivity] = useState(activity);

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
                return 'Alta';
            case 'medium':
                return 'Média';
            case 'low':
                return 'Baixa';
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
                return 'Manutenção';
            case 'repair':
                return 'Reparo';
            case 'inspection':
                return 'Inspeção';
            case 'installation':
                return 'Instalação';
            default:
                return 'Atividade';
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
        if (!minutes) return 'Não informado';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}min`;
        }
        return `${mins}min`;
    };





    const handleStatusUpdate = async (newStatus: RoadmapActivity['status']) => {
        setLoading(true);
        try {
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);

            if (isConnected) {
                const updatedActivity = await RoadmapService.updateActivityStatus(
                    currentActivity.id,
                    newStatus
                );
                setCurrentActivity(updatedActivity);
                Alert.alert('Sucesso', 'Status atualizado com sucesso!');
            } else {
                await OfflineService.addRequestToQueue({
                    type: 'answer', // ou um tipo mais específico como 'status_update'
                    payload: {
                        context: { roadmapActivityId: currentActivity.id },
                        status: newStatus,
                    },
                });
                // Atualiza a UI localmente de forma otimista
                setCurrentActivity(prev => ({ ...prev, status: newStatus }));
                Alert.alert('Modo Offline', 'A atualização de status foi salva e será enviada quando houver conexão.');
            }
            setShowStatusModal(false);
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao atualizar status');
        } finally {
            setLoading(false);
        }
    };

    const handleNotesUpdate = async () => {
        setLoading(true);
        try {
            const isConnected = await NetInfo.fetch().then(state => state.isConnected);

            if (isConnected) {
                const updatedActivity = await RoadmapService.addNotesToActivity(
                    currentActivity.id,
                    notes
                );
                setCurrentActivity(updatedActivity);
                Alert.alert('Sucesso', 'Notas atualizadas com sucesso!');
            } else {
                await OfflineService.addRequestToQueue({
                    type: 'answer', // ou um tipo mais específico como 'notes_update'
                    payload: {
                        context: { roadmapActivityId: currentActivity.id },
                        notes: notes,
                    },
                });
                // Atualiza a UI localmente de forma otimista
                setCurrentActivity(prev => ({ ...prev, notes: notes }));
                Alert.alert('Modo Offline', 'As notas foram salvas e serão enviadas quando houver conexão.');
            }
            setShowNotesModal(false);
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao atualizar notas');
        } finally {
            setLoading(false);
        }
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
            {renderInfoSection('Informações Gerais', (
                <View style={styles.sectionContent}>
                    {renderInfoRow('business', 'Cliente', currentActivity.clientName)}
                    {currentActivity.equipmentName &&
                        renderInfoRow('hardware-chip', 'Equipamento', currentActivity.equipmentName)
                    }
                    {renderInfoRow('location', 'Endereço', currentActivity.address)}
                    {renderInfoRow('time', 'Horário Agendado', formatDateTime(currentActivity.scheduledTime))}
                    {renderInfoRow('construct', 'Tipo', getTypeText(currentActivity.type))}
                    {renderInfoRow('flag', 'Prioridade', getPriorityText(currentActivity.priority))}
                    {currentActivity.estimatedDuration &&
                        renderInfoRow('timer', 'Duração Estimada', formatDuration(currentActivity.estimatedDuration))
                    }
                </View>
            ))}

            {/* Descrição */}
            {currentActivity.description && renderInfoSection('Descrição', (
                <View style={styles.sectionContent}>
                    <Text style={styles.descriptionText}>{currentActivity.description}</Text>
                </View>
            ))}

            {/* Notas */}
            {renderInfoSection('Notas', (
                <View style={styles.sectionContent}>
                    {currentActivity.notes ? (
                        <Text style={styles.notesText}>{currentActivity.notes}</Text>
                    ) : (
                        <Text style={styles.noNotesText}>Nenhuma nota adicionada</Text>
                    )}
                </View>
            ))}

            {/* Informações do sistema */}
            {renderInfoSection('Informações do Sistema', (
                <View style={styles.sectionContent}>
                    {renderInfoRow('calendar', 'Criado em', formatDateTime(currentActivity.createdAt))}
                    {renderInfoRow('refresh', 'Atualizado em', formatDateTime(currentActivity.updatedAt))}
                </View>
            ))}
        </ScrollView>

        {/* Botões de ação */}
        <View style={styles.actionButtons}>
            <TouchableOpacity
                style={[styles.actionButton, styles.statusButton]}
                onPress={() => setShowStatusModal(true)}
            >
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Alterar Status</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.actionButton, styles.notesButton]}
                onPress={() => setShowNotesModal(true)}
            >
                <Ionicons name="create" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Adicionar Notas</Text>
            </TouchableOpacity>
        </View>

        {/* Modal de Status */}
        <Modal
            visible={showStatusModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowStatusModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Alterar Status</Text>
                    <Text style={styles.modalSubtitle}>Selecione o novo status da atividade:</Text>

                    {(['pending', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
                        <TouchableOpacity
                            key={status}
                            style={[
                                styles.statusOption,
                                currentActivity.status === status && styles.statusOptionSelected
                            ]}
                            onPress={() => handleStatusUpdate(status)}
                            disabled={loading}
                        >
                            <View
                                style={[
                                    styles.statusIndicator,
                                    { backgroundColor: getStatusColor(status) }
                                ]}
                            />
                            <Text style={styles.statusOptionText}>{getStatusText(status)}</Text>
                            {loading && <ActivityIndicator size="small" color="#007BFF" />}
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setShowStatusModal(false)}
                        disabled={loading}
                    >
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

        {/* Modal de Notas */}
        <Modal
            visible={showNotesModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowNotesModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Adicionar Notas</Text>
                    <Text style={styles.modalSubtitle}>Digite suas observações sobre a atividade:</Text>

                    <TextInput
                        style={styles.notesInput}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Digite suas notas aqui..."
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                    />

                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.saveButton]}
                            onPress={handleNotesUpdate}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.saveButtonText}>Salvar</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelModalButton]}
                            onPress={() => setShowNotesModal(false)}
                            disabled={loading}
                        >
                            <Text style={styles.cancelModalButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
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
    notesText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
        fontStyle: 'italic',
    },
    noNotesText: {
        fontSize: 16,
        color: '#999',
        fontStyle: 'italic',
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
    statusButton: {
        backgroundColor: '#007BFF',
    },
    notesButton: {
        backgroundColor: '#28A745',
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
    statusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#f8f9fa',
    },
    statusOptionSelected: {
        backgroundColor: '#e3f2fd',
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    statusOptionText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
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
    notesInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        minHeight: 120,
        marginBottom: 20,
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