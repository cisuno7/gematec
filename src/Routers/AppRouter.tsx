import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import QRCodeScreen from '../Screens/QRCodeScreen';
import LoginScreen from '../Screens/LoginScreen';
import PersonalDataScreen from '../Screens/PersonalDataScreen';
import EquipmentDetailsScreen from '../Screens/Equipaments/EquipamentDetails';
import ClientDetailScreen from '../Screens/Clients/ClientsDetails';
import CreateEquipmentScreen from '../Screens/Equipaments/CreateEquipmentScreen';
import EditEquipmentScreen from '../Screens/Equipaments/EditEquipmentScreen';
import { ClientsAvulsosScreen, ClientsComContratoScreen } from "../Screens/Clients/Client";
import HomeScreen from '../Screens/HomeScreen';
import AccountSelectionScreen from "../Screens/AccountSelectionScreen";
import DrawerNavigator from "./DrawerNavigation";
import EquipamentScreen from '../Screens/Equipaments/EquipamentScreen';
import EquipmentQRCodeScreen from '../Screens/Equipaments/EquipmentQRCodeScreen';
import EquipmentListScreen from "../Screens/Equipaments/EquipmentListScreen";
import PmocListScreen from "../Screens/Pmoc/PmocListScreen";
import PmocDetailsScreen from "../Screens/Pmoc/PmocDetailsScreen";
import PmocEquipmentScreen from "../Screens/Pmoc/PmocEquipmentScreen";
import ActivityHistoryScreen from "../Screens/Activity/ActivityHistoryScreen";
import NewServiceOrderScreen from "../Screens/Orders/NewServiceOrderScreen";
import TechnicalAssistanceScreen from '../Screens/TechnicalAssistance/TechnicalAssistanceScreen';
import RespondOrderScreen from "../Screens/Orders/RespondOrderServiceScreen";
import ListOrderServiceScreen from "../Screens/Orders/ListOrderServiceScreen";
import ViewOrderActivityScreen from "../Screens/Orders/ViewOrderActivityScreen";
import HistOrderServiceEquipScreen from "../Screens/Orders/HistOrderServiceEquipScreen";
import ViewResponseActivityScreen from "../Screens/Orders/ViewResponseActivityScreen";
import CreateServiceOrderScreen from "../Screens/Orders/CreateServiceOrderScreen";
import TechnicalAssistanceDetailsScreen from "../Screens/TechnicalAssistance/TechnicalAssistanceDetailsScreen";
import ManualDetailsScreen from "../Screens/ManualDetailsScreen";
import ManualsScreen from "../Screens/ManualsScreen";
import SubSectorScreen from '../Screens/Clients/SubSectorScreen';
import PreferencesScreen from '../Screens/PreferencesScreen';
export type RootStackParamList = {
  CondenserTypesScreen: undefined;
  EvaporatorTypesScreen: undefined;
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
  AccountSelectionScreen: undefined;
  HomeScreen: undefined;
  EquipamentScreen: { clientId: number; sectorId: number, subsectorId?: number };
  CreateServiceOrderScreen: { equipmentId: number; equipmentStatus: string };
  CreateEquipmentScreen: undefined;
  EquipmentDetailsScreen: { equipmentId: string };
  EquipmentQRCodeScreen: { equipmentId?: string };
  EditEquipmentScreen: { equipmentId: string };
  EquipmentListScreen: { clientId?: number; sectorId?: number };
  PmocListScreen: undefined;
  PmocDetailsScreen: { pmocId: number };
  PmocEquipmentScreen: { pmocId: number; equipmentId: number };
  ServiceOrderScreen: undefined;
  ActivityHistoryScreen: { equipmentId: number };
  NewServiceOrderScreen: { equipmentId: number };
  TechnicalAssistanceScreen: undefined;
  ListOrderServiceScreen: { equipmentId: number };
  ViewOrderActivityScreen: { serviceOrderId: number; equipmentId: number; pmocId?: number; equipmentVersionId?: number; questions?: string };
  HistOrderServiceEquipScreen: { equipmentId: number };
  TechnicalAssistanceDetails: { id: number };
  ManualDetailsScreen: { manualId: number };
  SubSectorScreen: { clientId: number; parentSector: { id: number; name: string; level: number; complete_name: string } };
  ViewResponseActivityScreen: { serviceOrderId: number; equipmentStatus: string };
  RespondOrderScreen: { serviceOrderId: number; questions: string; equipmentId?: number };
  PreferencesScreen: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppRouter: React.FC = () => {
  return (
    <Stack.Navigator initialRouteName="LoginScreen">
      <Stack.Screen name="QRCodeScreen" component={QRCodeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} options={{ headerTitle: 'Login' }} />
      <Stack.Screen name="PersonalDataScreen" component={PersonalDataScreen} options={{ headerTitle: 'Meus Dados' }} />
      <Stack.Screen name="ClientsAvulsosScreen" component={ClientsAvulsosScreen} options={{ headerTitle: 'Clientes Avulsos' }} />
      <Stack.Screen name="ClientsComContratoScreen" component={ClientsComContratoScreen} options={{ headerTitle: 'Clientes com Contrato' }} />
      <Stack.Screen name="ClientDetailScreen" component={ClientDetailScreen} options={{ headerTitle: 'Detalhes do Cliente' }} />
      <Stack.Screen name="TechnicalAssistanceScreen" component={TechnicalAssistanceScreen} options={{ title: 'Assistência Técnica' }} />
      <Stack.Screen name="TechnicalAssistanceDetails" component={TechnicalAssistanceDetailsScreen} options={{ title: 'Detalhes Assistência Técnica' }} />
      <Stack.Screen name="EquipamentScreen" component={EquipamentScreen} options={{ headerTitle: 'Filtragem de Equipamentos' }} />
      <Stack.Screen name="EquipmentDetailsScreen" component={EquipmentDetailsScreen} options={{ headerTitle: 'Detalhes do Equipamento' }} />
      <Stack.Screen name="EquipmentListScreen" component={EquipmentListScreen} options={{ headerTitle: "Listagem de Equipamentos" }} />
      <Stack.Screen name="AccountSelectionScreen" component={AccountSelectionScreen} options={{ headerTitle: 'Selecionar Conta' }} />
      <Stack.Screen name="CreateEquipmentScreen" component={CreateEquipmentScreen} options={{ headerTitle: 'Criação de Equipamento' }} />
      <Stack.Screen name="EquipmentQRCodeScreen" component={EquipmentQRCodeScreen} options={{ headerTitle: 'Leitura QR Code' }} />
      <Stack.Screen name="EditEquipmentScreen" component={EditEquipmentScreen} options={{ headerTitle: 'Editar Equipamento' }} />
      <Stack.Screen name="PmocListScreen" component={PmocListScreen} options={{ headerTitle: "Listagem de PMOCs" }} />
      <Stack.Screen name="PmocDetailsScreen" component={PmocDetailsScreen} options={{ headerTitle: "Detalhes do PMOC" }} />
      <Stack.Screen name="PmocEquipmentScreen" component={PmocEquipmentScreen} options={{ headerTitle: "Detalhes do Equipamento PMOC" }} />
      <Stack.Screen name="ActivityHistoryScreen" component={ActivityHistoryScreen} options={{ headerTitle: 'Historico do Equipamento' }} />
      <Stack.Screen name="NewServiceOrderScreen" component={NewServiceOrderScreen} options={{ title: "Nova Ordem de Serviço" }} />
      <Stack.Screen name="ListOrderServiceScreen" component={ListOrderServiceScreen} options={{ title: "Listar Ordem de Serviço" }} />
      <Stack.Screen name="ManualsScreen" component={ManualsScreen} options={{ headerTitle: 'Manuais' }} />
      <Stack.Screen name="ViewOrderActivityScreen" component={ViewOrderActivityScreen} options={{ title: "Visualizar Plano de Atividade de uma Ordem de Serviço" }} />
      <Stack.Screen name="HistOrderServiceEquipScreen" component={HistOrderServiceEquipScreen} options={{ title: "Visualizar histórico de Ordem de Serviço em um Equipamento" }} />
      <Stack.Screen name="ViewResponseActivityScreen" component={ViewResponseActivityScreen} options={{ title: "Visualizar resposta de um plano de atividade (O.S)" }} />
      <Stack.Screen name="CreateServiceOrderScreen" component={CreateServiceOrderScreen} options={{ title: "Criar Nova Ordem de Serviço" }} />
      <Stack.Screen name="ManualDetailsScreen" component={ManualDetailsScreen} options={{ headerTitle: '' }} />
      <Stack.Screen name="RespondOrderScreen" component={RespondOrderScreen} options={{ title: "Responder Plano de Atividade de uma Ordem de Serviço" }} />
      <Stack.Screen name="PreferencesScreen" component={PreferencesScreen} options={{ headerTitle: 'Preferências' }} />
      <Stack.Screen name="HomeScreen" component={DrawerNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="SubSectorScreen" component={SubSectorScreen} options={{ headerTitle: 'Sub-setores' }} />
    </Stack.Navigator>
  );
};

export default AppRouter;