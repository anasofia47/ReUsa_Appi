import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { ItemCover } from '@/components/item-views';
import { Screen } from '@/components/screen';
import { EmptyView, LoadingView } from '@/components/state-views';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useItem, useMyRequestForItem } from '@/hooks/use-library-data';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { useData } from '@/providers/data-provider';
import { describeError } from '@/services/api/client';
import { LoanRuleError } from '@/services/loans/loan-service';

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
    return <EmptyView title="Producto no encontrado" message="Puede que ya haya sido donado o eliminado." />;
  }

  const isPublisher = item.publishedBy === user?.uid;
  const hasActive =
    myRequest &&
    myRequest.syncState !== 'conflict' &&
    (myRequest.status === 'requested' || myRequest.status === 'approved');

  async function onRequest() {
    if (!item) return;
    setBusy(true);
    setFeedback(null);
    try {
      await requestItem(item);
      setFeedback({
        error: false,
        text: online
          ? 'Solicitud enviada con éxito. El publicador fue notificado.'
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cover}>
          <ItemCover item={item} width={180} height={200} />
        </View>

        <ThemedText type="subtitle" accessibilityRole="header">
          {item.title}
        </ThemedText>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: theme.primary + '25' }]}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {item.category}
            </ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.border }]}>
            <ThemedText type="small">
              Estado: {item.state.replace('_', ' ')}
            </ThemedText>
          </View>
          {item.sex ? (
            <View style={[styles.badge, { backgroundColor: theme.border }]}>
              <ThemedText type="small">
                Para: {item.sex}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <ThemedText
          type="smallBold"
          style={{
            color: item.available ? theme.success : theme.danger,
            marginTop: Spacing.one,
          }}>
          {item.available ? '✓ Disponible para donación' : '✕ No disponible / Ya entregado'}
        </ThemedText>

        <ThemedText style={styles.description}>{item.description}</ThemedText>

        {isPublisher ? (
          <View style={[styles.infoBox, { borderColor: theme.border }]}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              Eres el publicador de este objeto
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Revisa la pestaña de Solicitudes para ver los interesados y confirmar la entrega.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.actions}>
            {myRequest && myRequest.syncState === 'pending' ? (
              <ThemedText type="smallBold" style={{ color: theme.warning }}>
                Solicitud guardada localmente · pendiente de envío
              </ThemedText>
            ) : null}

            {myRequest && myRequest.syncState === 'conflict' ? (
              <ThemedText type="smallBold" style={{ color: theme.danger }}>
                Tu solicitud no se pudo procesar: {myRequest.syncError}
              </ThemedText>
            ) : null}

            {myRequest?.syncState === 'synced' && myRequest.status === 'requested' ? (
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                Solicitud enviada · Esperando confirmación del publicador
              </ThemedText>
            ) : null}

            {myRequest?.syncState === 'synced' && myRequest.status === 'approved' ? (
              <ThemedText type="smallBold" style={{ color: theme.success }}>
                ¡Solicitud aceptada! Coordina la entrega con el publicador.
              </ThemedText>
            ) : null}

            <Button
              title={
                !item.available
                  ? 'No disponible'
                  : hasActive
                    ? 'Solicitud activa en curso'
                    : 'Solicitar donación'
              }
              disabled={!item.available || !!hasActive}
              loading={busy}
              onPress={onRequest}
            />
          </View>
        )}

        {feedback ? (
          <View
            style={[
              styles.feedbackBox,
              { borderColor: feedback.error ? theme.danger : theme.success },
            ]}>
            <ThemedText
              style={{ color: feedback.error ? theme.danger : theme.success, textAlign: 'center' }}>
              {feedback.text}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingVertical: Spacing.three },
  cover: { alignItems: 'center', paddingVertical: Spacing.two },
  badgeRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  description: { fontSize: 16, lineHeight: 24, marginTop: Spacing.one },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
  infoBox: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.half,
    marginTop: Spacing.two,
  },
  feedbackBox: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: Spacing.two,
  },
});
