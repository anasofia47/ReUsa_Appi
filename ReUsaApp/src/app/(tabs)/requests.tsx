import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@/components/button';
import { ConnectionBanner } from '@/components/connection-banner';
import { ItemCover } from '@/components/item-views';
import { RequestCard } from '@/components/request-card';
import { Screen } from '@/components/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/state-views';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useRequests } from '@/hooks/use-library-data';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { useData } from '@/providers/data-provider';
import { api } from '@/services/api';
import { describeError } from '@/services/api/client';
import type { Item, LocalRequest, RequestAction } from '@/types';

type Filter = 'open' | 'all';
type SupervisorTab = 'moderation' | 'requests';

export default function RequestsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { online, syncing, lastError, syncNow, transitionRequest, dismissRequest } = useData();
  const { requests, status } = useRequests();

  const isSupervisorOrAdmin = user?.role === 'supervisor' || user?.role === 'admin';

  // Si viene por parámetro tab=moderation o es supervisor, selecciona tab inicial
  const [supervisorTab, setSupervisorTab] = useState<SupervisorTab>(
    params.tab === 'requests' ? 'requests' : 'moderation',
  );

  useEffect(() => {
    if (params.tab === 'moderation') {
      setSupervisorTab('moderation');
    } else if (params.tab === 'requests') {
      setSupervisorTab('requests');
    }
  }, [params.tab]);

  const [filter, setFilter] = useState<Filter>('open');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Estado para moderación de publicaciones
  const [pendingItems, setPendingItems] = useState<Item[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<Item | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPendingItems = useCallback(async () => {
    if (!isSupervisorOrAdmin) return;
    setLoadingPending(true);
    try {
      const res = await api.get<{ items: Item[] }>('/api/items?status=pending_approval');
      setPendingItems(res.items || []);
    } catch {
      // Ignorar errores temporales
    } finally {
      setLoadingPending(false);
    }
  }, [isSupervisorOrAdmin]);

  useEffect(() => {
    if (isSupervisorOrAdmin) {
      void fetchPendingItems();
    }
  }, [isSupervisorOrAdmin, fetchPendingItems]);

  async function onApproveItem(item: Item) {
    setActionLoading(true);
    try {
      await api.patch(`/api/items/${item.id}/review`, { action: 'approve' });
      Alert.alert('¡Aprobado!', `"${item.title}" ya está visible en el catálogo de donaciones.`);
      setPendingItems((prev) => prev.filter((i) => i.id !== item.id));
      void syncNow();
    } catch (err) {
      Alert.alert('Error', describeError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function onConfirmReject() {
    if (!rejectingItem) return;
    setActionLoading(true);
    try {
      const reason = rejectionReason.trim() || 'No cumple con las normas de publicación de ReUsa.';
      await api.patch(`/api/items/${rejectingItem.id}/review`, {
        action: 'reject',
        reason,
      });
      Alert.alert('Objeto rechazado', `Se notificó al estudiante sobre el motivo del rechazo.`);
      setPendingItems((prev) => prev.filter((i) => i.id !== rejectingItem.id));
      setRejectingItem(null);
      setRejectionReason('');
      void syncNow();
    } catch (err) {
      Alert.alert('Error', describeError(err));
    } finally {
      setActionLoading(false);
    }
  }

  const visibleRequests =
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
          {isSupervisorOrAdmin ? 'Panel de Gestión y Moderación' : 'Mis Solicitudes y Entregas'}
        </ThemedText>
        <ConnectionBanner />

        {/* Pestañas de Supervisor: Moderar Publicaciones vs Solicitudes de Estudiantes */}
        {isSupervisorOrAdmin ? (
          <View style={styles.supervisorTabs}>
            <Pressable
              onPress={() => setSupervisorTab('moderation')}
              style={[
                styles.tabBtn,
                supervisorTab === 'moderation' && {
                  borderBottomColor: theme.primary,
                  borderBottomWidth: 3,
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={{
                  color: supervisorTab === 'moderation' ? theme.primary : theme.textSecondary,
                  fontSize: 14,
                }}>
                Aprobaciones ({pendingItems.length})
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setSupervisorTab('requests')}
              style={[
                styles.tabBtn,
                supervisorTab === 'requests' && {
                  borderBottomColor: theme.primary,
                  borderBottomWidth: 3,
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={{
                  color: supervisorTab === 'requests' ? theme.primary : theme.textSecondary,
                  fontSize: 14,
                }}>
                Solicitudes de Donación
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {/* Filtro secundario para lista de peticiones */}
        {(!isSupervisorOrAdmin || supervisorTab === 'requests') && (
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
        )}
      </View>

      {/* VISTA 1: Moderación de Publicaciones para Supervisor */}
      {isSupervisorOrAdmin && supervisorTab === 'moderation' ? (
        <FlatList
          data={pendingItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: BottomTabInset + Spacing.four }]}
          refreshControl={
            <RefreshControl
              refreshing={loadingPending}
              onRefresh={() => void fetchPendingItems()}
            />
          }
          ListEmptyComponent={
            loadingPending ? (
              <LoadingView message="Verificando publicaciones pendientes..." />
            ) : (
              <EmptyView
                title="¡Todo al día!"
                message="No hay publicaciones pendientes de revisión por moderación."
              />
            )
          }
          ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
          renderItem={({ item }) => (
            <View
              style={[
                styles.moderationCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}>
              <View style={styles.moderationRow}>
                <ItemCover item={item} width={100} height={100} />
                <View style={styles.itemMeta}>
                  <View style={styles.badgeRow}>
                    <View style={styles.pendingBadge}>
                      <ThemedText style={styles.pendingText}>Pendiente Moderación</ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.category}
                    </ThemedText>
                  </View>

                  <ThemedText type="smallBold" numberOfLines={2}>
                    {item.title}
                  </ThemedText>

                  <ThemedText type="small" themeColor="textSecondary">
                    Publicado por: {item.publisherName || 'Estudiante'}
                  </ThemedText>

                  <ThemedText type="small" themeColor="textSecondary">
                    Lugar: {item.deliveryPoint}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Estado: {item.condition}
                  </ThemedText>
                </View>
              </View>

              {item.description ? (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={3}
                  style={styles.desc}>
                  {item.description}
                </ThemedText>
              ) : null}

              <View style={styles.moderationActions}>
                <Button
                  title="✓ Aprobar Publicación"
                  variant="primary"
                  loading={actionLoading}
                  onPress={() => void onApproveItem(item)}
                />
                <Button
                  title="✕ Rechazar"
                  variant="danger"
                  loading={actionLoading}
                  onPress={() => {
                    setRejectingItem(item);
                    setRejectionReason('');
                  }}
                />
              </View>
            </View>
          )}
        />
      ) : (
        /* VISTA 2: Solicitudes de Donación entre estudiantes */
        <FlatList
          data={visibleRequests}
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
              refreshing={syncing && visibleRequests.length > 0}
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
      )}

      {/* Modal para ingresar motivo de rechazo */}
      <Modal
        visible={Boolean(rejectingItem)}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectingItem(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRejectingItem(null)}>
          <Pressable
            style={[
              styles.modalDialog,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle">Rechazar Publicación</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              Ingresa el motivo para notificar al estudiante por qué su publicación de &quot;
              {rejectingItem?.title}&quot; no fue aprobada:
            </ThemedText>

            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Ej. La fotografía está borrosa, objeto no permitido..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
              style={[
                styles.reasonInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="secondary"
                onPress={() => setRejectingItem(null)}
              />
              <Button
                title="Confirmar Rechazo"
                variant="danger"
                loading={actionLoading}
                onPress={() => void onConfirmReject()}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.two, paddingTop: Spacing.two, paddingBottom: Spacing.two },
  supervisorTabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
    marginTop: Spacing.one,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
  },
  list: { flexGrow: 1, paddingTop: Spacing.two },
  moderationCard: {
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    gap: Spacing.two,
  },
  moderationRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  itemMeta: {
    flex: 1,
    gap: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '700',
  },
  desc: {
    marginTop: Spacing.one,
    lineHeight: 18,
  },
  moderationActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalDialog: {
    padding: Spacing.four,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.three,
  },
  reasonInput: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
