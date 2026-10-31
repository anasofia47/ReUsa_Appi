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
type StudentTab = 'received' | 'sent';

export default function RequestsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { online, syncing, lastError, syncNow, transitionRequest, dismissRequest } = useData();
  const { requests, status } = useRequests();

  const isSupervisorOrAdmin = user?.role === 'supervisor' || user?.role === 'admin';

  // Supervisor tabs
  const [supervisorTab, setSupervisorTab] = useState<SupervisorTab>(
    params.tab === 'requests' ? 'requests' : 'moderation',
  );

  // Student tabs: Peticiones recibidas (para aceptar/rechazar) vs Mis solicitudes enviadas
  const [studentTab, setStudentTab] = useState<StudentTab>('received');

  useEffect(() => {
    if (params.tab === 'moderation') {
      setSupervisorTab('moderation');
    } else if (params.tab === 'requests') {
      setSupervisorTab('requests');
      setStudentTab('received');
    }
  }, [params.tab]);

  const [filter, setFilter] = useState<Filter>('open');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Estado para moderación de publicaciones (Supervisor)
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
      // Silenciar errores temporales
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

  // Filtrado de solicitudes para estudiantes
  const receivedRequests = requests.filter((r) => r.publisherId === user?.uid);
  const sentRequests = requests.filter((r) => r.publisherId !== user?.uid);
  const pendingReceivedCount = receivedRequests.filter((r) => r.status === 'requested').length;

  const currentStudentList = studentTab === 'received' ? receivedRequests : sentRequests;
  const visibleStudentRequests =
    filter === 'open'
      ? currentStudentList.filter((r) => r.status === 'requested' || r.status === 'approved')
      : currentStudentList;

  const visibleSupervisorRequests =
    filter === 'open'
      ? requests.filter((r) => r.status === 'requested' || r.status === 'approved')
      : requests;

  const visibleList = isSupervisorOrAdmin ? visibleSupervisorRequests : visibleStudentRequests;

  async function onAction(req: LocalRequest, action: RequestAction) {
    setBusyId(req.id);
    try {
      await transitionRequest(req.id, action);
      if (action === 'approve') {
        Alert.alert(
          'Solicitud aceptada',
          'Has confirmado la donación a este estudiante. Las demás solicitudes pendientes de este objeto se cancelaron automáticamente.',
        );
      } else if (action === 'deliver') {
        Alert.alert('¡Entrega realizada!', 'El objeto fue entregado y retirado del catálogo.');
      }
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
          {isSupervisorOrAdmin ? 'Panel de Gestión y Moderación' : 'Peticiones y Entregas'}
        </ThemedText>
        <ConnectionBanner />

        {/* Pestañas de Supervisor */}
        {isSupervisorOrAdmin ? (
          <View style={[styles.tabRow, { backgroundColor: theme.border + '60' }]}>
            <Pressable
              onPress={() => setSupervisorTab('moderation')}
              style={[
                styles.tabBtn,
                supervisorTab === 'moderation' && [
                  styles.tabBtnActive,
                  { backgroundColor: theme.backgroundElement },
                ],
              ]}>
              <ThemedText
                type="smallBold"
                style={{
                  color: supervisorTab === 'moderation' ? theme.primary : theme.textSecondary,
                  fontSize: 13,
                  fontWeight: supervisorTab === 'moderation' ? '700' : '500',
                }}>
                Aprobaciones ({pendingItems.length})
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setSupervisorTab('requests')}
              style={[
                styles.tabBtn,
                supervisorTab === 'requests' && [
                  styles.tabBtnActive,
                  { backgroundColor: theme.backgroundElement },
                ],
              ]}>
              <ThemedText
                type="smallBold"
                style={{
                  color: supervisorTab === 'requests' ? theme.primary : theme.textSecondary,
                  fontSize: 13,
                  fontWeight: supervisorTab === 'requests' ? '700' : '500',
                }}>
                Solicitudes de Donación
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          /* Pestañas de Estudiante: Recibidas vs Mis Solicitudes */
          <View style={[styles.tabRow, { backgroundColor: theme.border + '60' }]}>
            <Pressable
              onPress={() => setStudentTab('received')}
              style={[
                styles.tabBtn,
                studentTab === 'received' && [
                  styles.tabBtnActive,
                  { backgroundColor: theme.backgroundElement },
                ],
              ]}>
              <ThemedText
                type="smallBold"
                style={{
                  color: studentTab === 'received' ? theme.primary : theme.textSecondary,
                  fontSize: 13,
                  fontWeight: studentTab === 'received' ? '700' : '500',
                }}>
                Peticiones Recibidas ({pendingReceivedCount})
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setStudentTab('sent')}
              style={[
                styles.tabBtn,
                studentTab === 'sent' && [
                  styles.tabBtnActive,
                  { backgroundColor: theme.backgroundElement },
                ],
              ]}>
              <ThemedText
                type="smallBold"
                style={{
                  color: studentTab === 'sent' ? theme.primary : theme.textSecondary,
                  fontSize: 13,
                  fontWeight: studentTab === 'sent' ? '700' : '500',
                }}>
                Mis Solicitudes ({sentRequests.length})
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Filtro secundario: Pendientes / En curso vs Todas */}
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
          data={visibleList}
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
              refreshing={syncing && visibleList.length > 0}
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
                title={
                  !isSupervisorOrAdmin && studentTab === 'received'
                    ? 'No tienes peticiones de interesados'
                    : filter === 'open'
                      ? 'Sin solicitudes pendientes'
                      : 'Aún no hay solicitudes'
                }
                message={
                  !isSupervisorOrAdmin && studentTab === 'received'
                    ? 'Cuando otros estudiantes soliciten tus donaciones aprobadas, aparecerán aquí para que las aceptes o rechaces.'
                    : 'Cuando solicites o recibas peticiones de donación aparecerán aquí.'
                }
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
  tabRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginTop: Spacing.one,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filters: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
  },
  list: { flexGrow: 1, paddingTop: Spacing.two },
  moderationCard: {
    padding: Spacing.three,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
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
