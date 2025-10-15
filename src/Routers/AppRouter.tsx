import React from 'react';


import { createStackNavigator } from '@react-navigation/stack';
import QRCodeScreen from '../Screens/QRCodeScreen';
import { Text, StyleSheet } from 'react-native';
import LoginScreen from '../Screens/LoginScreen';
import PersonalDataScreen from '../Screens/PersonalDataScreen';
import EquipmentDetailsScreen from '../Screens/Equipaments/EquipamentDetails';
import ClientDetailScreen from '../Screens/Clients/ClientDetailScreen';
import ClientSectorsScreen from '../Screens/Clients/ClientSectorsScreen';
import SectorDetailScreen from '../Screens/Clients/SectorDetailScreen';
import ClientEquipmentListScreen from '../Screens/Clients/EquipmentListScreen';
import CreateEquipmentScreen from '../Screens/Equipaments/CreateEquipmentScreen';
import EditEquipmentScreen from '../Screens/Equipaments/EditEquipmentScreen';
import { ClientsAvulsosScreen, ClientsComContratoScreen } from "../Screens/Clients/Client";
import RoadmapScreen from '../Screens/Roadmap/RoadmapScreen';
import RoadmapActivityDetailsScreen from '../Screens/Roadmap/RoadmapdetailsScreen';

import HomeScreen from '../Screens/HomeScreen';
import DrawerNavigator from "./DrawerNavigation";
import EquipamentScreen from '../Screens/Equipaments/EquipamentScreen';
import EquipmentQRCodeScreen from '../Screens/Equipaments/EquipmentQRCodeScreen';
// Usar a tela restrita correta (por cliente/setor)
import EquipmentListScreen from "../Screens/Clients/EquipmentListScreen";
import GeneralEquipmentListScreen from "../Screens/Equipaments/GeneralEquipmentListScreen";
import PmocListScreen from "../Screens/Pmoc/PmocListScreen";
import PmocDetailsScreen from "../Screens/Pmoc/PmocDetailsScreen";
import PmocEquipmentScreen from "../Screens/Pmoc/PmocEquipmentScreen";
import ActivityHistoryScreen from "../Screens/Activity/ActivityHistoryScreen";
import ActivityEquipmentListScreen from "../Screens/Activity/ActivityEquipmentListScreen";
import ActivityQuestionnaireScreen from "../Screens/Activity/ActivityQuestionnaireScreen";
import NewActivityModal from "../Screens/Activity/NewActivityModal";
import WorkListScreen from "../Screens/Work/WorkListScreen";
import WorkDetailScreen from "../Screens/Work/WorkDetailScreen";
import WorkCreateScreen from "../Screens/Work/WorkCreateScreen";
import WorkEditScreen from "../Screens/Work/WorkEditScreen";
import WorkApproveScreen from "../Screens/Work/WorkApproveScreen";
import NewServiceOrderScreen from "../Screens/Orders/NewServiceOrderScreen";
import TechnicalAssistanceScreen from '../Screens/TechnicalAssistance/TechnicalAssistanceScreen';
import RespondOrderScreen from "../Screens/Orders/RespondOrderServiceScreen";
import ListOrderServiceScreen from "../Screens/Orders/ListOrderServiceScreen";
import ViewOrderActivityScreen from "../Screens/Orders/ViewOrderActivityScreen";
import HistOrderServiceEquipScreen from "../Screens/Orders/HistOrderServiceEquipScreen";
import ViewResponseActivityScreen from "../Screens/Orders/ViewResponseActivityScreen";
import CreateServiceOrderScreen from "../Screens/Orders/CreateServiceOrderScreen";
import TechnicalAssistanceDetailsScreen from "../Screens/TechnicalAssistance/TechnicalAssistanceDetailsScreen";

import ManualsScreen from "../Screens/ManualsScreen";
import SubSectorScreen from '../Screens/Clients/SubSectorScreen';
import PreferencesScreen from '../Screens/PreferencesScreen'; // Importe a PreferencesScreen
import { useUser } from '../Context/UserContext';
import { useLanguage } from '../Context/LanguageContext';
import { ActivityIndicator, View } from 'react-native';

