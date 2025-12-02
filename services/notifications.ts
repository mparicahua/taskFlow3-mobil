import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

// ==================== CONFIGURACIÓN ====================
// ✅ ACTUALIZADO para SDK 54: usar shouldShowBanner y shouldShowList
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,  // ✅ Mostrar banner en foreground (antes shouldShowAlert)
    shouldPlaySound: true,   // Reproducir sonido
    shouldSetBadge: true,    // Actualizar badge (iOS)
    shouldShowList: true,    // ✅ Agregar a lista de notificaciones
  }),
});

// ==================== TIPOS ====================
// ✅ Extender de Record para compatibilidad con Expo Notifications
interface NotificationData extends Record<string, unknown> {
  projectId?: number;
  listId?: number;
  taskId?: number;
  type: string;
}

// ==================== CLASE NOTIFICATION SERVICE ====================
class NotificationService {
  private isInitialized: boolean = false;
  private notificationListener: Notifications.Subscription | null = null; // ✅ Tipo correcto
  private responseListener: Notifications.Subscription | null = null; // ✅ Tipo correcto

  /**
   * Inicializar el servicio de notificaciones
   * Debe llamarse al iniciar sesión
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Notificaciones ya inicializadas');
      return;
    }

    try {
      // 1. Solicitar permisos
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Permisos de notificación denegados');
        return;
      }

      console.log('✅ Permisos de notificación otorgados');

      // 2. Configurar canal de notificaciones (Android)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Actualizaciones de Proyectos',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
          sound: 'default',
          enableVibrate: true,
        });

        console.log('✅ Canal de notificaciones configurado (Android)');
      }

      // 3. Listener para notificaciones recibidas (mientras app está abierta)
      this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
        if (__DEV__) {
          console.log('📬 Notificación recibida:', notification);
        }
      });

      // 4. Listener para cuando el usuario toca una notificación
      this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        this.handleNotificationTap(response);
      });

      this.isInitialized = true;
      console.log('✅ Servicio de notificaciones inicializado');
    } catch (error) {
      console.error('❌ Error inicializando notificaciones:', error);
    }
  }

  /**
   * Limpiar listeners al cerrar sesión
   */
  cleanup() {
    // ✅ ACTUALIZADO: usar .remove() en lugar de removeNotificationSubscription
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }

    this.isInitialized = false;
    console.log('🧹 Servicio de notificaciones limpiado');
  }

  /**
   * Manejar tap en notificación
   */
  private handleNotificationTap(response: Notifications.NotificationResponse) {
    // ✅ ACTUALIZADO: validación de tipo segura
    const rawData = response.notification.request.content.data;
    
    // Validar que data existe y tiene la estructura correcta
    if (!rawData || typeof rawData !== 'object') {
      console.warn('⚠️ Datos de notificación inválidos');
      return;
    }

    // Cast seguro después de validación
    const data = rawData as NotificationData;

    if (__DEV__) {
      console.log('👆 Usuario tocó notificación:', data);
    }

    // Navegar según el tipo de notificación
    if (data.projectId) {
      // Navegar al proyecto
      router.push(`/project/${data.projectId}` as any);
    } else {
      // Por defecto, ir a proyectos
      router.push('/(tabs)/projects' as any);
    }
  }

  // ==================== NOTIFICACIONES DE PROYECTOS ====================

  /**
   * Proyecto creado
   */
  async notifyProjectCreated(projectName: string, projectId: number, creatorName: string) {
    await this.scheduleNotification({
      title: '📁 Nuevo Proyecto',
      body: `${creatorName} creó "${projectName}"`,
      data: {
        projectId,
        type: 'project:created',
      },
    });
  }

  /**
   * Proyecto actualizado
   */
  async notifyProjectUpdated(projectName: string, projectId: number) {
    await this.scheduleNotification({
      title: '✏️ Proyecto Actualizado',
      body: `"${projectName}" fue modificado`,
      data: {
        projectId,
        type: 'project:updated',
      },
    });
  }

  /**
   * Proyecto eliminado
   */
  async notifyProjectDeleted(projectName: string, projectId: number) {
    await this.scheduleNotification({
      title: '🗑️ Proyecto Eliminado',
      body: `"${projectName}" fue eliminado`,
      data: {
        projectId,
        type: 'project:deleted',
      },
    });
  }

  /**
   * Miembro agregado
   */
  async notifyMemberAdded(projectName: string, projectId: number, memberName: string, roleName: string) {
    await this.scheduleNotification({
      title: '👥 Nuevo Miembro',
      body: `${memberName} fue agregado como ${roleName} a "${projectName}"`,
      data: {
        projectId,
        type: 'project:member:added',
      },
    });
  }

  /**
   * Miembro removido
   */
  async notifyMemberRemoved(projectName: string, projectId: number, memberName: string) {
    await this.scheduleNotification({
      title: '👋 Miembro Removido',
      body: `${memberName} fue removido de "${projectName}"`,
      data: {
        projectId,
        type: 'project:member:removed',
      },
    });
  }

  /**
   * Te uniste a un proyecto
   */
  async notifyJoinedProject(projectName: string, projectId: number) {
    await this.scheduleNotification({
      title: '🎉 Nuevo Proyecto',
      body: `Te agregaron a "${projectName}"`,
      data: {
        projectId,
        type: 'project:joined',
      },
    });
  }

  /**
   * Te removieron de un proyecto
   */
  async notifyLeftProject(projectName: string, projectId: number) {
    await this.scheduleNotification({
      title: '⚠️ Proyecto',
      body: `Fuiste removido de "${projectName}"`,
      data: {
        projectId,
        type: 'project:left',
      },
    });
  }

  // ==================== FUNCIÓN PRINCIPAL ====================

  /**
   * Programar notificación local
   */
  private async scheduleNotification(content: {
    title: string;
    body: string;
    data: NotificationData;
  }) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ Servicio de notificaciones no inicializado');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data,
          sound: true, // Sonido habilitado
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250], // Patrón de vibración (Android)
        },
        trigger: null, // Inmediata
      });

      if (__DEV__) {
        console.log(`📲 Notificación programada: ${content.title}`);
      }
    } catch (error) {
      console.error('❌ Error programando notificación:', error);
    }
  }

  /**
   * Cancelar todas las notificaciones
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🧹 Todas las notificaciones canceladas');
  }

  /**
   * Obtener badge count (iOS)
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Establecer badge count (iOS)
   */
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Limpiar badge (iOS)
   */
  async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }
}

// Exportar instancia singleton
export const notificationService = new NotificationService();