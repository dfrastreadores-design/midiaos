# Mídia.OS no Celular — Guia de Execução no Android e iOS

O **Mídia.OS** foi projetado para rodar perfeitamente em dispositivos móveis (**Android** e **iOS / iPhone e iPad**), com suporte tanto para instalação direta e instantânea (PWA) quanto para empacotamento em APK / IPA nativo.

---

## Opção 1: Instalação Direta e Instantânea (PWA Nativo — Recomendado)

Esta é a forma mais rápida e recomendada para clientes, diretores e executivos de vendas: **não precisa de loja de aplicativos**, ocupa menos de 3MB no aparelho e recebe atualizações automaticamente em tempo real.

### 📱 Como Rodar no Android (Google Chrome ou Samsung Internet)

1. Acesse o sistema no celular: `https://midiaos.online`
2. O sistema exibirá o botão **"Baixar App"** na barra inferior ou no menu superior.
3. Clique em **"Instalar Aplicativo Agora"**.
4. Caso prefira pelo navegador, toque nos **3 pontinhos (⋮)** no canto superior direito e selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
5. O ícone oficial do **Mídia.OS** aparecerá na sua tela de início e na gaveta de aplicativos do Android, abrindo em tela cheia sem barras de navegador.

---

### 🍏 Como Rodar no iOS (iPhone e iPad — Safari)

1. Abra o **Safari** no seu iPhone ou iPad e acesse `https://midiaos.online`
2. Toque no botão de **Compartilhar** (ícone do quadrado com a seta para cima ⎋ na barra inferior do Safari).
3. Role as opções para baixo e toque em **"Adicionar à Tela de Início"** (ícone com sinal de mais ⊞).
4. Toque em **"Adicionar"** no canto superior direito.
5. O app do **Mídia.OS** será fixado na tela do iPhone com ícone próprio e abrirá em tela cheia com navegação fluida por gestos e respeito à Dynamic Island / Notch.

---

## Opção 2: Empacotamento Nativo (Capacitor — Google Play e Apple App Store)

Caso deseje gerar um arquivo **.APK** (para Android) ou publicar na **Google Play Store** e **Apple App Store**, o projeto já possui o arquivo [`capacitor.config.json`](file:///capacitor.config.json) pré-configurado com o identificador `online.midiaos.app`.

### 1. Requisitos

- Node.js instalado
- Para Android: **Android Studio** instalado
- Para iOS: **macOS** com **Xcode** e **CocoaPods** instalados

### 2. Comandos para Instalar o Capacitor

No terminal do projeto:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

### 3. Gerar e Compilar para Android (APK / Google Play)

```bash
# 1. Adicionar a plataforma Android
npx cap add android

# 2. Sincronizar os recursos web
npx cap sync android

# 3. Abrir o projeto no Android Studio
npx cap open android
```

> No Android Studio, basta clicar em **Build > Build Bundle(s) / APK(s) > Build APK(s)** para gerar o arquivo `.apk` de instalação direta para celulares Android.

### 4. Gerar e Compilar para iOS (iPhone / TestFlight / App Store)

_(Deve ser executado em um Mac com Xcode)_

```bash
# 1. Adicionar a plataforma iOS
npx cap add ios

# 2. Sincronizar os recursos
npx cap sync ios

# 3. Abrir no Xcode
npx cap open ios
```

> No Xcode, selecione seu time de desenvolvedor Apple e clique em **Product > Archive** para enviar ao **TestFlight** ou **App Store**.

---

## Recursos Mobile Ativos

- **Barra de Navegação Inferior (Bottom Bar)**: Atalhos instantâneos para Início, PIs, Propostas, Clientes e Menu.
- **Áreas Seguras (Safe Areas)**: Respeito automático ao entalhe de tela (Notch) do iPhone e Dynamic Island.
- **Atualização Automática (OTA)**: Todas as alterações publicadas no servidor refletem automaticamente no celular sem necessidade de reinstalação.
