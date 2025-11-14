import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  
  // Formulario de nuevo proyecto
  const [newProject, setNewProject] = useState({
    nombre: '',
    descripcion: '',
    es_colaborativo: true,
  });

  // Colores dinámicos basados en el tema
  const colors = {
    background: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    cardBorder: isDark ? '#334155' : '#E2E8F0',
    text: isDark ? '#F1F5F9' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    textTertiary: isDark ? '#64748B' : '#94A3B8',
    input: isDark ? '#1E293B' : '#FFFFFF',
    inputBorder: isDark ? '#334155' : '#CBD5E1',
    accent: '#3B82F6',
    danger: '#EF4444',
    success: '#10B981',
    modalOverlay: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
  };

  // Cargar proyectos
  const loadProjects = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID yet, skipping load');
      return;
    }

    try {
      console.log('Loading projects for user:', user.id);
      const response = await fetch(`${API_URL}/api/projects/user/${user.id}`);
      const data = await response.json();

      if (data.success) {
        setProjects(data.data);
        console.log('Projects loaded:', data.data.length);
      } else {
        Alert.alert('Error', 'No se pudieron cargar los proyectos');
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      Alert.alert('Error', 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Recargar al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects])
  );

  // Refresh manual
  const onRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  // Crear proyecto
  const handleCreateProject = async () => {
    if (!newProject.nombre.trim()) {
      Alert.alert('Error', 'El nombre del proyecto es requerido');
      return;
    }

    setCreatingProject(true);

    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          usuario_id: user?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', 'Proyecto creado correctamente');
        setModalVisible(false);
        setNewProject({ nombre: '', descripcion: '', es_colaborativo: true });
        loadProjects();
      } else {
        Alert.alert('Error', data.message || 'No se pudo crear el proyecto');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setCreatingProject(false);
    }
  };

  // Abrir proyecto
  const openProject = (project: Project) => {
    console.log('Opening project:', project.id);
    Alert.alert('Info', `Abrir proyecto: ${project.nombre}`);
  };

  // Eliminar proyecto
  const deleteProject = (project: Project) => {
    const confirmDelete = () => {
      Alert.alert(
        'Confirmar',
        `¿Estás seguro de eliminar "${project.nombre}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await fetch(`${API_URL}/api/projects/${project.id}`, {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ usuario_id: user?.id }),
                });
                const data = await response.json();
                if (data.success) {
                  setProjects(projects.filter((p) => p.id !== project.id));
                  Alert.alert('Éxito', 'Proyecto eliminado');
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
      const confirmed = window.confirm(`¿Estás seguro de eliminar "${project.nombre}"?`);
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

  // Renderizar tarjeta de proyecto
  const renderProject = ({ item }: { item: Project }) => (
    <TouchableOpacity
      style={[styles.projectCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={() => openProject(item)}
      activeOpacity={0.7}
    >
      <View style={styles.projectHeader}>
        <View style={styles.projectTitleContainer}>
          <Text style={[styles.projectTitle, { color: colors.text }]} numberOfLines={1}>
            {item.nombre}
          </Text>
          <Text style={[styles.projectDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.descripcion || 'Sin descripción'}
          </Text>
        </View>

        <View style={styles.projectActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Info', 'Editar proyecto (próximamente)')}
          >
            <Ionicons name="pencil" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => deleteProject(item)}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Estadísticas */}
      <View style={styles.projectStats}>
        <Text style={[styles.statsText, { color: colors.textTertiary }]}>5 tareas</Text>
        <Text style={[styles.statsTextCompleted, { color: colors.success }]}>3 completadas</Text>
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
            <Text style={styles.memberInitials}>{miembro.usuario.iniciales}</Text>
          </View>
        ))}
        {item.proyecto_usuario_rol.length > 3 && (
          <View style={[styles.memberAvatar, styles.memberAvatarMore, { backgroundColor: colors.textSecondary }]}>
            <Text style={styles.memberInitials}>+{item.proyecto_usuario_rol.length - 3}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando proyectos...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Lista de proyectos */}
      {projects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>No hay proyectos aún</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            ¡Crea tu primer proyecto!
          </Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          renderItem={renderProject}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        />
      )}

      {/* Botón flotante para crear proyecto */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal de creación */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {/* Header del modal */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nuevo Proyecto</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Nombre del proyecto */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Nombre del Proyecto *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="Ej: Proyecto Final"
                  placeholderTextColor={colors.textSecondary}
                  value={newProject.nombre}
                  onChangeText={(text) => setNewProject({ ...newProject, nombre: text })}
                  editable={!creatingProject}
                />
              </View>

              {/* Descripción */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Descripción</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="Describe tu proyecto..."
                  placeholderTextColor={colors.textSecondary}
                  value={newProject.descripcion}
                  onChangeText={(text) => setNewProject({ ...newProject, descripcion: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!creatingProject}
                />
              </View>

              {/* Proyecto colaborativo */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() =>
                  setNewProject({ ...newProject, es_colaborativo: !newProject.es_colaborativo })
                }
                disabled={creatingProject}
              >
                <View style={[styles.checkbox, newProject.es_colaborativo && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                  {newProject.es_colaborativo && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>Proyecto Colaborativo</Text>
              </TouchableOpacity>

              {/* Botones */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.buttonSecondary, { borderColor: colors.inputBorder }]}
                  onPress={() => setModalVisible(false)}
                  disabled={creatingProject}
                >
                  <Text style={[styles.buttonSecondaryText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.buttonPrimary, { backgroundColor: colors.accent }, creatingProject && styles.buttonDisabled]}
                  onPress={handleCreateProject}
                  disabled={creatingProject}
                >
                  {creatingProject ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonPrimaryText}>Crear Proyecto</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  projectCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
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
    fontWeight: 'bold',
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 14,
  },
  projectActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  projectStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statsText: {
    fontSize: 12,
  },
  statsTextCompleted: {
    fontSize: 12,
  },
  membersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberAvatarOverlap: {
    marginLeft: -8,
  },
  memberAvatarMore: {
    backgroundColor: '#64748B',
  },
  memberInitials: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});