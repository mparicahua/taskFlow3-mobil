import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    // Aquí irá la lógica de login más adelante
    console.log('Login pressed', { email, password, rememberMe });
  };

  const handleGoogleLogin = () => {
    // Aquí irá la lógica de Google login más adelante
    console.log('Google login pressed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Settings Icon */}
          <View style={styles.headerContainer}>
            <TouchableOpacity style={styles.settingsButton}>
              <Ionicons name="settings-outline" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Bienvenido de vuelta</Text>
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>¿No tienes una cuenta? </Text>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Regístrate gratis</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Google Button */}
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
            <Ionicons name="logo-google" size={20} color="#FFFFFF" />
            <Text style={styles.googleButtonText}>Continuar con Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>O continúa con</Text>
            <View style={styles.divider} />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@ejemplo.com"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me & Forgot Password */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.rememberMeText}>Recordarme</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>

          {/* Dashboard Link */}
          <Link href="/(tabs)" asChild>
            <TouchableOpacity style={styles.dashboardButton}>
              <Text style={styles.dashboardButtonText}>Dashboard</Text>
            </TouchableOpacity>
          </Link>

          {/* Terms and Privacy */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>Al continuar, aceptas nuestros </Text>
            <TouchableOpacity>
              <Text style={styles.termsLink}>Términos de Servicio</Text>
            </TouchableOpacity>
            <Text style={styles.termsText}> y </Text>
            <TouchableOpacity>
              <Text style={styles.termsLink}>Política de Privacidad</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  settingsButton: {
    padding: 8,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  registerLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 14,
    marginHorizontal: 16,
  },
  inputContainer: {
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  eyeIcon: {
    paddingHorizontal: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#F1F5F9',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dashboardButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  dashboardButtonText: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    color: '#64748B',
  },
  termsLink: {
    fontSize: 12,
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
});