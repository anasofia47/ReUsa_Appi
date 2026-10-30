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
      <ThemedText type="smallBold">{label}</ThemedText>

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
            opacity: pressed ? 0.8 : 1,
          },
        ]}>
        <ThemedText
          style={[
            styles.valueText,
            !selectedOption && { color: theme.textSecondary },
          ]}
          numberOfLines={1}>
          {selectedOption ? selectedOption.label : placeholder}
        </ThemedText>
        <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
      </Pressable>

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
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
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.dialogHeader}>
              <ThemedText type="subtitle" style={{ fontSize: 18 }}>
                {label}
              </ThemedText>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={10}
                style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={theme.text} />
              </Pressable>
            </View>

            <FlatList
              data={options as SelectOption<T>[]}
              keyExtractor={(item) => item.value}
              contentContainerStyle={styles.optionsList}
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
                          ? theme.primary + '18'
                          : pressed
                            ? theme.backgroundElement
                            : 'transparent',
                        borderColor: isSelected ? theme.primary : 'transparent',
                      },
                    ]}>
                    <View style={styles.optionContent}>
                      <ThemedText
                        type={isSelected ? 'smallBold' : 'default'}
                        style={isSelected ? { color: theme.primary } : undefined}>
                        {item.label}
                      </ThemedText>
                      {item.description ? (
                        <ThemedText
                          type="small"
                          themeColor="textSecondary"
                          style={{ marginTop: 2 }}>
                          {item.description}
                        </ThemedText>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
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
    gap: Spacing.one,
  },
  trigger: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueText: {
    fontSize: 16,
    flex: 1,
    marginRight: Spacing.two,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  dialog: {
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  closeBtn: {
    padding: Spacing.one,
  },
  optionsList: {
    padding: Spacing.two,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 3,
  },
  optionContent: {
    flex: 1,
    marginRight: Spacing.two,
  },
});
