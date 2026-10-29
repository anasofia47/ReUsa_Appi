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
  const size = { width, height, borderRadius: 10 };
  if (item.coverUrl) {
    const uri = item.coverUrl.startsWith('data:')
      ? item.coverUrl
      : `${API_URL}${item.coverUrl}`;
    return (
      <Image
        source={{ uri }}
        style={size}
        contentFit="cover"
        transition={150}
        accessibilityLabel={`Foto de ${item.title}`}
      />
    );
  }
  return (
    <View
      accessible={false}
      style={[size, styles.placeholder, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="subtitle" themeColor="textSecondary">
        {item.title.charAt(0).toUpperCase()}
      </ThemedText>
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
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          pressed && { opacity: 0.85 },
        ]}>
        <ItemCover item={item} width={80} height={96} />
        <View style={styles.info}>
          <ThemedText type="smallBold" numberOfLines={2} style={{ fontSize: 16 }}>
            {item.title}
          </ThemedText>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: theme.primary + '20' }]}>
              <ThemedText type="small" style={{ color: theme.primary, fontSize: 12 }}>
                {item.category}
              </ThemedText>
            </View>
            {item.sex ? (
              <View style={[styles.badge, { backgroundColor: theme.border }]}>
                <ThemedText type="small" style={{ fontSize: 12 }}>
                  {item.sex}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            Estado: {item.state.replace('_', ' ')}
          </ThemedText>
          <ThemedText
            type="smallBold"
            style={{ color: available ? theme.success : theme.danger, fontSize: 13 }}>
            {item.status !== 'approved'
              ? 'En revisión de moderación'
              : available
                ? 'Disponible para solicitar'
                : 'Entregado / No disponible'}
          </ThemedText>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, gap: Spacing.half, justifyContent: 'center' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
