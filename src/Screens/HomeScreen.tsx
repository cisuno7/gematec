import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions, // Importar Dimensions para responsividade
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../Routers/AppRouter";
import { useLanguage } from "../Context/LanguageContext";

// Obter a altura da tela para um modal responsivo
const screenHeight = Dimensions.get("window").height;

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { t } = useLanguage();
  const [isMenuVisible, setMenuVisible] = useState(false);

  const toggleMenu = () => {
    setMenuVisible(!isMenuVisible);
  };

  // Definir os itens do menu com seus nomes de tela e ícones
  const menuItems = [
    { label: t('menu.roadmaps'), icon: "map", screen: null, implemented: false },
    { label: t('menu.pmocs'), icon: "document-text", screen: "PmocListScreen", implemented: true },
    { label: t('menu.serviceOrders'), icon: "hammer", screen: "ListOrderServiceScreen", implemented: true },
    { label: "Roteiro", icon: "map", screen: "RoadmapScreen", implemented: true },
    { label: t('menu.technicalAssistance'), icon: "headset", screen: "TechnicalAssistanceScreen", implemented: true },
    { label: t('menu.installation'), icon: "cube", screen: null, implemented: false },
    { label: t('menu.technicalSupport'), icon: "help-circle", screen: null, implemented: false },
    { label: t('menu.equipmentQrCode'), icon: "qr-code", screen: "EquipmentQRCodeScreen", implemented: true },
    { label: t('menu.manuals'), icon: "book", screen: "ManualsScreen", implemented: true },
  ];

  const navigateTo = (screenName: keyof RootStackParamList) => {
    toggleMenu(); // Fecha o menu antes de navegar
    navigation.navigate(screenName);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.welcomeToSystem')}</Text>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fab} onPress={toggleMenu}>
        <Ionicons name="apps" size={30} color="#fff" /> {/* Ícone de grade para o menu */}
      </TouchableOpacity>

      {/* Modal estilo Bottom Sheet */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isMenuVisible}
        onRequestClose={toggleMenu}
      >
        {/* Overlay clicável para fechar o modal */}
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={toggleMenu}>
          {/* Conteúdo do modal, impede que o clique no conteúdo feche o modal */}
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{t('home.quickActions')}</Text>

            <ScrollView contentContainerStyle={styles.menuGrid}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.gridItem, !item.implemented && styles.gridItemDisabled]}
                  onPress={() => item.implemented && navigateTo(item.screen as keyof RootStackParamList)}
                  disabled={!item.implemented}
                >
                  <Ionicons
                    name={item.icon as any} // Asserção de tipo para o nome do ícone
                    size={40}
                    color={item.implemented ? "#007BFF" : "#ccc"} // Cor do ícone
                  />
                  <Text style={[styles.gridItemText, !item.implemented && styles.gridItemTextDisabled]}>
                    {item.label}
                  </Text>
                  {!item.implemented && (
                    <Text style={styles.comingSoonText}>{t('home.comingSoon')}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Botão Fechar */}
            <TouchableOpacity style={styles.closeButton} onPress={toggleMenu}>
              <Text style={styles.closeButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E0ECFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#007BFF", // Cor azul primária
    borderRadius: 30, // Metade da largura/altura para um círculo perfeito
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8, // Sombra para Android
    shadowColor: "#000", // Sombra para iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Overlay mais escuro
    justifyContent: "flex-end", // Alinha o conteúdo na parte inferior
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20, // Cantos superiores arredondados
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: screenHeight * 0.7, // Altura máxima de 70% da tela
    width: "100%",
    elevation: 10, // Sombra para Android
    shadowColor: "#000", // Sombra para iOS
    shadowOffset: { width: 0, height: -5 }, // Sombra vindo de cima
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    paddingBottom: 20, // Espaço para o indicador de rolagem
  },
  gridItem: {
    width: "30%", // Aproximadamente 3 itens por linha com algum espaçamento
    marginVertical: 10,
    marginHorizontal: "1.5%", // Para espaçamento entre os itens
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f8f8f8", // Fundo claro para os itens
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  gridItemDisabled: {
    opacity: 0.5, // Diminui a opacidade de itens não implementados
  },
  gridItemText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    marginTop: 5,
  },
  gridItemTextDisabled: {
    color: "#666",
  },
  comingSoonText: {
    fontSize: 10,
    color: "#FF5733", // Laranja/vermelho para "Em Breve"
    fontWeight: "bold",
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: "#dc3545", // Cor vermelha para fechar
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default HomeScreen;
