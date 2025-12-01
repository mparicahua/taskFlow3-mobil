import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://taskflow3-server-production.up.railway.app';
//const SOCKET_URL = 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private isReady: boolean = false;
  private listeners: Map<string, Function[]> = new Map();

  /**
   * Conectar al servidor WebSocket con autenticación JWT
   */
  connect(token: string) {
    if (this.socket?.connected) {
      console.log('⚠️ Socket ya está conectado');
      return;
    }

    console.log('🔌 Conectando a Socket.IO...');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Eventos de conexión
    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('✅ Socket conectado:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.isReady = false;
      console.log('🔌 Socket desconectado:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket:', error.message);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconectado después de ${attemptNumber} intentos`);
    });

    // Evento especial: connection:ready
    this.socket.on('connection:ready', (data) => {
      this.isReady = true;
      console.log('🎉 Socket listo. Proyectos unidos:', data.projectsJoined);
    });

    // Debug: Ver todos los eventos (solo en desarrollo)
    if (__DEV__) {
      this.socket.onAny((eventName, ...args) => {
        console.log(`📩 Evento recibido: ${eventName}`, args);
      });
    }
  }

  /**
   * Desconectar socket
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Desconectando socket...');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isReady = false;
      this.listeners.clear();
    }
  }

  /**
   * Emitir evento al servidor
   */
  emit(event: string, data?: any) {
    if (!this.socket) {
      console.warn('⚠️ Socket no conectado, no se puede emitir:', event);
      return;
    }
    this.socket.emit(event, data);
    console.log(`📤 Evento emitido: ${event}`, data);
  }

  /**
   * Escuchar eventos del servidor
   */
  on(event: string, callback: Function) {
    if (!this.socket) {
      console.warn('⚠️ Socket no conectado, no se puede escuchar:', event);
      return;
    }

    // Guardar referencia del listener
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    // Registrar listener en socket
    this.socket.on(event, callback as any);
    console.log(`👂 Listener registrado: ${event}`);
  }

  /**
   * Dejar de escuchar un evento
   */
  off(event: string, callback?: Function) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback as any);
      
      // Remover de la lista local
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    } else {
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  /**
   * Remover todos los listeners de un evento
   */
  removeAllListeners(event?: string) {
    if (!this.socket) return;
    
    if (event) {
      this.socket.removeAllListeners(event);
      this.listeners.delete(event);
    } else {
      this.socket.removeAllListeners();
      this.listeners.clear();
    }
  }

  /**
   * Métodos helper para eventos específicos
   */
  joinProjects(projectIds: number[]) {
    this.emit('join:projects', { projectIds });
  }

  joinProject(projectId: number) {
    this.emit('join:project', { projectId });
  }

  leaveProject(projectId: number) {
    this.emit('leave:project', { projectId });
  }

  getConnectedUsers(projectId: number) {
    this.emit('get:connected-users', { projectId });
  }

  /**
   * Getters
   */
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  get ready(): boolean {
    return this.isReady;
  }
}

// Exportar instancia singleton
export const socketService = new SocketService();