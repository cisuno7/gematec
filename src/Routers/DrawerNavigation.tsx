// file: src/Routers/DrawerNavigation.tsx
import React, { useState, useEffect } from "react";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
  StatusBar
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import HomeScreen from "../Screens/HomeScreen";
import PersonalDataScreen from "../Screens/PersonalDataScreen";
import ManualsScreen from "../Screens/ManualsScreen";
import { ClientsAvulsosScreen, ClientsComContratoScreen } from "../Screens/Clients/Client";
import EquipamentScreen from "../Screens/Equipaments/EquipamentScreen";
import EquipmentQRCodeScreen from "../Screens/Equipaments/EquipmentQRCodeScreen";
import EquipmentListScreen from "../Screens/Equipaments/EquipmentListScreen";
import PmocListScreen from "../Screens/Pmoc/PmocListScreen";
import ListOrderServiceScreen from "../Screens/Orders/ListOrderServiceScreen";
import TechnicalAssistanceScreen from "../Screens/TechnicalAssistance/TechnicalAssistanceScreen";
import ActivityHistoryScreen from "../Screens/Activity/ActivityHistoryScreen";
import CreateEquipmentScreen from "../Screens/Equipaments/CreateEquipmentScreen";
import { RootStackParamList } from "./AppRouter";
import { useUser } from "../Context/UserContext";
import { usePermissions } from "../Context/PermissionsContext";
import { useLanguage } from "../Context/LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthService from "../Services/AuthService";
import MenuService from "../Services/MenuService";
import { MenuItem } from "../Models/MenuItem";
import PreferencesScreen from "../Screens/PreferencesScreen";

const Drawer = createDrawerNavigator<RootStackParamList>();

// Mapeamento de slugs para dados do aplicativo
const SLUG_TO_APP_DATA: { [key: string]: { titleKey: string; route?: keyof RootStackParamList; icon?: string; action?: 'logout' } } = {
  "operational": { titleKey: "menu.operacional", icon: "briefcase" },
  "basic": { titleKey: "menu.basicRegistrations", icon: "folder-open" },
  "administrator": { titleKey: "menu.administrative", icon: "shield" },
  "clients_with_contract": { titleKey: "menu.clientsWithContract", route: "ClientsComContratoScreen" },
  "clients_without_contract": { titleKey: "menu.clientsWithoutContract", route: "ClientsAvulsosScreen" },
  "equipments": { titleKey: "menu.equipments", route: "GeneralEquipmentListScreen" },
  "activities": { titleKey: "menu.activities", route: "ActivityHistoryScreen" },
  "home": { titleKey: "menu.home", route: "HomeScreen", icon: "home" },
  "manuals": { titleKey: "menu.manuals", route: "ManualsScreen", icon: "book" },
  "personal_data": { titleKey: "menu.personalData", route: "PersonalDataScreen", icon: "person" },
  "basic_registrations": { titleKey: "menu.basicRegistrations", icon: "folder-open" },
  "functions": { titleKey: "menu.functions", route: "FunctionsScreen" },
  "manufacturers": { titleKey: "menu.manufacturers", route: "ManufacturersScreen" },
  "coil_types": { titleKey: "menu.coilTypes", route: "CoilTypesScreen" },
  "equipment_types": { titleKey: "menu.equipmentTypes", route: "EquipmentTypesScreen" },
  "compressor_types": { titleKey: "menu.compressorTypes", route: "CompressorTypesScreen" },
  "cooling_fluid_types": { titleKey: "menu.coolingFluidTypes", route: "CoolingFluidTypesScreen" },
  "condenser_types": { titleKey: "menu.condenserTypes", route: "CondenserTypesScreen" },
  "evaporator_types": { titleKey: "menu.evaporatorTypes", route: "EvaporatorTypesScreen" },
  "phases": { titleKey: "menu.phases", route: "PhasesScreen" },
  "technologies": { titleKey: "menu.technologies", route: "TechnologiesScreen" },
  "capacity_units": { titleKey: "menu.capacityUnits", route: "CapacityUnitsScreen" },
  "administrative": { titleKey: "menu.administrative", icon: "shield" },
  "support": { titleKey: "menu.support", icon: "help-circle" },
  "pmocs": { titleKey: "menu.pmocs", route: "PmocListScreen" },
  "service_orders": { titleKey: "menu.serviceOrders", route: "ListOrderServiceScreen" },
  "technical_assistance": { titleKey: "menu.technicalAssistance", route: "TechnicalAssistanceScreen" },
  "equipment_qr_code": { titleKey: "menu.equipmentQrCode", route: "EquipmentQRCodeScreen" },
  "create_equipment": { titleKey: "menu.createEquipment", route: "CreateEquipmentScreen" },
  "filter_equipment": { titleKey: "menu.filterEquipment", route: "EquipamentScreen" },
  "view_activities": { titleKey: "menu.viewActivities", route: "ActivityHistoryScreen" },
  "roadmaps": { titleKey: "menu.roadmaps", route: "RoadmapScreen" },
  "documentation": { titleKey: "menu.documentation", icon: "document" },
};

