import { StyleSheet, Text, type TextProps } from 'react-native';
import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'small' | 'smallBold' | 'link' | 'linkPrimary';
  themeColor?: ThemeColor;
};

/** Texto que toma su color del tema (claro/oscuro) y ofrece los estilos tipográficos de la app. */
export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'subtitle' && styles.subtitle,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.linkPrimary, { color: theme.primary }],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  title: { fontSize: 32, fontWeight: '700', lineHeight: 38 },
  subtitle: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  link: { lineHeight: 24, fontSize: 14 },
  linkPrimary: { lineHeight: 24, fontSize: 14, fontWeight: '600' },
});
