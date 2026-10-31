import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import type { ActivityEntry } from '@/db/repositories';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/text';
import { useAuth } from '@/providers/auth-provider';
import { useData } from '@/providers/data-provider';
import { api } from '@/services/api';
import type { StudentReport } from '@/types';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const { repos, online, syncing, lastSyncAt, lastError, pendingCount, dataVersion, syncNow } =
    useData();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    let active = true;
    repos.activity.recent(15).then((rows) => active && setActivity(rows));
    return () => {
      active = false;
    };
  }, [repos, dataVersion]);

  useEffect(() => {
    let active = true;
    if (online) {
      setLoadingReport(true);
      api
        .get<{ studentReport?: StudentReport }>('/api/reports')
        .then((res) => {
          if (active && res.studentReport) {
            setReport(res.studentReport);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoadingReport(false);
        });
    }
    return () => {
      active = false;
    };
  }, [online, dataVersion]);

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
      ? 'Administrador TdeA'
      : user?.role === 'supervisor'
        ? 'Supervisor ReUsa'
        : 'Estudiante TdeA';

  const userInitials = (user?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.six }]}
        showsVerticalScrollIndicator={false}>
        {/* ── Encabezado de Usuario ── */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.primary + '18' }]}>
              <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
                {userInitials}
              </ThemedText>
            </View>
            <View style={styles.profileInfo}>
              <ThemedText type="smallBold" style={styles.userName} numberOfLines={1}>
                {user?.name || 'Usuario'}
              </ThemedText>
              <ThemedText style={styles.userEmail} numberOfLines={1}>
                {user?.email}
              </ThemedText>
              <View
                style={[
                  styles.rolePill,
                  {
                    backgroundColor:
                      user?.role === 'supervisor' || user?.role === 'admin'
                        ? '#F59E0B18'
                        : theme.primary + '14',
                    borderColor:
                      user?.role === 'supervisor' || user?.role === 'admin'
                        ? '#F59E0B'
                        : theme.primary,
                  },
                ]}>
                <Ionicons
                  name={
                    user?.role === 'supervisor' || user?.role === 'admin'
                      ? 'shield-checkmark'
                      : 'school'
                  }
                  size={13}
                  color={
                    user?.role === 'supervisor' || user?.role === 'admin'
                      ? '#D97706'
                      : theme.primary
                  }
                />
                <ThemedText
                  type="smallBold"
                  style={{
                    fontSize: 12,
                    color:
                      user?.role === 'supervisor' || user?.role === 'admin'
                        ? '#D97706'
                        : theme.primary,
                  }}>
                  {roleLabel}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* ── Mis Reportes y Donaciones ── */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleWrap}>
              <Ionicons name="bar-chart" size={18} color={theme.primary} />
              <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                Mis Reportes y Donaciones
              </ThemedText>
            </View>
            {loadingReport && <ActivityIndicator size="small" color={theme.primary} />}
          </View>

          {loadingReport && !report ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: Spacing.four }} />
          ) : report ? (
            <View style={{ gap: Spacing.three }}>
              {/* Contadores 2x2 */}
              <View style={styles.metricsGrid}>
                <View
                  style={[
                    styles.metricBox,
                    { backgroundColor: theme.primary + '10', borderColor: theme.primary + '25' },
                  ]}>
                  <ThemedText style={[styles.metricCount, { color: theme.primary }]}>
                    {report.publishedItems.total}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Publicados</ThemedText>
                </View>

                <View
                  style={[
                    styles.metricBox,
                    { backgroundColor: theme.success + '12', borderColor: theme.success + '30' },
                  ]}>
                  <ThemedText style={[styles.metricCount, { color: theme.success }]}>
                    {report.publishedItems.approved}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Aprobados</ThemedText>
                </View>

                <View
                  style={[
                    styles.metricBox,
                    { backgroundColor: theme.danger + '10', borderColor: theme.danger + '25' },
                  ]}>
                  <ThemedText style={[styles.metricCount, { color: theme.danger }]}>
                    {report.publishedItems.rejected}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Rechazados</ThemedText>
                </View>

                <View
                  style={[
                    styles.metricBox,
                    { backgroundColor: '#8B5CF612', borderColor: '#8B5CF630' },
                  ]}>
                  <ThemedText style={[styles.metricCount, { color: '#8B5CF6' }]}>
                    {report.donationsGiven.approvedCount}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Beneficiados</ThemedText>
                </View>
              </View>

              {/* Objetos puestos a donar */}
              <View style={styles.subSection}>
                <View style={styles.subSectionHeader}>
                  <ThemedText type="smallBold" style={{ fontSize: 14 }}>
                    Objetos para Donar ({report.publishedItems.items.length})
                  </ThemedText>
                </View>

                {report.publishedItems.items.length === 0 ? (
                  <ThemedText style={styles.emptyNotice}>
                    No has publicado objetos aún.
                  </ThemedText>
                ) : (
                  report.publishedItems.items.map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.itemReportRow,
                        {
                          borderColor:
                            item.status === 'rejected'
                              ? theme.danger + '50'
                              : item.status === 'approved'
                                ? theme.success + '40'
                                : theme.border,
                          backgroundColor:
                            item.status === 'rejected'
                              ? theme.danger + '06'
                              : '#F8FAFC',
                        },
                      ]}>
                      <View style={styles.reportRowHeader}>
                        <ThemedText type="smallBold" style={{ flex: 1, fontSize: 14 }}>
                          {item.title}
                        </ThemedText>
                        <View
                          style={[
                            styles.statusTag,
                            {
                              backgroundColor:
                                item.status === 'approved'
                                  ? theme.success + '18'
                                  : item.status === 'rejected'
                                    ? theme.danger + '18'
                                    : theme.primary + '18',
                            },
                          ]}>
                          <ThemedText
                            type="smallBold"
                            style={{
                              fontSize: 11,
                              color:
                                item.status === 'approved'
                                  ? theme.success
                                  : item.status === 'rejected'
                                    ? theme.danger
                                    : theme.primary,
                            }}>
                            {item.status === 'approved'
                              ? '✓ Aprobado'
                              : item.status === 'rejected'
                                ? '✕ Rechazado'
                                : '⏳ En revisión'}
                          </ThemedText>
                        </View>
                      </View>

                      <ThemedText style={styles.categorySubtext}>
                        Categoría: {item.category}
                      </ThemedText>

                      {item.status === 'rejected' && (
                        <View
                          style={[
                            styles.rejectionNotice,
                            {
                              backgroundColor: theme.danger + '12',
                              borderColor: theme.danger + '35',
                            },
                          ]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="alert-circle" size={14} color={theme.danger} />
                            <ThemedText
                              type="smallBold"
                              style={{ color: theme.danger, fontSize: 12 }}>
                              Rechazado por: {item.reviewedByName || 'Supervisor ReUsa'}
                            </ThemedText>
                          </View>
                          {item.reviewedByEmail ? (
                            <ThemedText style={{ fontSize: 11, color: theme.danger + 'CC' }}>
                              {item.reviewedByEmail}
                            </ThemedText>
                          ) : null}
                          <ThemedText style={{ fontSize: 12, marginTop: 4, color: '#334155' }}>
                            <ThemedText type="smallBold" style={{ fontSize: 12 }}>Motivo: </ThemedText>
                            {item.rejectionReason || 'No especificado'}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>

              {/* A cuántos les aprobó donaciones */}
              <View style={styles.subSection}>
                <ThemedText type="smallBold" style={{ fontSize: 14 }}>
                  Compañeros beneficiados ({report.donationsGiven.recipients.length})
                </ThemedText>
                {report.donationsGiven.recipients.length === 0 ? (
                  <ThemedText style={styles.emptyNotice}>
                    Aún no has aprobado solicitudes de donación.
                  </ThemedText>
                ) : (
                  report.donationsGiven.recipients.map((r) => (
                    <View
                      key={r.requestId}
                      style={[
                        styles.itemReportRow,
                        { borderColor: theme.border, backgroundColor: '#F8FAFC' },
                      ]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="gift-outline" size={16} color={theme.primary} />
                        <ThemedText type="smallBold" style={{ fontSize: 14 }}>
                          {r.itemTitle}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.categorySubtext}>
                        Beneficiario: {r.applicantName} ({r.applicantEmail})
                      </ThemedText>
                      {r.applicantPhone ? (
                        <ThemedText style={styles.categorySubtext}>
                          Teléfono: {r.applicantPhone}
                        </ThemedText>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Ionicons
                          name={r.status === 'delivered' ? 'checkmark-done-circle' : 'checkmark-circle'}
                          size={14}
                          color={theme.success}
                        />
                        <ThemedText type="smallBold" style={{ color: theme.success, fontSize: 12 }}>
                          {r.status === 'delivered' ? 'Entregado' : 'Aprobado para donar'}
                        </ThemedText>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Solicitudes realizadas */}
              <View style={styles.subSection}>
                <ThemedText type="smallBold" style={{ fontSize: 14 }}>
                  Solicitudes que he realizado ({report.requestsMade.total})
                </ThemedText>
                {report.requestsMade.items.length === 0 ? (
                  <ThemedText style={styles.emptyNotice}>
                    No has solicitado objetos de otros compañeros.
                  </ThemedText>
                ) : (
                  report.requestsMade.items.map((r) => (
                    <View
                      key={r.requestId}
                      style={[
                        styles.itemReportRow,
                        { borderColor: theme.border, backgroundColor: '#F8FAFC' },
                      ]}>
                      <ThemedText type="smallBold" style={{ fontSize: 14 }}>
                        {r.itemTitle}
                      </ThemedText>
                      <ThemedText style={styles.categorySubtext}>
                        Publicado por: {r.publisherName} ({r.publisherEmail})
                      </ThemedText>
                      <ThemedText
                        type="smallBold"
                        style={{
                          fontSize: 12,
                          color:
                            r.status === 'approved' || r.status === 'delivered'
                              ? theme.success
                              : r.status === 'rejected'
                                ? theme.danger
                                : theme.primary,
                          marginTop: 4,
                        }}>
                        {r.status === 'approved'
                          ? `✓ Aprobada por ${r.publisherName}`
                          : r.status === 'rejected'
                            ? `✕ Rechazada por ${r.publisherName}`
                            : r.status === 'delivered'
                              ? '🎉 Entregada con éxito'
                              : '⏳ En espera de respuesta'}
                      </ThemedText>
                    </View>
                  ))
                )}
              </View>
            </View>
          ) : (
            <ThemedText style={styles.emptyNotice}>
              Conéctate a internet para consultar tus reportes y estadísticas en vivo.
            </ThemedText>
          )}
        </View>

        {/* ── Estado de Sincronización ── */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.cardTitleWrap}>
            <Ionicons name="sync" size={18} color={theme.primary} />
            <ThemedText type="smallBold" style={{ fontSize: 16 }}>
              Sincronización Local
            </ThemedText>
          </View>

          <View style={styles.syncRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: online ? theme.success : '#94A3B8' },
              ]}
            />
            <ThemedText style={styles.syncStatusText}>
              {online ? 'Conectado a la nube TdeA' : 'Trabajando sin conexión (Offline)'}
            </ThemedText>
          </View>

          <ThemedText style={styles.syncMetaText}>
            Última sincronización: {formatDateTime(lastSyncAt)}
          </ThemedText>
          {pendingCount > 0 && (
            <ThemedText style={[styles.syncMetaText, { color: '#D97706', fontWeight: '600' }]}>
              Cambios pendientes por subir: {pendingCount}
            </ThemedText>
          )}
          {lastError ? (
            <ThemedText style={[styles.syncMetaText, { color: theme.danger }]}>
              {lastError}
            </ThemedText>
          ) : null}

          <Button
            title={syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
            variant="secondary"
            loading={syncing}
            icon={syncing ? undefined : 'refresh'}
            onPress={() => void syncNow()}
          />
        </View>

        {/* ── Actividad reciente ── */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.cardTitleWrap}>
            <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
            <ThemedText type="smallBold" style={{ fontSize: 16 }}>
              Actividad Reciente
            </ThemedText>
          </View>

          {activity.length === 0 ? (
            <ThemedText style={styles.emptyNotice}>
              Sin actividad registrada en este dispositivo.
            </ThemedText>
          ) : (
            activity.map((a) => (
              <View key={a.id} style={styles.activityItem}>
                <Ionicons name="ellipse" size={7} color={theme.primary} style={{ marginTop: 4 }} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.activityDetail}>
                    {a.detail}
                  </ThemedText>
                  <ThemedText style={styles.activityTime}>
                    {formatDateTime(a.createdAt)} · {a.kind}
                  </ThemedText>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Cerrar Sesión ── */}
        <Button
          title="Cerrar sesión"
          variant="danger"
          icon="log-out-outline"
          onPress={confirmSignOut}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.four,
  },
  profileCard: {
    padding: Spacing.four,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 18,
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  card: {
    padding: Spacing.four,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.three,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metricBox: {
    flex: 1,
    minWidth: '46%',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  metricCount: {
    fontSize: 24,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subSection: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyNotice: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  itemReportRow: {
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    gap: 3,
    marginTop: Spacing.one,
  },
  reportRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categorySubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  rejectionNotice: {
    marginTop: Spacing.one,
    padding: Spacing.two,
    borderRadius: 10,
    borderWidth: 1,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  syncMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  activityDetail: {
    fontSize: 13,
    color: '#1E293B',
  },
  activityTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
