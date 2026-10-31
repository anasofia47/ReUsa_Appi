import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'small' | 'medium' | 'large';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'medium',
  icon,
  loading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bgMap: Record<Variant, string> = {
    primary: theme.primary,
    secondary: theme.backgroundElement,
    danger: theme.danger,
    ghost: 'transparent',
  };

  const textMap: Record<Variant, string> = {
    primary: theme.onPrimary,
    secondary: theme.text,
    danger: '#FFFFFF',
    ghost: theme.primary,
  };

  const borderMap: Record<Variant, string> = {
    primary: 'transparent',
    secondary: theme.border,
    danger: 'transparent',
    ghost: 'transparent',
  };

  const minHeight = size === 'small' ? 36 : size === 'large' ? 52 : 46;
  const paddingH = size === 'small' ? Spacing.two : Spacing.four;
  const fontSize = size === 'small' ? 13 : size === 'large' ? 16 : 14;
  const iconSize = size === 'small' ? 16 : 18;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight,
          paddingHorizontal: paddingH,
          backgroundColor: bgMap[variant],
          borderColor: borderMap[variant],
        },
        variant === 'primary' && !isDisabled && styles.primaryShadow,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={textMap[variant]} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon ? (
            <Ionicons
              name={icon}
              size={iconSize}
              color={textMap[variant]}
              style={styles.icon}
            />
          ) : null}
          <ThemedText
            type="smallBold"
            style={{
              color: textMap[variant],
              fontSize,
              fontWeight: '600',
            }}>
            {title}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 6,
  },
  primaryShadow: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
