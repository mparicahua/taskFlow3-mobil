import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

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
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// URL del servidor (tu servidor en Railway)
const API_URL = 'https://taskflow3-server-production.up.railway.app';

// Clave para almacenamiento (sin token, solo usuario)
const USER_KEY = 'user_data';

// Helper para almacenamiento multiplataforma
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      // En web usar localStorage
      return localStorage.getItem(key);
    } else {
      // En móvil usar SecureStore
      return await SecureStore.getItemAsync(key);
    }
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      // En web usar localStorage
      localStorage.setItem(key, value);
    } else {
      // En móvil usar SecureStore
      await SecureStore.setItemAsync(key, value);
    }
  },
  
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      // En web usar localStorage
      localStorage.removeItem(key);
    } else {
      // En móvil usar SecureStore
      await SecureStore.deleteItemAsync(key);
    }
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar autenticación al iniciar la app
  useEffect(() => {
    checkAuth();
  }, []);

  // Función para verificar si hay una sesión guardada
  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const storedUser = await storage.getItem(USER_KEY);

      if (storedUser) {
        setUser(JSON.parse(storedUser));
        // Usuario autenticado, navegar a tabs
        router.replace('/(tabs)');
      } else {
        // No hay sesión, ir a login
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // Función de login (igual que tu Vue LoginForm.vue)
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      // Guardar usuario (sin token, como en tu Vue)
      await storage.setItem(USER_KEY, JSON.stringify(data.user));

      setUser(data.user);

      // Navegar a los tabs
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  // Función de logout (igual que tu Vue)
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Limpiar datos locales (como tu Vue userStore)
      await storage.removeItem(USER_KEY);

      setUser(null);

      // Navegar a login
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}