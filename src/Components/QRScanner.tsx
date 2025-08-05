import React, { useState, useEffect } from 'react';
import { View, Button, StyleSheet, Text, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';

interface QRScannerProps {
  onScanned: (data: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanned }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log('Status da Permissão:', status);
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    console.log('Dados do QR Code escaneado:', data);
    onScanned(data);
    Alert.alert('QR Code Escaneado', `Dados: ${data}`);
    setTimeout(() => setScanned(false), 2000); // Permitir novo scan após 2s
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Solicitando permissão para acessar a câmera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>Permissão para acessar a câmera foi negada.</Text>
        <Button
          title="Permitir acesso à câmera"
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'], // Habilita apenas QR codes
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} // Liga o evento de escaneamento
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
});

export default QRScanner;
