import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
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

// Contenido del archivo RDF/TTL
const RDF_CONTENT = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix tf: <http://ucsp.edu.pe/ontologies/taskflow3#> .
tf:Proyecto     tf:contieneLista        tf:Lista .
tf:Lista        tf:contieneTarea        tf:Tarea .
tf:Tarea        tf:perteneceALista      tf:Lista .
tf:Usuario      tf:creaProyecto         tf:Proyecto .
tf:Usuario      tf:participaEn          tf:Proyecto .
tf:Tarea        tf:asignadoA            tf:Usuario .
tf:Usuario      tf:tieneAsignacion      tf:AsignacionRol .
tf:AsignacionRol tf:desempeniaRol       tf:Rol .
tf:AsignacionRol tf:enProyecto          tf:Proyecto .
tf:Tarea        tf:tieneEtiqueta        tf:Etiqueta .`;

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [downloading, setDownloading] = useState(false);

  // Colores dinámicos basados en el tema
  const colors = {
    background: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    border: isDark ? '#334155' : '#E2E8F0',
    text: isDark ? '#F1F5F9' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    accentHover: '#2563EB',
  };

  // Función para descargar el archivo RDF
  const downloadRDF = async () => {
    setDownloading(true);
    
    try {
      if (Platform.OS === 'web') {
        // En web, crear un blob y descargarlo
        const blob = new Blob([RDF_CONTENT], { type: 'text/turtle' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'taskflow3.ttl';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('¡Archivo RDF descargado!');
      } else {
        // En móvil, usar la nueva API con File y Paths
        const file = new File(Paths.document, 'taskflow3.ttl');
        
        // Escribir el contenido usando la nueva API
        await file.write(RDF_CONTENT);
        
        // Mostrar mensaje antes de compartir
        Alert.alert(
          'Archivo Creado',
          'El archivo se guardó temporalmente. Ahora puedes:\n\n• Guardarlo en "Archivos"\n• Compartirlo por WhatsApp/Email\n• Subirlo a Drive/iCloud',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
            },
            {
              text: 'Guardar/Compartir',
              onPress: async () => {
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                  await Sharing.shareAsync(file.uri, {
                    dialogTitle: 'Guardar archivo RDF',
                    UTI: 'public.plain-text', // Para iOS
                  });
                } else {
                  Alert.alert('Info', 'Archivo guardado internamente en: ' + file.uri);
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error downloading RDF:', error);
      Alert.alert('Error', 'No se pudo crear el archivo: ' + (error as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View style={styles.heroContainer}>
        <View style={[styles.logoContainer, { backgroundColor: colors.accent }]}>
          <Ionicons name="document-text" size={40} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          TaskFlow3
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Gestión de tareas simple y efectiva
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNumber, { color: colors.text }]}>100%</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gratuito</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNumber, { color: colors.text }]}>3min</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Para empezar</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNumber, { color: colors.text }]}>∞</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Proyectos</Text>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Características principales
        </Text>
        
        <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.featureIcon, { backgroundColor: colors.accent }]}>
            <Ionicons name="flash" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Súper Rápido</Text>
            <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
              Interfaz intuitiva sin curvas de aprendizaje
            </Text>
          </View>
        </View>

        <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.featureIcon, { backgroundColor: colors.accent }]}>
            <Ionicons name="people" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Colaborativo</Text>
            <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
              Trabaja en equipo de forma eficiente
            </Text>
          </View>
        </View>

        <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.featureIcon, { backgroundColor: colors.accent }]}>
            <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Seguro</Text>
            <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
              Tus datos están protegidos
            </Text>
          </View>
        </View>
      </View>

      {/* RDF Download Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Ontología RDF
        </Text>
        <View style={[styles.rdfCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.rdfContent}>
            <Ionicons name="download-outline" size={32} color={colors.accent} />
            <Text style={[styles.rdfTitle, { color: colors.text }]}>
              Archivo de Ontología
            </Text>
            <Text style={[styles.rdfDescription, { color: colors.textSecondary }]}>
              Descarga la ontología RDF/TTL del proyecto TaskFlow3
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.downloadButton,
              { backgroundColor: colors.accent },
              downloading && styles.downloadButtonDisabled
            ]}
            onPress={downloadRDF}
            disabled={downloading}
          >
            <Ionicons 
              name={downloading ? "hourglass-outline" : "download-outline"} 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.downloadButtonText}>
              {downloading ? 'Descargando...' : 'Descargar RDF'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Project Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>
          Proyecto Académico
        </Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Universidad Católica San Pablo
        </Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Desarrollo Basado en Plataformas
        </Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Semestre 2025-2
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
  },
  rdfCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  rdfContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  rdfTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  rdfDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
});