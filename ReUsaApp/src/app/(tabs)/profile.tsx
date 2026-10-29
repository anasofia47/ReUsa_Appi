import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import type { ActivityEntry } from '@/db/repositories';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/text';
import { useAuth } from '@/providers/auth-provider';
import { useData } from '@/providers/data-provider';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const { repos, online, syncing, lastSyncAt, lastError, pendingCount, dataVersion, syncNow } =
    useData();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    let active = true;
    repos.activity.recent(15).then((rows) => active && setActivity(rows));
    return () => {
      active = false;
    };
  }, [repos, dataVersion]);

  function confirmSignOut() {
    const warning =
      pendingCount > 0
        ? `Tienes ${pendingCount} solicitud(es) sin enviar que se perderán si cierras sesión ahora. `
        : '';
    Alert.alert('Cerrar sesión', `${warning}¿Quieres continuar?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  const roleLabel =
    user?.role === 'admin'
      ? 'Administrador'
      : user?.role === 'supervisor'
        ? 'Supervisor'
        : 'Estudiante';

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.six }]}>
        <ThemedText type="subtitle" accessibilityRole="header">
          Mi Perfil
        </ThemedText>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" style={{ fontSize: 18 }}>
            {user?.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{user?.email}</ThemedText>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            Rol: {roleLabel}
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">Estado de Sincronización</ThemedText>
          <ThemedText type="small">Conexión: {online ? 'En línea' : 'Sin conexión'}</ThemedText>
          <ThemedText type="small">Última sincronización: {formatDateTime(lastSyncAt)}</ThemedText>
          <ThemedText type="small">Cambios pendientes de enviar: {pendingCount}</ThemedText>
          {lastError ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {lastError}
            </ThemedText>
          ) : null}
          <Button
            title={syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
            variant="secondary"
            loading={syncing}
            onPress={() => void syncNow()}
          />
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">Actividad reciente (Trazabilidad)</ThemedText>
          {activity.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Sin actividad registrada en este dispositivo.
            </ThemedText>
          ) : (
            activity.map((a) => (
              <ThemedText key={a.id} type="small" themeColor="textSecondary">
                {formatDateTime(a.createdAt)} · {a.kind} · {a.detail}
              </ThemedText>
            ))
          )}
        </View>

        <Button title="Cerrar sesión" variant="danger" onPress={confirmSignOut} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingTop: Spacing.two },
  card: { padding: Spacing.three, borderRadius: 14, gap: Spacing.one },
});
