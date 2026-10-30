import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
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

        {/* ── Reportes y Estadísticas del Estudiante ── */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" style={{ fontSize: 16 }}>
            📊 Mis Reportes y Donaciones
          </ThemedText>

          {loadingReport && !report ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: Spacing.two }} />
          ) : report ? (
            <View style={{ gap: Spacing.three }}>
              {/* Contadores */}
              <View style={styles.metricsGrid}>
                <View style={[styles.metricBox, { backgroundColor: theme.primary + '18' }]}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Publicados
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ fontSize: 18, color: theme.primary }}>
                    {report.publishedItems.total}
                  </ThemedText>
                </View>
                <View style={[styles.metricBox, { backgroundColor: theme.success + '18' }]}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Aprobados
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ fontSize: 18, color: theme.success }}>
                    {report.publishedItems.approved}
                  </ThemedText>
                </View>
                <View style={[styles.metricBox, { backgroundColor: theme.danger + '18' }]}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Rechazados
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ fontSize: 18, color: theme.danger }}>
                    {report.publishedItems.rejected}
                  </ThemedText>
                </View>
                <View style={[styles.metricBox, { backgroundColor: theme.primary + '18' }]}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Beneficiados
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ fontSize: 18, color: theme.primary }}>
                    {report.donationsGiven.approvedCount}
                  </ThemedText>
                </View>
              </View>

              {/* Objetos puestos a donar */}
              <View style={{ gap: Spacing.one }}>
                <ThemedText type="smallBold" style={{ fontSize: 14 }}>
                  Objetos para Donar ({report.publishedItems.items.length})
                </ThemedText>
                {report.publishedItems.items.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    No has publicado objetos aún.
                  </ThemedText>
                ) : (
                  report.publishedItems.items.map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.itemReportRow,
                        { borderColor: item.status === 'rejected' ? theme.danger : theme.border },
                      ]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText type="smallBold">{item.title}</ThemedText>
                        <ThemedText
                          type="small"
                          style={{
                            color:
                              item.status === 'approved'
                                ? theme.success
                                : item.status === 'rejected'
                                  ? theme.danger
                                  : theme.primary,
                          }}>
                          {item.status === 'approved'
                            ? 'Aprobado'
                            : item.status === 'rejected'
                              ? 'Rechazado'
                              : 'En revisión'}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        Categoría: {item.category}
                      </ThemedText>

                      {item.status === 'rejected' && (
                        <View
                          style={[
                            styles.rejectionNotice,
                            { backgroundColor: theme.danger + '15', borderColor: theme.danger },
                          ]}>
                          <ThemedText
                            type="smallBold"
                            style={{ color: theme.danger, fontSize: 12 }}>
                            Rechazado por: {item.reviewedByName || 'Supervisor ReUsa'}
                          </ThemedText>
                          {item.reviewedByEmail ? (
                            <ThemedText type="small" style={{ fontSize: 11, color: theme.danger }}>
                              {item.reviewedByEmail}
                            </ThemedText>
                          ) : null}
                          <ThemedText type="small" style={{ fontSize: 12, marginTop: 2 }}>
                            Motivo: {item.rejectionReason || 'No especificado'}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>

              {/* A cuántos les aprobó donaciones */}
              <View style={{ gap: Spacing.one, marginTop: Spacing.one }}>
                <ThemedText type="smallBold" style={{ fontSize: 14 }}>
                  Compañeros a quienes aprobé donación ({report.donationsGiven.recipients.length})
                </ThemedText>
                {report.donationsGiven.recipients.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Aún no has aprobado solicitudes de donación.
                  </ThemedText>
                ) : (
                  report.donationsGiven.recipients.map((r) => (
                    <View key={r.requestId} style={[styles.itemReportRow, { borderColor: theme.border }]}>
                      <ThemedText type="smallBold">Objeto: {r.itemTitle}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Beneficiario: {r.applicantName} ({r.applicantEmail})
                      </ThemedText>
                      {r.applicantPhone ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          Teléfono: {r.applicantPhone}
                        </ThemedText>
                      ) : null}
                      <ThemedText type="small" style={{ color: theme.success, marginTop: 2 }}>
                        Estado: {r.status === 'delivered' ? '✓ Entregado' : '✓ Aprobado para donar'}
                      </ThemedText>
                    </View>
                  ))
                )}
              </View>

              {/* Solicitudes realizadas */}
              <View style={{ gap: Spacing.one, marginTop: Spacing.one }}>
                <ThemedText type="smallBold" style={{ fontSize: 14 }}>
                  Solicitudes que he realizado ({report.requestsMade.total})
                </ThemedText>
                {report.requestsMade.items.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    No has solicitado objetos de otros compañeros.
                  </ThemedText>
                ) : (
                  report.requestsMade.items.map((r) => (
                    <View key={r.requestId} style={[styles.itemReportRow, { borderColor: theme.border }]}>
                      <ThemedText type="smallBold">{r.itemTitle}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Publicado por: {r.publisherName} ({r.publisherEmail})
                      </ThemedText>
                      <ThemedText
                        type="small"
                        style={{
                          color:
                            r.status === 'approved' || r.status === 'delivered'
                              ? theme.success
                              : r.status === 'rejected'
                                ? theme.danger
                                : theme.primary,
                          marginTop: 2,
                        }}>
                        {r.status === 'approved'
                          ? `✓ Aprobada por ${r.publisherName}`
                          : r.status === 'rejected'
                            ? `✕ Rechazada por ${r.publisherName}`
                            : r.status === 'delivered'
                              ? '🎉 Entregada'
                              : '⏳ En espera de respuesta'}
                      </ThemedText>
                    </View>
                  ))
                )}
              </View>
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Conéctate a internet para consultar tus reportes y estadísticas en vivo.
            </ThemedText>
          )}
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
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 14,
    gap: Spacing.one,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  metricBox: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.two,
    borderRadius: 10,
    alignItems: 'center',
  },
  itemReportRow: {
    padding: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    marginTop: Spacing.half,
  },
  rejectionNotice: {
    marginTop: Spacing.half,
    padding: Spacing.one,
    borderRadius: 6,
    borderWidth: 1,
  },
});
