import React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import QRScanner from "../Components/QRScanner";
import QRCodeService from "../Services/QRCodeService";
import { NavigationProp } from "@react-navigation/native";
import ResponsiveContainer from "../Components/ResponsiveContainer";

interface QRCodeScreenProps {
  navigation: NavigationProp<any>;
}

const QRCodeScreen: React.FC<QRCodeScreenProps> = ({ navigation }) => {
  const handleScannedData = (data: string) => {
    try {
      const qrData = QRCodeService.processQRCode(data);
      if (!qrData.host) {
        throw new Error('Host inválido ou ausente no QR Code.');
      }
  
      navigation.navigate('LoginScreen', { host: qrData.host });
    } catch (error: any) {
      Alert.alert('Erro ao processar QR Code', error.message);
    }
  };
  

  return (
    <ResponsiveContainer withPadding={false} style={styles.container}>
      <Text style={styles.title}>Leia o QR Code para configurar o backend:</Text>
      <View style={styles.scannerContainer}>
        <QRScanner onScanned={handleScannedData} />
      </View>
    </ResponsiveContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 18,
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  scannerContainer: {
    width: "80%",
    height: "60%",
    borderRadius: 10,
    overflow: "hidden",
  },
});

export default QRCodeScreen;
