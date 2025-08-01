import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../Routers/AppRouter';
import TechnicalAssistanceService from '../../Services/TechnicalAssistanceService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NewAssistanceModal from '../../Components/Newassistencemodal';
import NewTechnicalAssistanceModal from '../../Components/Newassistencemodal';
import { usePermissions } from "../../Context/PermissionsContext";
import { TechnicalAssistance } from '../../Models/TechnicalAssistance';
import { useLanguage } from "../../Context/LanguageContext";
interface TechnicalAssistanceScreenProps {
    route: RouteProp<RootStackParamList, "TechnicalAssistanceScreen">;
}
const TechnicalAssistanceScreen: React.FC<TechnicalAssistanceScreenProps> = ({ route }) => {
    const { t } = useLanguage();
    const [data, setData] = useState<TechnicalAssistance[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);
    const [modalVisible, setModalVisible] = useState(false);
    const { hasPermission, permissions } = usePermissions();
    const [filters, setFilters] = useState<{
        search?: string;
        equipment_type?: string;
        brand?: string;
        status?: string;
    }>({
        search: undefined,
        equipment_type: undefined,
        brand: undefined,
        status: 'open'
    });



    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const token = await AsyncStorage.getItem("access_token");
                if (!token) throw new Error("Token de acesso não encontrado");

                const service = new TechnicalAssistanceService();
                const response = await service.fetchTechnicalAssistance(token, { page: currentPage, per_page: perPage }, filters);
                setData(response.results);
                setTotal(response.count);
                setTotalPages(Math.ceil(response.count / perPage) || 1);
            } catch (error) {
                console.error('Erro ao buscar dados:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentPage]); // Note que filters não está na dependência aqui, ajuste se necessário

    const renderItem = ({ item }: { item: TechnicalAssistance }) => (
        <View style={styles.row}>
            <Text style={styles.cell}>{item.equipment.client?.name || "N/A"}</Text>
            <Text style={styles.cell}>{item.equipment.client?.email || "N/A"}</Text>
            <Text style={styles.cell}>{item.equipment.tag}</Text>
            <Text style={styles.cell}>{item.equipment.equipment_type?.name || "N/A"}</Text>
            <Text style={styles.cell}>{item.equipment.brand?.name || "N/A"}</Text>
            <Text style={styles.cell}>{item.status}</Text>
            <Text style={styles.cell}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.filtersContainer}>
                <TextInput
                    style={styles.input}
                    placeholder={t('technicalAssistance.searchPlaceholder')}
                    value={filters.search || ''} // Garante que seja string para TextInput
                    onChangeText={(text) => setFilters({ ...filters, search: text || undefined })}
                />
                <Picker
                    selectedValue={filters.equipment_type || ''}
                    onValueChange={(itemValue) => setFilters({ ...filters, equipment_type: itemValue || undefined })}
                    style={styles.picker}
                >
                    <Picker.Item label={t('technicalAssistance.allTypes')} value="" />
                    {/* Adicionar opções de tipos de equipamento */}
                </Picker>
                <Picker
                    selectedValue={filters.brand || ''}
                    onValueChange={(itemValue) => setFilters({ ...filters, brand: itemValue || undefined })}
                    style={styles.picker}
                >
                    <Picker.Item label={t('technicalAssistance.allManufacturers')} value="" />
                    {/* Adicionar opções de fabricantes */}
                </Picker>
                <Picker
                    selectedValue={filters.status || ''}
                    onValueChange={(itemValue) => setFilters({ ...filters, status: itemValue || undefined })}
                    style={styles.picker}
                >
                    <Picker.Item label={t('technicalAssistance.allStatus')} value="" />
                    <Picker.Item label={t('technicalAssistance.open')} value="open" />
                    <Picker.Item label={t('technicalAssistance.pending')} value="pending" />
                    <Picker.Item label={t('technicalAssistance.closed')} value="closed" />
                </Picker>
            </View>
            <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
                <Text style={styles.buttonText}>{t('technicalAssistance.newTechnicalAssistance')}</Text>
            </TouchableOpacity>
            <NewTechnicalAssistanceModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
            />
            {loading ? (
                <ActivityIndicator size="large" color="#007BFF" />
            ) : (
                <View style={styles.tableContainer}>
                    <View style={styles.header}>
                        <Text style={styles.headerText}>{t('technicalAssistance.client')}</Text>
                        <Text style={styles.headerText}>{t('technicalAssistance.email')}</Text>
                        <Text style={styles.headerText}>{t('technicalAssistance.tag')}</Text>
                        <Text style={styles.headerText}>{t('technicalAssistance.type')}</Text>
                        <Text style={styles.headerText}>{t('technicalAssistance.manufacturer')}</Text>
                        <Text style={styles.headerText}>{t('technicalAssistance.status')}</Text>
                        <Text style={styles.headerText}>{t('technicalAssistance.date')}</Text>
                    </View>
                    <FlatList
                        data={data}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                    />
                </View>
            )}
        </View>
    );
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    filtersContainer: {
        marginBottom: 16,
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 8,
        marginBottom: 8,
    },
    picker: {
        height: 40,
        marginBottom: 8,
    },
    tableContainer: {
        flex: 1,
    },

    button: {
        backgroundColor: '#007BFF',
        padding: 12,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    header: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingVertical: 8,
    },
    headerText: {
        flex: 1,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingVertical: 8,
    },
    cell: {
        flex: 1,
        textAlign: 'center',
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginTop: 20,
    },
    errorText: {
        fontSize: 18,
        color: "red",
        textAlign: "center",
        marginTop: 20,
    },
});

export default TechnicalAssistanceScreen;