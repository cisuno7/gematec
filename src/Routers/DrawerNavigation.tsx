// file: src/Routers/DrawerNavigation.tsx
import React, { useState, useEffect } from "react";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { usePermissions } from "../Context/PermissionsContext"; // Certifique-se de que esta importação está correta
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
  "roadmaps": { titleKey: "menu.roadmaps", route: "RoadmapScreen", icon: "map" },
  "documentation": { titleKey: "menu.documentation", icon: "document" },
};

const CustomDrawerHeader: React.FC = () => {
  const { username } = useUser();
  const { t } = useLanguage();

  console.log("[CustomDrawerHeader] Username:", username);
  console.log("[CustomDrawerHeader] Tradução welcome:", t('common.welcome'));

  return (
    <View>
      <Text style={styles.userName}>
        {username ? `${t('common.welcome')}, ${username}` : t('common.welcome')}
      </Text>
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

  // Função auxiliar para coletar permissões recursivamente


  // Função para processar e mapear os itens do menu do backend
  const processMenuItems = (items: MenuItem[]): MenuItem[] => {
    console.log("[DrawerNavigation] Itens antes do filtro:", items.map(item => ({ slug: item.slug, required_apps: item.required_apps })));

    const filteredItems = items.filter(item => {
      const shouldInclude = item.required_apps ? item.required_apps.includes("mobile") : true;
      console.log(`[DrawerNavigation] Item ${item.slug} - required_apps: ${item.required_apps}, incluído: ${shouldInclude}`);
      return shouldInclude;
    });

    console.log("[DrawerNavigation] Itens após filtro:", filteredItems.map(item => item.slug));

    return filteredItems
      .map(item => {
        console.log(`[DrawerNavigation] Processando item: ${item.slug}`);
        const appData = SLUG_TO_APP_DATA[item.slug];
        if (!appData) {
          console.warn(`Mapeamento não encontrado para o slug: ${item.slug}`);
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
    const fetchMenu = async () => {
      try {
        setLoadingMenu(true);
        const menuData = await MenuService.fetchDynamicMenu();
        console.log("[DrawerNavigation] Menu recebido do backend:", JSON.stringify(menuData, null, 2));
        const processedData = processMenuItems(menuData); // Esta chamada agora também atualiza as permissões
        console.log("[DrawerNavigation] Menu processado:", JSON.stringify(processedData, null, 2));
        setDynamicMenu(processedData);
      } catch (error: any) {
        Alert.alert("Erro", error.message || "Não foi possível carregar o menu.");
        console.error("Erro ao carregar menu:", error);
      } finally {
        setLoadingMenu(false);
      }
    };
    fetchMenu();
  }, [t]); // Adiciona dependência da função de tradução para recarregar quando a linguagem mudar

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
    // Se item.required_permissions for vazio, significa que nenhuma permissão específica é necessária, então é permitido.
    const hasRequiredPermissions = item.required_permissions
      ? item.required_permissions.some((perm) => hasPermission(perm))
      : true;

    console.log(`[DrawerNavigation] Item ${item.slug} tem permissões necessárias:`, hasRequiredPermissions);

    if (!hasRequiredPermissions) {
      console.log(`[DrawerNavigation] Item ${item.slug} não será renderizado - sem permissões`);
      return null; // Não renderiza o item se as permissões não forem atendidas
    }

    const isSubmenuExpanded = submenuStates[item.slug];
    const paddingLeft = 16 + level * 16;

    if (item.items && item.items.length > 0) {
      return (
        <View key={item.slug}>
          <TouchableOpacity
            style={[styles.menuItem, { paddingLeft }]}
            onPress={() => toggleSubmenu(item.slug)}
          >
            <View style={styles.menuMainText}>
              {item.icon && <Ionicons name={item.icon as any} size={20} color="#333" style={styles.icon} />}
              <Text style={styles.menuText}>{item.title}</Text>
            </View>
            <Text style={styles.expandText}>{isSubmenuExpanded ? "▲" : "▼"}</Text>
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
            if (!equipmentId) {
              Alert.alert("Erro", "Por favor, selecione um equipamento primeiro.");
            } else {
              props.navigation.navigate(item.route as any, { equipmentId });
            }
          } else if (item.route === "ListOrderServiceScreen") {
            props.navigation.navigate(item.route as any, { equipmentId: equipmentId || 0 });
          }
          else {
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
        >
          {item.icon && <Ionicons name={item.icon as any} size={20} color="#333" style={styles.icon} />}
          <Text style={styles.menuText}>{item.title}</Text>
        </TouchableOpacity>
      );
    }
  };

  if (loadingMenu || permissionsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>
          {permissionsLoading ? t('common.loading') + ' permissões...' : t('common.loading') + ' menu...'}
        </Text>
      </View>
    );
  }

  return (
    <DrawerContentScrollView {...props}>
      <CustomDrawerHeader />
      {/* Item Fixo: Meus Dados */}
      {(() => {
        const hasViewUserPermission = hasPermission("view_user");
        console.log("[DrawerNavigation] Verificando permissão users.view_user:", hasViewUserPermission);
        return hasViewUserPermission && (
          <TouchableOpacity
            style={[styles.menuItem, { paddingLeft: 16 }]}
            onPress={() => props.navigation.navigate("PersonalDataScreen" as any, {})}
          >
            <Ionicons name="person" size={20} color="#333" style={styles.icon} />
            <Text style={styles.menuText}>{t('menu.personalData')}</Text>
          </TouchableOpacity>
        );
      })()}
      {dynamicMenu.map((item) => renderMenuItem(item))}

      {/* Item Fixo: Preferências */}
      <TouchableOpacity
        style={[styles.menuItem, { paddingLeft: 16 }]}
        onPress={() => props.navigation.navigate("PreferencesScreen" as any, {})}
      >
        <Ionicons name="settings" size={20} color="#333" style={styles.icon} />
        <Text style={styles.menuText}>{t('menu.preferences')}</Text>
      </TouchableOpacity>



      {/* Item Fixo: Sair (sempre por último) */}
      <TouchableOpacity
        style={[styles.menuItem, styles.logoutButton, { paddingLeft: 16 }]}
        onPress={handleLogout}
      >
        <Ionicons name="arrow-forward" size={20} color="#333" style={styles.icon} />
        <Text style={styles.menuText}>{t('menu.logout')}</Text>
      </TouchableOpacity>

    </DrawerContentScrollView>
  );
};

const DrawerNavigator: React.FC = () => {
  const { t } = useLanguage();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#007BFF" },
        headerTintColor: "#fff",
        drawerActiveTintColor: "#007BFF",
        drawerInactiveTintColor: "#333",
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
        name="PreferencesScreen" // Adicione a PreferencesScreen aqui também
        component={PreferencesScreen}
        options={{ title: t('menu.preferences') }}
      />

    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    justifyContent: "space-between",
  },
  menuText: {
    fontSize: 16,
    color: "#333",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  logoutButton: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  icon: {
    marginRight: 10,
  },
  expandIcon: {
    marginLeft: 8,
  },
  expandText: {
    fontSize: 16,
    color: "#007BFF",
  },
  menuMainText: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  userName: {
    color: "#007BFF",
    fontSize: 18,
    fontWeight: "bold",
    margin: 10,
    textAlign: "center",
  },
  submenu: {
    paddingLeft: 32,
  },
  submenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  submenuText: {
    fontSize: 14,
    color: "#555",
  },
});

export default DrawerNavigator;
