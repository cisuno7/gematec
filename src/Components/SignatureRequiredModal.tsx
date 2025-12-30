// file: src/Components/SignatureRequiredModal.tsx
import React, { useRef, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { useLanguage } from '../Context/LanguageContext';
import SignatureService from '../Services/SignatureService';
import { useResponsive } from '../hooks/useResponsive';

interface SignatureRequiredModalProps {
    visible: boolean;
    onSignatureSaved: () => void;
}

const SignatureRequiredModal: React.FC<SignatureRequiredModalProps> = ({
    visible,
    onSignatureSaved,
}) => {
    const { t } = useLanguage();
    const r = useResponsive();
    const screenWidth = r?.width ?? 414;
    const screenHeight = r?.height ?? 896;
    const signatureRef = useRef<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingSignature, setPendingSignature] = useState<string>('');

    // Estilo customizado para o canvas de assinatura
    const signatureWebStyle = `
    .m-signature-pad { 
      box-shadow: none; 
      border: none; 
      margin: 0; 
      width: 100%; 
      height: 100%; 
      background-color: #ffffff;
    }
    .m-signature-pad--body { 
      border: none; 
      background-color: #ffffff;
    }
    .m-signature-pad--footer { 
      display: none; 
      margin: 0; 
    }
  `;

    const handleSignatureOK = async (signature: string) => {
        if (!signature || signature.length < 100) {
            Alert.alert(
                'Assinatura Obrigatória',
                'Por favor, faça sua assinatura na área indicada.',
                [{ text: 'OK' }]
            );
            return;
        }

        setPendingSignature(signature);
        setShowConfirmation(true);
    };

    const handleConfirmSave = async () => {
        setIsSubmitting(true);
        setShowConfirmation(false);

        try {
            await SignatureService.saveSignature(pendingSignature);

            Alert.alert(
                'Sucesso',
                'Sua assinatura foi salva com sucesso!',
                [
                    {
                        text: 'OK',
                        onPress: onSignatureSaved,
                    },
                ]
            );
        } catch (error: any) {
            console.error('[SignatureRequiredModal] Erro ao salvar assinatura:', error);
            Alert.alert(
                'Erro',
                error.message || 'Erro ao salvar assinatura. Tente novamente.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsSubmitting(false);
            setPendingSignature('');
        }
    };

    const handleCancelSave = () => {
        setShowConfirmation(false);
        setPendingSignature('');
    };

    const handleClearSignature = () => {
        signatureRef.current?.clearSignature();
    };

    return (
        <>
            {/* Modal principal de assinatura */}
            <Modal
                visible={visible && !showConfirmation}
                animationType="slide"
                presentationStyle="fullScreen"
            >
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Assinatura Obrigatória</Text>
                        <Text style={styles.subtitle}>
                            Para continuar usando o aplicativo, você deve fornecer sua assinatura digital.
                            Esta assinatura será usada em relatórios e não poderá ser alterada posteriormente.
                        </Text>
                    </View>

                    <View style={[styles.signatureContainer, { height: screenHeight * 0.5 }]}>
                        <SignatureCanvas
                            ref={signatureRef}
                            onOK={handleSignatureOK}
                            onEmpty={() => console.log('[SignatureRequiredModal] Assinatura vazia')}
                            descriptionText="Faça sua assinatura acima"
                            clearText="Limpar"
                            confirmText="Salvar Assinatura"
              imageType="image/jpeg"
                            webStyle={signatureWebStyle}
                            backgroundColor="#ffffff"
                            penColor="#000000"
                            minWidth={2}
                            maxWidth={4}
                        />
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.clearButton]}
                            onPress={handleClearSignature}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.clearButtonText}>Limpar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.saveButton, isSubmitting && styles.disabledButton]}
                            onPress={() => signatureRef.current?.readSignature()}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                                <Text style={styles.saveButtonText}>Salvar Assinatura</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal de confirmação */}
            <Modal
                visible={showConfirmation}
                animationType="fade"
                transparent={true}
            >
                <View style={styles.confirmationOverlay}>
                    <View style={styles.confirmationModal}>
                        <Text style={styles.confirmationTitle}>Confirmar Assinatura</Text>
                        <Text style={styles.confirmationText}>
                            Uma vez salva, essa assinatura não poderá ser alterada.
                            Tem certeza que deseja continuar?
                        </Text>

                        <View style={styles.confirmationButtons}>
                            <TouchableOpacity
                                style={[styles.confirmationButton, styles.cancelButton]}
                                onPress={handleCancelSave}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.confirmationButton, styles.confirmButton]}
                                onPress={handleConfirmSave}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#ffffff" size="small" />
                                ) : (
                                    <Text style={styles.confirmButtonText}>Confirmar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: 20,
    },
    header: {
        marginBottom: 20,
        paddingTop: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 15,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    signatureContainer: {
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: '#007BFF',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
    clearButton: {
        backgroundColor: '#6c757d',
    },
    saveButton: {
        backgroundColor: '#007BFF',
    },
    disabledButton: {
        backgroundColor: '#cccccc',
    },
    clearButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmationOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmationModal: {
        backgroundColor: '#ffffff',
        borderRadius: 15,
        padding: 25,
        width: '100%',
        maxWidth: 400,
    },
    confirmationTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 15,
    },
    confirmationText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },
    confirmationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    confirmationButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    confirmButton: {
        backgroundColor: '#dc3545',
    },
    cancelButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default SignatureRequiredModal;
