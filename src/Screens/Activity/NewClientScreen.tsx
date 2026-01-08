import React, { useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { NavigationProp } from "@react-navigation/native";

import ResponsiveContainer from "../../Components/ResponsiveContainer";
import ResponsiveText from "../../Components/ResponsiveText";
import AppTextInput from "../../Components/AppTextInput";
import { useResponsive } from "../../hooks/useResponsive";
import { useNewActivityFlow } from "../../Context/NewActivityFlowContext";

interface Props {
  navigation: NavigationProp<any>;
}

const NewClientScreen: React.FC<Props> = ({ navigation }) => {
  const r = useResponsive();
  const { state, setNewClientDraft, setClientMode } = useNewActivityFlow();

  const activityTypeName = state.activityType?.name;

  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [sectorName, setSectorName] = useState("");
  const [subsectorName, setSubsectorName] = useState("");

  const canContinue = useMemo(() => {
    return !!name.trim() && !!email.trim() && !!contactName.trim() && !!sectorName.trim();
  }, [name, email, contactName, sectorName]);

  const handleContinue = () => {
    if (!name.trim()) return Alert.alert("Atenção", "Nome do cliente é obrigatório.");
    if (!email.trim()) return Alert.alert("Atenção", "Email do cliente é obrigatório.");
    if (!contactName.trim()) return Alert.alert("Atenção", "Contato é obrigatório.");
    if (!sectorName.trim()) return Alert.alert("Atenção", "Nome do setor é obrigatório.");

    setClientMode("new");
    setNewClientDraft({
      name: name.trim(),
      document: document.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim(),
      contactName: contactName.trim(),
      sectorName: sectorName.trim(),
      subsectorName: subsectorName.trim() || undefined,
    });

    if (!state.activityType?.id) {
      Alert.alert("Erro", "Tipo de atividade não encontrado. Volte e selecione novamente.");
      navigation.goBack();
      return;
    }

    navigation.navigate("AddMultipleEquipmentsScreen", {
      activityTypeId: state.activityType.id,
      fromNewActivityFlow: true,
    });
  };

  return (
    <ResponsiveContainer withPadding={false} style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: r.spacing(2), paddingTop: r.spacing(3), paddingBottom: r.spacing(2) }]}>
        <TouchableOpacity
          style={[styles.iconButton, { minHeight: r.verticalScale(44), minWidth: r.verticalScale(44) }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={r.scale(22)} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ResponsiveText variant="title" weight="bold" style={styles.headerTitle} numberOfLines={1}>
            Novo Cliente
          </ResponsiveText>
          <ResponsiveText variant="caption" style={styles.headerSubtitle} numberOfLines={2}>
            {activityTypeName ? `Atividade: ${activityTypeName}` : "Preencha os dados do cliente"}
          </ResponsiveText>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: r.spacing(2), paddingBottom: r.spacing(4) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={[styles.cardHeader, { marginBottom: r.spacing(1) }]}>
            <MaterialIcons name="person" size={r.scale(20)} color="#007BFF" />
            <ResponsiveText variant="subtitle" weight="600" style={{ marginLeft: r.spacing(1) }}>
              Dados do Cliente
            </ResponsiveText>
          </View>

          <ResponsiveText variant="caption" style={{ marginBottom: r.spacing(0.5), color: "#666" }}>
            Nome do Cliente *
          </ResponsiveText>
          <AppTextInput value={name} onChangeText={setName} placeholder="Digite o nome do cliente" />

          <View style={{ height: r.spacing(1) }} />
          <ResponsiveText variant="caption" style={{ marginBottom: r.spacing(0.5), color: "#666" }}>
            Documento (Opcional)
          </ResponsiveText>
          <AppTextInput value={document} onChangeText={setDocument} placeholder="Digite o documento" />

          <View style={{ height: r.spacing(1) }} />
          <ResponsiveText variant="caption" style={{ marginBottom: r.spacing(0.5), color: "#666" }}>
            Telefone (Opcional)
          </ResponsiveText>
          <AppTextInput value={phone} onChangeText={setPhone} placeholder="Digite o telefone" keyboardType="phone-pad" />

          <View style={{ height: r.spacing(1) }} />
          <ResponsiveText variant="caption" style={{ marginBottom: r.spacing(0.5), color: "#666" }}>
            Email *
          </ResponsiveText>
          <AppTextInput value={email} onChangeText={setEmail} placeholder="Digite o email" keyboardType="email-address" autoCapitalize="none" />

          <View style={{ height: r.spacing(1) }} />
          <ResponsiveText variant="caption" style={{ marginBottom: r.spacing(0.5), color: "#666" }}>
            Contato (Pessoa de Contato) *
          </ResponsiveText>
          <AppTextInput value={contactName} onChangeText={setContactName} placeholder="Digite o nome do contato" />

          <View style={{ height: r.spacing(1) }} />
          <ResponsiveText variant="caption" style={{ marginBottom: r.spacing(0.5), color: "#666" }}>
            Nome do Setor *
          </ResponsiveText>
          <AppTextInput value={sectorName} onChangeText={setSectorName} placeholder="Digite o nome do setor" />

          <View style={{ height: r.spacing(1) }} />
          <ResponsiveText variant="caption" style={{ marginBottom: r.spacing(0.5), color: "#666" }}>
            Nome do Subsetor (Opcional)
          </ResponsiveText>
          <AppTextInput value={subsectorName} onChangeText={setSubsectorName} placeholder="Digite o nome do subsetor" />
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { minHeight: r.verticalScale(52), marginTop: r.spacing(2) },
            !canContinue && styles.primaryButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <ResponsiveText variant="button" weight="bold" style={{ color: "#fff" }}>
            Avançar para Equipamentos
          </ResponsiveText>
          <Ionicons name="arrow-forward" size={r.scale(18)} color="#fff" style={{ marginLeft: r.spacing(1) }} />
        </TouchableOpacity>
      </ScrollView>
    </ResponsiveContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  header: { backgroundColor: "#007BFF", flexDirection: "row", alignItems: "center" },
  iconButton: { justifyContent: "center", alignItems: "center", marginRight: 12 },
  headerTitle: { color: "#fff", backgroundColor: "transparent" },
  headerSubtitle: { color: "rgba(255,255,255,0.9)", backgroundColor: "transparent" },
  scroll: { flex: 1 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  primaryButton: {
    backgroundColor: "#007BFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  primaryButtonDisabled: { backgroundColor: "#9bbcf2" },
});

export default NewClientScreen;


