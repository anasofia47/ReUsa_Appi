import { StyleSheet, View } from 'react-native';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/text';
import type { LocalRequest, RequestAction, RequestStatus } from '@/types';
import { Button } from './button';
import { ThemedText } from './themed-text';

const STATUS_LABEL: Record<RequestStatus, string> = {
  requested: 'Solicitado',
  approved: 'Aprobado / Pendiente de entrega',
  rejected: 'Rechazado',
  delivered: 'Entregado al beneficiario',
};

export function actionsForRequest(status: RequestStatus): RequestAction[] {
  if (status === 'requested') return ['approve', 'reject'];
  if (status === 'approved') return ['deliver'];
  return [];
}

const ACTION_LABEL: Record<RequestAction, string> = {
  approve: 'Aceptar solicitud',
  reject: 'Rechazar solicitud',
  deliver: 'Confirmar entrega',
};

interface RequestCardProps {
  request: LocalRequest;
  isPublisher: boolean;
  online: boolean;
  busy: boolean;
  onAction: (request: LocalRequest, action: RequestAction) => void;
  onDismiss: (request: LocalRequest) => void;
}

export function RequestCard({
  request,
  isPublisher,
  online,
  busy,
  onAction,
  onDismiss,
}: RequestCardProps) {
  const theme = useTheme();
  const conflict = request.syncState === 'conflict';
  const pending = request.syncState === 'pending';

  const isDonatedToOther =
    request.status === 'rejected' &&
    request.rejectionReason?.toLowerCase().includes('donado');

  const statusColor = conflict
    ? theme.danger
    : pending
      ? theme.warning
      : isDonatedToOther
        ? theme.warning
        : request.status === 'delivered'
          ? theme.success
          : request.status === 'approved'
            ? theme.primary
            : request.status === 'rejected'
              ? theme.danger
              : theme.textSecondary;

  const statusText = conflict
    ? 'No se pudo solicitar'
    : pending
      ? 'Pendiente de envío'
      : isDonatedToOther
        ? 'Ya donado a otro solicitante'
        : request.rejectionReason || STATUS_LABEL[request.status];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: conflict ? theme.danger : theme.border,
        },
      ]}>
      <View style={styles.row}>
        <ThemedText type="smallBold" style={[styles.title, { fontSize: 16 }]} numberOfLines={2}>
          {request.itemTitle}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: statusColor, fontSize: 13 }}>
          {statusText}
        </ThemedText>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {isPublisher ? `Solicitado por: ${request.userName} (${request.userEmail})` : `Fecha: ${formatDate(request.requestedAt)}`}
      </ThemedText>

      {conflict ? (
        <>
          <ThemedText type="small" style={{ color: theme.danger }}>
            {request.syncError}
          </ThemedText>
          <Button title="Descartar" variant="secondary" onPress={() => onDismiss(request)} />
        </>
      ) : null}

      {isPublisher && !pending && !conflict && actionsForRequest(request.status).length > 0 ? (
        <View style={styles.actions}>
          {actionsForRequest(request.status).map((action) => (
            <View key={action} style={styles.actionItem}>
              <Button
                title={ACTION_LABEL[action]}
                variant={action === 'approve' || action === 'deliver' ? 'primary' : 'danger'}
                disabled={!online || busy}
                onPress={() => onAction(request, action)}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: 14, borderWidth: 1, gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  title: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap', marginTop: Spacing.one },
  actionItem: { flexGrow: 1 },
});
