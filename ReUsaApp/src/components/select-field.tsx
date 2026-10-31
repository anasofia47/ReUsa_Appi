import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export interface SelectOption<T = string> {
  value: T;
  label: string;
  description?: string;
  icon?: string;
}

interface SelectFieldProps<T = string> {
  label: string;
  value: T;
  options: SelectOption<T>[] | readonly SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
}

export function SelectField<T extends string = string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Seleccionar...',
  error,
}: SelectFieldProps<T>) {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>

      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityState={{ expanded: modalVisible }}
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            borderColor: error ? theme.danger : theme.border,
            backgroundColor: theme.backgroundElement,
          },
          pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        ]}>
        <ThemedText
          style={[
            styles.valueText,
            { color: selectedOption ? theme.text : theme.textSecondary },
          ]}
          numberOfLines={1}>
          {selectedOption ? selectedOption.label : placeholder}
        </ThemedText>
        <View style={[styles.arrowCircle, { backgroundColor: theme.border + '40' }]}>
          <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
        </View>
      </Pressable>

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger, marginTop: 2 }}>
          {error}
        </ThemedText>
      ) : null}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setModalVisible(false)}>
          <Pressable
            style={[
              styles.dialog,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.dialogHeader}>
              <ThemedText type="subtitle" style={{ fontSize: 17, fontWeight: '700' }}>
                {label}
              </ThemedText>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={12}
                style={[styles.closeBtn, { backgroundColor: theme.border + '50' }]}>
                <Ionicons name="close" size={18} color={theme.text} />
              </Pressable>
            </View>

            <FlatList
              data={options as SelectOption<T>[]}
              keyExtractor={(item) => item.value}
              contentContainerStyle={styles.optionsList}
              ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      setModalVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.optionItem,
                      {
                        backgroundColor: isSelected
                          ? theme.primary + '15'
                          : pressed
                            ? theme.border + '30'
                            : 'transparent',
                        borderColor: isSelected ? theme.primary + '50' : 'transparent',
                      },
                    ]}>
                    <View style={styles.optionContent}>
                      <ThemedText
                        type={isSelected ? 'smallBold' : 'default'}
                        style={[
                          { fontSize: 15 },
                          isSelected && { color: theme.primary, fontWeight: '700' },
                        ]}>
                        {item.label}
                      </ThemedText>
                      {item.description ? (
                        <ThemedText
                          type="small"
                          themeColor="textSecondary"
                          style={{ marginTop: 2, fontSize: 12 }}>
                          {item.description}
                        </ThemedText>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={theme.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  trigger: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  valueText: {
    fontSize: 15,
    flex: 1,
    marginRight: Spacing.two,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  dialog: {
    maxHeight: '75%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three + 2,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    padding: Spacing.two,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionContent: {
    flex: 1,
    marginRight: Spacing.two,
  },
});
