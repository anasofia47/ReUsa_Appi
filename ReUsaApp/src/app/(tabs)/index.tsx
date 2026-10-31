import { Ionicons } from '@expo/vector-icons';
import { useDeferredValue, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { ConnectionBanner } from '@/components/connection-banner';
import { ItemCard } from '@/components/item-views';
import { Screen } from '@/components/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/state-views';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useItemCategories, useItems } from '@/hooks/use-library-data';
import { useTheme } from '@/hooks/use-theme';
import { useData } from '@/providers/data-provider';
import type { Sex } from '@/types';

const CATEGORY_ICONS: Record<string, string> = {
  'Libros y Guías': '📚',
  'Tecnología y Calculadoras': '💻',
  'Papelería y Dibujo': '✏️',
  'Ropa y Uniformes': '🥼',
  'Mobiliario y Accesorios': '🎒',
  'Otros': '📦',
};

export default function CatalogScreen() {
  const theme = useTheme();
  const { syncNow, syncing, lastError } = useData();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [sexFilter, setSexFilter] = useState<Sex | null>(null);

  const q = useDeferredValue(search);
  const { items, status } = useItems({ q, category, sex: sexFilter });
  const categories = useItemCategories();

  return (
    <Screen>
      <View style={styles.header}>
        {/* Barra superior con identidad ReUsa TdeA */}
        <View style={styles.brandRow}>
          <View style={styles.brandTitleCol}>
            <View style={[styles.universityPill, { backgroundColor: theme.primary + '18' }]}>
              <ThemedText style={[styles.universityText, { color: theme.primary }]}>
                ♻️ TdeA · ReUsa Campus
              </ThemedText>
            </View>
            <ThemedText type="title" style={styles.screenTitle}>
              Catálogo de Objetos
            </ThemedText>
          </View>
        </View>

        <ConnectionBanner />

        {/* Barra de búsqueda moderna */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por libro, calculadora, uniforme..."
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Buscar objetos por título o descripción"
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={10} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {/* Carrusel de categorías con íconos */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}>
          <Pressable
            onPress={() => setCategory(null)}
            style={[
              styles.categoryChip,
              {
                backgroundColor: category === null ? theme.primary : theme.backgroundElement,
                borderColor: category === null ? theme.primary : theme.border,
              },
            ]}>
            <ThemedText
              style={[
                styles.categoryChipText,
                { color: category === null ? theme.onPrimary : theme.text },
              ]}>
              ✨ Todos
            </ThemedText>
          </Pressable>

          {categories.map((c) => {
            const isSelected = c === category;
            const emoji = CATEGORY_ICONS[c] || '🏷️';
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(isSelected ? null : c)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.backgroundElement,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.categoryChipText,
                    { color: isSelected ? theme.onPrimary : theme.text },
                  ]}>
                  {emoji} {c}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Filtro por Sexo */}
        <View style={styles.sexRow}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.sexLabel}>
            Para:
          </ThemedText>
          {([null, 'otro', 'femenino', 'masculino'] as const).map((s) => {
            const selected = sexFilter === s;
            const label =
              s === null ? 'Cualquiera' : s === 'otro' ? 'Unisex' : s === 'femenino' ? 'Mujer' : 'Hombre';
            return (
              <Pressable
                key={s ?? 'all'}
                onPress={() => setSexFilter(selected && s !== null ? null : s)}
                style={[
                  styles.sexChip,
                  {
                    backgroundColor: selected ? theme.primary + '18' : 'transparent',
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={{
                    color: selected ? theme.primary : theme.textSecondary,
                    fontSize: 12,
                    fontWeight: selected ? '700' : '500',
                  }}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemCard item={item} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: BottomTabInset + Spacing.four },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={syncing && items.length > 0}
            onRefresh={() => void syncNow()}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          status === 'loading' ? (
            <LoadingView message="Cargando donaciones disponibles…" />
          ) : status === 'error' ? (
            <ErrorView
              message={lastError ?? 'No se pudo conectar al servidor'}
              onRetry={() => void syncNow()}
            />
          ) : (
            <EmptyView
              title="No hay donaciones disponibles"
              message={
                search || category || sexFilter
                  ? 'No encontramos objetos con los filtros seleccionados.'
                  : 'Sé el primero en compartir un artículo universitario con tus compañeros.'
              }
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 10,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  brandTitleCol: {
    gap: 4,
  },
  universityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  universityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    marginTop: 2,
  },
  sexLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  sexChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  list: {
    flexGrow: 1,
    paddingTop: Spacing.two,
  },
});
