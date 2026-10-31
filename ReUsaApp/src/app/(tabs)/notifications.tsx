import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { useNotifications } from '@/providers/notifications-provider';
import type { Notification } from '@/types';

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function onPressNotification(item: Notification) {
    if (!item.read) {
      void markAsRead(item.id);
    }

    const path = item.targetPath;
    if (path.includes('/supervisor') || item.type === 'item_submitted') {
      router.navigate({ pathname: '/(tabs)/requests', params: { tab: 'moderation' } });
    } else if (
      path.includes('/requests') ||
      item.type === 'item_requested' ||
      item.type === 'request_resolved'
    ) {
      router.navigate({ pathname: '/(tabs)/requests', params: { tab: 'requests' } });
    } else if (path.includes('/reports')) {
      router.navigate('/(tabs)/profile');
    } else if (path.includes('/items/')) {
      const id = path.split('/items/')[1]?.split('?')[0];
      if (id) {
        router.push({ pathname: '/item/[id]', params: { id } });
      } else {
        router.navigate('/(tabs)');
      }
    } else {
      router.navigate('/(tabs)');
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <View style={[styles.badge, { backgroundColor: theme.primary + '18' }]}>
              <ThemedText style={[styles.badgeText, { color: theme.primary }]}>
                🔔 Centro de Notificaciones
              </ThemedText>
            </View>
            <ThemedText type="title" style={styles.screenTitle}>
              Notificaciones
            </ThemedText>
          </View>
          {unreadCount > 0 ? (
            <Pressable
              onPress={() => void markAllAsRead()}
              style={[styles.markReadBtn, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="checkmark-done" size={16} color={theme.primary} />
              <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 12 }}>
                Leer todas ({unreadCount})
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
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
          contentContainerStyle={[
            styles.list,
            { paddingBottom: BottomTabInset + Spacing.four },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              colors={[theme.primary]}
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
            const iconData =
              item.type === 'item_submitted'
                ? { emoji: '📦', color: '#D97706', bg: '#FEF3C7' }
                : item.type === 'item_reviewed'
                ? { emoji: '✅', color: '#059669', bg: '#ECFDF5' }
                : item.type === 'item_requested'
                ? { emoji: '🙋', color: '#2563EB', bg: '#EFF6FF' }
                : { emoji: '🎉', color: '#7C3AED', bg: '#F5F3FF' };

            return (
              <Pressable
                onPress={() => onPressNotification(item)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: item.read
                      ? theme.backgroundElement
                      : theme.primary + '0D',
                    borderColor: item.read ? theme.border : theme.primary + '50',
                  },
                  pressed && styles.cardPressed,
                ]}>
                <View style={[styles.iconBox, { backgroundColor: iconData.bg }]}>
                  <ThemedText style={{ fontSize: 20 }}>{iconData.emoji}</ThemedText>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <ThemedText
                      type="smallBold"
                      style={[
                        styles.cardTitle,
                        { color: item.read ? theme.text : theme.primary },
                      ]}>
                      {item.title}
                    </ThemedText>
                    {!item.read && (
                      <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
                    )}
                  </View>

                  <ThemedText type="small" themeColor="textSecondary" style={styles.cardMessage}>
                    {item.message}
                  </ThemedText>

                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary, fontSize: 11 }}>
                      {new Date(item.createdAt).toLocaleDateString('es-CO', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </ThemedText>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={{ marginTop: 2 }} />
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
    gap: 6,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginTop: 6,
  },
  list: {
    flexGrow: 1,
    paddingTop: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  cardMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
});
