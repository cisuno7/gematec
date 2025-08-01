# Guia de Uso do Sistema de Permissões

Este guia mostra como implementar e usar o sistema de permissões em suas telas.

## 📋 Índice
1. [Componentes Disponíveis](#componentes-disponíveis)
2. [Hooks Disponíveis](#hooks-disponíveis)
3. [Exemplos Práticos](#exemplos-práticos)
4. [Padrões de Nomenclatura](#padrões-de-nomenclatura)
5. [Boas Práticas](#boas-práticas)

## 🔧 Componentes Disponíveis

### PermissionGuard
Componente que renderiza children apenas se o usuário tiver a permissão especificada.

```tsx
import { PermissionGuard } from '../Components/PermissionGuard';

// Uso básico
<PermissionGuard permission="equipment.create">
  <TouchableOpacity onPress={handleCreateEquipment}>
    <Text>Criar Equipamento</Text>
  </TouchableOpacity>
</PermissionGuard>

// Com fallback
<PermissionGuard 
  permission="equipment.delete" 
  fallback={
    <Text style={styles.noPermissionText}>
      Você não pode excluir equipamentos
    </Text>
  }
>
  <TouchableOpacity onPress={handleDeleteEquipment}>
    <Text>Excluir Equipamento</Text>
  </TouchableOpacity>
</PermissionGuard>
```

## 🎣 Hooks Disponíveis

### usePermissions
Hook principal para acessar o contexto de permissões.

```tsx
import { usePermissions } from '../Context/PermissionsContext';

const { hasPermission, permissions, isLoading } = usePermissions();

// Verificar uma permissão
if (hasPermission('equipment.view')) {
  // Usuário pode visualizar equipamentos
}

// Verificar se está carregando
if (isLoading) {
  return <LoadingSpinner />;
}

// Listar todas as permissões
console.log('Permissões do usuário:', permissions);
```

### usePermissionCheck
Hook para verificações mais avançadas de permissões.

```tsx
import { usePermissionCheck } from '../Components/PermissionGuard';

const { hasAnyPermission, hasAllPermissions } = usePermissionCheck();

// Verificar se tem pelo menos uma das permissões
const canViewOrEdit = hasAnyPermission(['equipment.view', 'equipment.edit']);

// Verificar se tem todas as permissões
const isAdmin = hasAllPermissions(['equipment.create', 'equipment.edit', 'equipment.delete']);
```

## 💡 Exemplos Práticos

### 1. Proteção de Tela Completa

```tsx
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { usePermissions } from '../Context/PermissionsContext';

const EquipmentScreen: React.FC = () => {
  const { hasPermission, isLoading } = usePermissions();

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Carregando permissões...</Text>
      </View>
    );
  }

  // Verificação de permissão
  if (!hasPermission('equipment.view')) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Você não tem permissão para visualizar equipamentos.
        </Text>
        <Text style={styles.errorSubtext}>
          Entre em contato com o administrador.
        </Text>
      </View>
    );
  }

  // Conteúdo da tela
  return (
    <View style={styles.container}>
      {/* Conteúdo da tela aqui */}
    </View>
  );
};
```

### 2. Botões Condicionais

```tsx
import { PermissionGuard } from '../Components/PermissionGuard';

const EquipmentListScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Equipamentos</Text>
        
        {/* Botão só aparece se tiver permissão */}
        <PermissionGuard permission="equipment.create">
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={handleAddEquipment}
          >
            <Text style={styles.buttonText}>Adicionar</Text>
          </TouchableOpacity>
        </PermissionGuard>
      </View>

      {/* Lista de equipamentos */}
      <FlatList
        data={equipments}
        renderItem={({ item }) => (
          <View style={styles.equipmentItem}>
            <Text>{item.name}</Text>
            
            <View style={styles.actions}>
              <PermissionGuard permission="equipment.edit">
                <TouchableOpacity onPress={() => handleEdit(item.id)}>
                  <Text>Editar</Text>
                </TouchableOpacity>
              </PermissionGuard>
              
              <PermissionGuard permission="equipment.delete">
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteText}>Excluir</Text>
                </TouchableOpacity>
              </PermissionGuard>
            </View>
          </View>
        )}
      />
    </View>
  );
};
```

### 3. Verificação em Funções

```tsx
const EquipmentScreen: React.FC = () => {
  const { hasPermission } = usePermissions();

  const handleCreateEquipment = () => {
    // Verificar permissão antes de executar
    if (!hasPermission('equipment.create')) {
      Alert.alert('Acesso Negado', 'Você não tem permissão para criar equipamentos.');
      return;
    }

    // Lógica para criar equipamento
    navigation.navigate('CreateEquipment');
  };

  const handleDeleteEquipment = (equipmentId: number) => {
    if (!hasPermission('equipment.delete')) {
      Alert.alert('Acesso Negado', 'Você não tem permissão para excluir equipamentos.');
      return;
    }

    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este equipamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: () => deleteEquipment(equipmentId)
        }
      ]
    );
  };

  return (
    // JSX da tela
  );
};
```

### 4. Menu Condicional

```tsx
const EquipmentDetailsScreen: React.FC = () => {
  const { hasPermission } = usePermissions();
  const { hasAnyPermission } = usePermissionCheck();

  const renderMenu = () => {
    const menuItems = [];

    // Sempre mostrar visualizar
    menuItems.push({
      title: 'Visualizar',
      onPress: () => handleView(),
      icon: 'eye'
    });

    // Adicionar editar se tiver permissão
    if (hasPermission('equipment.edit')) {
      menuItems.push({
        title: 'Editar',
        onPress: () => handleEdit(),
        icon: 'edit'
      });
    }

    // Adicionar excluir se tiver permissão
    if (hasPermission('equipment.delete')) {
      menuItems.push({
        title: 'Excluir',
        onPress: () => handleDelete(),
        icon: 'delete',
        destructive: true
      });
    }

    // Adicionar ações administrativas se tiver múltiplas permissões
    if (hasAnyPermission(['equipment.admin', 'equipment.manage'])) {
      menuItems.push({
        title: 'Ações Administrativas',
        onPress: () => handleAdminActions(),
        icon: 'settings'
      });
    }

    return menuItems;
  };

  return (
    <View style={styles.container}>
      {/* Conteúdo da tela */}
      
      {/* Menu flutuante */}
      <FloatingActionButton
        actions={renderMenu()}
        onPressItem={item => item.onPress()}
      />
    </View>
  );
};
```

## 📝 Padrões de Nomenclatura

### Estrutura Recomendada
```
[recurso].[ação]
```

### Exemplos de Permissões
```tsx
// Equipamentos
'equipment.view'      // Visualizar equipamentos
'equipment.create'    // Criar equipamentos
'equipment.edit'      // Editar equipamentos
'equipment.delete'    // Excluir equipamentos
'equipment.admin'     // Ações administrativas

// Ordens de Serviço
'service_order.view'
'service_order.create'
'service_order.edit'
'service_order.delete'
'service_order.approve'

// Clientes
'client.view'
'client.create'
'client.edit'
'client.delete'

// Relatórios
'report.view'
'report.export'
'report.admin'
```

## ✅ Boas Práticas

### 1. Sempre Verificar Loading
```tsx
const { hasPermission, isLoading } = usePermissions();

if (isLoading) {
  return <LoadingSpinner />;
}
```

### 2. Usar Fallbacks Informativos
```tsx
<PermissionGuard 
  permission="equipment.create"
  fallback={
    <View style={styles.noPermissionContainer}>
      <Text>Você não tem permissão para criar equipamentos</Text>
      <Text>Entre em contato com o administrador</Text>
    </View>
  }
>
  <CreateButton />
</PermissionGuard>
```

### 3. Verificar Permissões em Funções
```tsx
const handleAction = () => {
  if (!hasPermission('required.permission')) {
    Alert.alert('Acesso Negado', 'Você não tem permissão para esta ação.');
    return;
  }
  
  // Executar ação
};
```

### 4. Usar Constantes para Permissões
```tsx
// constants/permissions.ts
export const PERMISSIONS = {
  EQUIPMENT: {
    VIEW: 'equipment.view',
    CREATE: 'equipment.create',
    EDIT: 'equipment.edit',
    DELETE: 'equipment.delete',
  },
  SERVICE_ORDER: {
    VIEW: 'service_order.view',
    CREATE: 'service_order.create',
    EDIT: 'service_order.edit',
    DELETE: 'service_order.delete',
  },
} as const;

// Uso
import { PERMISSIONS } from '../constants/permissions';

if (hasPermission(PERMISSIONS.EQUIPMENT.CREATE)) {
  // Lógica aqui
}
```

### 5. Testar Diferentes Cenários
```tsx
// Teste com usuário sem permissões
// Teste com usuário com algumas permissões
// Teste com usuário com todas as permissões
// Teste durante o carregamento das permissões
```

## 🚀 Implementação Rápida

Para implementar permissões em uma nova tela:

1. **Importe os hooks necessários:**
```tsx
import { usePermissions } from '../Context/PermissionsContext';
import { PermissionGuard } from '../Components/PermissionGuard';
```

2. **Adicione verificação de loading:**
```tsx
const { hasPermission, isLoading } = usePermissions();

if (isLoading) return <LoadingSpinner />;
```

3. **Proteja a tela se necessário:**
```tsx
if (!hasPermission('sua.permissao.view')) {
  return <NoPermissionScreen />;
}
```

4. **Use PermissionGuard para elementos condicionais:**
```tsx
<PermissionGuard permission="sua.permissao.create">
  <CreateButton />
</PermissionGuard>
```

5. **Verifique permissões em funções:**
```tsx
const handleAction = () => {
  if (!hasPermission('sua.permissao.action')) {
    Alert.alert('Acesso Negado');
    return;
  }
  // Executar ação
};
```

Este guia deve te ajudar a implementar o sistema de permissões de forma consistente e segura em todo o seu aplicativo! 