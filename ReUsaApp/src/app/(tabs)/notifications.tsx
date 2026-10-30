import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Screen } from '@/components/screen';
import { EmptyView, LoadingView } from '@/components/state-views';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { api } from '@/services/api';
import type { Notification } from '@/types';

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get<{ notifications: Notification[]; unreadCount: number }>(
        '/api/notifications',
      );
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Silenciar errores de conectividad temporal
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function onPressNotification(item: Notification) {
    if (!item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      api.patch(`/api/notifications/${item.id}/read`, {}).catch(() => {});
    }

    // Mapeo de rutas web a rutas móviles de Expo
    const path = item.targetPath;
    if (path.includes('/requests') || path.includes('/supervisor')) {
      router.push('/(tabs)/requests');
    } else if (path.includes('/reports')) {
      router.push('/(tabs)/profile');
    } else if (path.includes('/items/')) {
      const id = path.split('/items/')[1]?.split('?')[0];
      if (id) {
        router.push({ pathname: '/item/[id]', params: { id } });
      } else {
        router.push('/(tabs)');
      }
    } else {
      router.push('/(tabs)');
    }
  }

  async function markAllAsRead() {
    try {
      await api.post('/api/notifications', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Ignorar
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ThemedText type="subtitle" accessibilityRole="header">
            Notificaciones
          </ThemedText>
          {unreadCount > 0 ? (
            <Pressable onPress={markAllAsRead} style={styles.markReadBtn}>
              <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 13 }}>
                Marcar leídas ({unreadCount})
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
        <ThemedText themeColor="textSecondary" type="small">
          {user?.role === 'supervisor' || user?.role === 'admin'
            ? 'Alertas de nuevos objetos para moderar y solicitudes en el campus.'
            : 'Avisos de solicitudes recibidas, aprobación de donaciones y moderación.'}
        </ThemedText>
      </View>

      {loading && notifications.length === 0 ? (
        <LoadingView message="Cargando notificaciones..." />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: BottomTabInset + Spacing.four }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void fetchNotifications();
              }}
            />
          }
          ListEmptyComponent={
            <EmptyView
              title="No hay notificaciones"
              message="Te avisaremos cuando haya actividad sobre tus donaciones o solicitudes."
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          renderItem={({ item }) => {
            const icon =
              item.type === 'item_submitted'
                ? '📦'
                : item.type === 'item_reviewed'
                ? '✅'
                : item.type === 'item_requested'
                ? '🙋'
                : '🎉';

            return (
              <Pressable
                onPress={() => void onPressNotification(item)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: item.read ? theme.backgroundElement : theme.primary + '12',
                    borderColor: item.read ? theme.border : theme.primary + '40',
                  },
                  pressed && { opacity: 0.85 },
                ]}>
                <ThemedText style={{ fontSize: 24, marginRight: Spacing.two }}>{icon}</ThemedText>
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <ThemedText
                      type="smallBold"
                      style={{
                        flex: 1,
                        color: item.read ? theme.text : theme.primary,
                        fontSize: 15,
                      }}>
                      {item.title}
                    </ThemedText>
                    {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                    {item.message}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary, fontSize: 11, marginTop: Spacing.one }}>
                    {new Date(item.createdAt).toLocaleDateString('es-CO', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </ThemedText>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  markReadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.one,
  },
});
