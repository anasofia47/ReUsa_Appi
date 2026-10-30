import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SelectField, type SelectOption } from '@/components/select-field';
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

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'Libros y Guías', label: 'Libros y Guías', description: 'Textos de estudio, lecturas, apuntes' },
  { value: 'Tecnología y Calculadoras', label: 'Tecnología y Calculadoras', description: 'Calculadoras científicas, tablets, accesorios' },
  { value: 'Papelería y Dibujo', label: 'Papelería y Dibujo', description: 'Reglas, compases, cuadernos, colores' },
  { value: 'Ropa y Uniformes', label: 'Ropa y Uniformes', description: 'Batas de laboratorio, ropa deportiva TdeA' },
  { value: 'Mobiliario y Accesorios', label: 'Mobiliario y Accesorios', description: 'Maletines, morrales, estuches' },
  { value: 'Otros', label: 'Otros', description: 'Cualquier otro material universitario' },
];

const CONDITION_OPTIONS: SelectOption[] = [
  { value: 'Nuevo', label: 'Nuevo', description: 'Sin estrenar o en empaque original' },
  { value: 'Como nuevo', label: 'Como nuevo', description: 'Poco uso, impecable estado' },
  { value: 'Buen estado', label: 'Buen estado', description: 'Funcional con desgaste mínimo normal' },
  { value: 'Aceptable', label: 'Aceptable', description: 'Totalmente funcional' },
];

const DELIVERY_OPTIONS: SelectOption[] = [
  { value: 'Campus TdeA - Bloque 1 Cafetería', label: 'Bloque 1 - Cafetería central' },
  { value: 'Campus TdeA - Bloque 2 Biblioteca', label: 'Bloque 2 - Biblioteca' },
  { value: 'Campus TdeA - Bloque 3 Plazoleta', label: 'Bloque 3 - Plazoleta' },
  { value: 'Campus TdeA - Bloque 4 Aulas', label: 'Bloque 4 - Aulas' },
  { value: 'Campus TdeA - Bloque 5 Administrativo', label: 'Bloque 5 - Administrativo' },
  { value: 'Portería Principal Calle 78B', label: 'Portería Principal - Calle 78B' },
];

const SEX_OPTIONS: SelectOption<Sex>[] = [
  { value: 'otro', label: 'Unisex / Cualquier persona', description: 'Sin distinción de género' },
  { value: 'femenino', label: 'Femenino', description: 'Para estudiantes mujeres' },
  { value: 'masculino', label: 'Masculino', description: 'Para estudiantes hombres' },
];

export default function PublishScreen() {
  const theme = useTheme();
  const { repos, online, syncNow } = useData();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Libros y Guías');
  const [description, setDescription] = useState('');
  const [deliveryPoint, setDeliveryPoint] = useState('Campus TdeA - Bloque 1 Cafetería');
  const [condition, setCondition] = useState('Buen estado');
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
      const stateMap: Record<string, 'nuevo' | 'usado_bueno' | 'usado_regular'> = {
        Nuevo: 'nuevo',
        'Como nuevo': 'usado_bueno',
        'Buen estado': 'usado_bueno',
        Aceptable: 'usado_regular',
      };
      const state = stateMap[condition] || 'usado_bueno';

      const { item } = await api.post<{ item: Item }>('/api/items', {
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        state,
        condition,
        deliveryPoint: deliveryPoint.trim() || 'Campus TdeA - Bloque 1 Cafetería',
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
      setDeliveryPoint('Campus TdeA - Bloque 1 Cafetería');
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

          <SelectField
            label="Categoría"
            value={category}
            options={CATEGORY_OPTIONS}
            onChange={setCategory}
            placeholder="Selecciona una categoría..."
          />

          <SelectField
            label="Estado del objeto"
            value={condition}
            options={CONDITION_OPTIONS}
            onChange={setCondition}
            placeholder="Selecciona el estado..."
          />

          <SelectField
            label="Punto de entrega en el campus TdeA"
            value={deliveryPoint}
            options={DELIVERY_OPTIONS}
            onChange={setDeliveryPoint}
            placeholder="Selecciona punto de entrega..."
          />

          <SelectField<Sex>
            label="Destinado para sexo"
            value={sex}
            options={SEX_OPTIONS}
            onChange={setSex}
            placeholder="Selecciona público..."
          />

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

          <Button
            title="Enviar para aprobación del supervisor"
            onPress={submit}
            loading={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: Spacing.three, paddingVertical: Spacing.two },
  section: { gap: Spacing.one },
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
