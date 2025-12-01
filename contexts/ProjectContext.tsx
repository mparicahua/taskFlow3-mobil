import React, { createContext, useContext, useEffect, useState } from 'react';

import { projectsAPI } from '@/services/api';
import { socketService } from '@/services/socket';

// ==================== TIPOS ====================
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

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
  fetchProjects: (userId: number) => Promise<void>;
  createProject: (projectData: any) => Promise<{ success: boolean; data?: any }>;
  updateProject: (projectId: number, projectData: any) => Promise<{ success: boolean; data?: any }>;
  deleteProject: (projectId: number, userId: number) => Promise<{ success: boolean }>;
  clearProjects: () => void;
}

// ==================== CONTEXT ====================
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenersSetup, setListenersSetup] = useState(false);

  // ==================== SOCKET LISTENERS ====================
  const setupSocketListeners = () => {
    if (listenersSetup) {
      console.log('⚠️ Listeners ya configurados, saltando...');
      return;
    }

    console.log('🎧 Configurando listeners de Socket en ProjectContext');

    // ✨ AGREGAR ESTAS 7 LÍNEAS NUEVAS
    socketService.removeAllListeners('project:created');
    socketService.removeAllListeners('project:updated');
    socketService.removeAllListeners('project:deleted');
    socketService.removeAllListeners('project:member:added');
    socketService.removeAllListeners('project:member:removed');
    socketService.removeAllListeners('project:joined');
    socketService.removeAllListeners('project:left');

    // Proyecto creado
    socketService.on('project:created', (data: any) => {
      console.log('📩 [CONTEXT] Proyecto creado recibido:', data);
      
      setProjects((prev) => {
        const existe = prev.find((p) => p.id === data.project.id);
        if (!existe) {
          console.log('✅ [CONTEXT] Proyecto agregado a la lista');
          return [data.project, ...prev];
        } else {
          console.log('⚠️ [CONTEXT] Proyecto ya existe, ignorando');
          return prev;
        }
      });
    });

    // Proyecto actualizado
    socketService.on('project:updated', (data: any) => {
      console.log('📩 [CONTEXT] Proyecto actualizado recibido:', data);
      
      setProjects((prev) =>
        prev.map((p) => (p.id === data.project.id ? { ...p, ...data.project } : p))
      );
      console.log('✅ [CONTEXT] Proyecto actualizado en la lista');
    });

    // Proyecto eliminado
    socketService.on('project:deleted', (data: any) => {
      console.log('📩 [CONTEXT] Proyecto eliminado recibido:', data);
      
      setProjects((prev) => prev.filter((p) => p.id !== data.projectId));
      console.log('✅ [CONTEXT] Proyecto eliminado de la lista');
    });

    // Miembro agregado
    socketService.on('project:member:added', (data: any) => {
      console.log('📩 [CONTEXT] Miembro agregado recibido:', data);
      
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === data.projectId) {
            const existe = p.proyecto_usuario_rol?.find(
              (m) => m.usuario.id === data.member.usuario.id
            );
            if (!existe) {
              return {
                ...p,
                proyecto_usuario_rol: [...(p.proyecto_usuario_rol || []), data.member],
              };
            }
          }
          return p;
        })
      );
      console.log('✅ [CONTEXT] Miembro agregado al proyecto');
    });

    // Miembro removido
    socketService.on('project:member:removed', (data: any) => {
      console.log('📩 [CONTEXT] Miembro removido recibido:', data);
      
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === data.projectId && p.proyecto_usuario_rol) {
            return {
              ...p,
              proyecto_usuario_rol: p.proyecto_usuario_rol.filter(
                (m) => m.usuario.id !== data.userId
              ),
            };
          }
          return p;
        })
      );
      console.log('✅ [CONTEXT] Miembro removido del proyecto');
    });

    // Te uniste a un proyecto
    socketService.on('project:joined', (data: any) => {
      console.log('📩 [CONTEXT] Te uniste a un proyecto:', data);
      
      // Recargar proyectos para obtener el nuevo
      const userStr = localStorage.getItem('user_data') || sessionStorage.getItem('user_data');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (projects.length > 0) {
          fetchProjects(user.id);
        }
      }
    });

    // Te removieron de un proyecto
    socketService.on('project:left', (data: any) => {
      console.log('📩 [CONTEXT] Te removieron de un proyecto:', data);
      setProjects((prev) => prev.filter((p) => p.id !== data.projectId));
    });

    setListenersSetup(true);
    console.log('✅ [CONTEXT] Listeners configurados correctamente');
  };

  // ==================== FETCH PROJECTS ====================
  const fetchProjects = async (userId: number) => {
    setLoading(true);
    setError(null);

    try {
      const data = await projectsAPI.getByUser(userId);

      if (data.success) {
        setProjects(data.data);
        console.log(`📦 [CONTEXT] ${data.data.length} proyectos cargados`);
      } else {
        throw new Error(data.message || 'Error al cargar proyectos');
      }
    } catch (err: any) {
      console.error('❌ [CONTEXT] Error al cargar proyectos:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ==================== CREATE PROJECT ====================
  const createProject = async (projectData: any) => {
    try {
      const data = await projectsAPI.create(projectData);

      if (data.success) {
        // Optimistic update
        setProjects((prev) => {
          const existe = prev.find((p) => p.id === data.data.id);
          if (!existe) {
            console.log('✅ [CONTEXT] Proyecto creado localmente (optimistic)');
            return [data.data, ...prev];
          }
          return prev;
        });

        return { success: true, data: data.data };
      } else {
        throw new Error(data.message || 'Error al crear proyecto');
      }
    } catch (err: any) {
      console.error('❌ [CONTEXT] Error al crear proyecto:', err);
      throw err;
    }
  };

  // ==================== UPDATE PROJECT ====================
  const updateProject = async (projectId: number, projectData: any) => {
    try {
      const data = await projectsAPI.update(projectId, projectData);

      if (data.success) {
        // Optimistic update
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, ...data.data } : p))
        );
        console.log('✅ [CONTEXT] Proyecto actualizado localmente (optimistic)');

        return { success: true, data: data.data };
      } else {
        throw new Error(data.message || 'Error al actualizar proyecto');
      }
    } catch (err: any) {
      console.error('❌ [CONTEXT] Error al actualizar proyecto:', err);
      throw err;
    }
  };

  // ==================== DELETE PROJECT ====================
  const deleteProject = async (projectId: number, userId: number) => {
    try {
      const data = await projectsAPI.delete(projectId, userId);

      if (data.success) {
        // Optimistic update
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        console.log('✅ [CONTEXT] Proyecto eliminado localmente (optimistic)');

        return { success: true };
      } else {
        throw new Error(data.message || 'Error al eliminar proyecto');
      }
    } catch (err: any) {
      console.error('❌ [CONTEXT] Error al eliminar proyecto:', err);
      throw err;
    }
  };

  // ==================== CLEAR PROJECTS ====================
  const clearProjects = () => {
    console.log('🧹 Limpiando proyectos y listeners...');
    
    // ✨ AGREGAR ESTAS 7 LÍNEAS
    socketService.removeAllListeners('project:created');
    socketService.removeAllListeners('project:updated');
    socketService.removeAllListeners('project:deleted');
    socketService.removeAllListeners('project:member:added');
    socketService.removeAllListeners('project:member:removed');
    socketService.removeAllListeners('project:joined');
    socketService.removeAllListeners('project:left');
    
    setProjects([]);
    setError(null);
    setListenersSetup(false);
    };

  // ==================== CONTEXT VALUE ====================
  const value = {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    clearProjects,
  };

  // ==================== EXPONER setupSocketListeners ====================
  // Para que AuthContext pueda llamarlo
  useEffect(() => {
    (ProjectProvider as any).setupListeners = setupSocketListeners;
  }, [listenersSetup]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

// ==================== HOOK ====================
export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}

// Exportar la función para uso externo
export const setupProjectListeners = () => {
  if ((ProjectProvider as any).setupListeners) {
    (ProjectProvider as any).setupListeners();
  }
};