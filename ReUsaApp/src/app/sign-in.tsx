import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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

export default function SignInScreen() {
  const theme = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<any>(null);

  async function submit() {
    const found = validateCredentials({ email, password }, 'signIn');
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
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
              <ThemedText style={styles.logoEmoji}>♻️</ThemedText>
            </View>
            <ThemedText style={styles.brandTitle}>ReUsa</ThemedText>
            <ThemedText style={styles.brandSubtitle}>
              Economía Circular · Tecnológico de Antioquia
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
            <ThemedText type="smallBold" style={styles.cardHeader}>
              Iniciar Sesión
            </ThemedText>
            <ThemedText style={styles.cardSubtext}>
              Ingresa tus credenciales para donar y solicitar objetos universitarios.
            </ThemedText>

            <View style={styles.inputsGap}>
              <TextField
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
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            </View>

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
              title="Ingresar a la Plataforma"
              onPress={submit}
              loading={loading}
              icon="arrow-forward"
            />
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>¿Aún no tienes una cuenta?</ThemedText>
            <Link href="/sign-up" accessibilityRole="link">
              <ThemedText type="smallBold" style={[styles.registerLink, { color: theme.primary }]}>
                Regístrate aquí
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
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
    gap: Spacing.four,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  logoEmoji: {
    fontSize: 32,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
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
  cardHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtext: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: -4,
  },
  inputsGap: {
    gap: Spacing.two,
    marginTop: Spacing.one,
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
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
