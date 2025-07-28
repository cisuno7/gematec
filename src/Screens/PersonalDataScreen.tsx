import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../Services/AuthService';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../Routers/AppRouter';
import { usePermissions } from "../Context/PermissionsContext";
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useUser } from '../Context/UserContext';

interface PersonalDataScreenProps {
  route: RouteProp<RootStackParamList, 'PersonalDataScreen'>;
  navigation: DrawerNavigationProp<RootStackParamList, 'PersonalDataScreen'>;
}

const PersonalDataScreen: React.FC<PersonalDataScreenProps> = ({ route }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { hasPermission, permissions } = usePermissions();
  const { account } = useUser();
  const [loading, setLoading] = useState(true);

  if (permissions.length === 0 && loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Carregando permissões...</Text>
      </View>
    );
  }

  if (!hasPermission("view_user")) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Você não tem permissão para visualizar seus dados.</Text>
      </View>
    );
  }

  // Campos editáveis
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [rhFactor, setRhFactor] = useState('');

  // Campos não editáveis
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState('');
  const [rg, setRg] = useState('');
  const [phone, setPhone] = useState('');
  const [ctps, setCtps] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');

  useEffect(() => {
    const fetchPersonalData = async () => {
      try {
        console.log('Buscando dados pessoais do usuário...');
        const token = await AsyncStorage.getItem('access_token');
        const currentAccount = await AsyncStorage.getItem('account');

        if (!token) throw new Error('Token de acesso não encontrado.');
        if (!currentAccount) throw new Error('Conta não encontrada.');

        setAccessToken(token);

        console.log('Conta:', currentAccount);
        console.log('Token de acesso:', token);

        const personalData = await AuthService.getPersonalData(currentAccount, token);
        console.log('Dados pessoais recebidos:', personalData);

        // Atualiza os campos
        setName(personalData.name || '');
        setBirthdate(personalData.birthdate || '');
        setRhFactor(personalData.rh_factor || '');
        setEmail(personalData.email || 'Não informado');
        setDocument(personalData.document || 'Não informado');
        setRg(personalData.rg || 'Não informado');
        setPhone(personalData.phone || 'Não informado');
        setCtps(personalData.ctps || 'Não informado');
        setAdmissionDate(personalData.admission_date || 'Não informado');
      } catch (error: any) {
        console.error('Erro ao buscar dados pessoais:', error.message);
        Alert.alert('Erro', 'Não foi possível carregar os dados pessoais.');
      }
    };

    fetchPersonalData();
  }, []);

  const handleUpdate = async () => {
    try {
      if (!accessToken) throw new Error('Token de acesso ausente.');
      if (!account) throw new Error('Conta não encontrada.');
      
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(birthdate)) {
        Alert.alert("Erro", "Data de nascimento deve estar no formato YYYY-MM-DD");
        return;
      }
      
      const updatedData = {
        name,
        birthdate,
        rh_factor: rhFactor,
      };

      console.log('Dados a serem enviados:', updatedData);

      const updatedPersonalData = await AuthService.updatePersonalData(account, accessToken, updatedData);
      Alert.alert('Sucesso', 'Dados atualizados com sucesso.');
      console.log('Dados atualizados:', updatedPersonalData);
    } catch (error: any) {
      console.error('Erro ao atualizar os dados pessoais:', error.message);
      Alert.alert('Erro', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dados Pessoais</Text>

      {/* Nome - Editável */}
      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Nome"
        editable={false}
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
      <TextInput
        style={styles.input}
        value={rhFactor}
        onChangeText={setRhFactor}
        editable={false}
        placeholder="Fator RH"
      />

      {/* Data de Admissão - Não editável */}
      <Text style={styles.label}>Data de Admissão</Text>
      <Text style={styles.nonEditableField}>{admissionDate}</Text>

      {/* Data de Nascimento - Editável */}
      <Text style={styles.label}>Data de Nascimento</Text>

      <TextInput
        style={styles.input}
        value={birthdate}
        onChangeText={(text: string) => {
          let cleaned = text.replace(/[^0-9-]/g, '').slice(0, 10);
          if (cleaned.length === 4 || cleaned.length === 7) {
            if (birthdate.length < cleaned.length) cleaned += '-';
          }
          setBirthdate(cleaned);
        }}
        placeholder="Data de Nascimento (AAAA-MM-DD)"
        keyboardType="numeric"
      />

      <Button title="Salvar Alterações" onPress={handleUpdate} />
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
});

export default PersonalDataScreen;
