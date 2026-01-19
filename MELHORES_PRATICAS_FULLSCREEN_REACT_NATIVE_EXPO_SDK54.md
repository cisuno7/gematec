# Melhores Práticas para Tela Cheia (Fullscreen) no React Native com Expo SDK 54

## 📱 Visão Geral

Este documento apresenta as melhores práticas para implementar layouts de tela cheia (fullscreen) e modo imersivo no React Native com Expo SDK 54 (React Native 0.81), baseado nas últimas documentações oficiais e práticas da comunidade.

## 🔑 Mudanças Principais no Expo SDK 54

### Android 16 / API 36 Support
- **Edge-to-edge layouts são sempre habilitados** quando direcionado para API 36
- Não é possível desabilitar edge-to-edge neste nível de API
- O conteúdo é desenhado por padrão sob as barras de sistema (status e navegação)

### Splash Screen
- A biblioteca `expo-splash-screen` agora usa a API oficial do Android Splash Screen (Android 12+)
- **Imagens de splash fullscreen não são mais suportadas no Android**
- Deve-se usar imagem/ícone centralizado + cor de fundo
- Sempre testar em builds de release (Expo Go e development builds podem mostrar comportamento diferente)

## 🛠️ Ferramentas e Bibliotecas Necessárias

```bash
npx expo install expo-status-bar expo-navigation-bar react-native-safe-area-context
```

### Opcional:
```bash
npx expo install expo-screen-orientation
```

## ⚙️ Configuração do app.json

### Configuração Básica
```json
{
  "expo": {
    "plugins": [
      [
        "expo-navigation-bar",
        {
          "visibility": "hidden",
          "behavior": "overlay-swipe",
          "position": "absolute",
          "backgroundColor": "#000000"
        }
      ]
    ],
    "android": {
      "edgeToEdgeEnabled": true
    }
  }
}
```

## 🔧 Implementação do Modo Imersivo

### 1. Setup Básico do App.tsx
```tsx
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { View, Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Esconder status bar
      StatusBar.setHidden(true, 'fade');
      // Esconder navigation bar (modo imersivo)
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
    return () => {
      // Reverter ao desmontar
      if (Platform.OS === 'android') {
        StatusBar.setHidden(false, 'fade');
        NavigationBar.setVisibilityAsync('visible');
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar hidden={true} translucent={true} />
        {/* Seu conteúdo aqui */}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
```

### 2. SafeAreaProvider na Raiz
```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Seus componentes de navegação e telas */}
    </SafeAreaProvider>
  );
}
```

## 🎯 Padrões Recomendados

### Hook useSafeAreaInsets (Recomendado)
```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function MinhaTela() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }}>
      {/* Conteúdo da tela */}
    </View>
  );
}
```

### SafeAreaView com Controle de Edges
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

function MinhaTela() {
  return (
    <SafeAreaView
      style={{ flex: 1 }}
      edges={['top', 'bottom']} // Apenas aplicar padding em top e bottom
    >
      {/* Conteúdo que pode se estender nas laterais */}
    </SafeAreaView>
  );
}
```

## 📱 Controle das Barras do Sistema

### Status Bar
```tsx
import { StatusBar } from 'expo-status-bar';

// Em modo imersivo
<StatusBar hidden={true} translucent={true} />

// Com estilo personalizado
<StatusBar
  style="light" // 'light' ou 'dark'
  backgroundColor="transparent"
  translucent={true}
/>
```

### Navigation Bar (Android)
```tsx
import * as NavigationBar from 'expo-navigation-bar';

// Esconder completamente
await NavigationBar.setVisibilityAsync('hidden');

// Comportamento overlay (swipe para mostrar)
await NavigationBar.setBehaviorAsync('overlay-swipe');

// Cor de fundo (quando visível)
await NavigationBar.setBackgroundColorAsync('#000000');
```

## 🎬 Vídeo e Mídia em Fullscreen

### Expo Video com Fullscreen
```tsx
import { VideoView, useVideoPlayer } from 'expo-video';

function VideoPlayer() {
  const player = useVideoPlayer(videoSource);

  return (
    <VideoView
      player={player}
      allowsFullscreen={true}
      allowsPictureInPicture={false}
      contentFit="cover"
      style={{ flex: 1 }}
    />
  );
}
```

### Expo AV (Alternativo)
```tsx
import { Video } from 'expo-av';

