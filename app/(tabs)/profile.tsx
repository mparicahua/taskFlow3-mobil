import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';

export default function ProfileScreen() {
  const { user, logout, logoutAll } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Colores dinámicos basados en el tema
  const colors = {
    background: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    border: isDark ? '#334155' : '#E2E8F0',
    text: isDark ? '#F1F5F9' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    danger: '#EF4444',
    warning: '#F59E0B',
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro que deseas cerrar sesión?');
      if (confirmed) {
        logout().catch((error) => {
          alert('No se pudo cerrar sesión');
          console.error('Logout error:', error);
        });
      }
    } else {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro que deseas cerrar sesión en este dispositivo?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Cerrar Sesión',
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
              } catch (error) {
                Alert.alert('Error', 'No se pudo cerrar sesión');
              }
            },
          },
        ]
      );
    }
  };

  const handleLogoutAll = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        '¿Estás seguro que deseas cerrar sesión en TODOS los dispositivos?'
      );
      if (confirmed) {
        logoutAll().catch((error) => {
          alert('No se pudo cerrar sesión');
          console.error('Logout all error:', error);
        });
      }
    } else {
      Alert.alert(
        'Cerrar Sesión en Todos los Dispositivos',
        'Esto cerrará tu sesión en todos los dispositivos donde hayas iniciado sesión. ¿Estás seguro?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Cerrar en Todos',
            style: 'destructive',
            onPress: async () => {
              try {
                await logoutAll();
              } catch (error) {
                Alert.alert('Error', 'No se pudo cerrar sesión');
              }
            },
          },
        ]
      );
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header con Avatar */}
      <View style={styles.header}>
        <View 
          style={[
            styles.avatarContainer, 
            { backgroundColor: user?.color_avatar || '#3B82F6' }
          ]}
        >
          <Text style={styles.avatarText}>
            {user?.iniciales || 'U'}
          </Text>
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>
          {user?.nombre || 'Usuario'}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          {user?.email || 'email@ejemplo.com'}
        </Text>
      </View>

      {/* Información de la Cuenta */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Información de la Cuenta
        </Text>
        
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="person-outline" size={20} color={colors.accent} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Nombre
              </Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.nombre || '-'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.accent} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Email
              </Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
              {user?.email || '-'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="id-card-outline" size={20} color={colors.accent} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                ID de Usuario
              </Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              #{user?.id || '-'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="color-palette-outline" size={20} color={colors.accent} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Color de Avatar
              </Text>
            </View>
            <View style={styles.colorPreviewContainer}>
              <View 
                style={[
                  styles.colorPreview, 
                  { backgroundColor: user?.color_avatar || '#3B82F6' }
                ]} 
              />
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {user?.color_avatar || '-'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Preferencias */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Preferencias
        </Text>
        
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons 
                name={isDark ? "moon" : "sunny"} 
                size={20} 
                color={colors.accent} 
              />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Tema
              </Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {isDark ? 'Oscuro' : 'Claro'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.accent} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Plataforma
              </Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {Platform.OS === 'web' ? 'Web' : Platform.OS === 'ios' ? 'iOS' : 'Android'}
            </Text>
          </View>
        </View>
      </View>

      {/* Estadísticas */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Estadísticas
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="folder-outline" size={28} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.text }]}>-</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Proyectos</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle-outline" size={28} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.text }]}>-</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completadas</Text>
          </View>
        </View>
      </View>

      {/* Seguridad */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Seguridad
        </Text>

        {/* Info JWT */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.securityInfo}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.accent} />
            <View style={styles.securityTextContainer}>
              <Text style={[styles.securityTitle, { color: colors.text }]}>
                Sesión Protegida con JWT
              </Text>
              <Text style={[styles.securityDescription, { color: colors.textSecondary }]}>
                Tu sesión está protegida con tokens de autenticación seguros
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Botones de Cerrar Sesión */}
      <View style={styles.section}>
        {/* Cerrar sesión en este dispositivo */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.danger }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        {/* Cerrar sesión en todos los dispositivos */}
        <TouchableOpacity
          style={[styles.logoutAllButton, { backgroundColor: colors.warning }]}
          onPress={handleLogoutAll}
          activeOpacity={0.8}
        >
          <Ionicons name="warning-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logoutAllButtonText}>Cerrar Sesión en Todos los Dispositivos</Text>
        </TouchableOpacity>

        <Text style={[styles.logoutHint, { color: colors.textSecondary }]}>
          "Cerrar sesión" solo cierra tu sesión en este dispositivo.{'\n'}
          "Cerrar en todos" cierra tu sesión en todos los dispositivos.
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          TaskFlow3 v1.0.0
        </Text>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Universidad Católica San Pablo
        </Text>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          🔐 Autenticación JWT Habilitada
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  colorPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  divider: {
    height: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  securityTextContainer: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  logoutAllButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutHint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    marginBottom: 4,
  },
});