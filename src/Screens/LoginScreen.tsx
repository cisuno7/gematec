import React, { useContext, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import Checkbox from "expo-checkbox";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NavigationProp, RouteProp } from "@react-navigation/native";
import AuthService from '../Services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginRequest from '../Models/LoginRequest';
import { jwtDecode } from "jwt-decode";
import { useUser } from "../Context/UserContext";
import { RootStackParamList } from "../Routers/AppRouter";
import { useAppNavigation } from "../Context/NavigationContext";
import CacheService from "../Services/CacheService";
import SignatureService from "../Services/SignatureService";
import SignatureRequiredModal from "../Components/SignatureRequiredModal";

interface LoginScreenProps {
  route: RouteProp<RootStackParamList, 'LoginScreen'>;
  navigation: NavigationProp<any>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ route, navigation }) => {
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
  const appNavigation = useAppNavigation();
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
      <View style={styles.formContainer}>
        <Text style={styles.title}>Bem-vindo</Text>
        <Text style={styles.subtitle}>Por favor, insira suas credenciais</Text>

        <TextInput
          style={[styles.input, accountError ? styles.inputError : null]}
          placeholder="Conta"
          placeholderTextColor="#999"
          value={account}
          onChangeText={handleAccountChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {accountError ? <Text style={styles.errorText}>{accountError}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Senha"
            secureTextEntry={!isPasswordVisible}
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            onPress={() => setPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={isPasswordVisible ? "eye" : "eye-off"}
              size={20}
              color="#333"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.checkboxContainer}>
          <Checkbox
            value={isChecked}
            onValueChange={setChecked}
            color={isChecked ? "#4630EB" : undefined}
            style={styles.checkbox}
          />
          <Text style={styles.label}>Manter-me logado</Text>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Entrar</Text>
        </TouchableOpacity>
      </View>
      <SignatureRequiredModal visible={showSignatureModal} onSignatureSaved={handleSignatureSaved} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  formContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    padding: 20,
    margin: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#ff4444",
  },
  errorText: {
    color: "#ff4444",
    fontSize: 12,
    alignSelf: "flex-start",
    marginTop: -10,
    marginBottom: 10,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    backgroundColor: "#fff",
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    color: '#000'
  },
  eyeIcon: {
    padding: 10,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    color: "#333",
  },
  loginButton: {
    backgroundColor: "#007BFF",
    padding: 15,
    borderRadius: 5,
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default LoginScreen;
