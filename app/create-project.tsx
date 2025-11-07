import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
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

interface SelectedMember {
  usuario: User;
  rol: Role;
  usuario_id: number;
  rol_id: number;
}

export default function CreateProjectScreen() {
  const { user } = useAuth();
  
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isCollaborative, setIsCollaborative] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Datos para miembros
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Cargar usuarios y roles
  useEffect(() => {
    loadUsersAndRoles();
  }, []);

  const loadUsersAndRoles = async () => {
    try {
      // Cargar usuarios
      const usersResponse = await fetch(`${API_URL}/api/users`);
      const usersData = await usersResponse.json();

      // Cargar roles
      const rolesResponse = await fetch(`${API_URL}/api/users/roles`);
      const rolesData = await rolesResponse.json();

      if (usersData.success && rolesData.success) {
        setUsers(usersData.data);
        setRoles(rolesData.data);
        
        // Filtrar usuarios disponibles (todos menos el actual)
        setAvailableUsers(
          usersData.data.filter((u: User) => u.id !== user?.id)
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Agregar miembro a la lista
  const addMember = () => {
    if (!selectedUserId || !selectedRoleId) {
      if (Platform.OS === 'web') {
        alert('Selecciona un usuario y un rol');
      } else {
        Alert.alert('Error', 'Selecciona un usuario y un rol');
      }
      return;
    }

    const selectedUser = users.find((u) => u.id === selectedUserId);
    const selectedRole = roles.find((r) => r.id === selectedRoleId);

    if (selectedUser && selectedRole) {
      setSelectedMembers([
        ...selectedMembers,
        {
          usuario: selectedUser,
          rol: selectedRole,
          usuario_id: selectedUser.id,
          rol_id: selectedRole.id,
        },
      ]);

      // Remover de usuarios disponibles
      setAvailableUsers(availableUsers.filter((u) => u.id !== selectedUserId));

      // Limpiar selección
      setSelectedUserId(null);
      setSelectedRoleId(null);
    }
  };

  // Remover miembro de la lista
  const removeMember = (index: number) => {
    const member = selectedMembers[index];
    setSelectedMembers(selectedMembers.filter((_, i) => i !== index));

    // Agregar de nuevo a usuarios disponibles
    setAvailableUsers([...availableUsers, member.usuario]);
  };

  // Crear proyecto
  const createProject = async () => {
    if (!projectName.trim()) {
      setError('El nombre del proyecto es requerido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Crear proyecto
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: projectName.trim(),
          descripcion: projectDescription.trim() || null,
          es_colaborativo: isCollaborative,
          usuario_id: user?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newProject = data.data;

        // Agregar miembros si es colaborativo
        if (isCollaborative && selectedMembers.length > 0) {
          for (const member of selectedMembers) {
            await fetch(`${API_URL}/api/projects/${newProject.id}/miembros`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                usuario_id: member.usuario_id,
                rol_id: member.rol_id,
              }),
            });
          }
        }

        // Volver al dashboard y recargar
        if (Platform.OS === 'web') {
          alert('Proyecto creado exitosamente');
        } else {
          Alert.alert('Éxito', 'Proyecto creado exitosamente');
        }
        
        // Usar replace para forzar recarga cuando vuelva
        router.replace('/(tabs)/projects');
      } else {
        setError(data.message || 'Error al crear el proyecto');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo Proyecto</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Nombre */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Título del Proyecto</Text>
          <TextInput
            style={styles.input}
            placeholder="Escribir un proyecto increíble"
            placeholderTextColor="#64748B"
            value={projectName}
            onChangeText={setProjectName}
          />
        </View>

        {/* Descripción */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe los detalles del proyecto..."
            placeholderTextColor="#64748B"
            value={projectDescription}
            onChangeText={setProjectDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Proyecto Colaborativo */}
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Proyecto Colaborativo</Text>
          <Switch
            value={isCollaborative}
            onValueChange={setIsCollaborative}
            trackColor={{ false: '#334155', true: '#3B82F6' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Miembros del equipo */}
        {isCollaborative && (
          <View style={styles.membersSection}>
            <Text style={styles.sectionTitle}>Miembros del Equipo</Text>

            {/* Selector de miembros */}
            <View style={styles.memberSelector}>
              <Text style={styles.label}>Agregar Miembro</Text>
              
              {/* Lista de usuarios disponibles */}
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Usuario:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {availableUsers.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[
                        styles.userChip,
                        selectedUserId === u.id && styles.userChipSelected,
                      ]}
                      onPress={() => setSelectedUserId(u.id)}
                    >
                      <View
                        style={[
                          styles.userAvatar,
                          { backgroundColor: u.color_avatar },
                        ]}
                      >
                        <Text style={styles.userInitials}>{u.iniciales}</Text>
                      </View>
                      <Text style={styles.userChipText}>{u.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Lista de roles */}
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Rol:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {roles
                    .filter((r) => r.nombre !== 'Propietario')
                    .map((r) => (
                      <TouchableOpacity
                        key={r.id}
                        style={[
                          styles.roleChip,
                          selectedRoleId === r.id && styles.roleChipSelected,
                        ]}
                        onPress={() => setSelectedRoleId(r.id)}
                      >
                        <Text style={styles.roleChipText}>{r.nombre}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={styles.addButton}
                onPress={addMember}
                disabled={!selectedUserId || !selectedRoleId}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>

            {/* Lista de miembros seleccionados */}
            {selectedMembers.length > 0 && (
              <View style={styles.selectedMembersContainer}>
                <Text style={styles.label}>Miembros Agregados:</Text>
                {selectedMembers.map((member, index) => (
                  <View key={index} style={styles.memberItem}>
                    <View style={styles.memberInfo}>
                      <View
                        style={[
                          styles.memberAvatar,
                          { backgroundColor: member.usuario.color_avatar },
                        ]}
                      >
                        <Text style={styles.memberInitials}>
                          {member.usuario.iniciales}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.memberName}>
                          {member.usuario.nombre}
                        </Text>
                        <Text style={styles.memberRole}>
                          {member.rol.nombre}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => removeMember(index)}>
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Error */}
        {error !== '' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Botones */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={createProject}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Crear Proyecto</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  membersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  memberSelector: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  pickerContainer: {
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  userChipSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userInitials: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userChipText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  roleChip: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleChipSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  roleChipText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  selectedMembersContainer: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 8,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitials: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memberRole: {
    fontSize: 12,
    color: '#94A3B8',
  },
  errorContainer: {
    backgroundColor: '#7F1D1D',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#FECACA',
    fontSize: 14,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: 16,
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