import { Ionicons } from '@expo/vector-icons';
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
  { value: 'Libros y Guías', label: '📚 Libros y Guías', description: 'Textos de estudio, apuntes, lecturas' },
  { value: 'Tecnología y Calculadoras', label: '💻 Tecnología y Calculadoras', description: 'Calculadoras, cargadores, accesorios' },
  { value: 'Papelería y Dibujo', label: '✏️ Papelería y Dibujo', description: 'Reglas, compases, cuadernos, estuches' },
  { value: 'Ropa y Uniformes', label: '🥼 Ropa y Uniformes', description: 'Batas de laboratorio, ropa institucional' },
  { value: 'Mobiliario y Accesorios', label: '🎒 Mobiliario y Accesorios', description: 'Morrales, cartucheras, sillas' },
  { value: 'Otros', label: '📦 Otros', description: 'Cualquier otro material universitario útil' },
];

const CONDITION_OPTIONS: SelectOption[] = [
  { value: 'Nuevo', label: '✨ Nuevo', description: 'Sin estrenar o en su empaque original' },
  { value: 'Como nuevo', label: '⭐ Como nuevo', description: 'Poco uso, estado impecable' },
  { value: 'Buen estado', label: '👍 Buen estado', description: 'Totalmente funcional con desgaste normal' },
  { value: 'Aceptable', label: '👌 Aceptable', description: 'Funcional para cumplir su objetivo' },
];

const DELIVERY_OPTIONS: SelectOption[] = [
  { value: 'Campus TdeA - Bloque 1 Cafetería', label: '☕ Bloque 1 - Cafetería central' },
  { value: 'Campus TdeA - Bloque 2 Biblioteca', label: '📖 Bloque 2 - Biblioteca' },
  { value: 'Campus TdeA - Bloque 3 Plazoleta', label: '🌳 Bloque 3 - Plazoleta' },
  { value: 'Campus TdeA - Bloque 4 Aulas', label: '🏫 Bloque 4 - Aulas' },
  { value: 'Campus TdeA - Bloque 5 Administrativo', label: '🏢 Bloque 5 - Administrativo' },
  { value: 'Portería Principal Calle 78B', label: '🚪 Portería Principal - Calle 78B' },
];

const SEX_OPTIONS: SelectOption<Sex>[] = [
  { value: 'otro', label: '👥 Unisex / Cualquier persona', description: 'Sin distinción de género' },
  { value: 'femenino', label: '👩 Femenino', description: 'Para estudiantes mujeres' },
  { value: 'masculino', label: '👨 Masculino', description: 'Para estudiantes hombres' },
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
          'Permite el acceso a la cámara o galería para fotografiar tu donación.',
          err.canAskAgain
            ? [{ text: 'Entendido' }]
            : [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
              ],
        );
      } else if (err instanceof ImageTooLargeError) {
        Alert.alert('Imagen muy grande', 'Por favor elige otra fotografía más liviana.');
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
      Alert.alert('Faltan datos', 'Ingresa una breve descripción del objeto.');
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
        '¡Donación enviada con éxito! Tu objeto pasará por revisión de moderación antes de publicarse en el catálogo.',
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
          contentContainerStyle={[
            styles.form,
            { paddingBottom: BottomTabInset + Spacing.six },
          ]}
          keyboardShouldPersistTaps="handled">
          {/* Encabezado con estética institucional */}
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: theme.primary + '18' }]}>
              <ThemedText style={[styles.badgeText, { color: theme.primary }]}>
                🎁 Solidaridad Universitaria
              </ThemedText>
            </View>
            <ThemedText type="title" style={styles.title}>
              Donar un Objeto
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Comparte libros, útiles, ropa o tecnología que ya no uses. Un supervisor revisará la
              publicación antes de hacerla pública.
            </ThemedText>
          </View>

          {feedback ? (
            <View
              style={[
                styles.feedbackBox,
                { borderColor: theme.success, backgroundColor: theme.success + '15' },
              ]}>
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
              <ThemedText style={{ color: theme.success, flex: 1, fontSize: 13, fontWeight: '600' }}>
                {feedback}
              </ThemedText>
            </View>
          ) : null}

          {/* Tarjeta 1: Información del Objeto */}
          <View
            style={[
              styles.cardSection,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
              <ThemedText type="smallBold" style={{ fontSize: 15, fontWeight: '700' }}>
                Información del Objeto
              </ThemedText>
            </View>

            <TextField
              label="Título o nombre del objeto"
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Calculadora científica Casio, Bata laboratorio..."
            />

            <SelectField
              label="Categoría"
              value={category}
              options={CATEGORY_OPTIONS}
              onChange={setCategory}
              placeholder="Selecciona una categoría..."
            />

            <SelectField
              label="Estado físico"
              value={condition}
              options={CONDITION_OPTIONS}
              onChange={setCondition}
              placeholder="Selecciona el estado..."
            />

            <SelectField
              label="Punto de entrega en el campus"
              value={deliveryPoint}
              options={DELIVERY_OPTIONS}
              onChange={setDeliveryPoint}
              placeholder="Selecciona punto de entrega..."
            />

            <SelectField<Sex>
              label="Destinado para"
              value={sex}
              options={SEX_OPTIONS}
              onChange={setSex}
              placeholder="Selecciona público..."
            />
          </View>

          {/* Tarjeta 2: Fotografía */}
          <View
            style={[
              styles.cardSection,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="camera-outline" size={18} color={theme.primary} />
              <ThemedText type="smallBold" style={{ fontSize: 15, fontWeight: '700' }}>
                Fotografía del Objeto
              </ThemedText>
            </View>

            {cover ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: `data:${cover.contentType};base64,${cover.base64}` }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
                <Button
                  title="Cambiar fotografía"
                  icon="refresh-outline"
                  variant="secondary"
                  size="small"
                  onPress={() => setCover(null)}
                />
              </View>
            ) : (
              <View
                style={[
                  styles.uploadPlaceholder,
                  { borderColor: theme.border, backgroundColor: theme.background + '80' },
                ]}>
                <View style={[styles.cameraCircle, { backgroundColor: theme.primary + '18' }]}>
                  <Ionicons name="camera" size={28} color={theme.primary} />
                </View>
                <ThemedText type="smallBold" style={{ fontSize: 14 }}>
                  Toma una foto clara o sube una imagen
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                  Formatos JPEG, PNG o WebP (máx. 500 KB)
                </ThemedText>
                <View style={styles.photoActionsRow}>
                  <Button
                    title="Cámara"
                    icon="camera"
                    variant="primary"
                    size="small"
                    onPress={() => void onPickPhoto('camera')}
                  />
                  <Button
                    title="Galería"
                    icon="image"
                    variant="secondary"
                    size="small"
                    onPress={() => void onPickPhoto('library')}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Tarjeta 3: Descripción */}
          <View
            style={[
              styles.cardSection,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={18} color={theme.primary} />
              <ThemedText type="smallBold" style={{ fontSize: 15, fontWeight: '700' }}>
                Descripción Detallada
              </ThemedText>
            </View>

            <TextField
              label="Detalles y condiciones"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe para qué asignatura sirve, si incluye accesorios o detalles del uso..."
              multiline
              numberOfLines={4}
              style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: 10 }}
            />
          </View>

          {/* Botón de envío */}
          <Button
            title="Enviar para Aprobación del Supervisor"
            icon="checkmark-circle"
            variant="primary"
            size="large"
            loading={loading}
            onPress={submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  header: {
    gap: 6,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardSection: {
    padding: Spacing.three,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 6,
  },
  cameraCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  previewImage: {
    width: 160,
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
  },
});
