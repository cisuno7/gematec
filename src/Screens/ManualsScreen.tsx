import React, { useState, useEffect } from "react";
import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomPicker from "../Components/CustomPicker";
import { RouteProp } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { RootStackParamList } from "../Routers/AppRouter";
import ManualService from "../Services/ManualService";
import { usePermissions } from "../Context/PermissionsContext";
import { useLanguage } from "../Context/LanguageContext";
import { Manual, Category, OfflineManual, OfflineStorageInfo } from "../Models/Manual";
// Expo SDK 54: APIs legacy (getInfoAsync, deleteAsync, etc.) foram movidas para expo-file-system/legacy
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as NetInfo from "@react-native-community/netinfo";
import { MaterialIcons } from '@expo/vector-icons';
import ResponsiveContainer from "../Components/ResponsiveContainer";
import ResponsiveText from "../Components/ResponsiveText";
import AppTextInput from "../Components/AppTextInput";
import { useResponsive } from "../hooks/useResponsive";

interface ManualsScreenProps {
  route: RouteProp<RootStackParamList, "ManualsScreen">;
  navigation: DrawerNavigationProp<RootStackParamList, "ManualsScreen">;
}

const ManualsScreen: React.FC<ManualsScreenProps> = ({ navigation }) => {
  const { hasPermission } = usePermissions();
  const { t } = useLanguage();
  const r = useResponsive();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Estados para funcionalidade offline
  const [isOnline, setIsOnline] = useState(true);
  const [offlineManuals, setOfflineManuals] = useState<OfflineManual[]>([]);
  const [offlineStorageInfo, setOfflineStorageInfo] = useState<OfflineStorageInfo>({
    exists: false,
    totalSize: 0,
    manualCount: 0,
  });
  const [downloadingOffline, setDownloadingOffline] = useState(false);



  const fetchManuals = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("Token de acesso não encontrado.");

      const response = await ManualService.fetchManuals({
        accessToken: token,
        page,
        perPage,
        search: search.trim() || undefined, // Remover limite de 3 caracteres e usar undefined se vazio
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
    loadOfflineData();
  }, []);

  useEffect(() => {
    fetchManuals();
  }, [page, search, selectedCategory]);

  // Verificar conectividade de rede
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(!!online);
      console.log("[ManualsScreen] Status de conectividade:", online ? "Online" : "Offline");
    });

    return () => unsubscribe();
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchManuals();
  };

  const loadOfflineData = async () => {
    try {
      // Carregar manuais offline
      const offlineManualsData = await ManualService.getOfflineManuals();
      setOfflineManuals(offlineManualsData);

      // Carregar informações de armazenamento
      const storageInfo = await ManualService.getOfflineStorageInfo();
      setOfflineStorageInfo(storageInfo);
    } catch (error: any) {
      console.error("[ManualsScreen] Erro ao carregar dados offline:", error);
    }
  };

  const handleDownloadOffline = async () => {
    if (!isOnline) {
      Alert.alert(t('common.error'), "Você precisa estar online para baixar os manuais.");
      return;
    }

    Alert.alert(
      "Download Offline",
      "Deseja baixar todos os manuais para acesso offline? Isso pode levar alguns minutos dependendo da quantidade de manuais.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Baixar",
          onPress: async () => {
            try {
              setDownloadingOffline(true);
              const result = await ManualService.downloadAllManualsOffline(
                await AsyncStorage.getItem("access_token") || ""
              );

              Alert.alert(
                "Download Concluído",
                `${result.downloaded} manuais baixados com sucesso!\n${result.failed} falharam.\nTamanho total: ${(result.totalSize / 1024 / 1024).toFixed(2)} MB`
              );

              await loadOfflineData(); // Recarregar dados offline
            } catch (error: any) {
              console.error("[ManualsScreen] Erro no download offline:", error);
              Alert.alert(t('common.error'), error.message || "Erro ao baixar manuais offline");
            } finally {
              setDownloadingOffline(false);
            }
          }
        }
      ]
    );
  };

  const handleOpenOfflineManual = async (manual: OfflineManual) => {
    try {
      console.log("[ManualsScreen] Abrindo manual offline:", manual.name);

      // Verificar se o arquivo existe
      const fileInfo = await FileSystem.getInfoAsync(manual.fileUri);
      if (!fileInfo.exists) {
        Alert.alert(t('common.error'), "Arquivo não encontrado. Tente baixar novamente.");
        return;
      }

      // Tentar abrir com múltiplas estratégias
      let fileOpened = false;

      // Estratégia 1: Compartilhar arquivo
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(manual.fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: `Manual: ${manual.name}`,
          });
          fileOpened = true;
        }
      } catch (shareError) {
        console.warn("[ManualsScreen] Erro ao compartilhar:", shareError);
      }

      // Estratégia 2: Abrir diretamente
      if (!fileOpened) {
        try {
          await Linking.openURL(manual.fileUri);
          fileOpened = true;
        } catch (linkError) {
          console.warn("[ManualsScreen] Erro ao abrir arquivo:", linkError);
        }
      }

      if (!fileOpened) {
        Alert.alert("Aviso", "Não foi possível abrir o arquivo automaticamente. O arquivo está salvo em: " + manual.fileUri);
      }

    } catch (error: any) {
      console.error("[ManualsScreen] Erro ao abrir manual offline:", error);
      Alert.alert(t('common.error'), "Erro ao abrir manual offline");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        <ResponsiveText variant="body" style={styles.itemText} numberOfLines={2}>
          {t('manuals.manual')}: {item.name}
        </ResponsiveText>
        <ResponsiveText variant="caption" style={styles.itemText} numberOfLines={1}>
          {t('manuals.category')}: {item.category.name}
        </ResponsiveText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.browserButton, { minHeight: r.verticalScale(40) }]}
        onPress={() => handleOpenInBrowser(item)}
      >
        <ResponsiveText variant="body" maxFontSizeMultiplier={1.5} style={styles.browserButtonText}>🌐</ResponsiveText>
      </TouchableOpacity>
    </View>
  );

  const renderOfflineManualItem = ({ item }: { item: OfflineManual }) => (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => handleOpenOfflineManual(item)}
      >
        <ResponsiveText variant="body" style={styles.itemText} numberOfLines={2}>
          {t('manuals.manual')}: {item.name}
        </ResponsiveText>
        <ResponsiveText variant="caption" style={styles.itemText} numberOfLines={1}>
          {t('manuals.category')}: {item.category.name}
        </ResponsiveText>
        <ResponsiveText variant="caption" maxFontSizeMultiplier={1.3} style={styles.offlineBadge}>
          📱 Offline
        </ResponsiveText>
        <ResponsiveText variant="caption" maxFontSizeMultiplier={1.3} style={styles.fileSizeText}>
          {formatFileSize(item.fileSize)}
        </ResponsiveText>
      </TouchableOpacity>
    </View>
  );

  return (
    <ResponsiveContainer withPadding={false} style={styles.container} scroll={true}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.headerContainer}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <ResponsiveText variant="title" style={styles.title} numberOfLines={2}>
              {t('menu.manuals')}
            </ResponsiveText>
          </View>
          <View style={styles.statusContainer}>
            <ResponsiveText variant="caption" maxFontSizeMultiplier={1.3} style={[styles.statusText, { color: isOnline ? '#28a745' : '#dc3545' }]}>
              {isOnline ? '🟢 Online' : '🔴 Offline'}
            </ResponsiveText>
          </View>
        </View>

        {/* Controles Offline */}
        <View style={styles.offlineControls}>
          {isOnline && (
            <TouchableOpacity
              style={[styles.controlButton, downloadingOffline && styles.disabledButton, { minHeight: r.verticalScale(40) }]}
              onPress={handleDownloadOffline}
              disabled={downloadingOffline}
            >
              <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.controlButtonText}>
                {downloadingOffline ? '⏳ Baixando...' : '📥 Baixar offline'}
              </ResponsiveText>
            </TouchableOpacity>
          )}
        </View>

        {/* Informações de Armazenamento Offline */}
        {offlineStorageInfo.exists && (
          <View style={styles.storageInfo}>
            <ResponsiveText variant="caption" maxFontSizeMultiplier={1.3} style={styles.storageText}>
              📁 {offlineStorageInfo.manualCount} manuais offline • {formatFileSize(offlineStorageInfo.totalSize)}
            </ResponsiveText>
          </View>
        )}
        {/* Filtros - apenas quando estiver online */}
        {isOnline && (
          <>
            <AppTextInput
              style={styles.input}
              placeholder={t('manuals.searchPlaceholder')}
              placeholderTextColor="#666"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              maxFontSizeMultiplier={1.8}
            />
            {loadingCategories ? (
              <ActivityIndicator size="small" color="#007BFF" />
            ) : (
              <CustomPicker
                selectedValue={selectedCategory}
                onValueChange={(value) => {
                  setSelectedCategory(value);
                  setPage(1);
                }}
                items={[
                  { label: t('manuals.allCategories'), value: "" },
                  ...categories.map(category => ({
                    label: category.name,
                    value: category.id.toString()
                  }))
                ]}
                placeholder={t('manuals.selectCategory')}
                style={[styles.picker, { backgroundColor: '#fff' }]}
                searchable={true}
              />
            )}
          </>
        )}

      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" />
      ) : (
        <>
          {!isOnline ? (
            // Offline - mostrar manuais baixados
            <FlatList
              data={offlineManuals}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderOfflineManualItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <ResponsiveText variant="body" style={styles.emptyText}>
                    📱 Nenhum manual offline encontrado
                  </ResponsiveText>
                  <ResponsiveText variant="caption" style={styles.emptySubText}>
                    Quando estiver online, use o botão "Baixar offline" para baixar todos os manuais e depois acessá-los sem internet.
                  </ResponsiveText>
                </View>
              }
            />
          ) : (
            // Online - mostrar manuais do servidor
            <FlatList
              data={manuals}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderManualItem}
              ListEmptyComponent={
                <ResponsiveText variant="body" style={styles.emptyText}>
                  {t('manuals.noManualsFound')}
                </ResponsiveText>
              }
            />
          )}

          {/* Paginação apenas no modo online */}
          {isOnline && totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                disabled={page === 1}
                onPress={() => setPage(page - 1)}
                style={[styles.pageButton, page === 1 && styles.disabledButton, { minHeight: r.verticalScale(44) }]}
              >
                <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.pageButtonText}>
                  {t('common.previous')}
                </ResponsiveText>
              </TouchableOpacity>
              <ResponsiveText variant="body" style={styles.pageText}>
                {t('common.page')} {page} {t('common.of')} {totalPages}
              </ResponsiveText>
              <TouchableOpacity
                disabled={page === totalPages}
                onPress={() => setPage(page + 1)}
                style={[styles.pageButton, page === totalPages && styles.disabledButton, { minHeight: r.verticalScale(44) }]}
              >
                <ResponsiveText variant="button" maxFontSizeMultiplier={1.3} style={styles.pageButtonText}>
                  {t('common.next')}
                </ResponsiveText>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      </KeyboardAvoidingView>
    </ResponsiveContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    flex: 1,
    marginRight: 10,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusText: {
    // ResponsiveText cuida do tamanho
  },
  offlineControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: "#007BFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 2,
    marginBottom: 5,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    color: "#fff",
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  storageInfo: {
    backgroundColor: '#e8f5e8',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
    marginHorizontal: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  storageText: {
    color: '#155724',
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    marginHorizontal: 20,
    backgroundColor: "#fff",
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 15,
    marginHorizontal: 20,
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
    flexShrink: 1,
  },
  browserButton: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: "#007BFF",
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  browserButtonText: {
    color: "#fff",
  },
  itemText: {
    color: "#333",
    marginBottom: 4,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 20,
    flexWrap: 'wrap',
  },
  pageButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  pageButtonText: {
    color: "#fff",
  },
  pageText: {
    color: "#333",
    marginHorizontal: 8,
  },
  errorText: {
    color: "#FF0000",
    textAlign: "center",
    marginTop: 20,
  },
  offlineBadge: {
    color: '#28a745',
    backgroundColor: '#d4edda',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  fileSizeText: {
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptySubText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default ManualsScreen;