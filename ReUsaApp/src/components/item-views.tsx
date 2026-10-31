import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { API_URL } from '@/config/env';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Item } from '@/types';
import { ThemedText } from './themed-text';

export function ItemCover({ item, width, height }: { item: Item; width: number; height: number }) {
  const theme = useTheme();
  const size = { width, height, borderRadius: 14 };
  if (item.coverUrl) {
    const uri = item.coverUrl.startsWith('data:')
      ? item.coverUrl
      : `${API_URL}${item.coverUrl}`;
    return (
      <Image
        source={{ uri }}
        style={[size, styles.coverImage]}
        contentFit="cover"
        transition={150}
        accessibilityLabel={`Foto de ${item.title}`}
      />
    );
  }
  return (
    <View
      accessible={false}
      style={[
        size,
        styles.placeholder,
        { backgroundColor: theme.primary + '15', borderColor: theme.border },
      ]}>
      <Ionicons name="cube-outline" size={Math.min(width, height) * 0.4} color={theme.primary} />
    </View>
  );
}

export function ItemCard({ item }: { item: Item }) {
  const theme = useTheme();
  const available = item.available && item.status === 'approved';

  return (
    <Link href={{ pathname: '/item/[id]', params: { id: item.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, categoría ${item.category}. ${item.available ? 'Disponible' : 'No disponible'}`}
        accessibilityHint="Abre el detalle del producto donado"
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
          pressed && styles.cardPressed,
        ]}>
        <ItemCover item={item} width={92} height={92} />

        <View style={styles.info}>
          {/* Fila superior: Categoría y Ubicación */}
          <View style={styles.topRow}>
            <View style={[styles.categoryBadge, { backgroundColor: theme.primary + '18' }]}>
              <ThemedText style={[styles.categoryText, { color: theme.primary }]}>
                {item.category}
              </ThemedText>
            </View>
            {item.deliveryPoint ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.locationText}>
                📍 {item.deliveryPoint.replace('Campus TdeA - ', '')}
              </ThemedText>
            ) : null}
          </View>

          {/* Título del Objeto */}
          <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
            {item.title}
          </ThemedText>

          {/* Estado y Disponibilidad */}
          <View style={styles.footerRow}>
            <View style={[styles.conditionPill, { backgroundColor: theme.border + '35' }]}>
              <ThemedText type="small" style={{ fontSize: 11, fontWeight: '500' }}>
                {item.condition || item.state.replace('_', ' ')}
              </ThemedText>
            </View>

            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      item.status !== 'approved'
                        ? theme.warning
                        : available
                          ? theme.success
                          : theme.textSecondary,
                  },
                ]}
              />
              <ThemedText
                type="small"
                style={{
                  color:
                    item.status !== 'approved'
                      ? theme.warning
                      : available
                        ? theme.success
                        : theme.textSecondary,
                  fontSize: 12,
                  fontWeight: '600',
                }}>
                {item.status !== 'approved'
                  ? 'En revisión'
                  : available
                    ? 'Disponible'
                    : 'Donado'}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.chevronCol}>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  coverImage: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
  },
  info: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  locationText: {
    fontSize: 11,
    flexShrink: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  conditionPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  chevronCol: {
    justifyContent: 'center',
    paddingLeft: 2,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
