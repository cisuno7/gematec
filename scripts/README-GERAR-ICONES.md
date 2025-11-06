# 🎨 Guia para Gerar Ícones do App

Este guia explica como gerar os ícones do app com padding seguro de 20% para evitar cortes nas bordas.

## 📋 Requisitos

O script requer Node.js e a biblioteca `sharp`. Se o `sharp` não estiver instalando corretamente no Windows, você pode:

### Opção 1: Usar Ferramenta Online (Recomendado)

1. Acesse https://www.appicon.co/ ou https://www.appicon.build/
2. Faça upload do seu `logo.jpeg` ou `icon.png`
3. Configure:
   - **Tamanho**: 512×512 px
   - **Padding**: 20% (deixe 20% de espaço em todas as bordas)
   - **Formato**: PNG com fundo transparente
4. Baixe o ícone gerado e salve como `assets/icon.png`

### Opção 2: Usar Photoshop/GIMP/Canva

1. Abra seu logo original
2. Crie um novo documento de **512×512 px** com fundo transparente
3. Centralize o logo ocupando apenas **80% do espaço** (deixe 20% de padding em cada lado)
   - Área do logo: 409.6×409.6 px (centrado)
   - Padding: 51.2 px em cada lado
4. Exporte como PNG com fundo transparente
5. Salve como `assets/icon.png`

### Opção 3: Usar Script Python (Recomendado - mais confiável)

1. Instale o Pillow:
   ```bash
   pip install Pillow
   ```

2. Execute os scripts:
   ```bash
   python scripts/generate-icon.py
   python scripts/generate-adaptive-icon.py
   python scripts/generate-favicon.py
   ```

### Opção 4: Usar Script Node.js (se sharp estiver instalado)

```bash
node scripts/generate-icon.js
node scripts/generate-adaptive-icon.js
node scripts/generate-favicon.js
```

Ou execute todos de uma vez:

```bash
node scripts/generate-all-icons.js
```

## 📐 Especificações dos Ícones

### Ícone Principal (`icon.png`)
- **Tamanho**: 512×512 px
- **Formato**: PNG
- **Fundo**: Transparente
- **Padding**: 20% em todas as bordas
- **Área segura**: 409.6×409.6 px (centrado)

### Adaptive Icon Android (`adaptive-icon.png`)
- **Tamanho**: 1024×1024 px
- **Formato**: PNG
- **Fundo**: Transparente ou sólido (#ffffff)
- **Padding**: 20% em todas as bordas

### Favicon Web (`favicon.png`)
- **Tamanho**: 32×32 px ou 16×16 px
- **Formato**: PNG ou ICO
- **Fundo**: Transparente

## ✅ Verificação

Após gerar os ícones, verifique:

1. ✅ `assets/icon.png` existe e tem 512×512 px
2. ✅ `assets/adaptive-icon.png` existe e tem 1024×1024 px
3. ✅ `assets/favicon.png` existe
4. ✅ O `app.json` está configurado corretamente (já atualizado)

## 🔧 Configuração no app.json

O `app.json` já está configurado para usar:
- `icon`: `./assets/icon.png`
- `android.adaptiveIcon.foregroundImage`: `./assets/adaptive-icon.png`
- `web.favicon`: `./assets/favicon.png`

## 🚀 Próximos Passos

Após gerar os ícones:

1. Teste visualmente se o logo não está sendo cortado
2. Execute `npx expo prebuild` para atualizar os ícones nativos
3. Teste em dispositivos Android e iOS
4. Verifique o favicon na versão web

## ⚠️ Troubleshooting

### Sharp não instala no Windows

Se o `sharp` não instalar corretamente:

1. Instale Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/
2. Ou use uma das opções alternativas acima (ferramenta online ou manual)

### Ícone ainda sendo cortado

Certifique-se de que:
- O padding de 20% está presente em todas as bordas
- Nenhum elemento do logo toca as extremidades do arquivo
- O logo está perfeitamente centralizado