export type RootStackParamList = {
  CondenserTypesScreen: undefined;
  EvaporatorTypesScreen: undefined;
  RoadmapScreen: undefined;
  RoadmapDetailsScreen: { activity: any };

  RoadmapEquipmentQuestionsScreen: { activity: any; equipment: any };
  PhasesScreen: undefined;
  TechnologiesScreen: undefined;
  FunctionsScreen: undefined;
  ManufacturersScreen: undefined;
  CoilTypesScreen: undefined;
  EquipmentTypesScreen: undefined;
  CompressorTypesScreen: undefined;
  CoolingFluidTypesScreen: undefined;
  CapacityUnitsScreen: undefined;
  QRCodeScreen: undefined;
  LoginScreen: undefined;
  PersonalDataScreen: undefined;
  ClientsAvulsosScreen: undefined;
  ClientsComContratoScreen: undefined;
  ManualsScreen: undefined;
  ClientDetailScreen: { clientId: number };
  HomeScreen: undefined;
  AuthenticatedFlow: undefined;
  EquipamentScreen: { clientId: number; sectorId: number, subsectorId?: number };
  CreateServiceOrderScreen: { equipmentId: number; equipmentStatus: string };
  CreateEquipmentScreen: { clientId?: number; sectorId?: number };
  EquipmentDetailsScreen: { equipmentId: string };
  EquipmentQRCodeScreen: { equipmentId?: string };
  EditEquipmentScreen: { equipmentId: string };
  EquipmentListScreen: { clientId: number; sectorId: number };
  GeneralEquipmentListScreen: undefined;
  PmocListScreen: undefined;
  PmocDetailsScreen: { pmocId: number };
  PmocEquipmentScreen: { pmocId: number; equipmentId: number };
  ServiceOrderScreen: undefined;
  ActivityHistoryScreen: { equipmentId?: number, activityTypeSlug?: string, status?: string[] };
  ActivityEquipmentListScreen: { activityId: number; activityName: string; clientId?: number; clientName?: string };
  ActivityQuestionnaireScreen: { activityId: number; activityEquipmentId: number; equipmentId: number; equipmentTag: string; activityName: string; budgetPolicy?: string; fromNewActivityFlow?: boolean };
  NewActivityModal: { preselectedActivityTypeSlug?: string } | undefined;
  WorkListScreen: { activityId: number; activityName?: string };
  WorkDetailScreen: { activityId: number; workId: number };
  WorkCreateScreen: { activityId: number };
  WorkEditScreen: { activityId: number; workId: number };
  WorkApproveScreen: { activityId: number; workId: number };
  NewServiceOrderScreen: { equipmentId: number };
  TechnicalAssistanceScreen: undefined;
  ListOrderServiceScreen: { equipmentId: number };
  ViewOrderActivityScreen: { serviceOrderId: number; equipmentId: number; pmocId?: number; equipmentVersionId?: number; questions?: string };
  HistOrderServiceEquipScreen: { equipmentId: number };
  TechnicalAssistanceDetails: { id: number };
  SubSectorScreen: { clientId: number; parentSector: { id: number; name: string; level: number; complete_name: string } };
  ClientSectorsScreen: { clientId: number };
  SectorDetailScreen: { clientId: number; sectorId: number };
  ViewResponseActivityScreen: { serviceOrderId: number; equipmentStatus: string };
  RespondOrderScreen: { serviceOrderId: number; questions: string; equipmentId?: number };
  PreferencesScreen: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

/*interface AppRouterProps {
  isAuthenticated: boolean;
}*/

const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useUser(); // Obtenha o estado de autenticação do UserContext
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>{t('common.loading')}...</Text>
      </View>
    );
  }
  return (
    <Stack.Navigator initialRouteName={isAuthenticated ? "AuthenticatedFlow" : "LoginScreen"}>
      <Stack.Screen name="AuthenticatedFlow" component={DrawerNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} options={{ headerTitle: 'Login' }} />
      <Stack.Screen name="PersonalDataScreen" component={PersonalDataScreen} options={{ headerTitle: t('menu.personalData') }} />
      <Stack.Screen name="ClientsAvulsosScreen" component={ClientsAvulsosScreen} options={{ headerTitle: t('menu.clientsWithoutContract') }} />
      <Stack.Screen name="ClientsComContratoScreen" component={ClientsComContratoScreen} options={{ headerTitle: t('menu.clientsWithContract') }} />
      <Stack.Screen name="ClientDetailScreen" component={ClientDetailScreen} options={{ headerTitle: 'Detalhes do Cliente' }} />
      <Stack.Screen name="TechnicalAssistanceScreen" component={TechnicalAssistanceScreen} options={{ title: t('menu.technicalAssistance') }} />
      <Stack.Screen name="TechnicalAssistanceDetails" component={TechnicalAssistanceDetailsScreen} options={{ title: 'Detalhes Assistência Técnica' }} />
      <Stack.Screen name="EquipamentScreen" component={EquipamentScreen} options={{ headerTitle: t('menu.filterEquipment') }} />
      <Stack.Screen name="EquipmentDetailsScreen" component={EquipmentDetailsScreen} options={{ headerTitle: 'Detalhes do Equipamento' }} />
      <Stack.Screen name="EquipmentListScreen" component={EquipmentListScreen} options={{ headerTitle: t('menu.equipments') }} />
      <Stack.Screen name="GeneralEquipmentListScreen" component={GeneralEquipmentListScreen} options={{ headerTitle: "Listagem Geral de Equipamentos" }} />
      <Stack.Screen name="CreateEquipmentScreen" component={CreateEquipmentScreen} options={{ headerTitle: t('menu.createEquipment') }} />
      <Stack.Screen name="EquipmentQRCodeScreen" component={EquipmentQRCodeScreen} options={{ headerTitle: t('menu.equipmentQrCode') }} />
      <Stack.Screen name="EditEquipmentScreen" component={EditEquipmentScreen} options={{ headerTitle: 'Editar Equipamento' }} />
      <Stack.Screen name="PmocListScreen" component={PmocListScreen} options={{ headerTitle: t('menu.pmocs') }} />
      <Stack.Screen name="PmocDetailsScreen" component={PmocDetailsScreen} options={{ headerTitle: "Detalhes do PMOC" }} />
      <Stack.Screen name="PmocEquipmentScreen" component={PmocEquipmentScreen} options={{ headerTitle: "Detalhes do Equipamento PMOC" }} />
      <Stack.Screen name="ActivityHistoryScreen" component={ActivityHistoryScreen} options={{ headerTitle: t('menu.activities') }} />
      <Stack.Screen name="ActivityEquipmentListScreen" component={ActivityEquipmentListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ActivityQuestionnaireScreen" component={ActivityQuestionnaireScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NewActivityModal" component={NewActivityModal} options={{ headerShown: false }} />
      <Stack.Screen name="WorkListScreen" component={WorkListScreen} options={{ headerTitle: 'Registros de Trabalho' }} />
      <Stack.Screen name="WorkDetailScreen" component={WorkDetailScreen} options={{ headerTitle: 'Detalhes do Registro' }} />
      <Stack.Screen name="WorkCreateScreen" component={WorkCreateScreen} options={{ headerTitle: 'Criar Registro de Trabalho' }} />
      <Stack.Screen name="WorkEditScreen" component={WorkEditScreen} options={{ headerTitle: 'Editar Registro de Trabalho' }} />
      <Stack.Screen name="WorkApproveScreen" component={WorkApproveScreen} options={{ headerTitle: 'Aprovar Registro' }} />
      <Stack.Screen name="NewServiceOrderScreen" component={NewServiceOrderScreen} options={{ title: "Nova Ordem de Serviço" }} />
      <Stack.Screen name="ListOrderServiceScreen" component={ListOrderServiceScreen} options={{ title: t('menu.serviceOrders') }} />
      <Stack.Screen name="ManualsScreen" component={ManualsScreen} options={{ headerTitle: t('menu.manuals') }} />
      <Stack.Screen name="ViewOrderActivityScreen" component={ViewOrderActivityScreen} options={{ title: "Visualizar Plano de Atividade de uma Ordem de Serviço" }} />
      <Stack.Screen name="HistOrderServiceEquipScreen" component={HistOrderServiceEquipScreen} options={{ title: "Visualizar histórico de Ordem de Serviço em um Equipamento" }} />
      <Stack.Screen name="ViewResponseActivityScreen" component={ViewResponseActivityScreen} options={{ title: "Visualizar resposta de um plano de atividade (O.S)" }} />
      <Stack.Screen name="CreateServiceOrderScreen" component={CreateServiceOrderScreen} options={{ title: "Criar Nova Ordem de Serviço" }} />
      <Stack.Screen name="RespondOrderScreen" component={RespondOrderScreen} options={{ title: "Responder Plano de Atividade de uma Ordem de Serviço" }} />
      <Stack.Screen name="SubSectorScreen" component={SubSectorScreen} options={{ headerTitle: 'Sub-setores' }} />
      <Stack.Screen name="ClientSectorsScreen" component={ClientSectorsScreen} options={{ headerTitle: 'Setores do Cliente' }} />
      <Stack.Screen name="RoadmapScreen" component={RoadmapScreen} options={{ headerTitle: 'Roteiro' }} />
      <Stack.Screen name="RoadmapDetailsScreen" component={RoadmapActivityDetailsScreen} options={{ headerTitle: 'Detalhes da Atividade' }} />

      <Stack.Screen name="SectorDetailScreen" component={SectorDetailScreen} options={{ headerTitle: 'Detalhes do Setor' }} />
      <Stack.Screen name="PreferencesScreen" component={PreferencesScreen} options={{ headerTitle: t('menu.preferences') }} />
    </Stack.Navigator>
  );
};
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default AppRouter;