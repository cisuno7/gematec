import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
  ActivityIndicator,
} from "react-native";
import ScreenContainer from "../Components/ScreenContainer";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from "../Routers/AppRouter";
import { useLanguage } from "../Context/LanguageContext";
import { useUser } from "../Context/UserContext";
import { usePermissions } from "../Context/PermissionsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ActivityService from "../Services/ActivityService";
import EquipmentService from "../Services/EquipamentService";
import SignatureService from "../Services/SignatureService";
import SignatureRequiredModal from "../Components/SignatureRequiredModal";

const { width, height } = Dimensions.get("window");

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { t } = useLanguage();
  const { username } = useUser();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingActivities: 0,
    todayActivities: 0,
    totalEquipment: 0,
  });
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Animações
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    // Animar entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    enforceSignature();
    loadStats();
  }, []);

  // Recarregar estatísticas quando a tela receber foco
  useFocusEffect(
    React.useCallback(() => {
      console.log("[HomeScreen] Tela recebeu foco, recarregando estatísticas...");
      enforceSignature();
      loadStats();
    }, [])
  );

  const enforceSignature = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) return;
      const needsFromFlag = (await AsyncStorage.getItem('needs_signature_pending')) === '1';
      const needsSignature = needsFromFlag || await SignatureService.checkNeedsSignature(token);
      if (needsSignature) {
        setShowSignatureModal(true);
      }
    } catch (e) {
      console.warn('[HomeScreen] Falha ao verificar assinatura:', (e as any)?.message || e);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) {
        console.error("Token não encontrado");
        setLoading(false);
        return;
      }

      console.log("[HomeScreen] Carregando estatísticas do dashboard resumido...");

      // Preparado para usar o novo endpoint resumido quando disponível
      // Por enquanto, usa valores padrão para evitar chamadas desnecessárias
      let createdCount = 0;
      let openCount = 0;
      let totalCount = 0;

      try {
        // TODO: Quando o endpoint resumido estiver disponível no backend, descomentar:
        // const counts = await ActivityService.getDashboardSummary({ token });
        // createdCount = counts.created || 0;
        // openCount = counts.open || 0;
        // totalCount = counts.total || 0;

        // Por enquanto, usar o método placeholder que retorna valores zerados
        // para evitar chamadas GET /activities desnecessárias
        const counts = await ActivityService.getDashboardSummary({ token });
        createdCount = counts.created || 0;
        openCount = counts.open || 0;
        totalCount = counts.total || 0;

        console.log("[HomeScreen] Estatísticas carregadas:", {
          createdActivities: createdCount,
          openActivities: openCount,
          totalActivities: totalCount,
        });
      } catch (error: any) {
        console.error("[HomeScreen] Erro ao carregar estatísticas:", error);
        console.warn("[HomeScreen] Usando valores zero como fallback");
      }

      setStats({
        pendingActivities: createdCount,
        todayActivities: openCount,
        totalEquipment: totalCount,
      });

      setLoading(false);
    } catch (error) {
      console.error("[HomeScreen] Erro ao carregar estatísticas:", error);
      // Em caso de erro, manter valores padrão
      setStats({
        pendingActivities: 0,
        todayActivities: 0,
        totalEquipment: 0,
      });
      setLoading(false);
    }
  };



  // Definir os itens do menu com seus nomes de tela e ícones
  const menuItems = [
    {
      label: t('menu.pmocs'),
      icon: "document-text",
      screen: "ActivityHistoryScreen",
      params: { activityTypeSlug: "pmoc", status: ["open", "pending"] },
      implemented: true,
      color: "#4CAF50",
      description: "Gerenciar PMOCs"
    },
    {
      label: t('menu.serviceOrders'),
      icon: "hammer",
      screen: "ActivityHistoryScreen",
      params: { activityTypeSlug: "service_order", status: ["open", "pending"] },
      implemented: true,
      color: "#FF9800",
      description: "Ordens de serviço"
    },
    {
      label: "Roteiro",
      screen: "RoadmapScreen",
      implemented: true,
      color: "#2196F3",
      description: "Visualizar roteiros"
    },
    {
      label: t('menu.technicalAssistance'),
      icon: "headset",
      screen: "ActivityHistoryScreen",
      params: { activityTypeSlug: "technical_assistance", status: ["open", "pending"] },
      implemented: true,
      color: "#9C27B0",
      description: "Assistência técnica"
    },
    {
      label: t('menu.installation'),
      icon: "cube",
      screen: "ActivityHistoryScreen",
      params: { activityTypeSlug: "instalation", status: ["open", "pending"] },
      implemented: true,
      color: "#607D8B",
      description: "Instalações"
    },
    {
      label: t('menu.equipmentQrCode'),
      icon: "qr-code",
      screen: "EquipmentQRCodeScreen",
      implemented: true,
      color: "#795548",
      description: "Scanner QR Code"
    },
    {
      label: t('menu.manuals'),
      icon: "book",
      screen: "ManualsScreen",
      implemented: true,
      color: "#E91E63",
      description: "Manuais técnicos"
    },
    {
      label: "Equipamentos",
      icon: "construct",
      screen: "GeneralEquipmentListScreen",
      implemented: true,
      color: "#00BCD4",
      description: "Lista de equipamentos"
    },
  ];

  const navigateTo = (screenName: keyof RootStackParamList, params?: any) => {
    navigation.navigate(screenName, params);
  };

  const StatCard = ({ title, value, icon, color, onPress }: any) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const QuickActionCard = ({ item, onPress }: any) => (
    <TouchableOpacity
      style={styles.quickActionCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.actionIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any} size={28} color={item.color} />
      </View>
      <Text style={styles.actionTitle}>{item.label}</Text>
      <Text style={styles.actionDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  return (
    <ScreenContainer style={styles.container} withPadding={false}>
      <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.userText}>
              <Text style={styles.welcomeText}>{t('common.welcome')}</Text>
              <Text style={styles.userName}>{username || t('common.user')}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Estatísticas */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>{t('dashboard.dailySummary')}</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title={t('dashboard.pendingActivities')}
                value={stats.pendingActivities}
                icon="time"
                color="#FF6B6B"
                onPress={() => navigation.navigate("ActivityHistoryScreen", { status: ["pending"] })}
              />
              <StatCard
                title={t('dashboard.openActivities')}
                value={stats.todayActivities}
                icon="calendar"
                color="#4ECDC4"
                onPress={() => navigation.navigate("ActivityHistoryScreen", { status: ["open"] })}
              />
              <StatCard
                title={t('dashboard.totalActivities')}
                value={stats.totalEquipment}
                icon="list"
                color="#45B7D1"
                onPress={() => navigation.navigate("ActivityHistoryScreen", {})}
              />
            </View>
          </View>

          {/* Ações Rápidas */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
            <View style={styles.quickActionsGrid}>
              {menuItems.slice(0, 4).map((item, index) => (
                <QuickActionCard
                  key={index}
                  item={item}
                  onPress={() => item.implemented && navigateTo(item.screen as keyof RootStackParamList, item.params)}
                />
              ))}
            </View>
          </View>

          {/* Mais Opções */}
          <View style={styles.moreOptionsSection}>
            <View style={styles.moreOptionsGrid}>
              {menuItems.slice(4).map((item, index) => (
                <QuickActionCard
                  key={index}
                  item={item}
                  onPress={() => item.implemented && navigateTo(item.screen as keyof RootStackParamList, item.params)}
                />
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
      <SignatureRequiredModal visible={showSignatureModal} onSignatureSaved={() => setShowSignatureModal(false)} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#2C3E50',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userText: {
    marginLeft: 12,
  },
  welcomeText: {
    color: '#BDC3C7',
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  statsSection: {
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statTitle: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 4,
  },
  quickActionsSection: {
    marginBottom: 30,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#6C757D',
    lineHeight: 16,
  },
  moreOptionsSection: {
    marginBottom: 30,
  },
  moreOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

export default HomeScreen;
