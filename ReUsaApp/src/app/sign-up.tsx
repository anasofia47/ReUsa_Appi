import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { describeError } from '@/services/api/client';
import { validateCredentials } from '@/services/auth/auth-service';
import type { Role, Sex } from '@/types';

export default function SignUpScreen() {
  const theme = useTheme();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sex, setSex] = useState<Sex>('otro');
  const [role, setRole] = useState<Role>('student');
  const [supervisorSecret, setSupervisorSecret] = useState('');

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    sex?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);

  async function submit() {
    const found = validateCredentials({ name, email, password, sex }, 'signUp');
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      await signUp(name, email, password, sex, role, supervisorSecret || undefined);
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* ── Brand Header ── */}
          <View style={styles.header}>
            <View style={[styles.logoBadge, { backgroundColor: theme.primary + '18' }]}>
              <ThemedText style={styles.logoEmoji}>🌱</ThemedText>
            </View>
            <ThemedText style={styles.brandTitle}>Crear Cuenta</ThemedText>
            <ThemedText style={styles.brandSubtitle}>
              Únete a la economía circular del Tecnológico de Antioquia
            </ThemedText>
          </View>

          {/* ── Form Card ── */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}>
            <View style={styles.inputsGap}>
              <TextField
                label="Nombre completo"
                value={name}
                onChangeText={setName}
                error={errors.name}
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />

              <TextField
                ref={emailRef}
                label="Correo Institucional / Personal"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <TextField
                ref={passwordRef}
                label="Contraseña (mínimo 6 caracteres)"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
              />
            </View>

            {/* Selector de Sexo */}
            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.sectionLabel}>
                Sexo
              </ThemedText>
              <View style={styles.chipsRow}>
                {(['masculino', 'femenino', 'otro'] as const).map((s) => {
                  const selected = sex === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setSex(s)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? theme.primary : theme.border,
                          backgroundColor: selected ? theme.primary : '#F8FAFC',
                        },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={{
                          color: selected ? theme.onPrimary : '#475569',
                          textTransform: 'capitalize',
                          fontSize: 13,
                        }}>
                        {s}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              {errors.sex ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {errors.sex}
                </ThemedText>
              ) : null}
            </View>

            {/* Selector de Rol */}
            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.sectionLabel}>
                Rol en la Plataforma
              </ThemedText>
              <View style={styles.chipsRow}>
                {(['student', 'supervisor'] as const).map((r) => {
                  const selected = role === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setRole(r)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? theme.primary : theme.border,
                          backgroundColor: selected ? theme.primary : '#F8FAFC',
                        },
                      ]}>
                      <Ionicons
                        name={r === 'student' ? 'school-outline' : 'shield-checkmark-outline'}
                        size={15}
                        color={selected ? theme.onPrimary : '#475569'}
                      />
                      <ThemedText
                        type="smallBold"
                        style={{
                          color: selected ? theme.onPrimary : '#475569',
                          fontSize: 13,
                        }}>
                        {r === 'student' ? 'Estudiante' : 'Supervisor'}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {role === 'supervisor' ? (
              <TextField
                label="Clave Secreta de Supervisor"
                value={supervisorSecret}
                onChangeText={setSupervisorSecret}
                placeholder="Ingresa la clave autorizada"
                secureTextEntry
              />
            ) : null}

            {formError ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: theme.danger + '12', borderColor: theme.danger + '35' },
                ]}>
                <Ionicons name="alert-circle" size={16} color={theme.danger} />
                <ThemedText
                  accessibilityRole="alert"
                  style={[styles.errorText, { color: theme.danger }]}>
                  {formError}
                </ThemedText>
              </View>
            ) : null}

            <Button
              title="Registrarme en ReUsa"
              onPress={submit}
              loading={loading}
              icon="checkmark-circle-outline"
            />
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>¿Ya tienes una cuenta?</ThemedText>
            <Link href="/sign-in" accessibilityRole="link">
              <ThemedText type="smallBold" style={[styles.loginLink, { color: theme.primary }]}>
                Inicia sesión aquí
              </ThemedText>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.four,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  logoEmoji: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    padding: Spacing.five,
    borderRadius: 24,
    borderWidth: 1,
    gap: Spacing.three,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  inputsGap: {
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.one,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#334155',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
