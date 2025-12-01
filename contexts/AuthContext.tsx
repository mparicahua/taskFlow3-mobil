import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { setupProjectListeners } from '@/contexts/ProjectContext';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  authAPI,
  authEvents,
  storage,
} from '@/services/api';
import { socketService } from '@/services/socket';

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
  useEffect(() => {
    const handleSessionExpired = (data: { reason: string; error: any }) => {
      if (__DEV__) {
        console.log('🚪 Evento de sesión expirada recibido:', data.reason);
      }

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

    authEvents.on('session-expired', handleSessionExpired);
    authEvents.on('token-refreshed', handleTokenRefreshed);

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
  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      const accessToken = await storage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
      const storedUser = await storage.getItem(USER_KEY);

      if (accessToken && refreshToken && storedUser) {
        const isValid = await verifyToken();
        
        if (isValid) {
          setUser(JSON.parse(storedUser));
          
          // ✨ CONECTAR SOCKET Y CONFIGURAR LISTENERS
          socketService.connect(accessToken);
          
          // Esperar un poco para que el socket se conecte
          setTimeout(() => {
            setupProjectListeners();
          }, 100);
          
          router.replace('/(tabs)');
        } else {
          await clearSession();
          router.replace('/login');
        }
      } else {
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
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const data = await authAPI.login(email, password);

      if (!data.success) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      await storage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      await storage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      await storage.setItem(USER_KEY, JSON.stringify(data.user));

      setUser(data.user);

      if (__DEV__) {
        console.log('✅ Login exitoso:', data.user.nombre);
      }

      // ✨ CONECTAR SOCKET Y CONFIGURAR LISTENERS
      socketService.connect(data.accessToken);
      
      setTimeout(() => {
        setupProjectListeners();
      }, 100);

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      
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
  const register = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);

      const data = await authAPI.register(name, email, password);

      if (!data.success) {
        throw new Error(data.message || 'Error al registrarse');
      }

      await storage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      await storage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      await storage.setItem(USER_KEY, JSON.stringify(data.user));

      setUser(data.user);

      if (__DEV__) {
        console.log('✅ Registro exitoso:', data.user.nombre);
      }

      // ✨ CONECTAR SOCKET Y CONFIGURAR LISTENERS
      socketService.connect(data.accessToken);
      
      setTimeout(() => {
        setupProjectListeners();
      }, 100);

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Register error:', error);
      
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
  const logout = async () => {
    try {
      setIsLoading(true);
      
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
      
      if (refreshToken) {
        try {
          await authAPI.logout(refreshToken);
          
          if (__DEV__) {
            console.log('✅ Logout notificado al servidor');
          }
        } catch (error) {
          console.error('Error notifying server about logout:', error);
        }
      }

      // ✨ DESCONECTAR SOCKET
      socketService.disconnect();
      
      await clearSession();

      if (Platform.OS === 'web') {
        alert('Sesión cerrada correctamente');
      } else {
        Alert.alert('Sesión Cerrada', 'Has cerrado sesión correctamente');
      }

      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      await clearSession();
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== LOGOUT ALL ====================
  const logoutAll = async () => {
    try {
      setIsLoading(true);
      
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
      
      if (refreshToken) {
        try {
          await authAPI.logoutAll(refreshToken);
          
          if (__DEV__) {
            console.log('✅ Logout all notificado al servidor');
          }
        } catch (error) {
          console.error('Error notifying server about logout all:', error);
        }
      }

      // ✨ DESCONECTAR SOCKET
      socketService.disconnect();
      
      await clearSession();

      if (Platform.OS === 'web') {
        alert('Sesión cerrada en todos los dispositivos');
      } else {
        Alert.alert(
          'Sesión Cerrada',
          'Has cerrado sesión en todos tus dispositivos correctamente'
        );
      }

      router.replace('/login');
    } catch (error) {
      console.error('Logout all error:', error);
      await clearSession();
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== CLEAR SESSION ====================
  const clearSession = async () => {
    await storage.removeItem(ACCESS_TOKEN_KEY);
    await storage.removeItem(REFRESH_TOKEN_KEY);
    await storage.removeItem(USER_KEY);
    setUser(null);
    
    if (__DEV__) {
      console.log('🧹 Sesión limpiada del storage');
    }
  };

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
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}