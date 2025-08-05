import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'; // Added TouchableOpacity
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../Services/AuthService';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../Routers/AppRouter';
import { usePermissions } from "../Context/PermissionsContext";
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useUser } from '../Context/UserContext';
import PersonalDataModel from '../Models/PersonalData'; // Import the updated model

interface PersonalDataScreenProps {
  route: RouteProp<RootStackParamList, 'PersonalDataScreen'>;
  navigation: DrawerNavigationProp<RootStackParamList, 'PersonalDataScreen'>;
}

const PersonalDataScreen: React.FC<PersonalDataScreenProps> = ({ route, navigation }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { hasPermission, permissions } = usePermissions();
  const { account, logout } = useUser(); // Added logout from useUser
  const [loading, setLoading] = useState(true);
  const [personalData, setPersonalData] = useState<PersonalDataModel | null>(null); // State to hold fetched data

  // Editable fields
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [rhFactor, setRhFactor] = useState('');

  // Non-editable fields (derived from personalData)
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState('');
  const [rg, setRg] = useState('');
  const [phone, setPhone] = useState('');
  const [ctps, setCtps] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [group, setGroup] = useState<any>(null); // Assuming 'any' for now, or define a Group interface
  const [role, setRole] = useState<any>(null);   // Assuming 'any' for now, or define a Role interface

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Fator RH options - usando valores em minúsculas conforme backend
  const rhFactorOptions = [
    { label: 'Selecione o Fator RH', value: '' },
    { label: 'A+', value: 'a+' },
    { label: 'A-', value: 'a-' },
    { label: 'B+', value: 'b+' },
    { label: 'B-', value: 'b-' },
    { label: 'AB+', value: 'ab+' },
    { label: 'AB-', value: 'ab-' },
    { label: 'O+', value: 'o+' },
    { label: 'O-', value: 'o-' },
  ];

  const canEdit = hasPermission("change_me");
  const canView = hasPermission("view_user");

  console.log("[PersonalDataScreen] Permissão change_me:", canEdit);
  console.log("[PersonalDataScreen] Permissão view_user:", canView);
  console.log("[PersonalDataScreen] Permissões disponíveis:", permissions);
  console.log("[PersonalDataScreen] Estado de edição:", isEditing);

  useEffect(() => {
    const fetchPersonalData = async () => {
      try {
        setLoading(true);
        console.log('Buscando dados pessoais do usuário...');
        const token = await AsyncStorage.getItem('access_token');
        const currentAccount = await AsyncStorage.getItem('account');

        if (!token) throw new Error('Token de acesso não encontrado.');
        if (!currentAccount) throw new Error('Conta não encontrada.');

        setAccessToken(token);

        console.log('Conta:', currentAccount);
        console.log('Token de acesso:', token);

        const fetchedData = await AuthService.getPersonalData(token, currentAccount);
        const personalDataInstance = new PersonalDataModel(fetchedData); // Create instance
        setPersonalData(personalDataInstance); // Store the instance

        // Update editable fields
        setName(personalDataInstance.name || '');
        setBirthdate(personalDataInstance.birthdate || '');
        setRhFactor(personalDataInstance.rh_factor || '');

        // Update non-editable fields
        setEmail(personalDataInstance.email || 'Não informado');
        setDocument(personalDataInstance.document || 'Não informado');
        setRg(personalDataInstance.rg || 'Não informado');
        setPhone(personalDataInstance.phone || 'Não informado');
        setCtps(personalDataInstance.ctps || 'Não informado');
        setAdmissionDate(personalDataInstance.admission_date || 'Não informado');
        setGroup(personalDataInstance.group || null);
        setRole(personalDataInstance.role || null);

      } catch (error: any) {
        console.error('Erro ao buscar dados pessoais:', error.message);
        Alert.alert('Erro', 'Não foi possível carregar os dados pessoais.');
      } finally {
        setLoading(false);
      }
    };

    fetchPersonalData();
  }, []);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    // Reset editable fields if canceling edit
    if (isEditing && personalData) {
      setName(personalData.name || '');
      setBirthdate(personalData.birthdate || '');
      setRhFactor(personalData.rh_factor || '');
    }
  };

  const handleUpdate = async () => {
    try {
      if (!accessToken) throw new Error('Token de acesso ausente.');
      if (!account) throw new Error('Conta não encontrada.');

      // Validação melhorada de data
      let validatedBirthdate: string | undefined = birthdate;
      if (birthdate && birthdate.trim() !== '') {
        // Remove caracteres não numéricos exceto hífens
        const cleanDate = birthdate.replace(/[^0-9-]/g, '');

        // Verifica se tem o formato correto
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(cleanDate)) {
          Alert.alert("Erro", "Data de nascimento deve estar no formato YYYY-MM-DD (ex: 1990-01-15)");
          return;
        }

        // Valida se é uma data válida
        const dateObj = new Date(cleanDate);
        if (isNaN(dateObj.getTime())) {
          Alert.alert("Erro", "Data de nascimento inválida");
          return;
        }

        validatedBirthdate = cleanDate;
      } else {
        validatedBirthdate = undefined; // Permite data vazia
      }

      const updatedData = {
        name: name.trim() || undefined,
        birthdate: validatedBirthdate,
        rh_factor: rhFactor.trim() || undefined,
      };

      console.log('Dados a serem enviados:', updatedData);

      const updatedPersonalData = await AuthService.updatePersonalData(accessToken, updatedData);
      Alert.alert('Sucesso', 'Dados atualizados com sucesso.');
      console.log('Dados atualizados:', updatedPersonalData);
      setPersonalData(new PersonalDataModel(updatedPersonalData)); // Update the main personalData state
      setIsEditing(false); // Exit edit mode
    } catch (error: any) {
      console.error('Erro ao atualizar os dados pessoais:', error.message);
      let errorMessage = 'Erro ao atualizar os dados pessoais.';
      if (error.response?.status === 403) {
        errorMessage = 'Você não tem permissão para editar seus dados.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      Alert.alert('Erro', errorMessage);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!newPassword || !confirmNewPassword) {
      setPasswordError('Por favor, preencha ambos os campos de senha.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    // Validação adicional de senha forte
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword)) {
      setPasswordError('A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número.');
      return;
    }

    try {
      if (!accessToken) throw new Error('Token de acesso ausente.');
      await AuthService.updatePassword(accessToken, newPassword, confirmNewPassword);
      Alert.alert('Sucesso', 'Senha alterada com sucesso. Por favor, faça login novamente.');
      await logout(); // Logout the user
      navigation.navigate('LoginScreen'); // Navigate to login screen
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error.message);
      let errorMessage = 'Erro ao alterar a senha.';
      if (error.response?.status === 400) {
        errorMessage = 'As senhas não coincidem ou são inválidas.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Você não tem permissão para alterar a senha.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      Alert.alert('Erro', errorMessage);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  if (!canView) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Você não tem permissão para visualizar seus dados.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dados Pessoais</Text>

      {canEdit && (
        <View style={styles.buttonContainer}>
          {!isEditing ? (
            <Button title="Editar Dados" onPress={handleEditToggle} />
          ) : (
            <>
              <Button title="Salvar Alterações" onPress={handleUpdate} />
              <Button title="Cancelar" onPress={handleEditToggle} color="red" />
            </>
          )}
        </View>
      )}

      {/* Nome - Editável */}
      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={[styles.input, !isEditing && styles.disabledInput]}
        value={name}
        onChangeText={setName}
        placeholder="Nome"
        placeholderTextColor="#666"
        editable={isEditing && canEdit}
      />

      {/* Email - Não editável */}
      <Text style={styles.label}>Email</Text>
      <Text style={styles.nonEditableField}>{email}</Text>

      {/* Documento - Não editável */}
      <Text style={styles.label}>Documento</Text>
      <Text style={styles.nonEditableField}>{document}</Text>

      {/* RG - Não editável */}
      <Text style={styles.label}>RG</Text>
      <Text style={styles.nonEditableField}>{rg}</Text>

      {/* Telefone - Não editável */}
      <Text style={styles.label}>Telefone</Text>
      <Text style={styles.nonEditableField}>{phone}</Text>

      {/* CTPS - Não editável */}
      <Text style={styles.label}>CTPS</Text>
      <Text style={styles.nonEditableField}>{ctps}</Text>

      {/* Fator RH - Editável */}
      <Text style={styles.label}>Fator RH</Text>
      <Picker
        selectedValue={rhFactor}
        onValueChange={(value) => setRhFactor(value)}
        enabled={isEditing && canEdit}
        style={[styles.picker, !isEditing && styles.disabledPicker]}
      >
        {rhFactorOptions.map((option) => (
          <Picker.Item
            key={option.value}
            label={option.label}
            value={option.value}
          />
        ))}
      </Picker>

      {/* Data de Admissão - Não editável */}
      <Text style={styles.label}>Data de Admissão</Text>
      <Text style={styles.nonEditableField}>{admissionDate}</Text>

      {/* Data de Nascimento - Editável */}
      <Text style={styles.label}>Data de Nascimento</Text>
      <TextInput
        style={[styles.input, !isEditing && styles.disabledInput]}
        value={birthdate}
        onChangeText={(text: string) => {
          // Remove tudo exceto números e hífens
          let cleaned = text.replace(/[^0-9-]/g, '');

          // Limita a 10 caracteres (YYYY-MM-DD)
          cleaned = cleaned.slice(0, 10);

          // Adiciona hífens automaticamente
          if (cleaned.length >= 4 && !cleaned.includes('-')) {
            cleaned = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
          }
          if (cleaned.length >= 7 && cleaned.split('-').length === 2) {
            cleaned = cleaned.slice(0, 7) + '-' + cleaned.slice(7);
          }

          setBirthdate(cleaned);
        }}
        placeholder="AAAA-MM-DD (ex: 1990-01-15)"
        placeholderTextColor="#666"
        keyboardType="numeric"
        editable={isEditing && canEdit}
        maxLength={10}
      />

      {/* Group - Não editável */}
      <Text style={styles.label}>Grupo</Text>
      <Text style={styles.nonEditableField}>{group?.name || 'Não informado'}</Text>

      {/* Role - Não editável */}
      <Text style={styles.label}>Função</Text>
      <Text style={styles.nonEditableField}>{role?.name || 'Não informado'}</Text>

      {/* Seção de Alteração de Senha */}
      <View style={styles.passwordSection}>
        <Text style={styles.sectionTitle}>Alterar Senha</Text>
        <Text style={styles.label}>Nova Senha</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="Nova Senha"
          placeholderTextColor="#666"
        />
        <Text style={styles.label}>Confirmar Nova Senha</Text>
        <TextInput
          style={styles.input}
          value={confirmNewPassword}
          onChangeText={setConfirmNewPassword}
          secureTextEntry
          placeholder="Confirmar Nova Senha"
          placeholderTextColor="#666"
        />
        {passwordError ? <Text style={styles.passwordErrorText}>{passwordError}</Text> : null}
        <TouchableOpacity style={styles.passwordButton} onPress={handleChangePassword}>
          <Text style={styles.passwordButtonText}>Alterar Senha</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    color: '#333',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: '#fff',
    color: '#333',
    height: 50,
  },
  disabledPicker: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: "#FF0000",
    textAlign: "center",
    marginTop: 20,
  },
  nonEditableField: {
    fontSize: 16,
    color: '#555',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  passwordSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  passwordErrorText: {
    color: 'red',
    marginBottom: 10,
  },
  passwordButton: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  passwordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PersonalDataScreen;
