# TaskFlow3 Mobile

Aplicación móvil multiplataforma para gestión de proyectos y tareas colaborativas desarrollada con **React Native**, **Expo** y **TypeScript**.

## Características

- **Sistema de autenticación JWT** con refresh tokens automáticos
- **Dashboard de proyectos** con vista de tarjetas interactivas
- **Proyectos colaborativos** con gestión de miembros y roles
- **Tablero Kanban** con drag & drop para organizar tareas
- **Modo claro/oscuro** automático según preferencias del sistema
- **Persistencia segura** con SecureStore (móvil) y localStorage (web)
- **Sincronización en tiempo real** entre dispositivos
- **Cierre de sesión selectivo** (dispositivo actual o todos)
- **Descarga de ontología RDF/TTL** del proyecto

## Tecnologías

### Frontend
- **React Native 0.81.5** - Framework multiplataforma
- **Expo 54** - Plataforma de desarrollo y despliegue
- **TypeScript 5.9** - Tipado estático de JavaScript
- **Expo Router 6.0** - Navegación basada en archivos
- **Axios 1.13** - Cliente HTTP con interceptores JWT
- **Reanimated & Gesture Handler** - Animaciones y gestos fluidos
- **Ionicons** - Biblioteca de iconos

### Backend (Requerido)
- API REST compatible (servidor TaskFlow3)
- Autenticación JWT con access y refresh tokens
- Base de datos relacional

## Prerrequisitos

### Software necesario
- **Node.js** (v18 o superior)
- **npm** o **yarn**
- **Expo CLI** (`npm install -g @expo/cli`)

### Opcional (para desarrollo nativo)
- **Xcode** (macOS - para iOS)
- **Android Studio** (Windows/Mac/Linux - para Android)

### Para dispositivos físicos
- **Expo Go** app ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

## Instalación

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd taskflow3-app
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno

El proyecto utiliza la URL del servidor configurada en `services/api.ts`:

```typescript
// services/api.ts
const API_URL = 'https://taskflow3-server-production.up.railway.app';
```

Para cambiar el servidor, edita esta constante con tu URL de backend.

### 4. Iniciar el servidor de desarrollo
```bash
npm start
```

La aplicación estará disponible mediante:
- **Expo Go**: Escanea el QR con tu dispositivo
- **Web**: Presiona `w` para abrir en navegador
- **iOS Simulator**: Presiona `i` (requiere Xcode en macOS)
- **Android Emulator**: Presiona `a` (requiere Android Studio)

## Comandos Disponibles

### Desarrollo
```bash
npm start          # Inicia Expo DevTools
npm run ios        # Abre en iOS Simulator
npm run android    # Abre en Android Emulator
npm run web        # Abre en navegador web
```

### Compilación
```bash
# Instalar EAS CLI (si aún no lo tienes)
npm install -g eas-cli

# Iniciar sesión en Expo
eas login

# Compilar APK para Android (testing)
eas build -p android --profile preview

# Compilar para iOS
eas build -p ios --profile preview

# Build de producción
eas build -p android --profile production
eas build -p ios --profile production
```

### Otras utilidades
```bash
npm run lint       # Ejecutar linter
npm run reset-project  # Limpiar proyecto a estado inicial
```

## Perfiles de Compilación

El archivo `eas.json` incluye los siguientes perfiles:

| Perfil | Descripción | Comando |
|--------|-------------|---------|
| `development` | Build con DevClient para debugging | `eas build -p <platform> --profile development` |
| `preview` | APK/IPA para testing interno | `eas build -p <platform> --profile preview` |
| `production` | Build optimizado para tiendas | `eas build -p <platform> --profile production` |

### Generar APK para pruebas
```bash
# Este comando genera un APK que puedes instalar directamente
eas build -p android --profile preview
```

Una vez completado, recibirás un enlace para descargar el APK.



## Sistema de Autenticación


### Características de seguridad

- **Access Tokens** de corta duración (15 minutos)
- **Refresh Tokens** de larga duración (7 días)
- **Renovación automática** transparente al usuario
- **Cola de peticiones** durante el refresh
- **Cierre de sesión selectivo** por dispositivo
- **Logout total** en todos los dispositivos


## Integración con Backend

El proyecto espera un servidor compatible con las siguientes especificaciones:

- **Autenticación JWT** con access y refresh tokens
- **Endpoints RESTful** documentados arriba
- **CORS habilitado** para el dominio de la app
- **Respuestas JSON** con estructura:
  ```json
  {
    "success": true,
    "data": {},
    "message": "Operación exitosa"
  }
  ```

## Documentación Adicional

- [Documentación de Expo](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

