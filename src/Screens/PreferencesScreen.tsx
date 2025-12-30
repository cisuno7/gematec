import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
    Modal,
    FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../Context/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import PreferencesService from '../Services/PreferencesService';
import ResponsiveContainer from '../Components/ResponsiveContainer';

const PreferencesScreen: React.FC = () => {
    const navigation = useNavigation();
    const { currentLanguage, t, saveLanguagePreference } = useLanguage();
    const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    useEffect(() => {
        setSelectedLanguage(currentLanguage);
    }, [currentLanguage]);

    const languageOptions = [
        { label: t('language.portuguese'), value: 'pt-BR' }, // Valor correto do backend
        { label: t('language.english'), value: 'en' },
    ];

    // Validação para garantir que o idioma selecionado é válido
    const isValidLanguage = (language: string): boolean => {
        return languageOptions.some(option => option.value === language);
    };

    const handleSave = async () => {
        if (selectedLanguage === currentLanguage) {
            navigation.goBack();
            return;
        }

        if (!isValidLanguage(selectedLanguage)) {
            Alert.alert(t('common.error'), 'Idioma selecionado não é válido');
            return;
        }

        setSaving(true);
        try {
            const accessToken = await AsyncStorage.getItem('access_token');
            if (!accessToken) {
                Alert.alert(t('common.error'), 'Token de acesso não encontrado');
                return;
            }



            await saveLanguagePreference(accessToken, selectedLanguage);
            Alert.alert(t('common.success'), t('preferences.saveSuccess'));
            navigation.goBack();
        } catch (error: any) {
            console.error('Error saving preferences:', error);

            // Se é um fallback aplicado com sucesso, trata como sucesso
            if (error.isFallback && error.message === 'FALLBACK_APPLIED') {
                Alert.alert(
                    t('common.success'), 
                    'Idioma alterado com sucesso! (Aplicado localmente pois o backend não suporta preferências)'
                );
                navigation.goBack();
                return;
            }

            // Mostrar erro mais detalhado
            let errorMessage = t('preferences.saveError');
            if (error.response?.status === 404) {
                errorMessage = 'Endpoint de preferências não encontrado (404). Verifique se o backend suporta esta funcionalidade.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Token de acesso inválido ou expirado. Faça login novamente.';
            } else if (error.response?.status === 403) {
                errorMessage = 'Você não tem permissão para alterar preferências.';
            } else if (error.response?.status === 405 || error.response?.status === 404 || error.response?.status === 501) {
                errorMessage = 'Endpoint de preferências não implementado no backend. Preferência aplicada localmente.';
            } else if (error.response?.status) {
                errorMessage = `Erro do servidor: ${error.response.status} - ${error.response.data?.detail || 'Erro desconhecido'}`;
            } else if (error.message) {
                errorMessage = `Erro de conexão: ${error.message}`;
            }

            Alert.alert(t('common.error'), errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setSelectedLanguage(currentLanguage);
        navigation.goBack();
    };

    if (loading) {
        return (
            <ResponsiveContainer withPadding={false} style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.loadingText}>{t('preferences.loading')}</Text>
            </ResponsiveContainer>
        );
    }

    return (
        <ResponsiveContainer withPadding={false} style={styles.container}>
            <ScrollView style={styles.container}>
                <View style={styles.content}>
                <Text style={styles.title}>{t('preferences.title')}</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('preferences.language')}</Text>
                    <TouchableOpacity
                        style={styles.languageSelector}
                        onPress={() => setShowLanguageModal(true)}
                        disabled={saving}
                    >
                        <Text style={styles.languageText}>
                            {selectedLanguage ?
                                languageOptions.find(opt => opt.value === selectedLanguage)?.label || selectedLanguage
                                : 'Selecione o idioma...'
                            }
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {/* Modal para seleção de idioma */}
                <Modal
                    visible={showLanguageModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowLanguageModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('preferences.language')}</Text>
                                <TouchableOpacity
                                    onPress={() => setShowLanguageModal(false)}
                                    style={styles.closeButton}
                                >
                                    <MaterialIcons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={languageOptions}
                                keyExtractor={(item) => item.value}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.languageOption,
                                            selectedLanguage === item.value && styles.selectedLanguageOption
                                        ]}
                                        onPress={() => {
                                            setSelectedLanguage(item.value);
                                            setShowLanguageModal(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.languageOptionText,
                                            selectedLanguage === item.value && styles.selectedLanguageOptionText
                                        ]}>
                                            {item.label}
                                        </Text>
                                        {selectedLanguage === item.value && (
                                            <MaterialIcons name="check" size={20} color="#007BFF" />
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={handleCancel}
                        disabled={saving}
                    >
                        <Text style={styles.cancelButtonText}>{t('preferences.cancel')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.saveButton, saving && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>{t('preferences.save')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
                </View>
            </ScrollView>
        </ResponsiveContainer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 30,
        textAlign: 'center',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    languageSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
        padding: 15,
        minHeight: 50,
    },
    languageText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
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
        width: '80%',
        maxHeight: '60%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 5,
    },
    languageOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedLanguageOption: {
        backgroundColor: '#f8f9fa',
    },
    languageOptionText: {
        fontSize: 16,
        color: '#333',
    },
    selectedLanguageOptionText: {
        fontWeight: '600',
        color: '#007BFF',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
        gap: 15,
    },
    button: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    saveButton: {
        backgroundColor: '#007BFF',
    },
    cancelButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    disabledButton: {
        backgroundColor: '#cccccc',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
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
});

export default PreferencesScreen;
