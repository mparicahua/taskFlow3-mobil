import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  authAPI,
  authEvents,
  storage,
} from '@/services/api';

// Tipos basados en tu servidor TaskFlow3
interface User {
  id: number;
  nombre: string;
  email: string;
  iniciales: string;
  color_avatar: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  checkAuth: () => Promise<void>;
  verifyToken: () => Promise<boolean>;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ==================== LISTENER DE EVENTOS ====================
  // Escuchar eventos de sesión expirada
  useEffect(() => {
    const handleSessionExpired = (data: { reason: string; error: any }) => {
      if (__DEV__) {
        console.log('🚪 Evento de sesión expirada recibido:', data.reason);
      }

      // Mostrar alert antes de redirigir
      if (Platform.OS === 'web') {
        alert(data.reason);
        clearSessionSync();
        router.replace('/login');
      } else {
        Alert.alert(
          'Sesión Expirada',
          data.reason,
          [
            {
              text: 'Iniciar Sesión',
              onPress: async () => {
                await clearSession();
                router.replace('/login');
              },
            },
          ],
          { cancelable: false }
        );
      }
    };

    const handleTokenRefreshed = () => {
      if (__DEV__) {
        console.log('✅ Token refrescado automáticamente');
      }
    };

    // Registrar listeners
    authEvents.on('session-expired', handleSessionExpired);
    authEvents.on('token-refreshed', handleTokenRefreshed);

    // Cleanup al desmontar
    return () => {
      authEvents.off('session-expired', handleSessionExpired);
      authEvents.off('token-refreshed', handleTokenRefreshed);
    };
  }, []);

  // Verificar autenticación al iniciar la app
  useEffect(() => {
    checkAuth();
  }, []);

  // ==================== CHECK AUTH ====================
  // Función para verificar si hay una sesión guardada al iniciar la app
  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      // Verificar si hay tokens guardados
      const accessToken = await storage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
      const storedUser = await storage.getItem(USER_KEY);

      if (accessToken && refreshToken && storedUser) {
        // Hay sesión guardada, verificar que el token sea válido
        const isValid = await verifyToken();
        
        if (isValid) {
          // Token válido, restaurar usuario
          setUser(JSON.parse(storedUser));
          router.replace('/(tabs)');
        } else {
          // Token inválido, limpiar e ir a login
          await clearSession();
          router.replace('/login');
        }
      } else {
        // No hay sesión, ir a login
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      await clearSession();
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== VERIFY TOKEN ====================
  // Verificar si el token actual es válido
  const verifyToken = async (): Promise<boolean> => {
    try {
      const response = await authAPI.verify();
      return response.success;
    } catch (error) {
      if (__DEV__) {
        console.error('Token verification failed:', error);
      }
      return false;
    }
  };

  // ==================== LOGIN ====================
  // Función de login con JWT
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const data = await authAPI.login(email, password);

      if (!data.success) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      // Guardar tokens y usuario
      await storage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      await storage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      await storage.setItem(USER_KEY, JSON.stringify(data.user));

      setUser(data.user);

      if (__DEV__) {
        console.log('✅ Login exitoso:', data.user.nombre);
      }

      // Navegar a los tabs
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Extraer mensaje de error
      const errorMessage = 
        error.response?.data?.message || 
        error.message || 
        'Error al iniciar sesión';
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== REGISTER ====================
  // Función de registro con JWT
  const register = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);

      const data = await authAPI.register(name, email, password);

      if (!data.success) {
        throw new Error(data.message || 'Error al registrarse');
      }

      // Guardar tokens y usuario
      await storage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      await storage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      await storage.setItem(USER_KEY, JSON.stringify(data.user));

      setUser(data.user);

      if (__DEV__) {
        console.log('✅ Registro exitoso:', data.user.nombre);
      }

      // Navegar a los tabs
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Register error:', error);
      
      // Extraer mensaje de error
      const errorMessage = 
        error.response?.data?.message || 
        error.message || 
        'Error al registrarse';
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== LOGOUT ====================
  // Función de logout (cierra sesión actual)
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Obtener refresh token para enviarlo al servidor
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
      
      if (refreshToken) {
        try {
          // Notificar al servidor para invalidar el refresh token
          await authAPI.logout(refreshToken);
          
          if (__DEV__) {
            console.log('✅ Logout notificado al servidor');
          }
        } catch (error) {
          console.error('Error notifying server about logout:', error);
          // Continuar con el logout local aunque falle el servidor
        }
      }

      // Limpiar datos locales
      await clearSession();

      // Mostrar confirmación
      if (Platform.OS === 'web') {
        alert('Sesión cerrada correctamente');
      } else {
        Alert.alert('Sesión Cerrada', 'Has cerrado sesión correctamente');
      }

      // Navegar a login
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Forzar limpieza local en caso de error
      await clearSession();
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== LOGOUT ALL ====================
  // Función de logout all (cierra todas las sesiones)
  const logoutAll = async () => {
    try {
      setIsLoading(true);
      
      // Obtener refresh token para enviarlo al servidor
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
      
      if (refreshToken) {
        try {
          // Notificar al servidor para invalidar TODOS los refresh tokens del usuario
          await authAPI.logoutAll(refreshToken);
          
          if (__DEV__) {
            console.log('✅ Logout all notificado al servidor');
          }
        } catch (error) {
          console.error('Error notifying server about logout all:', error);
          // Continuar con el logout local aunque falle el servidor
        }
      }

      // Limpiar datos locales
      await clearSession();

      // Mostrar confirmación
      if (Platform.OS === 'web') {
        alert('Sesión cerrada en todos los dispositivos');
      } else {
        Alert.alert(
          'Sesión Cerrada',
          'Has cerrado sesión en todos tus dispositivos correctamente'
        );
      }

      // Navegar a login
      router.replace('/login');
    } catch (error) {
      console.error('Logout all error:', error);
      // Forzar limpieza local en caso de error
      await clearSession();
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== CLEAR SESSION ====================
  // Función auxiliar para limpiar toda la sesión local
  const clearSession = async () => {
    await storage.removeItem(ACCESS_TOKEN_KEY);
    await storage.removeItem(REFRESH_TOKEN_KEY);
    await storage.removeItem(USER_KEY);
    setUser(null);
    
    if (__DEV__) {
      console.log('🧹 Sesión limpiada del storage');
    }
  };

  // Función sincrónica para web
  const clearSessionSync = () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  };

  // ==================== CONTEXT VALUE ====================
  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    logoutAll,
    checkAuth,
    verifyToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ==================== HOOK ====================
// Hook para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}