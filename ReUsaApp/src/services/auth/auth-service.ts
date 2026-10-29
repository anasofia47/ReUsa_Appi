import type { ApiClient } from '@/services/api/client';
import type { AuthResult, Role, Sex, User } from '@/types';
import type { SessionManager } from './session-manager';

export interface CredentialsInput {
  name?: string;
  email: string;
  password: string;
  role?: Role;
  sex?: Sex;
  supervisorSecret?: string;
}

/** Validación en el cliente: mejora la experiencia, pero la API vuelve a validar todo. */
export function validateCredentials(
  input: CredentialsInput,
  mode: 'signIn' | 'signUp',
) {
  const errors: { name?: string; email?: string; password?: string; sex?: string } = {};

  if (mode === 'signUp') {
    if ((input.name ?? '').trim().length < 2) {
      errors.name = 'Escribe tu nombre (mínimo 2 letras)';
    }
    if (!input.sex) {
      errors.sex = 'Selecciona tu sexo';
    }
  }

  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) {
    errors.email = 'Escribe un correo válido';
  }

  if (mode === 'signUp' ? input.password.length < 6 : input.password.length === 0) {
    errors.password =
      mode === 'signUp'
        ? 'La contraseña debe tener al menos 6 caracteres'
        : 'Escribe tu contraseña';
  }

  return errors;
}

export function createAuthService(publicApi: Pick<ApiClient, 'post'>, session: SessionManager) {
  return {
    async signIn(email: string, password: string): Promise<User> {
      const result = await publicApi.post<AuthResult>(
        '/api/auth/login',
        { email: email.trim(), password },
        { auth: false },
      );
      await session.save(result);
      return result.user;
    },

    async signUp(
      name: string,
      email: string,
      password: string,
      sex?: Sex,
      role: Role = 'student',
      supervisorSecret?: string,
    ): Promise<User> {
      const result = await publicApi.post<AuthResult>(
        '/api/auth/register',
        {
          displayName: name.trim(),
          email: email.trim(),
          password,
          sex,
          role,
          supervisorSecret,
        },
        { auth: false },
      );
      await session.save(result);
      return result.user;
    },

    signOut: () => session.clear(),
  };
}