const CustomDrawerHeader: React.FC = () => {
  const { username } = useUser();
  const { t } = useLanguage();

  console.log("[CustomDrawerHeader] Username recebido:", username);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{username || t('common.user')}</Text>
      </View>
      <View style={styles.headerDecoration} />
    </View>
  );
};

const CustomDrawerContent = (props: any & { extraData: {} }) => {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { clientId, sectorId, equipmentId, logout } = useUser();
  const { t } = useLanguage();
  const [dynamicMenu, setDynamicMenu] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [submenuStates, setSubmenuStates] = useState<{ [key: string]: boolean }>({});

  // Função para processar e mapear os itens do menu do backend
  const processMenuItems = (items: MenuItem[]): MenuItem[] => {
    console.log("[DrawerNavigation] Itens antes do filtro:", items.map(item => ({ slug: item.slug, required_apps: item.required_apps })));

    const filteredItems = items
      .filter(item => {
        const shouldInclude = item.required_apps ? item.required_apps.includes("mobile") : true;
        console.log(`[DrawerNavigation] Item ${item.slug} - required_apps: ${item.required_apps}, incluído: ${shouldInclude}`);
        return shouldInclude;
      })
      // Remove categorias/grupos que não tiverem filhos mobile após o filtro
      .filter(item => {
        if (item.items && item.items.length > 0) {
          const hasChildren = item.items.some(child => !child.required_apps || child.required_apps.includes("mobile"));
          if (!hasChildren) {
            console.log(`[DrawerNavigation] Removendo categoria sem filhos mobile: ${item.slug}`);
          }
          return hasChildren;
        }
        return true;
      });

    console.log("[DrawerNavigation] Itens após filtro:", filteredItems.map(item => item.slug));

    return filteredItems
      .map(item => {
        console.log(`[DrawerNavigation] Processando item: ${item.slug}`);
        const appData = SLUG_TO_APP_DATA[item.slug];
        if (!appData) {
          console.warn(`Mapeamento não encontrado para o slug: ${item.slug}`);
          // Se o item já tem título e não é uma categoria (não tem items), mantém ele
          if (item.title && !item.items) {
            console.log(`[DrawerNavigation] Item ${item.slug} tem título próprio, mantendo com rota padrão`);
            const processedItem: MenuItem = {
              ...item,
              title: item.title,
              route: item.route || (item.slug === 'clients_with_contract' ? 'ClientsComContratoScreen' :
                item.slug === 'clients_without_contract' ? 'ClientsAvulsosScreen' : undefined),
            };
            return processedItem;
          }
          return null;
        }

        console.log(`[DrawerNavigation] Mapeamento encontrado para ${item.slug}:`, appData);

        const processedItem: MenuItem = {
          ...item,
          title: t(appData.titleKey), // Usa a função de tradução
          route: appData.route,
          icon: appData.icon,
          action: appData.action,
        };

        console.log(`[DrawerNavigation] Item processado: ${item.slug}, rota: ${processedItem.route}`);

        if (item.items && item.items.length > 0) {
          processedItem.items = processMenuItems(item.items); // Processa recursivamente os sub-itens
        }
        return processedItem;
      })
      .filter(item => item !== null) as MenuItem[];
  };

  useEffect(() => {
    let mounted = true;
    const fetchMenu = async () => {
      try {
        setLoadingMenu(true);
        const menuData = await MenuService.fetchDynamicMenu();
        if (!mounted) return;
        console.log("[DrawerNavigation] Menu recebido do backend:", JSON.stringify(menuData, null, 2));
        const processedData = processMenuItems(menuData);
        if (!mounted) return;
        console.log("[DrawerNavigation] Menu processado:", JSON.stringify(processedData, null, 2));
        setDynamicMenu(processedData);
      } catch (error: any) {
        console.warn("[DrawerNavigation] Menu não carregado na primeira tentativa (provável corrida de inicialização). Tentando novamente em 1s...");
        // Retry suave após um pequeno delay para contornar corrida de AsyncStorage/account/baseURL
        setTimeout(async () => {
          try {
            if (!mounted) return;
            const retryData = await MenuService.fetchDynamicMenu();
            if (!mounted) return;
            const processed = processMenuItems(retryData);
            if (!mounted) return;
            setDynamicMenu(processed);
          } catch (retryErr) {
            if (!mounted) return;
            Alert.alert("Erro", (retryErr as any).message || "Não foi possível carregar o menu.");
            console.error("Erro ao carregar menu (retry):", retryErr);
          } finally {
            if (!mounted) return;
            setLoadingMenu(false);
          }
        }, 1000);
        return;
      } finally {
        if (!mounted) return;
        setLoadingMenu(false);
      }
    };
    fetchMenu();
    return () => { mounted = false; };
  }, [t]); // Recarrega quando a linguagem mudar

  const toggleSubmenu = (id: string) => {
    setSubmenuStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = async () => {
    try {
      await logout();
      props.navigation.navigate("LoginScreen");
    } catch (error) {
      console.error("Erro durante o logout:", error);
      props.navigation.navigate("LoginScreen");
    }
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    console.log(`[DrawerNavigation] Renderizando item: ${item.slug}, permissões:`, item.required_permissions);

    // Verifica se o usuário tem ALGUMA das permissões necessárias para este item
    const hasRequiredPermissions = item.required_permissions
      ? item.required_permissions.some((perm) => hasPermission(perm))
      : true;

    console.log(`[DrawerNavigation] Item ${item.slug} tem permissões necessárias:`, hasRequiredPermissions);

    if (!hasRequiredPermissions) {
      console.log(`[DrawerNavigation] Item ${item.slug} não será renderizado - sem permissões`);
      return null;
    }

    const isSubmenuExpanded = submenuStates[item.slug];
    const paddingLeft = 20 + level * 20;

    if (item.items && item.items.length > 0) {
      return (
        <View key={item.slug}>
          <TouchableOpacity
            style={[styles.menuItem, { paddingLeft }]}
            onPress={() => toggleSubmenu(item.slug)}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                {item.icon && (
                  <View style={styles.iconContainer}>
                    <Ionicons name={item.icon as any} size={20} color="#007BFF" />
                  </View>
                )}
                <Text style={styles.menuText}>{item.title}</Text>
              </View>
              <View style={[styles.expandIcon, isSubmenuExpanded && styles.expandIconRotated]}>
                <Ionicons name="chevron-down" size={16} color="#007BFF" />
              </View>
            </View>
          </TouchableOpacity>
          {isSubmenuExpanded && (
            <View style={styles.submenu}>
              {item.items.map((childItem) => renderMenuItem(childItem, level + 1))}
            </View>
          )}
        </View>
      );
    } else {
      let onPressAction = () => {
        console.log(`[DrawerNavigation] Clicou no item: ${item.slug}, rota: ${item.route}`);

        if (item.route) {
          if (item.route === "EquipamentScreen") {
            if (!clientId || !sectorId) {
              Alert.alert("Erro", "Por favor, selecione um cliente e setor primeiro.");
              props.navigation.navigate("ClientsAvulsosScreen" as any, {});
            } else {
              props.navigation.navigate(item.route as any, { clientId, sectorId });
            }
          } else if (item.route === "ActivityHistoryScreen") {
            props.navigation.navigate(item.route as any, {});
          } else if (item.route === "ListOrderServiceScreen") {
            props.navigation.navigate(item.route as any, { equipmentId: equipmentId || 0 });
          } else {
            console.log(`[DrawerNavigation] Navegando para: ${item.route}`);
            props.navigation.navigate(item.route as any, {});
          }
        } else if (item.action === "logout") {
          handleLogout();
        }
      };

      return (
        <TouchableOpacity
          key={item.slug}
          style={[styles.menuItem, { paddingLeft }]}
          onPress={onPressAction}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemContent}>
            <View style={styles.menuItemLeft}>
              {item.icon && (
                <View style={styles.iconContainer}>
                  <Ionicons name={item.icon as any} size={20} color="#007BFF" />
                </View>
              )}
              <Text style={styles.menuText}>{item.title}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
  };

  if (loadingMenu || permissionsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>
            {permissionsLoading ? t('common.loading') + ' permissões...' : t('common.loading') + ' menu...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.drawerContainer}>
      <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />
      <DrawerContentScrollView
        {...props}
        style={styles.drawerScrollView}
        showsVerticalScrollIndicator={false}
      >
        <CustomDrawerHeader />

        <View style={styles.menuSection}>
          {/* Item Fixo: Meus Dados (sempre visível; edição controlada na tela) */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => props.navigation.navigate("PersonalDataScreen" as any, {})}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="person" size={20} color="#007BFF" />
                </View>
                <Text style={styles.menuText}>{t('menu.personalData')}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Separador visual */}
          <View style={styles.menuSeparator} />

          {/* Menu Dinâmico */}
          {dynamicMenu.map((item) => renderMenuItem(item))}

          {/* Item Fixo: Preferências */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => props.navigation.navigate("PreferencesScreen" as any, {})}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="settings" size={20} color="#007BFF" />
                </View>
                <Text style={styles.menuText}>{t('menu.preferences')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Seção de Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, styles.logoutIconContainer]}>
                  <Ionicons name="log-out" size={20} color="#E74C3C" />
                </View>
                <Text style={styles.logoutText}>{t('menu.logout')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>
    </View>
  );
};

const DrawerNavigator: React.FC = () => {
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.8, 400);
  const { t } = useLanguage();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#2C3E50",
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: '600',
        },
        drawerStyle: {
          backgroundColor: '#F8F9FA',
          width: drawerWidth,
        },
        drawerActiveTintColor: "#007BFF",
        drawerInactiveTintColor: "#2C3E50",
      }}
    >
      <Drawer.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ title: t('menu.home'), headerTitle: () => <CustomDrawerHeader /> }}
      />
      <Drawer.Screen
        name="ManualsScreen"
        component={ManualsScreen}
        options={{ title: t('menu.manuals') }}
      />
      <Drawer.Screen
        name="PersonalDataScreen"
        component={PersonalDataScreen}
        options={{ title: t('menu.personalData') }}
      />
      <Drawer.Screen
        name="PreferencesScreen"
        component={PreferencesScreen}
        options={{ title: t('menu.preferences') }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  drawerScrollView: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#2C3E50',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  userInfo: {
    alignItems: 'center',
  },
  welcomeText: {
    color: '#BDC3C7',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerDecoration: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#007BFF',
  },
  menuSection: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  menuItem: {
    marginHorizontal: 10,
    marginVertical: 2,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutIconContainer: {
    backgroundColor: '#FFEBEE',
  },
  menuText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
    flex: 1,
  },
  logoutText: {
    fontSize: 16,
    color: '#E74C3C',
    fontWeight: '600',
    flex: 1,
  },
  expandIcon: {
    transform: [{ rotate: '0deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  submenu: {
    marginLeft: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 10,
    marginTop: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutSection: {
    marginTop: 'auto',
    paddingTop: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    marginHorizontal: 10,
  },
  logoutButton: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
  menuSeparator: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginHorizontal: 20,
    marginVertical: 15,
  },
});

export default DrawerNavigator;
