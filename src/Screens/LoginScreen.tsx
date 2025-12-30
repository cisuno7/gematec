import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Checkbox from "expo-checkbox";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ResponsiveText from "../Components/ResponsiveText";
import AppTextInput from "../Components/AppTextInput";
import { useResponsive } from "../hooks/useResponsive";
import { NavigationProp, RouteProp } from "@react-navigation/native";
import AuthService from '../Services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginRequest from '../Models/LoginRequest';
import { jwtDecode } from "jwt-decode";
import { useUser } from "../Context/UserContext";
import { RootStackParamList } from "../Routers/AppRouter";
import CacheService from "../Services/CacheService";
import SignatureService from "../Services/SignatureService";
import SignatureRequiredModal from "../Components/SignatureRequiredModal";

interface LoginScreenProps {
  route: RouteProp<RootStackParamList, 'LoginScreen'>;
  navigation: NavigationProp<any>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ route, navigation }) => {
  const r = useResponsive();
  const [account, setAccount] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isChecked, setChecked] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingAccess, setPendingAccess] = useState<string | null>(null);
  const [pendingRefresh, setPendingRefresh] = useState<string | null>(null);
  const [pendingAccount, setPendingAccount] = useState<string | null>(null);
  const { setUsername, login } = useUser();
  useEffect(() => {
    const loadKeepLoggedIn = async () => {
      try {
        const storedValue = await AsyncStorage.getItem('keep_logged_in');
        if (storedValue !== null) {
          const parsedValue = JSON.parse(storedValue);
          setChecked(parsedValue);
          console.log('Valor de keep_logged_in carregado:', parsedValue);
        } else {
          console.log('Nenhum valor de keep_logged_in encontrado no AsyncStorage.');
        }
      } catch (error) {
        console.error('Erro ao carregar keep_logged_in do AsyncStorage:', error);
      }
    };

    loadKeepLoggedIn();
  }, []); // Empty dependency array means this runs once on mount

  const RESERVED_ACCOUNT_NAMES = [
    'admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'public', 'default', 'postgres', 'root', 'test'
  ];

  const validateAccount = (accountName: string) => {
    if (!accountName.trim()) {
      setAccountError("Por favor, informe a conta.");
      return false;
    }
    const regex = /^[a-z0-9_]+$/;
    if (!regex.test(accountName)) {
      setAccountError("A conta deve conter apenas letras minúsculas, números e underline.");
      return false;
    }
    if (accountName.length > 64) {
      setAccountError("A conta não pode ter mais de 64 caracteres.");
      return false;
    }
    if (RESERVED_ACCOUNT_NAMES.includes(accountName)) {
      setAccountError(`"${accountName}" é uma palavra reservada e não pode ser usada como conta.`);
      return false;
    }
    setAccountError("");
    return true;
  };

  const handleAccountChange = (text: string) => {
    setAccount(text.toLowerCase());
    if (text.trim() !== "") {
      validateAccount(text.toLowerCase());
    } else {
      setAccountError("");
    }
  };

  const handleLogin = async () => {
    console.log('Iniciando login...');

    // Validar os campos
    if (!account) {
      Alert.alert('Erro', 'Conta não informada.');
      return;
    }

    if (!validateAccount(account)) {
      Alert.alert("Erro", accountError);
      return;
    }

    if (!email.trim()) {
      Alert.alert("Erro", "Por favor, informe o email.");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Erro", "Por favor, informe a senha.");
      return;
    }

    try {
      const loginRequest = new LoginRequest(email, password);
      console.log('LoginRequest:', loginRequest);

      const response = await AuthService.login(account, email, password);
      console.log('Resposta do login:', response);

      // Validar a resposta
      if (!response || !response.access || !response.refresh) {
        console.error('Tokens de acesso ou atualização não encontrados na resposta:', response);
        throw new Error('Resposta inválida da API: tokens não encontrados.');
      }

      // Salvar tokens e conta imediatamente (antes de navegar)
      await login(response.access, response.refresh, account || '', isChecked);
      console.log('Login bem-sucedido. Tokens, conta e preferência de "manter logado" salvos via UserContext.');

      // Decodificar o access token para obter dados do usuário
      try {
        const decodedToken: any = jwtDecode(response.access);
        const usernameFromToken = decodedToken.user_name || "Usuário";
        setUsername(usernameFromToken);
      } catch (tokenError) {
        console.error('Erro ao decodificar token:', tokenError);
        // Não bloquear o login por isso, apenas usar valores padrão
      }

      // Verificar se precisa de assinatura antes de liberar o app
      try {
        const loginPayloadNeeds = (response as any).needs_signature;
        const needsFromLogin = loginPayloadNeeds === true || loginPayloadNeeds === 'true' || loginPayloadNeeds === 1 || loginPayloadNeeds === '1';
        let needsSignature = needsFromLogin;
        if (!needsSignature) {
          // Double-check via /me para garantir consistência
          needsSignature = await SignatureService.checkNeedsSignature(response.access);
        }
        console.log('[LoginScreen] needs_signature (final):', needsSignature);
        if (needsSignature) {
          // Marcar pendência e reter tokens/conta para uso do modal
          setPendingAccess(response.access);
          setPendingRefresh(response.refresh);
          setPendingAccount(account || '');
          try { await AsyncStorage.setItem('needs_signature_pending', '1'); } catch { }
          setShowSignatureModal(true);
          return; // Não navega até salvar a assinatura
        }
      } catch (signatureError: any) {
        console.warn('[LoginScreen] Erro ao verificar assinatura, prosseguindo:', signatureError?.message || signatureError);
      }

      // Pré-carregar dados essenciais em background
      console.log('[LoginScreen] Iniciando pré-carregamento de dados em background');
      CacheService.preloadEssentials(response.access).catch(error => {
        console.error('[LoginScreen] Erro no pré-carregamento (não bloqueia login):', error);
      });

      // Navegar explicitamente para a HomeScreen após o login
      navigation.navigate('AuthenticatedFlow');
      // A navegação para a tela inicial será tratada automaticamente pelo AppRouter
      // com base no estado de autenticação do UserContext.
    } catch (error: any) {
      console.error("Erro de login:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      let errorMessage = "Erro inesperado. Tente novamente.";

      // Se o AuthService já retornou uma mensagem específica, usar ela
      if (error.message && !error.message.includes('Erro inesperado')) {
        errorMessage = error.message;
      } else if (error.code === 'ENOTFOUND' || error.message.includes('getaddrinfo')) {
        errorMessage = "Conta não encontrada. Verifique o nome da conta informado.";
      } else if (error.response?.status === 401) {
        errorMessage = "Email ou senha incorretos. Verifique suas credenciais.";
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      Alert.alert(
        "Erro de Login",
        errorMessage,
        [{ text: "OK" }]
      );
    }
  };

  const handleSignatureSaved = () => {
    console.log('[LoginScreen] Assinatura salva. Liberando aplicativo...');
    setShowSignatureModal(false);
    // Garantir que os tokens e a conta estão salvos (idempotente)
    if (pendingAccess && pendingRefresh) {
      login(pendingAccess, pendingRefresh, pendingAccount || '', isChecked).catch(() => { });
    }
    navigation.navigate('AuthenticatedFlow');
  };

  return (
    <LinearGradient
      colors={["#E0ECFF", "#A7C7E7", "#6A9CE6"]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: r.spacing(2, 16, 28),
              paddingVertical: r.spacing(2, 16, 28),
            },
          ]}
        >
          <View
            style={[
              styles.formContainer,
              r.isTablet && { maxWidth: 520, alignSelf: "center", width: "100%" },
            ]}
          >
            <ResponsiveText
              variant="title"
              weight="bold"
              style={{ marginBottom: r.spacing(0.5), textAlign: "center" }}
            >
              Bem-vindo
            </ResponsiveText>
            <ResponsiveText
              variant="body"
              style={{ marginBottom: r.spacing(1.5), textAlign: "center" }}
            >
              Por favor, insira suas credenciais
            </ResponsiveText>

            <AppTextInput
              style={[styles.fullWidth, accountError ? styles.inputError : null]}
              placeholder="Conta"
              value={account}
              onChangeText={handleAccountChange}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {accountError ? (
              <ResponsiveText
                variant="caption"
                style={{
                  color: "#ff4444",
                  alignSelf: "flex-start",
                  marginTop: r.spacing(0.5),
                  marginBottom: r.spacing(1),
                }}
              >
                {accountError}
              </ResponsiveText>
            ) : (
              <View style={{ height: r.spacing(1) }} />
            )}

            <AppTextInput
              style={[styles.fullWidth, { marginBottom: r.spacing(1) }]}
              placeholder="Email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <View style={[styles.passwordWrapper, { marginBottom: r.spacing(1) }]}>
              <AppTextInput
                style={[styles.fullWidth, { paddingRight: 56 }]}
                placeholder="Senha"
                secureTextEntry={!isPasswordVisible}
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={() => setPasswordVisible(!isPasswordVisible)}
                style={styles.eyeIcon}
                accessibilityRole="button"
                accessibilityLabel={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
              >
                <Ionicons
                  name={isPasswordVisible ? "eye" : "eye-off"}
                  size={20}
                  color="#333"
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.checkboxContainer, { marginBottom: r.spacing(1.5) }]}>
              <Checkbox
                value={isChecked}
                onValueChange={setChecked}
                color={isChecked ? "#4630EB" : undefined}
                style={styles.checkbox}
              />
              <ResponsiveText
                variant="body"
                style={{ flexShrink: 1, flexWrap: "wrap" }}
              >
                Manter-me logado
              </ResponsiveText>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                { minHeight: r.verticalScale(48), paddingVertical: r.spacing(1) },
              ]}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <ResponsiveText
                variant="button"
                weight="bold"
                style={{ color: "#fff", textAlign: "center" }}
              >
                Entrar
              </ResponsiveText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SignatureRequiredModal visible={showSignatureModal} onSignatureSaved={handleSignatureSaved} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  formContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 10,
    padding: 20,
    alignItems: "stretch",
  },
  fullWidth: {
    width: "100%",
  },
  inputError: {
    borderColor: "#ff4444",
  },
  passwordWrapper: {
    position: "relative",
    width: "100%",
  },
  eyeIcon: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
  },
  loginButton: {
    backgroundColor: "#007BFF",
    borderRadius: 5,
    width: "100%",
    alignItems: "center",
  },
});

export default LoginScreen;
