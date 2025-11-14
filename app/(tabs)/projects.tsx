import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';

const API_URL = 'https://taskflow3-server-production.up.railway.app';

interface User {
  id: number;
  nombre: string;
  email: string;
  iniciales: string;
  color_avatar: string;
}

interface Role {
  id: number;
  nombre: string;
  descripcion: string;
}

interface ProjectMember {
  usuario: User;
  rol: Role;
}

interface Project {
  id: number;
  nombre: string;
  descripcion: string | null;
  es_colaborativo: boolean;
  proyecto_usuario_rol: ProjectMember[];
}

export default function ProjectsScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  
  // Modo edición
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [previousCollaborative, setPreviousCollaborative] = useState(true);
  
  // Formulario de proyecto
  const [projectForm, setProjectForm] = useState({
    nombre: '',
    descripcion: '',
    es_colaborativo: true,
  });

  // Gestión de miembros (solo para modo editar)
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Colores dinámicos
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
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_URL}/api/projects/user/${user.id}`);
      const data = await response.json();

      if (data.success) {
        setProjects(data.data);
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

  // Recargar al enfocar
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

  // Cargar usuarios y roles
  const loadUsersAndRoles = async () => {
    setLoadingUsers(true);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch(`${API_URL}/api/users`),
        fetch(`${API_URL}/api/users/roles`),
      ]);

      const usersData = await usersResponse.json();
      const rolesData = await rolesResponse.json();

      if (usersData.success && rolesData.success) {
        setAllUsers(usersData.data);
        setAllRoles(rolesData.data);
      }
    } catch (error) {
      console.error('Error loading users/roles:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Cargar usuarios disponibles
  const loadAvailableUsers = async (proyectoId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/users/disponibles/${proyectoId}`);
      const data = await response.json();
      if (data.success) {
        setAvailableUsers(data.data);
      }
    } catch (error) {
      console.error('Error loading available users:', error);
    }
  };

  // Abrir modal para crear
  const openCreateModal = () => {
    setIsEditMode(false);
    setEditingProject(null);
    setProjectForm({
      nombre: '',
      descripcion: '',
      es_colaborativo: true,
    });
    setPreviousCollaborative(true);
    setModalVisible(true);
  };

  // Abrir modal para editar
  const openEditModal = async (project: Project) => {
    await loadUsersAndRoles();
    setIsEditMode(true);
    setEditingProject(project);
    setProjectForm({
      nombre: project.nombre,
      descripcion: project.descripcion || '',
      es_colaborativo: project.es_colaborativo,
    });
    setPreviousCollaborative(project.es_colaborativo);
    setProjectMembers(project.proyecto_usuario_rol || []);
    await loadAvailableUsers(project.id);
    setModalVisible(true);
  };

  // Toggle colaborativo
  const toggleCollaborative = () => {
    const newValue = !projectForm.es_colaborativo;

    // Si está en modo edición y era colaborativo antes y ahora lo desactiva
    if (isEditMode && previousCollaborative && !newValue && editingProject) {
      Alert.alert(
        'Confirmar',
        '¿Desactivar proyecto colaborativo? Esto eliminará a todos los miembros excepto al propietario.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await fetch(
                  `${API_URL}/api/projects/${editingProject.id}/miembros`,
                  { method: 'DELETE' }
                );
                const data = await response.json();

                if (data.success) {
                  setProjectForm({ ...projectForm, es_colaborativo: newValue });
                  setProjectMembers(
                    projectMembers.filter(m => m.rol.nombre === 'Propietario')
                  );
                  await loadAvailableUsers(editingProject.id);
                } else {
                  Alert.alert('Error', data.message || 'Error al eliminar miembros');
                }
              } catch (error) {
                console.error('Error:', error);
                Alert.alert('Error', 'Error al eliminar miembros');
              }
            },
          },
        ]
      );
    } else {
      setProjectForm({ ...projectForm, es_colaborativo: newValue });
    }
  };

  // Agregar miembro al proyecto (modo editar)
  const addMemberToProject = async () => {
    if (!selectedUserId || !selectedRoleId) {
      Alert.alert('Error', 'Selecciona un usuario y un rol');
      return;
    }

    if (!editingProject) return;

    try {
      const response = await fetch(
        `${API_URL}/api/projects/${editingProject.id}/miembros`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario_id: selectedUserId,
            rol_id: selectedRoleId,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setProjectMembers([...projectMembers, data.data]);
        await loadAvailableUsers(editingProject.id);
        setSelectedUserId(null);
        setSelectedRoleId(null);
      } else {
        Alert.alert('Error', data.message || 'Error al agregar miembro');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Error al agregar miembro');
    }
  };

  // Eliminar miembro del proyecto (modo editar)
  const removeMemberFromProject = async (usuarioId: number) => {
    if (!editingProject) return;

    Alert.alert(
      'Confirmar',
      '¿Eliminar este miembro del proyecto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_URL}/api/projects/${editingProject.id}/miembros/${usuarioId}`,
                { method: 'DELETE' }
              );

              const data = await response.json();

              if (data.success) {
                setProjectMembers(projectMembers.filter(m => m.usuario.id !== usuarioId));
                await loadAvailableUsers(editingProject.id);
              } else {
                Alert.alert('Error', data.message || 'Error al eliminar miembro');
              }
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Error', 'Error al eliminar miembro');
            }
          },
        },
      ]
    );
  };

  // Crear proyecto
  const createProject = async () => {
    if (!projectForm.nombre.trim()) {
      Alert.alert('Error', 'El nombre del proyecto es requerido');
      return;
    }

    setSavingProject(true);

    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectForm,
          usuario_id: user?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', 'Proyecto creado correctamente');
        closeModal();
        loadProjects();
      } else {
        Alert.alert('Error', data.message || 'No se pudo crear el proyecto');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setSavingProject(false);
    }
  };

  // Editar proyecto
  const updateProject = async () => {
    if (!projectForm.nombre.trim()) {
      Alert.alert('Error', 'El nombre del proyecto es requerido');
      return;
    }

    if (!editingProject) return;

    setSavingProject(true);

    try {
      const response = await fetch(`${API_URL}/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectForm,
          usuario_id: user?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', 'Proyecto actualizado correctamente');
        closeModal();
        loadProjects();
      } else {
        Alert.alert('Error', data.message || 'No se pudo actualizar el proyecto');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setSavingProject(false);
    }
  };

  // Cerrar modal
  const closeModal = () => {
    setModalVisible(false);
    setIsEditMode(false);
    setEditingProject(null);
    setProjectForm({
      nombre: '',
      descripcion: '',
      es_colaborativo: true,
    });
    setPreviousCollaborative(true);
    setProjectMembers([]);
    setAvailableUsers([]);
    setSelectedUserId(null);
    setSelectedRoleId(null);
  };

  // Abrir proyecto
  const openProject = (project: Project) => {
    Alert.alert('Info', `Abrir proyecto: ${project.nombre}\n(Próximamente: Tablero Kanban)`);
  };

  // Eliminar proyecto
  const deleteProject = (project: Project) => {
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
                setProjects(projects.filter(p => p.id !== project.id));
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
            onPress={() => openEditModal(item)}
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        />
      )}

      {/* Botón flotante para crear */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={openCreateModal}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal para crear/editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {/* Header del modal */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isEditMode ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Nombre */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Nombre del Proyecto *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="Ej: Proyecto Final"
                  placeholderTextColor={colors.textSecondary}
                  value={projectForm.nombre}
                  onChangeText={(text) => setProjectForm({ ...projectForm, nombre: text })}
                />
              </View>

              {/* Descripción */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="Describe tu proyecto..."
                  placeholderTextColor={colors.textSecondary}
                  value={projectForm.descripcion}
                  onChangeText={(text) => setProjectForm({ ...projectForm, descripcion: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Proyecto Colaborativo */}
              <View style={[styles.switchContainer, { backgroundColor: colors.input, borderColor: colors.inputBorder }]}>
                <Text style={[styles.label, { color: colors.text }]}>Proyecto Colaborativo</Text>
                <Switch
                  value={projectForm.es_colaborativo}
                  onValueChange={toggleCollaborative}
                  trackColor={{ false: colors.inputBorder, true: colors.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Miembros del equipo - SOLO en modo EDITAR y si es colaborativo */}
              {isEditMode && projectForm.es_colaborativo && (
                <View style={styles.membersSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Miembros del Equipo
                  </Text>

                  {loadingUsers ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : (
                    <>
                      {/* Selector de miembros */}
                      <View style={styles.memberSelector}>
                        <Text style={[styles.label, { color: colors.text }]}>Agregar Miembro</Text>

                        {/* Selector de usuario */}
                        <View style={styles.pickerGroup}>
                          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Usuario:</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userChipsContainer}>
                            {availableUsers.map((u) => (
                              <TouchableOpacity
                                key={u.id}
                                style={[
                                  styles.userChip,
                                  { 
                                    backgroundColor: selectedUserId === u.id ? colors.accent : colors.input,
                                    borderColor: colors.inputBorder,
                                  },
                                ]}
                                onPress={() => setSelectedUserId(u.id)}
                              >
                                <View style={[styles.chipAvatar, { backgroundColor: u.color_avatar }]}>
                                  <Text style={styles.chipInitials}>{u.iniciales}</Text>
                                </View>
                                <Text style={[styles.chipName, { color: selectedUserId === u.id ? '#FFFFFF' : colors.text }]} numberOfLines={1}>
                                  {u.nombre}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        {/* Selector de rol */}
                        <View style={styles.pickerGroup}>
                          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Rol:</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleChipsContainer}>
                            {allRoles
                              .filter(r => r.nombre !== 'Propietario')
                              .map((r) => (
                                <TouchableOpacity
                                  key={r.id}
                                  style={[
                                    styles.roleChip,
                                    {
                                      backgroundColor: selectedRoleId === r.id ? colors.accent : colors.input,
                                      borderColor: colors.inputBorder,
                                    },
                                  ]}
                                  onPress={() => setSelectedRoleId(r.id)}
                                >
                                  <Text style={[styles.roleChipText, { color: selectedRoleId === r.id ? '#FFFFFF' : colors.text }]}>
                                    {r.nombre}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                          </ScrollView>
                        </View>

                        {/* Botón agregar */}
                        <TouchableOpacity
                          style={[
                            styles.addButton,
                            { backgroundColor: colors.accent },
                            (!selectedUserId || !selectedRoleId) && styles.addButtonDisabled,
                          ]}
                          onPress={addMemberToProject}
                          disabled={!selectedUserId || !selectedRoleId}
                        >
                          <Ionicons name="add" size={16} color="#FFFFFF" />
                          <Text style={styles.addButtonText}>Agregar</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Lista de miembros del proyecto */}
                      {projectMembers.length > 0 && (
                        <View style={styles.membersList}>
                          <Text style={[styles.label, { color: colors.text }]}>Miembros Actuales</Text>
                          {projectMembers.map((member) => (
                            <View
                              key={member.usuario.id}
                              style={[styles.memberItem, { backgroundColor: colors.input, borderColor: colors.inputBorder }]}
                            >
                              <View style={styles.memberInfo}>
                                <View style={[styles.memberAvatar, { backgroundColor: member.usuario.color_avatar }]}>
                                  <Text style={styles.memberInitials}>{member.usuario.iniciales}</Text>
                                </View>
                                <View style={styles.memberDetails}>
                                  <Text style={[styles.memberName, { color: colors.text }]}>{member.usuario.nombre}</Text>
                                  <Text style={[styles.memberRole, { color: colors.textSecondary }]}>{member.rol.nombre}</Text>
                                </View>
                              </View>
                              {member.rol.nombre !== 'Propietario' && (
                                <TouchableOpacity onPress={() => removeMemberFromProject(member.usuario.id)}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Botones del modal */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.inputBorder }]}
                onPress={closeModal}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.accent },
                  savingProject && styles.saveButtonDisabled,
                ]}
                onPress={isEditMode ? updateProject : createProject}
                disabled={savingProject}
              >
                {savingProject ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isEditMode ? 'Actualizar' : 'Crear Proyecto'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  projectCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
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
    marginTop: 8,
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
    marginLeft: -8,
  },
  memberInitials: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  membersSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  memberSelector: {
    marginBottom: 20,
  },
  pickerGroup: {
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  userChipsContainer: {
    flexDirection: 'row',
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    maxWidth: 150,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chipInitials: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chipName: {
    fontSize: 14,
    flex: 1,
  },
  roleChipsContainer: {
    flexDirection: 'row',
  },
  roleChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  membersList: {
    marginTop: 20,
    marginBottom:40,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 12,
    marginTop: 2,
  },
  helperText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});