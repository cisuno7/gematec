import React, { useState } from "react";
import ClientList from "../../Components/ClientList";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../Routers/AppRouter";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { usePermissions } from "../../Context/PermissionsContext";
import { View, StyleSheet, Text } from "react-native";

interface ClientScreenProps {
  route: RouteProp<RootStackParamList, "ClientsAvulsosScreen" | "ClientsComContratoScreen">;
  navigation: DrawerNavigationProp<RootStackParamList>;
}

// Dentro do componente ClientsAvulsosScreen
export const ClientsAvulsosScreen: React.FC<ClientScreenProps> = ({ route, navigation }) => {

  const { hasPermission, permissions } = usePermissions();
  const [loading, setLoading] = useState(false); // Adicionar estado de loading




  return <ClientList hasContract={false} navigation={navigation} />;
};

export const ClientsComContratoScreen: React.FC<ClientScreenProps> = ({ route, navigation }) => {

  const { hasPermission, permissions } = usePermissions();
  const [loading, setLoading] = useState(false);

  return <ClientList hasContract={true} navigation={navigation} />;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginVertical: 10,
  },
  errorText: {
    fontSize: 16,
    color: "#FF0000",
    textAlign: "center",
    marginTop: 20,
  },
});
