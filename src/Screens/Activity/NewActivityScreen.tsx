import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationProp, RouteProp } from "@react-navigation/native";

import ResponsiveContainer from "../../Components/ResponsiveContainer";
import ResponsiveText from "../../Components/ResponsiveText";
import CustomPicker from "../../Components/CustomPicker";
import { useResponsive } from "../../hooks/useResponsive";
import { useLanguage } from "../../Context/LanguageContext";
import ActivityService from "../../Services/ActivityService";
import { RootStackParamList } from "../../Routers/AppRouter";
import { useNewActivityFlow } from "../../Context/NewActivityFlowContext";

type ScreenRoute = RouteProp<RootStackParamList, "NewActivityModal">;

interface Props {
  navigation: NavigationProp<any>;
  route: ScreenRoute;
}

type ActivityTypeItem = {
  id: number;
  name: string;
  slug?: string;
  budgetPolicy?: string;
};

const canonicalize = (s?: string): string => {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const slugAliases: { [k: string]: string[] } = {
  service_order: ["service_order", "order_service", "ordem_de_servico", "ordem_servico", "service-order"],
  pmoc: ["pmoc"],
  technical_assistance: ["technical_assistance", "assistencia_tecnica", "technical-assistance"],
  instalation: ["instalation", "installation", "instalacao"],
};

const expandAliases = (slug?: string): string[] => {
  const c = canonicalize(slug);
  const base = slugAliases[c];
  return base ? base.map(canonicalize) : [c];
};

const NewActivityScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useLanguage();
  const r = useResponsive();
  const { setActivityType, setClientMode, resetFlow } = useNewActivityFlow();

  const preselectedSlug = (route?.params as any)?.preselectedActivityTypeSlug as string | undefined;

  const [loading, setLoading] = useState(true);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeItem[]>([]);
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState<string>("");
  const [clientMode, setLocalClientMode] = useState<"existing" | "new" | "">("");

  const activityService = useMemo(() => new ActivityService(), []);

  useEffect(() => {
    // Ao entrar no fluxo, limpamos qualquer estado anterior do wizard
    resetFlow();
  }, [resetFlow]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("access_token");
        if (!token) throw new Error("Token não encontrado.");
        const types = await activityService.fetchActivityTypes(token);
        setActivityTypes(types || []);
      } catch (e: any) {
        Alert.alert("Erro", e?.message || "Falha ao carregar tipos de atividade.");
        setActivityTypes([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activityService]);

  useEffect(() => {
    if (!preselectedSlug) return;
    if (!activityTypes || activityTypes.length === 0) return;
    const wanted = new Set(expandAliases(preselectedSlug));
    const match = activityTypes.find((it) => wanted.has(canonicalize(it.slug || it.name)));
    if (match?.id) {
      setSelectedActivityTypeId(String(match.id));
    }
  }, [preselectedSlug, activityTypes]);

  const selectedType = useMemo(() => {
    const idNum = Number(selectedActivityTypeId);
    return activityTypes.find((t2) => t2.id === idNum) || null;
  }, [activityTypes, selectedActivityTypeId]);

  const canContinue = !!selectedType && (clientMode === "existing" || clientMode === "new");

  const handleContinue = () => {
    if (!selectedType) {
      Alert.alert("Atenção", "Selecione um tipo de atividade.");
      return;
    }
    if (clientMode !== "existing" && clientMode !== "new") {
      Alert.alert("Atenção", "Selecione a opção de cliente.");
      return;
    }

    setActivityType({
      id: selectedType.id,
      name: selectedType.name,
      slug: selectedType.slug,
      budgetPolicy: selectedType.budgetPolicy,
    });
    setClientMode(clientMode === "new" ? "new" : "existing");

    if (clientMode === "new") {
      navigation.navigate("NewClientScreen");
    } else {
      navigation.navigate("ExistingClientScreen");
    }
  };

  if (loading) {
    return (
      <ResponsiveContainer withPadding={false} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <ResponsiveText variant="body" style={{ marginTop: r.spacing(1) }}>
          {t("activity.loading")}
        </ResponsiveText>
      </ResponsiveContainer>
    );
  }

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
            {t("activity.newActivity")}
          </ResponsiveText>
          <ResponsiveText variant="caption" style={styles.headerSubtitle} numberOfLines={2}>
            Selecione o tipo e informe o cliente
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
            <MaterialIcons name="assignment" size={r.scale(20)} color="#007BFF" />
            <ResponsiveText variant="subtitle" weight="600" style={{ marginLeft: r.spacing(1) }}>
              {t("activity.selectActivityType")}
            </ResponsiveText>
          </View>
          <CustomPicker
            selectedValue={selectedActivityTypeId}
            onValueChange={(v) => setSelectedActivityTypeId(String(v))}
            items={(activityTypes || []).map((it) => ({ label: it.name, value: String(it.id) }))}
            placeholder="Selecione um tipo de atividade"
            searchable={true}
            style={{}}
          />
        </View>

        <View style={[styles.card, { marginTop: r.spacing(1.5) }]}>
          <View style={[styles.cardHeader, { marginBottom: r.spacing(1) }]}>
            <MaterialIcons name="people" size={r.scale(20)} color="#007BFF" />
            <ResponsiveText variant="subtitle" weight="600" style={{ marginLeft: r.spacing(1) }}>
              {t("activity.clientOption")}
            </ResponsiveText>
          </View>

          <TouchableOpacity
            style={[
              styles.option,
              { padding: r.spacing(1.5), minHeight: r.verticalScale(52) },
              clientMode === "existing" && styles.optionSelected,
            ]}
            onPress={() => setLocalClientMode("existing")}
            activeOpacity={0.8}
          >
            <MaterialIcons name="business" size={r.scale(22)} color={clientMode === "existing" ? "#fff" : "#007BFF"} />
            <View style={{ flex: 1, marginLeft: r.spacing(1) }}>
              <ResponsiveText variant="body" weight="600" style={{ color: clientMode === "existing" ? "#fff" : "#333" }}>
                {t("activity.existingClient")}
              </ResponsiveText>
              <ResponsiveText variant="caption" style={{ color: clientMode === "existing" ? "rgba(255,255,255,0.9)" : "#666" }}>
                Selecionar cliente e setor já cadastrados
              </ResponsiveText>
            </View>
            <Ionicons name="chevron-forward" size={r.scale(18)} color={clientMode === "existing" ? "#fff" : "#999"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.option,
              { padding: r.spacing(1.5), minHeight: r.verticalScale(52), marginTop: r.spacing(1) },
              clientMode === "new" && styles.optionSelected,
            ]}
            onPress={() => setLocalClientMode("new")}
            activeOpacity={0.8}
          >
            <MaterialIcons name="person-add" size={r.scale(22)} color={clientMode === "new" ? "#fff" : "#007BFF"} />
            <View style={{ flex: 1, marginLeft: r.spacing(1) }}>
              <ResponsiveText variant="body" weight="600" style={{ color: clientMode === "new" ? "#fff" : "#333" }}>
                {t("activity.newClient")}
              </ResponsiveText>
              <ResponsiveText variant="caption" style={{ color: clientMode === "new" ? "rgba(255,255,255,0.9)" : "#666" }}>
                Informar dados do cliente antes de adicionar equipamentos
              </ResponsiveText>
            </View>
            <Ionicons name="chevron-forward" size={r.scale(18)} color={clientMode === "new" ? "#fff" : "#999"} />
          </TouchableOpacity>
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
            Continuar
          </ResponsiveText>
          <Ionicons name="arrow-forward" size={r.scale(18)} color="#fff" style={{ marginLeft: r.spacing(1) }} />
        </TouchableOpacity>
      </ScrollView>
    </ResponsiveContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f7fb" },
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
  option: {
    borderWidth: 1,
    borderColor: "#e6eaf2",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  optionSelected: { backgroundColor: "#007BFF", borderColor: "#007BFF" },
  primaryButton: {
    backgroundColor: "#007BFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  primaryButtonDisabled: { backgroundColor: "#9bbcf2" },
});

export default NewActivityScreen;


