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

export default function CatalogScreen() {
  const theme = useTheme();
  const { syncNow, syncing, lastError } = useData();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [sexFilter, setSexFilter] = useState<Sex | null>(null);

  const q = useDeferredValue(search);
  const { items, status } = useItems({ q, category, sex: sexFilter });
  const categories = useItemCategories();
  const filtering = q.trim().length > 0 || category !== null || sexFilter !== null;

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle" accessibilityRole="header">
          Catálogo ReUsa
        </ThemedText>
        <ConnectionBanner />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar objetos por título o descripción"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Buscar objetos por título o descripción"
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          style={[
            styles.search,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.backgroundElement,
            },
          ]}
        />

        {/* Filtro por Sexo */}
        <View style={styles.sexRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Sexo:
          </ThemedText>
          {([null, 'masculino', 'femenino', 'otro'] as const).map((s) => {
            const selected = sexFilter === s;
            return (
              <Pressable
                key={s ?? 'all-sex'}
                onPress={() => setSexFilter(s)}
                style={[
                  styles.miniChip,
                  {
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected ? theme.primary : 'transparent',
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={{
                    color: selected ? theme.onPrimary : theme.text,
                    fontSize: 12,
                    textTransform: 'capitalize',
                  }}>
                  {s ?? 'Todos'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Categorías */}
        {categories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}>
            {[null, ...categories].map((c) => {
              const selected = c === category;
              return (
                <Pressable
                  key={c ?? 'all'}
                  onPress={() => setCategory(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected ? theme.primary : 'transparent',
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: selected ? theme.onPrimary : theme.text }}>
                    {c ?? 'Todas las categorías'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemCard item={item} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        contentContainerStyle={[styles.list, { paddingBottom: BottomTabInset + Spacing.four }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={syncing && items.length > 0}
            onRefresh={() => void syncNow()}
          />
        }
        ListEmptyComponent={
          status === 'loading' ? (
            <LoadingView message="Cargando objetos disponibles…" />
          ) : status === 'error' ? (
            <ErrorView message={lastError ?? 'Error desconocido'} onRetry={() => void syncNow()} />
          ) : (
            <EmptyView
              title={filtering ? 'Sin resultados' : 'El catálogo está vacío'}
              message={
                filtering
                  ? 'Prueba ajustando los filtros o el texto de búsqueda.'
                  : 'Aún no hay objetos disponibles. Sé el primero en donar.'
              }
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.two, paddingTop: Spacing.two, paddingBottom: Spacing.two },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  sexRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  miniChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  chips: { gap: Spacing.two, paddingVertical: Spacing.one },
  chip: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
  },
  list: { flexGrow: 1 },
});
