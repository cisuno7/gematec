import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import QRScanner from "../../Components/QRScanner";
import EquipmentService from "../../Services/EquipamentService";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../../Routers/AppRouter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePermissions } from "../../Context/PermissionsContext";
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface EquipmentQRCodeScreenProps {
  route: RouteProp<RootStackParamList, "EquipmentQRCodeScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "EquipmentQRCodeScreen">;
}

const EquipmentQRCodeScreen: React.FC<EquipmentQRCodeScreenProps> = ({
  navigation,
  route,
}) => {
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(true);

  const handleScannedData = async (data: string) => {
    try {
      setLoading(true);
      setScanning(false);
      console.log("Dados escaneados:", data);

      // Validar formato UUID (simples validação)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(data)) {
        throw new Error("QR Code inválido. O dado escaneado não é um UUID válido.");
      }

      // Obter o token de acesso
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      // Buscar detalhes do equipamento usando UUID
      const equipmentDetails = await EquipmentService.fetchEquipmentDetails(data, token);
      if (!equipmentDetails) {
        throw new Error("Equipamento não encontrado.");
      }

      // Redirecionar para a tela de detalhes do equipamento
      navigation.navigate("EquipmentDetailsScreen", {
        equipmentId: data, // Usar UUID como string
      });
    } catch (error: any) {
      Alert.alert("Erro ao processar QR Code", error.message);
      setScanning(true); // Reativar scanner em caso de erro
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Scanner QR Code</Text>
        <Text style={styles.headerSubtitle}>Escaneie o código do equipamento</Text>
      </View>
    </View>
  );

  const renderScannerContainer = () => (
    <View style={styles.scannerContainer}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.scannerHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <MaterialIcons name="qr-code-scanner" size={32} color="#fff" />
        <Text style={styles.scannerTitle}>Scanner Ativo</Text>
      </LinearGradient>

      <View style={styles.scannerContent}>
        {scanning ? (
          <View style={styles.scannerWrapper}>
            <QRScanner onScanned={handleScannedData} />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame}>
                <View style={styles.cornerTopLeft} />
                <View style={styles.cornerTopRight} />
                <View style={styles.cornerBottomLeft} />
                <View style={styles.cornerBottomRight} />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.processingText}>Processando QR Code...</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderInstructions = () => (
    <View style={styles.instructionsCard}>
      <View style={styles.instructionsHeader}>
        <Ionicons name="information-circle" size={24} color="#667eea" />
        <Text style={styles.instructionsTitle}>Como usar</Text>
      </View>

      <View style={styles.instructionsContent}>
        <View style={styles.instructionItem}>
          <View style={styles.instructionIcon}>
            <Ionicons name="qr-code" size={16} color="#667eea" />
          </View>
          <Text style={styles.instructionText}>
            Posicione o QR Code do equipamento dentro da área de escaneamento
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <View style={styles.instructionIcon}>
            <Ionicons name="hand-left" size={16} color="#667eea" />
          </View>
          <Text style={styles.instructionText}>
            Mantenha o dispositivo estável para uma leitura precisa
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <View style={styles.instructionIcon}>
            <Ionicons name="checkmark-circle" size={16} color="#667eea" />
          </View>
          <Text style={styles.instructionText}>
            O equipamento será identificado automaticamente
          </Text>
        </View>
      </View>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setScanning(true)}
        disabled={scanning}
      >
        <Ionicons name="refresh" size={20} color="#667eea" />
        <Text style={styles.actionButtonText}>Reiniciar Scanner</Text>
      </TouchableOpacity>
    </View>
  );



  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderScannerContainer()}
        {renderInstructions()}
      </ScrollView>

      {renderActionButtons()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#667eea',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  scannerContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  scannerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  scannerContent: {
    padding: 20,
    alignItems: 'center',
  },
  scannerWrapper: {
    width: Math.min(width * 0.75, 300),
    height: Math.min(width * 0.75, 300),
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: Math.min(width * 0.55, 220),
    height: Math.min(width * 0.55, 220),
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#667eea',
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#667eea',
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#667eea',
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#667eea',
    borderBottomRightRadius: 8,
  },
  processingContainer: {
    width: Math.min(width * 0.75, 300),
    height: Math.min(width * 0.75, 300),
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  processingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
    textAlign: 'center',
  },
  instructionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 12,
  },
  instructionsContent: {
    padding: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  instructionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  instructionText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
    lineHeight: 20,
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: 200,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 8,
  },

});

export default EquipmentQRCodeScreen;