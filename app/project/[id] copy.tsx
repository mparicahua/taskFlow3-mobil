import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuth } from '@/contexts/AuthContext';
import { listsAPI, projectsAPI, tasksAPI } from '@/services/api';

// ==================== TIPOS ====================
interface User {
  id: number;
  nombre: string;
  email: string;
  iniciales: string;
  color_avatar: string;
}

interface Tarea {
  id: number;
  lista_id: number;
  titulo: string;
  descripcion: string | null;
  orden: number;
  completada: boolean;
  prioridad: 'Baja' | 'Media' | 'Alta';
  fecha_creacion: string;
  fecha_vencimiento: string | null;
  asignado_a: number | null;
  usuario: User | null;
  tarea_etiqueta?: Array<{
    id: number;
    etiqueta: {
      id: number;
      nombre: string;
      color: string;
    };
  }>;
}

interface Lista {
  id: number;
  proyecto_id: number;
  nombre: string;
  orden: number;
  activa: boolean;
  tareas: Tarea[];
}

interface ProjectMember {
  usuario: User;
  rol: {
    nombre: string;
  };
}

interface Project {
  id: number;
  nombre: string;
  descripcion: string | null;
  proyecto_usuario_rol: ProjectMember[];
}

export default function ProjectBoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Estados
  const [project, setProject] = useState<Project | null>(null);
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Lista
  const [showListModal, setShowListModal] = useState(false);
  const [listForm, setListForm] = useState({ nombre: '' });
  const [savingList, setSavingList] = useState(false);

  // Modal Tarea
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Tarea | null>(null);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'Media' as 'Baja' | 'Media' | 'Alta',
    fecha_vencimiento: null as string | null,
    asignado_a: null as number | null,
  });
  const [savingTask, setSavingTask] = useState(false);

  // Colores
  const colors = {
    background: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    cardBorder: isDark ? '#334155' : '#E2E8F0',
    text: isDark ? '#F1F5F9' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    input: isDark ? '#1E293B' : '#FFFFFF',
    inputBorder: isDark ? '#334155' : '#CBD5E1',
    accent: '#3B82F6',
    danger: '#EF4444',
    success: '#10B981',
  };

  // ==================== EFECTOS ====================
  useEffect(() => {
    if (id) {
      loadProjectBoard();
    }
  }, [id]);

  // ==================== FUNCIONES DE CARGA ====================
  const loadProjectBoard = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Cargar proyecto
      const projectData = await projectsAPI.getByUser(user.id);
      if (projectData.success) {
        const foundProject = projectData.data.find((p: Project) => p.id === parseInt(id));
        if (foundProject) {
          setProject(foundProject);
          await loadLists(parseInt(id));
        } else {
          Alert.alert('Error', 'Proyecto no encontrado');
          router.back();
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
      Alert.alert('Error', 'No se pudo cargar el proyecto');
    } finally {
      setLoading(false);
    }
  };

  const loadLists = async (projectId: number) => {
    try {
      const data = await listsAPI.getByProject(projectId);
      if (data.success) {
        setListas(data.data);
      }
    } catch (error) {
      console.error('Error loading lists:', error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProjectBoard().finally(() => setRefreshing(false));
  }, []);

  // ==================== FUNCIONES DE LISTA ====================
  const openCreateListModal = () => {
    setListForm({ nombre: '' });
    setShowListModal(true);
  };

  const closeListModal = () => {
    setShowListModal(false);
    setListForm({ nombre: '' });
  };

  const createList = async () => {
    if (!listForm.nombre.trim()) {
      Alert.alert('Error', 'El nombre de la lista es requerido');
      return;
    }

    setSavingList(true);
    try {
      const data = await listsAPI.create({
        proyecto_id: parseInt(id),
        nombre: listForm.nombre,
        orden: listas.length,
      });

      if (data.success) {
        setListas([...listas, { ...data.data, tareas: [] }]);
        closeListModal();
      } else {
        Alert.alert('Error', data.message || 'No se pudo crear la lista');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error de conexión');
    } finally {
      setSavingList(false);
    }
  };

  const deleteList = (lista: Lista) => {
    Alert.alert(
      'Confirmar',
      `¿Eliminar la lista "${lista.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await listsAPI.delete(lista.id);
              if (data.success) {
                setListas(listas.filter((l) => l.id !== lista.id));
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la lista');
            }
          },
        },
      ]
    );
  };

  // ==================== FUNCIONES DE TAREA ====================
  const openCreateTaskModal = (listaId: number) => {
    setEditingTask(null);
    setSelectedListId(listaId);
    setTaskForm({
      titulo: '',
      descripcion: '',
      prioridad: 'Media',
      fecha_vencimiento: null,
      asignado_a: null,
    });
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task: Tarea) => {
    setEditingTask(task);
    setSelectedListId(task.lista_id);
    setTaskForm({
      titulo: task.titulo,
      descripcion: task.descripcion || '',
      prioridad: task.prioridad,
      fecha_vencimiento: task.fecha_vencimiento,
      asignado_a: task.asignado_a,
    });
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setSelectedListId(null);
    setTaskForm({
      titulo: '',
      descripcion: '',
      prioridad: 'Media',
      fecha_vencimiento: null,
      asignado_a: null,
    });
  };

  const createTask = async () => {
    if (!taskForm.titulo.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }

    setSavingTask(true);
    try {
      const data = await tasksAPI.create({
        lista_id: selectedListId!,
        ...taskForm,
      });

      if (data.success) {
        // Actualizar lista local
        setListas(
          listas.map((lista) =>
            lista.id === selectedListId
              ? { ...lista, tareas: [...lista.tareas, data.data] }
              : lista
          )
        );
        closeTaskModal();
      } else {
        Alert.alert('Error', data.message || 'No se pudo crear la tarea');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error de conexión');
    } finally {
      setSavingTask(false);
    }
  };

  const updateTask = async () => {
    if (!taskForm.titulo.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }

    setSavingTask(true);
    try {
      const data = await tasksAPI.update(editingTask!.id, taskForm);

      if (data.success) {
        // Actualizar lista local
        setListas(
          listas.map((lista) => ({
            ...lista,
            tareas: lista.tareas.map((t) => (t.id === editingTask!.id ? data.data : t)),
          }))
        );
        closeTaskModal();
      } else {
        Alert.alert('Error', data.message || 'No se pudo actualizar la tarea');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error de conexión');
    } finally {
      setSavingTask(false);
    }
  };

  const deleteTask = () => {
    Alert.alert(
      'Confirmar',
      '¿Eliminar esta tarea?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await tasksAPI.delete(editingTask!.id);
              if (data.success) {
                setListas(
                  listas.map((lista) => ({
                    ...lista,
                    tareas: lista.tareas.filter((t) => t.id !== editingTask!.id),
                  }))
                );
                closeTaskModal();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la tarea');
            }
          },
        },
      ]
    );
  };

  const toggleTaskComplete = async (task: Tarea) => {
    try {
      const data = await tasksAPI.update(task.id, {
        completada: !task.completada,
      });

      if (data.success) {
        setListas(
          listas.map((lista) => ({
            ...lista,
            tareas: lista.tareas.map((t) =>
              t.id === task.id ? { ...t, completada: !t.completada } : t
            ),
          }))
        );
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la tarea');
    }
  };

  // ==================== UTILIDADES ====================
  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Alta':
        return '#EF4444';
      case 'Media':
        return '#F59E0B';
      case 'Baja':
        return '#10B981';
      default:
        return colors.textSecondary;
    }
  };

  // ==================== RENDERIZADO ====================
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Cargando tablero...
        </Text>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Proyecto no encontrado</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder,paddingTop:60 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {project.nombre}
            </Text>
            {project.proyecto_usuario_rol.length > 0 && (
              <View style={styles.membersRow}>
                {project.proyecto_usuario_rol.slice(0, 3).map((member) => (
                  <View
                    key={member.usuario.id}
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: member.usuario.color_avatar },
                    ]}
                  >
                    <Text style={styles.memberInitials}>{member.usuario.iniciales}</Text>
                  </View>
                ))}
                {project.proyecto_usuario_rol.length > 3 && (
                  <View style={[styles.memberAvatar, { backgroundColor: colors.textSecondary }]}>
                    <Text style={styles.memberInitials}>
                      +{project.proyecto_usuario_rol.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <TouchableOpacity onPress={openCreateListModal}>
            <Ionicons name="add-circle" size={28} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Listas (Horizontal Scroll) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {listas.map((lista) => (
            <View
              key={lista.id}
              style={[
                styles.listCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              {/* Header de la lista */}
              <View style={styles.listHeader}>
                <View style={styles.listTitleContainer}>
                  <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1}>
                    {lista.nombre}
                  </Text>
                  <Text style={[styles.listCount, { color: colors.textSecondary }]}>
                    {lista.tareas.length} {lista.tareas.length === 1 ? 'tarea' : 'tareas'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteList(lista)}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>

              {/* Tareas */}
              <ScrollView style={styles.tasksScroll} showsVerticalScrollIndicator={false}>
                {lista.tareas.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.taskCard, { backgroundColor: colors.input, borderColor: colors.inputBorder }]}
                    onPress={() => openEditTaskModal(task)}
                    activeOpacity={0.7}
                  >
                    {/* Checkbox + Título */}
                    <View style={styles.taskHeader}>
                      <TouchableOpacity
                        onPress={() => toggleTaskComplete(task)}
                        style={styles.checkbox}
                      >
                        <Ionicons
                          name={task.completada ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={task.completada ? colors.success : colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.taskTitle,
                          { color: colors.text },
                          task.completada && styles.taskTitleCompleted,
                        ]}
                        numberOfLines={2}
                      >
                        {task.titulo}
                      </Text>
                    </View>

                    {/* Descripción */}
                    {task.descripcion && (
                      <Text
                        style={[styles.taskDescription, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {task.descripcion}
                      </Text>
                    )}

                    {/* Footer: Prioridad, Fecha, Usuario */}
                    <View style={styles.taskFooter}>
                      <View style={styles.taskFooterLeft}>
                        <View
                          style={[
                            styles.priorityBadge,
                            { backgroundColor: getPriorityColor(task.prioridad) + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.priorityText,
                              { color: getPriorityColor(task.prioridad) },
                            ]}
                          >
                            {task.prioridad}
                          </Text>
                        </View>
                        {task.fecha_vencimiento && (
                          <View style={styles.dateContainer}>
                            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                              {formatDate(task.fecha_vencimiento)}
                            </Text>
                          </View>
                        )}
                      </View>
                      {task.usuario && (
                        <View
                          style={[
                            styles.taskAvatar,
                            { backgroundColor: task.usuario.color_avatar },
                          ]}
                        >
                          <Text style={styles.taskAvatarText}>{task.usuario.iniciales}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Botón agregar tarea */}
                <TouchableOpacity
                  style={[styles.addTaskButton, { backgroundColor: colors.input, borderColor: colors.inputBorder }]}
                  onPress={() => openCreateTaskModal(lista.id)}
                >
                  <Ionicons name="add" size={20} color={colors.accent} />
                  <Text style={[styles.addTaskText, { color: colors.accent }]}>Agregar tarea</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          ))}

          {/* Botón nueva lista */}
          <TouchableOpacity
            style={[styles.addListButton, { borderColor: colors.cardBorder }]}
            onPress={openCreateListModal}
          >
            <Ionicons name="add-circle-outline" size={32} color={colors.accent} />
            <Text style={[styles.addListText, { color: colors.text }]}>Nueva Lista</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ==================== MODAL: CREAR LISTA ==================== */}
        <Modal
          visible={showListModal}
          animationType="slide"
          transparent={true}
          onRequestClose={closeListModal}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva Lista</Text>
                <TouchableOpacity onPress={closeListModal}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={[styles.label, { color: colors.text }]}>Nombre de la lista</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="Ej: Por Hacer, En Progreso..."
                  placeholderTextColor={colors.textSecondary}
                  value={listForm.nombre}
                  onChangeText={(text) => setListForm({ nombre: text })}
                  autoFocus
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel, { borderColor: colors.inputBorder }]}
                  onPress={closeListModal}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: colors.accent }]}
                  onPress={createList}
                  disabled={savingList}
                >
                  {savingList ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Crear</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ==================== MODAL: CREAR/EDITAR TAREA ==================== */}
        <Modal
          visible={showTaskModal}
          animationType="slide"
          transparent={true}
          onRequestClose={closeTaskModal}
        >
          <View style={styles.modalOverlay}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.modalContent, styles.modalContentLarge, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
                  </Text>
                  <TouchableOpacity onPress={closeTaskModal}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  {/* Título */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Título *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
                      placeholder="Título de la tarea..."
                      placeholderTextColor={colors.textSecondary}
                      value={taskForm.titulo}
                      onChangeText={(text) => setTaskForm({ ...taskForm, titulo: text })}
                      autoFocus={!editingTask}
                    />
                  </View>

                  {/* Descripción */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Descripción</Text>
                    <TextInput
                      style={[styles.input, styles.textArea, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
                      placeholder="Describe la tarea..."
                      placeholderTextColor={colors.textSecondary}
                      value={taskForm.descripcion}
                      onChangeText={(text) => setTaskForm({ ...taskForm, descripcion: text })}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Prioridad */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Prioridad</Text>
                    <View style={styles.priorityButtons}>
                      {(['Baja', 'Media', 'Alta'] as const).map((priority) => (
                        <TouchableOpacity
                          key={priority}
                          style={[
                            styles.priorityButton,
                            {
                              backgroundColor:
                                taskForm.prioridad === priority
                                  ? getPriorityColor(priority)
                                  : colors.input,
                              borderColor: getPriorityColor(priority),
                            },
                          ]}
                          onPress={() => setTaskForm({ ...taskForm, prioridad: priority })}
                        >
                          <Text
                            style={[
                              styles.priorityButtonText,
                              {
                                color:
                                  taskForm.prioridad === priority
                                    ? '#FFFFFF'
                                    : getPriorityColor(priority),
                              },
                            ]}
                          >
                            {priority}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Asignar a */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Asignar a</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.assigneeScroll}
                    >
                      <TouchableOpacity
                        style={[
                          styles.assigneeChip,
                          {
                            backgroundColor:
                              taskForm.asignado_a === null ? colors.accent : colors.input,
                            borderColor: colors.inputBorder,
                          },
                        ]}
                        onPress={() => setTaskForm({ ...taskForm, asignado_a: null })}
                      >
                        <Text
                          style={[
                            styles.assigneeChipText,
                            { color: taskForm.asignado_a === null ? '#FFFFFF' : colors.text },
                          ]}
                        >
                          Sin asignar
                        </Text>
                      </TouchableOpacity>
                      {project?.proyecto_usuario_rol.map((member) => (
                        <TouchableOpacity
                          key={member.usuario.id}
                          style={[
                            styles.assigneeChip,
                            {
                              backgroundColor:
                                taskForm.asignado_a === member.usuario.id
                                  ? member.usuario.color_avatar
                                  : colors.input,
                              borderColor: colors.inputBorder,
                            },
                          ]}
                          onPress={() =>
                            setTaskForm({ ...taskForm, asignado_a: member.usuario.id })
                          }
                        >
                          <View
                            style={[
                              styles.assigneeAvatar,
                              { backgroundColor: member.usuario.color_avatar },
                            ]}
                          >
                            <Text style={styles.assigneeInitials}>{member.usuario.iniciales}</Text>
                          </View>
                          <Text
                            style={[
                              styles.assigneeChipText,
                              {
                                color:
                                  taskForm.asignado_a === member.usuario.id
                                    ? '#FFFFFF'
                                    : colors.text,
                              },
                            ]}
                          >
                            {member.usuario.nombre}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                <View style={styles.modalFooter}>
                  {editingTask && (
                    <TouchableOpacity
                      style={[styles.deleteButton, { backgroundColor: colors.danger }]}
                      onPress={deleteTask}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                      <Text style={[styles.deleteButtonText, { color: '#FFFFFF' }]}>
                        Eliminar
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.modalFooterRight}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonCancel, { borderColor: colors.inputBorder }]}
                      onPress={closeTaskModal}
                    >
                      <Text style={[styles.modalButtonText, { color: colors.text }]}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: colors.accent }]}
                      onPress={editingTask ? updateTask : createTask}
                      disabled={savingTask}
                    >
                      {savingTask ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                          {editingTask ? 'Actualizar' : 'Crear'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

// ==================== ESTILOS ====================
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  membersRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  memberInitials: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  listsContainer: {
    padding: 16,
    gap: 12,
  },
  listCard: {
    width: 280,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    maxHeight: 500,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listCount: {
    fontSize: 12,
    marginTop: 2,
  },
  tasksScroll: {
    flex: 1,
  },
  taskCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 8,
    marginTop: 2,
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskDescription: {
    fontSize: 12,
    marginBottom: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  taskAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addTaskText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  addListButton: {
    width: 200,
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addListText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  modalContentLarge: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
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
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  assigneeScroll: {
    flexDirection: 'row',
  },
  assigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  assigneeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  assigneeAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  assigneeInitials: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalFooterRight: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
  },
  modalButtonSave: {
    // backgroundColor se establece dinámicamente
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});