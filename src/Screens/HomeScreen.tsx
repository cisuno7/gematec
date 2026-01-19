import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  ActivityIndicator,
  Image,
} from "react-native";
import ResponsiveContainer from "../Components/ResponsiveContainer";
import ResponsiveText from "../Components/ResponsiveText";
import { useResponsive } from "../hooks/useResponsive";
import { Ionicons } from "@expo/vector-icons";
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

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { t } = useLanguage();
  const { username } = useUser();
  const { hasPermission } = usePermissions();
  const r = useResponsive();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    openActivities: 0,
    waitingApproval: 0,
    totalActivities: 0,
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

      console.log("[HomeScreen] Carregando estatísticas do dashboard...");

      try {
        // Usar o novo endpoint /charts/activities
        const charts = await ActivityService.getActivityCharts({ token });

        console.log("[HomeScreen] Estatísticas carregadas:", {
          total: charts.total,
          created: charts.created,
          open: charts.open,
          waiting_budget_approval: charts.waiting_budget_approval,
          budget_approval: charts.budget_approval,
          budget_disapproval: charts.budget_disapproval,
          closed: charts.closed,
          archived: charts.archived,
        });

        setStats({
          openActivities: charts.open,
          waitingApproval: charts.waiting_budget_approval,
          totalActivities: charts.total,
        });

      } catch (error: any) {
        console.error("[HomeScreen] Erro ao carregar estatísticas:", error);
        console.warn("[HomeScreen] Usando valores zero como fallback");

        // Em caso de erro, manter valores padrão
        setStats({
          openActivities: 0,
          waitingApproval: 0,
          totalActivities: 0,
        });
      }

      setLoading(false);
    } catch (error) {
      console.error("[HomeScreen] Erro ao carregar estatísticas:", error);
      // Em caso de erro, manter valores padrão
      setStats({
        openActivities: 0,
        waitingApproval: 0,
        totalActivities: 0,
      });
      setLoading(false);
    }
  };



  // Definir os itens do menu com seus nomes de tela e ícones
  const menuItems = [
    {
      label: t('menu.pmocs'),
      icon: "document-text",
      screen: "ActivityListScreen",
      params: { activityTypeSlug: "pmoc", status: ["open", "pending"] },
      implemented: true,
      color: "#4CAF50",
      description: "Gerenciar PMOCs"
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
      screen: "ActivityListScreen",
      params: { activityTypeSlug: "technical_assistance", status: ["open", "pending"] },
      implemented: true,
      color: "#9C27B0",
      description: "Assistência técnica"
    },
    {
      label: t('menu.installation'),
      icon: "cube",
      screen: "ActivityListScreen",
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
        <Ionicons name={icon} size={r.scale(24)} color={color} />
      </View>
      <View style={styles.statContent}>
        <ResponsiveText variant="title" weight="bold" style={{ color: '#2C3E50' }}>
          {value}
        </ResponsiveText>
        <ResponsiveText variant="caption" style={{ color: '#6C757D', textAlign: 'center', marginTop: r.spacing(0.4) }}>
          {title}
        </ResponsiveText>
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
        <Ionicons name={item.icon as any} size={r.scale(28)} color={item.color} />
      </View>
      <ResponsiveText variant="body" weight="bold" style={{ color: '#2C3E50', marginBottom: r.spacing(0.4) }}>
        {item.label}
      </ResponsiveText>
      <ResponsiveText variant="caption" style={{ color: '#6C757D', lineHeight: r.responsiveFontSize(16) }}>
        {item.description}
      </ResponsiveText>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ResponsiveContainer style={styles.loadingContainer} withPadding={false}>
        <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />
        <ActivityIndicator size="large" color="#007BFF" />
        <ResponsiveText variant="body" style={{ color: '#6C757D', marginTop: r.spacing(1.5) }}>
          Carregando dashboard...
        </ResponsiveText>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer style={styles.container} withPadding={false}>
      <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
            <ResponsiveText variant="subtitle" weight="bold" style={{ color: '#2C3E50', marginBottom: r.spacing(1.5) }}>
              {t('dashboard.dailySummary')}
            </ResponsiveText>
            <View style={styles.statsGrid}>
              <StatCard
                title="Atividades Abertas"
                value={stats.openActivities}
                icon="calendar"
                color="#4ECDC4"
                onPress={() => navigation.navigate("ActivityListScreen", { status: ["open"] })}
              />
              <StatCard
                title="Aguardando Aprovação"
                value={stats.waitingApproval}
                icon="hourglass"
                color="#FFA726"
                onPress={() => navigation.navigate("ActivityListScreen", { status: ["waiting_budget_approval"] })}
              />
              <StatCard
                title="Total de Atividades"
                value={stats.totalActivities}
                icon="list"
                color="#45B7D1"
                onPress={() => navigation.navigate("ActivityListScreen", {})}
              />
            </View>
          </View>

          {/* Ações Rápidas */}
          <View style={styles.quickActionsSection}>
            <ResponsiveText variant="subtitle" weight="bold" style={{ color: '#2C3E50', marginBottom: r.spacing(1.5) }}>
              {t('dashboard.quickActions')}
            </ResponsiveText>
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
    </ResponsiveContainer>
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
  header: {
    backgroundColor: '#2C3E50',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    height: 50,
    width: '100%',
    maxWidth: 200,
  },
  notificationButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
    zIndex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userText: {
    marginLeft: 12,
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
    backgroundColor: '#F8F9FA',
    marginTop: 0,
  },
  scrollContent: {
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 20,
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
