import { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { ConnectionBanner } from '@/components/connection-banner';
import { RequestCard } from '@/components/request-card';
import { Screen } from '@/components/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/state-views';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useRequests } from '@/hooks/use-library-data';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { useData } from '@/providers/data-provider';
import { describeError } from '@/services/api/client';
import type { LocalRequest, RequestAction } from '@/types';

type Filter = 'open' | 'all';

export default function RequestsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { online, syncing, lastError, syncNow, transitionRequest, dismissRequest } = useData();
  const { requests, status } = useRequests();

  const isSupervisorOrAdmin = user?.role === 'supervisor' || user?.role === 'admin';
  const [filter, setFilter] = useState<Filter>('open');
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible =
    filter === 'open'
      ? requests.filter((r) => r.status === 'requested' || r.status === 'approved')
      : requests;

  async function onAction(req: LocalRequest, action: RequestAction) {
    setBusyId(req.id);
    try {
      await transitionRequest(req.id, action);
    } catch (err) {
      Alert.alert('No se pudo completar la acción', describeError(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle" accessibilityRole="header">
          {isSupervisorOrAdmin ? 'Gestión de Solicitudes' : 'Mis Solicitudes y Entregas'}
        </ThemedText>
        <ConnectionBanner />

        <View style={styles.filters}>
          {(['open', 'all'] as const).map((f) => {
            const selected = f === filter;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                accessibilityRole="button"
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
                  {f === 'open' ? 'Pendientes / En curso' : 'Todas'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            isPublisher={item.publisherId === user?.uid || isSupervisorOrAdmin}
            online={online}
            busy={busyId === item.id}
            onAction={onAction}
            onDismiss={(r) => void dismissRequest(r.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        contentContainerStyle={[styles.list, { paddingBottom: BottomTabInset + Spacing.four }]}
        refreshControl={
          <RefreshControl
            refreshing={syncing && visible.length > 0}
            onRefresh={() => void syncNow()}
          />
        }
        ListEmptyComponent={
          status === 'loading' ? (
            <LoadingView message="Cargando solicitudes…" />
          ) : status === 'error' ? (
            <ErrorView message={lastError ?? 'Error desconocido'} onRetry={() => void syncNow()} />
          ) : (
            <EmptyView
              title={filter === 'open' ? 'Sin solicitudes pendientes' : 'Aún no hay solicitudes'}
              message="Cuando solicites o recibas peticiones de donación aparecerán aquí."
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.two, paddingTop: Spacing.two, paddingBottom: Spacing.two },
  filters: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
  },
  list: { flexGrow: 1 },
});
