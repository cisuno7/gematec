import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import * as Linking from "expo-linking";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../Routers/AppRouter";
import ManualService from "../Services/ManualService";
import { usePermissions } from "../Context/PermissionsContext";
import { useLanguage } from "../Context/LanguageContext";
import { Manual, Category } from "../Models/Manual";
import { MaterialIcons } from '@expo/vector-icons';

interface ManualsScreenProps {
  route: RouteProp<RootStackParamList, "ManualsScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "ManualsScreen">;
}

const ManualsScreen: React.FC<ManualsScreenProps> = ({ navigation }) => {
  const { hasPermission } = usePermissions();
  const { t } = useLanguage();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);



  const fetchManuals = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      const response = await ManualService.fetchManuals({
        accessToken: token,
        page,
        perPage,
        search: search.length >= 3 ? search : "",
        categoryId: selectedCategory ? parseInt(selectedCategory) : undefined,
      });

      setManuals(response.results || []);
      setTotalPages(Math.ceil(response.count / perPage) || 1);
    } catch (error: any) {
      console.error("[ManualsScreen] Erro ao buscar manuais:", error);
      Alert.alert(t('common.error'), error.message || t('manuals.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");
      const response = await ManualService.fetchCategories(token);
      setCategories(response);
    } catch (error: any) {
      console.error("[ManualsScreen] Erro ao buscar categorias:", error);
      Alert.alert(t('common.error'), error.message || t('manuals.categoriesLoadError'));
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleDownload = async (manual: Manual) => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      // Usar content_url como campo principal, com fallback para file_url
      const fileUrl = manual.content_url || manual.file_url || "";

      if (!fileUrl) {
        throw new Error(t('manuals.fileUrlNotAvailable'));
      }

      console.log("[ManualsScreen] Iniciando download do manual:", manual.name);
      console.log("[ManualsScreen] URL do arquivo:", fileUrl);

      // Verificar extensão do arquivo
      const fileExtension = fileUrl.split('.').pop()?.toLowerCase() || 'pdf';

      // Verificar se há aplicativos disponíveis para abrir o arquivo
      const canOpenFile = await ManualService.checkFileOpenCapability(fileExtension);

      if (!canOpenFile) {
        Alert.alert(
          "Aviso",
          `Não foi detectado um aplicativo para abrir arquivos .${fileExtension.toUpperCase()} no seu dispositivo.\n\nO arquivo será baixado, mas pode não abrir automaticamente.\n\nDeseja continuar mesmo assim?`,
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Continuar", onPress: () => proceedWithDownload() }
          ]
        );
        return;
      }

      proceedWithDownload();

      async function proceedWithDownload() {
        try {
          // Mensagem simples de progresso (sem expor URLs ou detalhes técnicos)
          Alert.alert(t('common.loading'), `Baixando manual...`);

          if (!token) {
            Alert.alert(t('common.error'), "Token de acesso não encontrado");
            return;
          }
          const fileUri = await ManualService.downloadManual(fileUrl, token, manual.name);

          console.log("[ManualsScreen] Download concluído. Arquivo salvo em:", fileUri);

          // Mensagem simples de sucesso
          Alert.alert(t('common.success'), t('manuals.downloadSuccess'));
        } catch (downloadError: any) {
          console.error("[ManualsScreen] Erro ao baixar manual:", downloadError);
          Alert.alert(t('common.error'), downloadError.message || t('manuals.downloadError'));
        }
      }
    } catch (error: any) {
      console.error("[ManualsScreen] Erro ao baixar manual:", error);
      Alert.alert(t('common.error'), error.message || t('manuals.downloadError'));
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchManuals();
  }, [page, search, selectedCategory]);

  const handleSearch = () => {
    setPage(1);
    fetchManuals();
  };

  const handleOpenInBrowser = async (manual: Manual) => {
    try {
      const fileUrl = manual.content_url || manual.file_url || "";
      if (!fileUrl) {
        throw new Error(t('manuals.fileUrlNotAvailable'));
      }

      // Construir URL completa se for relativa
      let fullUrl = fileUrl;
      if (!fileUrl.startsWith('http')) {
        const token = await AsyncStorage.getItem("access_token");
        if (!token) throw new Error("Token de acesso não encontrado.");

        // Usar a mesma lógica do ManualService para construir a URL
        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await ManualService.getDynamicBaseUrl(token);
        fullUrl = `${dynamicBaseUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
      }

      console.log("[ManualsScreen] Abrindo no navegador:", fullUrl);
      await Linking.openURL(fullUrl);
    } catch (error: any) {
      console.error("[ManualsScreen] Erro ao abrir no navegador:", error);
      Alert.alert(t('common.error'), "Erro ao abrir manual no navegador");
    }
  };

  const renderManualItem = ({ item }: { item: Manual }) => (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => handleDownload(item)}
      >
        <Text style={styles.itemText}>{t('manuals.manual')}: {item.name}</Text>
        <Text style={styles.itemText}>{t('manuals.category')}: {item.category.name}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.browserButton}
        onPress={() => handleOpenInBrowser(item)}
      >
        <Text style={styles.browserButtonText}>🌐</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('menu.manuals')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('manuals.searchPlaceholder')}
        placeholderTextColor="#666"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={handleSearch}
      />
      {loadingCategories ? (
        <ActivityIndicator size="small" color="#007BFF" />
      ) : (
        <View style={{ position: 'relative' }}>
          <Picker
            selectedValue={selectedCategory}
            onValueChange={(value) => {
              setSelectedCategory(value);
              setPage(1);
            }}
            style={[styles.picker, { backgroundColor: '#fff', color: '#222' }]}
          >
            <Picker.Item label={t('manuals.allCategories')} value="" color="#888" />
            {categories.map((category) => (
              <Picker.Item key={category.id} label={category.name} value={category.id.toString()} color="#CCCCCC" />
            ))}
          </Picker>
          <MaterialIcons
            name="arrow-drop-down"
            size={24}
            color="#888"
            style={{ position: 'absolute', right: 10, top: 13, pointerEvents: 'none' }}
          />
        </View>
      )}
      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" />
      ) : (
        <>
          <FlatList
            data={manuals}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderManualItem}
            ListEmptyComponent={<Text style={styles.emptyText}>{t('manuals.noManualsFound')}</Text>}
          />
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              disabled={page === 1}
              onPress={() => setPage(page - 1)}
              style={[styles.pageButton, page === 1 && styles.disabledButton]}
            >
              <Text style={styles.pageButtonText}>{t('common.previous')}</Text>
            </TouchableOpacity>
            <Text style={styles.pageText}>{t('common.page')} {page} {t('common.of')} {totalPages}</Text>
            <TouchableOpacity
              disabled={page === totalPages}
              onPress={() => setPage(page + 1)}
              style={[styles.pageButton, page === totalPages && styles.disabledButton]}
            >
              <Text style={styles.pageButtonText}>{t('common.next')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  itemContent: {
    flex: 1,
  },
  browserButton: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: "#007BFF",
    borderRadius: 5,
  },
  browserButtonText: {
    fontSize: 16,
    color: "#fff",
  },
  itemText: {
    fontSize: 14,
    color: "#333",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  pageButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
  },
  pageButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  pageText: {
    fontSize: 14,
    color: "#333",
  },
  errorText: {
    fontSize: 16,
    color: "#FF0000",
    textAlign: "center",
    marginTop: 20,
  },
});

export default ManualsScreen;