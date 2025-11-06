import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">¡Hola, {user?.nombre || 'Usuario'}!</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Bienvenido a TaskFlow3</ThemedText>
        <ThemedText>
          Has iniciado sesión correctamente en tu app móvil de TaskFlow3.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Tu Perfil</ThemedText>
        <View style={styles.infoContainer}>
          <View style={styles.avatarContainer}>
            <View 
              style={[
                styles.avatar, 
                { backgroundColor: user?.color_avatar || '#3B82F6' }
              ]}
            >
              <ThemedText style={styles.avatarText}>
                {user?.iniciales || 'TF'}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <ThemedText type="defaultSemiBold">Nombre: </ThemedText>
            <ThemedText>{user?.nombre}</ThemedText>
          </View>
          
          <View style={styles.infoRow}>
            <ThemedText type="defaultSemiBold">Email: </ThemedText>
            <ThemedText>{user?.email}</ThemedText>
          </View>
          
          <View style={styles.infoRow}>
            <ThemedText type="defaultSemiBold">ID: </ThemedText>
            <ThemedText>{user?.id}</ThemedText>
          </View>
        </View>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">¿Qué puedes hacer?</ThemedText>
        <ThemedText>
          • Gestionar tus proyectos y tareas
        </ThemedText>
        <ThemedText>
          • Colaborar con tu equipo
        </ThemedText>
        <ThemedText>
          • Organizar tareas con tableros Kanban
        </ThemedText>
        <ThemedText>
          • Puedes cerrar sesión usando el botón en la esquina superior derecha
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Próximas Funciones</ThemedText>
        <ThemedText>
          Estamos trabajando en traer todas las funciones de la web a la app móvil:
        </ThemedText>
        <ThemedText>• Vista de proyectos</ThemedText>
        <ThemedText>• Tablero Kanban</ThemedText>
        <ThemedText>• Gestión de tareas</ThemedText>
        <ThemedText>• Notificaciones push</ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  infoContainer: {
    gap: 12,
    paddingVertical: 8,
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});