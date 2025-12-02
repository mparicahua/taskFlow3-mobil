import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import EventEmitter from 'eventemitter3';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ==================== EVENT EMITTER ====================
// Event emitter para comunicar eventos de autenticación
export const authEvents = new EventEmitter();

// Eventos disponibles:
// - 'session-expired': Cuando la sesión expira (refresh token inválido)
// - 'token-refreshed': Cuando el token se refresca exitosamente

// ==================== CONFIGURACIÓN ====================
// URL del servidor
const API_URL = 'https://taskflow3-server-production.up.railway.app';
//const API_URL = 'http://localhost:3000';

// Claves para almacenamiento
const ACCESS_TOKEN_KEY = 'b8e38909bec1ac9199fb2d81ed7c6089c79100dc58868acaf1322077ceaa32faea0127ef93830fac88bad7fa548198dad4b0898ece73a1f91e23d712c7207657';
const REFRESH_TOKEN_KEY = '89910a27b356e0f0932f20761b3a69097d3e5ea19b0ac3a3511cf1095da7f0902aa0565f669dd04de4b8dcd2bbc0b6796033684c2dd696bfaa8d1674e67d7630';
const USER_KEY = 'user_data';

// ==================== STORAGE HELPER ====================
// Helper para almacenamiento multiplataforma
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

// ==================== AXIOS INSTANCE ====================
// Crear instancia de Axios
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== REFRESH TOKEN LOGIC ====================
// Variable para evitar múltiples refreshes simultáneos
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

