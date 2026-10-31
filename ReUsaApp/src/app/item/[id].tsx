import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { ItemCover } from '@/components/item-views';
import { Screen } from '@/components/screen';
import { EmptyView, LoadingView } from '@/components/state-views';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useItem, useMyRequestForItem } from '@/hooks/use-library-data';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { useData } from '@/providers/data-provider';
import { describeError } from '@/services/api/client';
import { LoanRuleError } from '@/services/loans/loan-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ItemDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { online, requestItem } = useData();
  const { item, loaded } = useItem(id);
  const myRequest = useMyRequestForItem(id);

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);

  if (!loaded) return <LoadingView message="Cargando producto..." />;
  if (!item) {
    return (
      <EmptyView
        title="Producto no disponible"
        message="Es posible que este objeto ya haya sido donado a otro estudiante o haya sido retirado."
      />
    );
  }

  const isPublisher = item.publishedBy === user?.uid;
  const hasActive =
    myRequest &&
    myRequest.syncState !== 'conflict' &&
    (myRequest.status === 'requested' || myRequest.status === 'approved');

  const coverWidth = Math.min(SCREEN_WIDTH - Spacing.four * 2, 380);
  const coverHeight = Math.round(coverWidth * 0.78);

  async function onRequest() {
    if (!item) return;
    setBusy(true);
    setFeedback(null);
    try {
      await requestItem(item);
      setFeedback({
        error: false,
        text: online
          ? '¡Solicitud enviada! El estudiante que publicó el objeto fue notificado para coordinar la entrega.'
          : 'Sin conexión: tu solicitud quedó guardada en el dispositivo y se enviará automáticamente al reconectar.',
      });
    } catch (err) {
      setFeedback({
        error: true,
        text: err instanceof LoanRuleError ? err.message : describeError(err),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.six }]}
        showsVerticalScrollIndicator={false}>
        {/* ── Imagen Portada Hero ── */}
        <View style={styles.coverWrapper}>
          <View
            style={[
              styles.coverContainer,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}>
            <ItemCover item={item} width={coverWidth} height={coverHeight} />
          </View>
        </View>

        {/* ── Tarjeta Principal de Información ── */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}>
          {/* Categoría y Disponibilidad */}
          <View style={styles.topBadgesRow}>
            <View style={[styles.badge, { backgroundColor: theme.primary + '18' }]}>
              <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 12 }}>
                {item.category}
              </ThemedText>
            </View>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: item.available ? theme.success + '18' : '#94A3B825',
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={{
                  color: item.available ? theme.success : '#64748B',
                  fontSize: 12,
                }}>
                {item.available ? '● Disponible' : '○ Ya donado'}
              </ThemedText>
            </View>
          </View>

          {/* Título Principal */}
          <ThemedText style={styles.title} accessibilityRole="header">
            {item.title}
          </ThemedText>

          {/* Chips de Características */}
          <View style={styles.featuresRow}>
            <View style={[styles.featurePill, { borderColor: theme.border }]}>
              <Ionicons name="sparkles-outline" size={14} color="#64748B" />
              <ThemedText style={styles.featureText}>
                Estado: {item.state.replace('_', ' ')}
              </ThemedText>
            </View>

            {item.sex ? (
              <View style={[styles.featurePill, { borderColor: theme.border }]}>
                <Ionicons name="person-outline" size={14} color="#64748B" />
                <ThemedText style={styles.featureText}>Para: {item.sex}</ThemedText>
              </View>
            ) : null}

            {item.deliveryPoint ? (
              <View style={[styles.featurePill, { borderColor: theme.border }]}>
                <Ionicons name="location-outline" size={14} color="#059669" />
                <ThemedText style={[styles.featureText, { color: '#059669', fontWeight: '600' }]}>
                  {item.deliveryPoint}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Descripción ── */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="document-text-outline" size={18} color={theme.primary} />
            <ThemedText type="smallBold" style={{ fontSize: 16 }}>
              Descripción del Objeto
            </ThemedText>
          </View>
          <ThemedText style={styles.description}>
            {item.description || 'El donante no incluyó detalles adicionales.'}
          </ThemedText>
        </View>

        {/* ── Sección de Acciones / Estado ── */}
        {isPublisher ? (
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: theme.primary + '10',
                borderColor: theme.primary + '30',
              },
            ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="information-circle" size={20} color={theme.primary} />
              <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 15 }}>
                Eres el donante de este objeto
              </ThemedText>
            </View>
            <ThemedText style={styles.infoBoxText}>
              Ve a la pestaña de <ThemedText type="smallBold">Solicitudes</ThemedText> para ver a los estudiantes interesados, aceptar la donación y confirmar la entrega.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.actionsContainer}>
            {myRequest && myRequest.syncState === 'pending' ? (
              <View style={[styles.statusNotice, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
                <Ionicons name="cloud-upload-outline" size={16} color="#D97706" />
                <ThemedText style={[styles.statusNoticeText, { color: '#D97706' }]}>
                  Solicitud guardada en el móvil · Se enviará al sincronizar
                </ThemedText>
              </View>
            ) : null}

            {myRequest && myRequest.syncState === 'conflict' ? (
              <View style={[styles.statusNotice, { backgroundColor: theme.danger + '15', borderColor: theme.danger + '40' }]}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.danger} />
                <ThemedText style={[styles.statusNoticeText, { color: theme.danger }]}>
                  No se pudo procesar: {myRequest.syncError}
                </ThemedText>
              </View>
            ) : null}

            {myRequest?.syncState === 'synced' && myRequest.status === 'requested' ? (
              <View style={[styles.statusNotice, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }]}>
                <Ionicons name="time-outline" size={16} color={theme.primary} />
                <ThemedText style={[styles.statusNoticeText, { color: theme.primary }]}>
                  Solicitud en espera · El donante está revisando las solicitudes
                </ThemedText>
              </View>
            ) : null}

            {myRequest?.syncState === 'synced' && myRequest.status === 'approved' ? (
              <View style={[styles.statusNotice, { backgroundColor: theme.success + '15', borderColor: theme.success + '40' }]}>
                <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                <ThemedText style={[styles.statusNoticeText, { color: theme.success }]}>
                  ¡Aprobada para ti! Coordina con el compañero donante
                </ThemedText>
              </View>
            ) : null}

            <Button
              title={
                !item.available
                  ? 'Objeto no disponible'
                  : hasActive
                    ? 'Solicitud en curso'
                    : 'Solicitar donación'
              }
              variant={hasActive || !item.available ? 'secondary' : 'primary'}
              disabled={!item.available || !!hasActive}
              loading={busy}
              icon={
                !item.available
                  ? undefined
                  : hasActive
                    ? 'checkmark-done'
                    : 'heart-outline'
              }
              onPress={onRequest}
            />
          </View>
        )}

        {/* ── Banner de Retroalimentación ── */}
        {feedback ? (
          <View
            style={[
              styles.feedbackBox,
              {
                backgroundColor: feedback.error ? theme.danger + '12' : theme.success + '12',
                borderColor: feedback.error ? theme.danger + '40' : theme.success + '40',
              },
            ]}>
            <Ionicons
              name={feedback.error ? 'alert-circle' : 'checkmark-circle'}
              size={20}
              color={feedback.error ? theme.danger : theme.success}
            />
            <ThemedText
              style={[
                styles.feedbackText,
                { color: feedback.error ? theme.danger : theme.success },
              ]}>
              {feedback.text}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.four,
  },
  coverWrapper: {
    alignItems: 'center',
    marginVertical: Spacing.one,
  },
  coverContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
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
  topBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 28,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: 2,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#F8FAFC',
  },
  featureText: {
    fontSize: 12,
    color: '#475569',
    textTransform: 'capitalize',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: '#334155',
  },
  actionsContainer: {
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  infoBox: {
    padding: Spacing.four,
    borderRadius: 18,
    borderWidth: 1,
    gap: Spacing.one,
  },
  infoBoxText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
  },
  statusNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusNoticeText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    flex: 1,
  },
});
