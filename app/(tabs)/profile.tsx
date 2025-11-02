import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { DebugAuth } from "../../src/utils/debugAuth";

export default function ProfileScreen() {
  const handleShowAuth = async () => {
    await DebugAuth.showStoredAuth();
    Alert.alert("Debug", "Informações exibidas no console!");
  };

  const handleTestUrl = async () => {
    await DebugAuth.testUrlConstruction();
    Alert.alert("Debug", "URL testada! Veja o console.");
  };

  const handleShowAllKeys = async () => {
    await DebugAuth.showAllKeys();
    Alert.alert("Debug", "Chaves exibidas no console!");
  };

  const handleClearAuth = async () => {
    Alert.alert(
      "Confirmar",
      "Isso vai limpar todos os dados de autenticação. Você será deslogado.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "destructive",
          onPress: async () => {
            await DebugAuth.clearAuth();
            Alert.alert("Sucesso", "Dados limpos! Reinicie o app.");
          },
        },
      ]
    );
  };

  const handleRunAllTests = async () => {
    await DebugAuth.runAllTests();
    Alert.alert("Debug", "Todos os testes executados! Veja o console.");
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Perfil do Usuário</Text>

        <View style={styles.debugSection}>
          <Text style={styles.sectionTitle}>🔧 Ferramentas de Debug</Text>
          <Text style={styles.sectionDescription}>
            Use estas ferramentas para diagnosticar problemas de autenticação.
            Os resultados aparecem no console.
          </Text>

          <TouchableOpacity style={styles.debugButton} onPress={handleShowAuth}>
            <Text style={styles.debugButtonText}>🔍 Mostrar Dados de Auth</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.debugButton} onPress={handleTestUrl}>
            <Text style={styles.debugButtonText}>🌐 Testar Construção de URL</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.debugButton} onPress={handleShowAllKeys}>
            <Text style={styles.debugButtonText}>📋 Mostrar Todas as Chaves</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.debugButton} onPress={handleRunAllTests}>
            <Text style={styles.debugButtonText}>🚀 Executar Todos os Testes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.debugButton, styles.dangerButton]}
            onPress={handleClearAuth}
          >
            <Text style={[styles.debugButtonText, styles.dangerButtonText]}>
              🗑️ Limpar Cache de Auth
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  debugSection: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
  },
  debugButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  debugButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  dangerButton: {
    backgroundColor: "#FF3B30",
    marginTop: 10,
  },
  dangerButtonText: {
    color: "#fff",
  },
});