// Función para procesar la cola de peticiones fallidas
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ==================== INTERCEPTOR DE REQUEST ====================
// Agrega automáticamente el access token a cada petición
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await storage.getItem(ACCESS_TOKEN_KEY);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Log en desarrollo
      if (__DEV__) {
        console.log('🔐 Request con token:', config.url);
      }
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ==================== INTERCEPTOR DE RESPONSE ====================
// Maneja automáticamente la renovación de tokens cuando expiran
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Si el error es 401 (Unauthorized) o 403 (Forbidden/Invalid Token)
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      
      // Log en desarrollo
      if (__DEV__) {
        console.log(`⚠️ Token error ${error.response?.status} detectado en:`, originalRequest.url);
      }

      if (isRefreshing) {
        // Si ya estamos refrescando, agregar a la cola
        if (__DEV__) {
          console.log('⏳ Agregando a cola de espera...');
        }
        
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(async (token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        if (__DEV__) {
          console.log('🔄 Intentando refrescar token...');
        }

        const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Intentar refrescar el token
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        if (response.data.success) {
          const { accessToken } = response.data;

          if (__DEV__) {
            console.log('✅ Token refrescado exitosamente');
          }

          // Guardar nuevo access token
          await storage.setItem(ACCESS_TOKEN_KEY, accessToken);

          // Actualizar header de la petición original
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          // Procesar cola de peticiones pendientes
          processQueue(null, accessToken);

          // Emitir evento de token refrescado
          authEvents.emit('token-refreshed');

          // Reintentar la petición original
          return api(originalRequest);
        } else {
          throw new Error('Failed to refresh token');
        }
      } catch (refreshError: any) {
        // ==================== SESIÓN EXPIRADA ====================
        if (__DEV__) {
          console.log('❌ Refresh token falló:', refreshError.message);
          console.log('🚪 Limpiando sesión y emitiendo evento...');
        }

        // Procesar cola de peticiones pendientes con error
        processQueue(refreshError as Error, null);
        
        // Limpiar tokens del storage
        await storage.removeItem(ACCESS_TOKEN_KEY);
        await storage.removeItem(REFRESH_TOKEN_KEY);
        await storage.removeItem(USER_KEY);

        // ==================== EMITIR EVENTO ====================
        // Emitir evento para que AuthContext maneje la redirección
        authEvents.emit('session-expired', {
          reason: refreshError.response?.status === 403 
            ? 'Tu sesión expiró por inactividad' 
            : 'Tu sesión ha expirado',
          error: refreshError
        });

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ==================== FUNCIONES DE AUTENTICACIÓN ====================

export const authAPI = {
  // Login
  async login(email: string, password: string) {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  // Register
  async register(nombre: string, email: string, password: string) {
    const response = await api.post('/api/auth/register', { nombre, email, password });
    return response.data;
  },

  // Refresh token
  async refresh(refreshToken: string) {
    const response = await api.post('/api/auth/refresh', { refreshToken });
    return response.data;
  },

  // Verify token
  async verify() {
    const response = await api.get('/api/auth/verify');
    return response.data;
  },

  // Logout
  async logout(refreshToken: string) {
    const response = await api.post('/api/auth/logout', { refreshToken });
    return response.data;
  },

  // Logout all sessions
  async logoutAll(refreshToken: string) {
    const response = await api.post('/api/auth/logout-all', { refreshToken });
    return response.data;
  },
};

// ==================== FUNCIONES DE PROYECTOS ====================

export const projectsAPI = {
  // Obtener proyectos del usuario
  async getByUser(userId: number) {
    const response = await api.get(`/api/projects/user/${userId}`);
    return response.data;
  },

  // Crear proyecto
  async create(projectData: {
    nombre: string;
    descripcion?: string;
    es_colaborativo: boolean;
    usuario_id: number;
  }) {
    const response = await api.post('/api/projects', projectData);
    return response.data;
  },

  // Actualizar proyecto
  async update(projectId: number, projectData: {
    nombre: string;
    descripcion?: string;
    es_colaborativo: boolean;
    usuario_id: number;
  }) {
    const response = await api.put(`/api/projects/${projectId}`, projectData);
    return response.data;
  },

  // Eliminar proyecto
  async delete(projectId: number, userId: number) {
    const response = await api.delete(`/api/projects/${projectId}`, {
      data: { usuario_id: userId },
    });
    return response.data;
  },

  // Agregar miembro
  async addMember(projectId: number, memberData: {
    usuario_id: number;
    rol_id: number;
  }) {
    const response = await api.post(`/api/projects/${projectId}/miembros`, memberData);
    return response.data;
  },

  // Eliminar miembro
  async removeMember(projectId: number, userId: number) {
    const response = await api.delete(`/api/projects/${projectId}/miembros/${userId}`);
    return response.data;
  },

  // Eliminar todos los miembros
  async removeAllMembers(projectId: number) {
    const response = await api.delete(`/api/projects/${projectId}/miembros`);
    return response.data;
  },
};

// ==================== FUNCIONES DE LISTAS ====================

export const listsAPI = {
  // Obtener listas de un proyecto
  async getByProject(projectId: number) {
    const response = await api.get(`/api/lists/project/${projectId}`);
    return response.data;
  },

  // Crear lista
  async create(listData: {
    proyecto_id: number;
    nombre: string;
    orden: number;
  }) {
    const response = await api.post('/api/lists', listData);
    return response.data;
  },

  // Actualizar lista
  async update(listId: number, listData: {
    nombre: string;
    orden?: number;
  }) {
    const response = await api.put(`/api/lists/${listId}`, listData);
    return response.data;
  },

  // Eliminar lista
  async delete(listId: number) {
    const response = await api.delete(`/api/lists/${listId}`);
    return response.data;
  },
};

// ==================== FUNCIONES DE TAREAS ====================

export const tasksAPI = {
  // Obtener tareas de una lista
  async getByList(listId: number) {
    const response = await api.get(`/api/tasks/list/${listId}`);
    return response.data;
  },

  // Crear tarea
  async create(taskData: {
    lista_id: number;
    titulo: string;
    descripcion?: string;
    prioridad?: string;
    fecha_vencimiento?: string | null;
    asignado_a?: number | null;
  }) {
    const response = await api.post('/api/tasks', taskData);
    return response.data;
  },

  // Actualizar tarea
  async update(taskId: number, taskData: {
    titulo?: string;
    descripcion?: string;
    prioridad?: string;
    fecha_vencimiento?: string | null;
    asignado_a?: number | null;
    completada?: boolean;
  }) {
    const response = await api.put(`/api/tasks/${taskId}`, taskData);
    return response.data;
  },

  // Mover tarea (drag & drop)
  async move(taskId: number, moveData: {
    nueva_lista_id: number;
    nuevo_orden: number;
  }) {
    const response = await api.put(`/api/tasks/${taskId}/move`, moveData);
    return response.data;
  },

  // Eliminar tarea
  async delete(taskId: number) {
    const response = await api.delete(`/api/tasks/${taskId}`);
    return response.data;
  },
};

// ==================== FUNCIONES DE USUARIOS ====================

export const usersAPI = {
  // Obtener todos los usuarios
  async getAll() {
    const response = await api.get('/api/users');
    return response.data;
  },

  // Obtener usuarios disponibles para agregar a un proyecto
  async getAvailable(projectId: number) {
    const response = await api.get(`/api/users/disponibles/${projectId}`);
    return response.data;
  },

  // Obtener roles
  async getRoles() {
    const response = await api.get('/api/users/roles');
    return response.data;
  },
};

// ==================== FUNCIONES DE ETIQUETAS ====================

export const tagsAPI = {
  // Obtener todas las etiquetas
  async getAll() {
    const response = await api.get('/api/tags');
    return response.data;
  },
};

// Exportar la instancia de axios por si se necesita usar directamente
export default api;

// Exportar storage y keys para uso en AuthContext
export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, storage, USER_KEY };

