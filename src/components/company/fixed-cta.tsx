import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function FixedCta({
  label,
  onPress,
  disabled,
  hint,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: insets.bottom + Spacing.two,
          backgroundColor: theme.pageBackground,
          borderTopColor: theme.separatorStrong,
        },
      ]}>
      {!!hint && (
        <ThemedText type="caption" themeColor="hint" style={styles.hint}>
          {hint}
        </ThemedText>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.buttonColor },
          (pressed || disabled) && styles.pressed,
        ]}>
        <ThemedText style={[styles.label, { color: theme.buttonTextColor }]}>{label}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hint: {
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: CompanyRadius.button,
  },
  label: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
