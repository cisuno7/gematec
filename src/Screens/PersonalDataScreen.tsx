import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../Services/AuthService';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../Routers/AppRouter';
import { usePermissions } from "../Context/PermissionsContext";
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useUser } from '../Context/UserContext';
import PersonalDataModel from '../Models/PersonalData';
import DatePickerInput from '../Components/DatePickerInput';
import { FontAwesome } from '@expo/vector-icons';
import ResponsiveContainer from '../Components/ResponsiveContainer';
import ResponsiveText from '../Components/ResponsiveText';
import AppTextInput from '../Components/AppTextInput';
import CustomPicker from '../Components/CustomPicker';
import { useResponsive } from '../hooks/useResponsive';

interface PersonalDataScreenProps {
  route: RouteProp<RootStackParamList, 'PersonalDataScreen'>;
  navigation: DrawerNavigationProp<RootStackParamList, 'PersonalDataScreen'>;
}

const PersonalDataScreen: React.FC<PersonalDataScreenProps> = ({ route, navigation }) => {
  const r = useResponsive();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { hasPermission, permissions } = usePermissions();
  const { account, logout, updateUserData } = useUser(); // Added updateUserData
  const [loading, setLoading] = useState(true);
  const [personalData, setPersonalData] = useState<PersonalDataModel | null>(null);

  // Editable fields
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [rhFactor, setRhFactor] = useState('');

  // Non-editable fields
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState('');
  const [rg, setRg] = useState('');
  const [phone, setPhone] = useState('');
  const [ctps, setCtps] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [group, setGroup] = useState<any>(null);
  const [role, setRole] = useState<any>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  // Fator RH options
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

  // Animate in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    const fetchPersonalData = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('access_token');
        const currentAccount = await AsyncStorage.getItem('account');

        if (!token) throw new Error('Token de acesso não encontrado.');
        if (!currentAccount) throw new Error('Conta não encontrada.');

        setAccessToken(token);

        const fetchedData = await AuthService.getPersonalData(token, currentAccount);
        const personalDataInstance = new PersonalDataModel(fetchedData);
        setPersonalData(personalDataInstance);

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
    if (isEditing && personalData) {
      setName(personalData.name || '');
      setBirthdate(personalData.birthdate || '');
      setRhFactor(personalData.rh_factor || '');
    }
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);
      if (!accessToken) throw new Error('Token de acesso ausente.');
      if (!account) throw new Error('Conta não encontrada.');

      // Validação e conversão de data
      let validatedBirthdate: string | undefined = birthdate;
      if (birthdate && birthdate.trim() !== '') {
        try {
          let dateObj: Date;

          if (/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
            dateObj = new Date(birthdate);
          } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(birthdate)) {
            const [day, month, year] = birthdate.split('/');
            dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            dateObj = new Date(birthdate);
          }

          if (isNaN(dateObj.getTime())) {
            Alert.alert("Erro", "Data de nascimento inválida");
            return;
          }

          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          validatedBirthdate = `${day}/${month}/${year}`;
        } catch (error) {
          Alert.alert("Erro", "Formato de data inválido");
          return;
        }
      }

      // Preparar dados para envio
      const updatedData: any = {};

      if (name.trim()) updatedData.name = name.trim();
      if (validatedBirthdate) updatedData.birthdate = validatedBirthdate;
      if (rhFactor.trim()) {
        const cleanRhFactor = rhFactor.trim().toLowerCase().replace(/[^a-z+-]/g, '');
        const validRhFactors = ['a+', 'a-', 'b+', 'b-', 'ab+', 'ab-', 'o+', 'o-'];
        if (validRhFactors.includes(cleanRhFactor)) {
          updatedData.rh_factor = cleanRhFactor;
        }
      }
      if (document.trim()) updatedData.document = document.trim();
      if (rg.trim()) updatedData.rg = rg.trim();
      if (phone.trim()) {
        const cleanPhone = phone.trim().replace(/\D/g, '');
        if (cleanPhone.length >= 10) {
          updatedData.phone = cleanPhone;
        }
      }
      if (ctps.trim() && ctps.trim() !== "Não informado") {
        const cleanCtps = ctps.trim().replace(/\D/g, '');
        if (cleanCtps.length <= 11) {
          updatedData.ctps = cleanCtps;
        }
      }

      const updatedPersonalData = await AuthService.updatePersonalData(accessToken, updatedData);

      // Update local state
      setPersonalData(new PersonalDataModel(updatedPersonalData));
      setIsEditing(false);

      // Update user data in context for menu lateral
      if (updatedData.name) {
        updateUserData({ name: updatedData.name });
      }

      Alert.alert('Sucesso', 'Dados atualizados com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar os dados pessoais:', error.message);
      let errorMessage = 'Erro ao atualizar os dados pessoais.';
      if (error.response?.status === 403) {
        errorMessage = 'Você não tem permissão para editar seus dados.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setSaving(false);
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

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword)) {
      setPasswordError('A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número.');
      return;
    }

    try {
      setChangingPassword(true);
      if (!accessToken) throw new Error('Token de acesso ausente.');
      await AuthService.updatePassword(accessToken, newPassword, confirmNewPassword);
      Alert.alert('Sucesso', 'Senha alterada com sucesso. Por favor, faça login novamente.');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmNewPassword('');
      await logout();
      navigation.navigate('LoginScreen');
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
    } finally {
      setChangingPassword(false);
    }
  };

  const renderField = (label: string, value: string, isEditable: boolean = false, onChangeText?: (text: string) => void, placeholder?: string) => (
    <View style={styles.fieldContainer}>
      <ResponsiveText variant="body" weight="600" style={{ color: '#34495e', marginBottom: 8 }}>
        {label}
      </ResponsiveText>
      {isEditable ? (
        <AppTextInput
          style={[!isEditing && styles.disabledInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          editable={isEditing && canEdit}
        />
      ) : (
        <View style={styles.fieldValue}>
          <ResponsiveText variant="body" style={{ color: '#495057' }}>
            {value}
          </ResponsiveText>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  // Todos podem visualizar; edição depende de permissão (canEdit)

  return (
    <ResponsiveContainer withPadding={false} style={styles.keyboardContainer}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.container,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <FontAwesome name="user-circle" size={60} color="#007BFF" />
            </View>
            <ResponsiveText variant="title" weight="bold" style={{ color: '#2c3e50', marginBottom: 5 }}>
              Meus Dados
            </ResponsiveText>
            <ResponsiveText variant="subtitle" style={{ color: '#7f8c8d', textAlign: 'center' }}>
              Gerencie suas informações pessoais
            </ResponsiveText>
          </View>

          {/* Edit Button */}
          {canEdit && (
            <View style={styles.editButtonContainer}>
              {!isEditing ? (
                <TouchableOpacity style={styles.editButton} onPress={handleEditToggle}>
                  <FontAwesome name="edit" size={16} color="#fff" />
                  <ResponsiveText variant="body" weight="600" style={{ color: '#fff', marginLeft: r.spacing(0.8) }}>
                    Editar Dados
                  </ResponsiveText>
                </TouchableOpacity>
              ) : (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.saveButton]}
                    onPress={handleUpdate}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <FontAwesome name="check" size={16} color="#fff" />
                    )}
                    <ResponsiveText variant="body" weight="600" style={{ color: '#fff', marginLeft: r.spacing(0.8) }}>
                      {saving ? 'Salvando...' : 'Salvar'}
                    </ResponsiveText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={handleEditToggle}
                  >
                    <FontAwesome name="times" size={16} color="#fff" />
                    <ResponsiveText variant="body" weight="600" style={{ color: '#fff', marginLeft: r.spacing(0.8) }}>
                      Cancelar
                    </ResponsiveText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Personal Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome name="user" size={r.scale(20)} color="#007BFF" />
              <ResponsiveText variant="subtitle" weight="bold" style={{ color: '#2c3e50', marginLeft: r.spacing(1) }}>
                Informações Pessoais
              </ResponsiveText>
            </View>

            {renderField('Nome', name, true, setName, 'Digite seu nome')}
            {renderField('Email', email)}

            {/* Data de Nascimento com DatePickerInput */}
            <View style={styles.fieldContainer}>
              <ResponsiveText variant="body" weight="600" style={{ color: '#34495e', marginBottom: 8 }}>
                Data de Nascimento
              </ResponsiveText>
              <DatePickerInput
                value={birthdate}
                onChangeText={setBirthdate}
                placeholder="Selecione a data de nascimento"
                style={[!isEditing && styles.disabledInput]}
                editable={isEditing && canEdit}
              />
            </View>

            {/* Fator RH com CustomPicker */}
            <View style={styles.fieldContainer}>
              <ResponsiveText variant="body" weight="600" style={{ color: '#34495e', marginBottom: 8 }}>
                Fator RH
              </ResponsiveText>
              <CustomPicker
                selectedValue={rhFactor}
                onValueChange={(value) => setRhFactor(value)}
                enabled={isEditing && canEdit}
                items={rhFactorOptions.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                placeholder="Selecione o Fator RH"
              />
            </View>
          </View>

          {/* Documents Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome name="id-card" size={r.scale(20)} color="#007BFF" />
              <ResponsiveText variant="subtitle" weight="bold" style={{ color: '#2c3e50', marginLeft: r.spacing(1) }}>
                Documentos
              </ResponsiveText>
            </View>

            {renderField('Documento', document, true, setDocument, 'Digite seu documento')}
            {renderField('RG', rg, true, setRg, 'Digite seu RG')}
            {renderField('CTPS', ctps, true, setCtps, 'Digite sua CTPS')}
          </View>

          {/* Contact Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome name="phone" size={r.scale(20)} color="#007BFF" />
              <ResponsiveText variant="subtitle" weight="bold" style={{ color: '#2c3e50', marginLeft: r.spacing(1) }}>
                Contato
              </ResponsiveText>
            </View>

            {renderField('Telefone', phone, true, setPhone, 'Digite seu telefone')}
          </View>

          {/* Work Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome name="briefcase" size={r.scale(20)} color="#007BFF" />
              <ResponsiveText variant="subtitle" weight="bold" style={{ color: '#2c3e50', marginLeft: r.spacing(1) }}>
                Informações Profissionais
              </ResponsiveText>
            </View>

            {renderField('Data de Admissão', admissionDate)}
            {renderField('Grupo', group?.name || 'Não informado')}
            {renderField('Função', role?.name || 'Não informado')}
          </View>

          {/* Password Change Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome name="lock" size={r.scale(20)} color="#007BFF" />
              <ResponsiveText variant="subtitle" weight="bold" style={{ color: '#2c3e50', marginLeft: r.spacing(1) }}>
                Segurança
              </ResponsiveText>
            </View>

            <TouchableOpacity
              style={styles.passwordButton}
              onPress={() => setShowPasswordModal(true)}
            >
              <FontAwesome name="key" size={16} color="#007BFF" />
              <ResponsiveText variant="body" weight="600" style={{ color: '#007BFF', flex: 1, marginLeft: r.spacing(1) }}>
                Alterar Senha
              </ResponsiveText>
              <FontAwesome name="chevron-right" size={16} color="#007BFF" />
            </TouchableOpacity>
          </View>
          </Animated.View>
        </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContainer, { width: r.width * 0.9 }]}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <FontAwesome name="lock" size={r.scale(24)} color="#007BFF" />
                <ResponsiveText variant="subtitle" weight="bold" style={{ color: '#2c3e50', flex: 1, marginLeft: r.spacing(1) }}>
                  Alterar Senha
                </ResponsiveText>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setPasswordError('');
                  }}
                >
                  <FontAwesome name="times" size={r.scale(20)} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.fieldContainer}>
                  <ResponsiveText variant="body" weight="600" style={{ color: '#2c3e50', marginBottom: 8 }}>
                    Nova Senha
                  </ResponsiveText>
                  <AppTextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    placeholder="Digite a nova senha"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <ResponsiveText variant="body" weight="600" style={{ color: '#2c3e50', marginBottom: 8 }}>
                    Confirmar Nova Senha
                  </ResponsiveText>
                  <AppTextInput
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    secureTextEntry
                    placeholder="Confirme a nova senha"
                  />
                </View>

                {passwordError ? (
                  <View style={styles.modalErrorContainer}>
                    <FontAwesome name="exclamation-circle" size={16} color="#FF6B6B" />
                    <ResponsiveText variant="caption" style={{ color: '#c53030', flex: 1 }}>
                      {passwordError}
                    </ResponsiveText>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.modalButton, changingPassword && styles.disabledButton]}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                >
                  {changingPassword ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <FontAwesome name="check" size={16} color="#fff" />
                  )}
                  <ResponsiveText variant="body" weight="600" style={{ color: '#fff', marginLeft: r.spacing(0.8) }}>
                    {changingPassword ? 'Alterando...' : 'Alterar Senha'}
                  </ResponsiveText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </KeyboardAvoidingView>
    </ResponsiveContainer>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  editButtonContainer: {
    marginBottom: 25,
  },
  editButton: {
    backgroundColor: '#007BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 10,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#2c3e50',
  },
  disabledInput: {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
    borderColor: '#e9ecef',
  },
  fieldValue: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 15,
  },
  fieldValueText: {
    fontSize: 16,
    color: '#495057',
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 15,
  },
  passwordButtonText: {
    fontSize: 16,
    color: '#007BFF',
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    marginLeft: 10,
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    gap: 20,
  },
  modalButton: {
    backgroundColor: '#007BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fed7d7',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  modalErrorText: {
    color: '#c53030',
    fontSize: 14,
    flex: 1,
  },
});

export default PersonalDataScreen;
