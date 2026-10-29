import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useData } from '@/providers/data-provider';
import { api } from '@/services/api';
import { describeError } from '@/services/api/client';
import {
  ImageTooLargeError,
  PermissionDeniedError,
  pickCover,
  type CoverSource,
  type PickedCover,
} from '@/services/device/cover-service';
import type { Item, Sex } from '@/types';

export default function PublishScreen() {
  const theme = useTheme();
  const { repos, online, syncNow } = useData();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Académico');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<'nuevo' | 'usado_bueno' | 'usado_regular'>('usado_bueno');
  const [sex, setSex] = useState<Sex>('otro');
  const [cover, setCover] = useState<PickedCover | null>(null);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function onPickPhoto(source: CoverSource) {
    try {
      const picked = await pickCover(source, repos.activity);
      if (picked) setCover(picked);
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        Alert.alert(
          'Permiso necesario',
          'Permite el acceso a la cámara para fotografiar tu donación.',
          err.canAskAgain
            ? [{ text: 'Entendido' }]
            : [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
              ],
        );
      } else if (err instanceof ImageTooLargeError) {
        Alert.alert('Imagen muy grande', 'Por favor elige otra fotografía.');
      } else {
        Alert.alert('Error', describeError(err));
      }
    }
  }

  async function submit() {
    if (!title.trim()) {
      Alert.alert('Faltan datos', 'Ingresa el nombre del objeto a donar.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Faltan datos', 'Ingresa una descripción del objeto.');
      return;
    }
    if (!online) {
      Alert.alert('Conexión requerida', 'Necesitas conexión para enviar la solicitud de donación.');
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const { item } = await api.post<{ item: Item }>('/api/items', {
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        state,
        sex,
      });

      if (cover) {
        await api.put(`/api/items/${item.id}/cover`, {
          contentType: cover.contentType,
          data: cover.base64,
        });
      }

      setFeedback(
        '¡Donación enviada con éxito! Tu publicación quedó registrada y será visible en el catálogo una vez aprobada por el supervisor.',
      );
      setTitle('');
      setDescription('');
      setCover(null);
      void syncNow();
    } catch (err) {
      Alert.alert('Error al publicar', describeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.form, { paddingBottom: BottomTabInset + Spacing.six }]}
          keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle" accessibilityRole="header">
            Publicar Objeto para Donación
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Dona materiales, libros o tecnología universitaria. Pasará por revisión de moderación
            antes de publicarse.
          </ThemedText>

          {feedback ? (
            <View style={[styles.feedbackBox, { borderColor: theme.success }]}>
              <ThemedText style={{ color: theme.success }}>{feedback}</ThemedText>
            </View>
          ) : null}

          <TextField
            label="Título del objeto"
            value={title}
            onChangeText={setTitle}
            placeholder="Ej. Calculadora científica, Bata de laboratorio..."
          />

          <TextField
            label="Categoría"
            value={category}
            onChangeText={setCategory}
            placeholder="Ej. Académico, Tecnología, Ropa, Libros..."
          />

          {/* Estado del objeto */}
          <View style={styles.section}>
            <ThemedText type="smallBold">Estado físico</ThemedText>
            <View style={styles.chipsRow}>
              {(['nuevo', 'usado_bueno', 'usado_regular'] as const).map((s) => {
                const selected = state === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setState(s)}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected ? theme.primary : 'transparent',
                      },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{
                        color: selected ? theme.onPrimary : theme.text,
                        fontSize: 12,
                      }}>
                      {s === 'usado_bueno'
                        ? 'Usado (Bueno)'
                        : s === 'usado_regular'
                          ? 'Usado (Aceptable)'
                          : 'Nuevo'}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Destinado a Sexo */}
          <View style={styles.section}>
            <ThemedText type="smallBold">Destinado para sexo</ThemedText>
            <View style={styles.chipsRow}>
              {(['masculino', 'femenino', 'otro'] as const).map((s) => {
                const selected = sex === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSex(s)}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected ? theme.primary : 'transparent',
                      },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{
                        color: selected ? theme.onPrimary : theme.text,
                        fontSize: 12,
                        textTransform: 'capitalize',
                      }}>
                      {s}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Cámara / Foto */}
          <View style={styles.section}>
            <ThemedText type="smallBold">Fotografía del objeto</ThemedText>
            {cover ? (
              <View style={styles.imagePreview}>
                <Image
                  source={{ uri: `data:${cover.contentType};base64,${cover.base64}` }}
                  style={styles.preview}
                  contentFit="cover"
                />
                <Button
                  title="Cambiar foto"
                  variant="secondary"
                  onPress={() => onPickPhoto('camera')}
                />
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <Button title="📷 Tomar foto" onPress={() => onPickPhoto('camera')} />
                <Button
                  title="🖼️ Elegir de la galería"
                  variant="secondary"
                  onPress={() => onPickPhoto('library')}
                />
              </View>
            )}
          </View>

          <TextField
            label="Descripción detallada"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe las características y condiciones de entrega"
            multiline
            numberOfLines={3}
          />

          <Button title="Enviar para aprobación" onPress={submit} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: Spacing.three, paddingVertical: Spacing.two },
  section: { gap: Spacing.one },
  chipsRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
  },
  photoButtons: { gap: Spacing.two },
  imagePreview: { alignItems: 'center', gap: Spacing.two },
  preview: { width: 140, height: 140, borderRadius: 12 },
  feedbackBox: {
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#05966915',
  },
});
