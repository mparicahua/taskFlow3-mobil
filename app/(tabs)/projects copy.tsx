import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const API_URL = 'https://taskflow3-server-production.up.railway.app';

interface Project {
  id: number;
  nombre: string;
  descripcion: string | null;
  es_colaborativo: boolean;
  proyecto_usuario_rol: Array<{
    usuario: {
      id: number;
      nombre: string;
      iniciales: string;
      color_avatar: string;
    };
    rol: {
      nombre: string;
    };
  }>;
}

export default function ProjectsScreen() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar proyectos
  const loadProjects = useCallback(async () => {
    // No hacer nada si no hay usuario
    if (!user?.id) {
      console.log('No user ID yet, skipping load');
      return;
    }

    try {
      console.log('Loading projects for user:', user.id);
      const response = await fetch(
        `${API_URL}/api/projects/user/${user.id}`
      );
      const data = await response.json();

      if (data.success) {
        setProjects(data.data);
        console.log('Projects loaded:', data.data.length);
      } else {
        if (Platform.OS === 'web') {
          alert('Error al cargar proyectos');
        } else {
          Alert.alert('Error', 'No se pudieron cargar los proyectos');
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      if (Platform.OS === 'web') {
        alert('Error de conexión');
      } else {
        Alert.alert('Error', 'Error de conexión con el servidor');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadProjects();
    }
  }, [user?.id]);

  // Recargar cuando la pantalla gana foco (después de crear proyecto)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        console.log('Screen focused, reloading projects');
        loadProjects();
      }
    }, [user?.id, loadProjects])
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProjects();
  }, [loadProjects]);

  // Abrir proyecto
  const openProject = (project: Project) => {
    // TODO: Navegar a la pantalla del proyecto (Kanban board)
    if (Platform.OS === 'web') {
      alert(`Abrir proyecto: ${project.nombre}\n(Próximamente: Tablero Kanban)`);
    } else {
      Alert.alert(
        project.nombre,
        'Próximamente: Tablero Kanban',
        [{ text: 'OK' }]
      );
    }
  };

  // Eliminar proyecto
  const deleteProject = (project: Project) => {
    const confirmDelete = () => {
      Alert.alert(
        'Eliminar Proyecto',
        `¿Estás seguro de eliminar "${project.nombre}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await fetch(
                  `${API_URL}/api/projects/${project.id}`,
                  {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario_id: user?.id }),
                  }
                );

                const data = await response.json();

                if (data.success) {
                  setProjects(projects.filter((p) => p.id !== project.id));
                } else {
                  Alert.alert('Error', data.message || 'Error al eliminar');
                }
              } catch (error) {
                console.error('Error deleting project:', error);
                Alert.alert('Error', 'Error de conexión');
              }
            },
          },
        ]
      );
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `¿Estás seguro de eliminar "${project.nombre}"?`
      );
      if (confirmed) {
        fetch(`${API_URL}/api/projects/${project.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_id: user?.id }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setProjects(projects.filter((p) => p.id !== project.id));
            } else {
              alert(data.message || 'Error al eliminar');
            }
          })
          .catch(() => alert('Error de conexión'));
      }
    } else {
      confirmDelete();
    }
  };

  // Navegar a crear proyecto
  const goToCreateProject = () => {
    router.push('/create-project');
  };

  // Renderizar tarjeta de proyecto
  const renderProject = ({ item }: { item: Project }) => (
    <TouchableOpacity
      style={styles.projectCard}
      onPress={() => openProject(item)}
      activeOpacity={0.7}
    >
      <View style={styles.projectHeader}>
        <View style={styles.projectTitleContainer}>
          <Text style={styles.projectTitle} numberOfLines={1}>
            {item.nombre}
          </Text>
          <Text style={styles.projectDescription} numberOfLines={2}>
            {item.descripcion || 'Sin descripción'}
          </Text>
        </View>

        <View style={styles.projectActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              // TODO: Editar proyecto
              if (Platform.OS === 'web') {
                alert('Editar proyecto (próximamente)');
              } else {
                Alert.alert('Info', 'Editar proyecto (próximamente)');
              }
            }}
          >
            <Ionicons name="pencil" size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteProject(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Estadísticas (placeholder) */}
      <View style={styles.projectStats}>
        <Text style={styles.statsText}>5 tareas</Text>
        <Text style={styles.statsTextCompleted}>3 completadas</Text>
      </View>

      {/* Miembros */}
      <View style={styles.membersContainer}>
        {item.proyecto_usuario_rol.slice(0, 3).map((miembro, index) => (
          <View
            key={miembro.usuario.id}
            style={[
              styles.memberAvatar,
              { backgroundColor: miembro.usuario.color_avatar },
              index > 0 && styles.memberAvatarOverlap,
            ]}
          >
            <Text style={styles.memberInitials}>
              {miembro.usuario.iniciales}
            </Text>
          </View>
        ))}
        {item.proyecto_usuario_rol.length > 3 && (
          <View style={[styles.memberAvatar, styles.memberAvatarMore]}>
            <Text style={styles.memberInitials}>
              +{item.proyecto_usuario_rol.length - 3}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Cargando proyectos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Lista de proyectos */}
      {projects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color="#64748B" />
          <Text style={styles.emptyText}>No hay proyectos aún</Text>
          <Text style={styles.emptySubtext}>
            ¡Crea tu primer proyecto!
          </Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          renderItem={renderProject}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
        />
      )}

      {/* Botón Flotante (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={goToCreateProject}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Espacio para el FAB
  },
  projectCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  projectTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  projectActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  projectStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  statsTextCompleted: {
    fontSize: 14,
    color: '#10B981',
  },
  membersContainer: {
    flexDirection: 'row',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  memberAvatarOverlap: {
    marginLeft: -8,
  },
  memberAvatarMore: {
    backgroundColor: '#334155',
    marginLeft: -8,
  },
  memberInitials: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});