function VideoPlayer() {
  return (
    <Video
      source={{ uri: 'video-url' }}
      useNativeControls
      resizeMode="cover"
      isLooping
      shouldPlay
      style={{ flex: 1 }}
    />
  );
}
```

## 📋 Checklist de Implementação

### 1. Setup do Projeto
- [ ] Confirmar targeting Android 16 (API 36)
- [ ] Instalar dependências necessárias
- [ ] Configurar plugins no app.json
- [ ] Envolver app com SafeAreaProvider

### 2. Splash Screen
- [ ] Usar imagem centralizada + cor de fundo
- [ ] Testar em build de release
- [ ] Evitar imagens fullscreen no Android

### 3. Gerenciamento de Safe Area
- [ ] Usar SafeAreaView ou useSafeAreaInsets
- [ ] Ajustar padding/margins para evitar sobreposição
- [ ] Testar em dispositivos com notch e gesture navigation

### 4. Status Bar
- [ ] Usar expo-status-bar para controle
- [ ] Evitar backgroundColor quando edge-to-edge estiver habilitado
- [ ] Usar translucent para desenhar conteúdo por trás

### 5. Navigation Bar (Android)
- [ ] Usar expo-navigation-bar com cautela
- [ ] Verificar suporte quando edge-to-edge estiver forçado
- [ ] Fallback para backgrounds safe-area-aware

### 6. Vídeo/Mídia
- [ ] Usar fullscreenOptions apropriadamente
- [ ] Reconhecer limitações com estilos de navigation bar
- [ ] Testar transições de fullscreen

### 7. Testes
- [ ] Testar em dispositivos Android 15+ e Android 16
- [ ] Testar builds de desenvolvimento vs produção
- [ ] Verificar comportamento em diferentes orientações

## 🚨 Problemas Conhecidos e Workarounds

### Headers Aparecendo Sob Status Bar
- **Sintomas**: Headers aparecem sob a status bar no Android
- **Causa**: Bug no react-native-screens ~4.19.0
- **Solução**: Downgrade para 4.18.0 ou aguardar correção

### Navigation Bar Background Não Funciona
- **Sintomas**: setBackgroundColorAsync não funciona quando edge-to-edge
- **Causa**: Android espera conteúdo atrás da nav bar
- **Solução**: Usar views safe-area-aware com backgrounds

### Vídeo Fullscreen Override Navigation Bar
- **Sintomas**: Estilos customizados da nav bar resetados durante fullscreen
- **Causa**: Issue conhecida #27802
- **Solução**: Não há workaround confiável no SDK 54

### Modal com Edge-to-Edge
- **Sintomas**: Propriedades statusBarTranslucent sempre true
- **Causa**: Comportamento forçado do edge-to-edge
- **Solução**: Lidar com safe areas apropriadamente

## 📱 Exemplo Completo de Tela Fullscreen

```tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

function FullscreenScreen() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setHidden(true, 'fade');
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }

    return () => {
      if (Platform.OS === 'android') {
        StatusBar.setHidden(false, 'fade');
        NavigationBar.setVisibilityAsync('visible');
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} translucent={true} />

      {/* Background que se estende sob as barras */}
      <View style={StyleSheet.absoluteFill}>
        {/* Seu background/imagem aqui */}
      </View>

      {/* Conteúdo que respeita safe areas */}
      <View style={{
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}>
        {/* Seus componentes interativos aqui */}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FullscreenScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
```

## 🔗 Referências

- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54-beta)
- [Expo Status Bar Documentation](https://docs.expo.dev/guides/configuring-statusbar/)
- [Expo Navigation Bar Documentation](https://docs.expo.dev/versions/latest/sdk/navigation-bar/)
- [React Native Safe Area Context](https://reactnavigation.org/docs/8.x/handling-safe-area)
- [Android Edge-to-Edge Guidelines](https://developer.android.com/develop/ui/views/layout/edge-to-edge)

## 📝 Notas Finais

- Sempre teste em dispositivos físicos Android 15+ e 16
- Comportamentos podem diferir entre builds de desenvolvimento e produção
- Mantenha compatibilidade com versões anteriores do Android quando possível
- Monitore updates do Expo SDK para novas APIs e correções de bugs