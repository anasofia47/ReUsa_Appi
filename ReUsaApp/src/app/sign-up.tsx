import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            Crear cuenta
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Únete a la comunidad de economía circular universitaria ReUsa.
          </ThemedText>

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
            label="Correo institucional / personal"
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

          {/* Formulario Sexo (Requisito explícito de la entrega) */}
          <View style={styles.section}>
            <ThemedText type="smallBold">Sexo</ThemedText>
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
                        backgroundColor: selected ? theme.primary : 'transparent',
                      },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{
                        color: selected ? theme.onPrimary : theme.text,
                        textTransform: 'capitalize',
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
            <ThemedText type="smallBold">Rol en la plataforma</ThemedText>
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
                        backgroundColor: selected ? theme.primary : 'transparent',
                      },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: selected ? theme.onPrimary : theme.text }}>
                      {r === 'student' ? 'Estudiante' : 'Supervisor'}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {role === 'supervisor' ? (
            <TextField
              label="Clave secreta de supervisor"
              value={supervisorSecret}
              onChangeText={setSupervisorSecret}
              placeholder="Ingresa la clave de supervisor"
              secureTextEntry
            />
          ) : null}

          {formError ? (
            <ThemedText accessibilityRole="alert" style={{ color: theme.danger }}>
              {formError}
            </ThemedText>
          ) : null}

          <Button title="Crear cuenta" onPress={submit} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: {
    flexGrow: 1,
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  title: { fontSize: 32, lineHeight: 38 },
  section: { gap: Spacing.one },
  chipsRow: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
