import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function QtyStepper({
  count,
  onInc,
  onDec,
  disabled,
}: {
  count: number;
  onInc: () => void;
  onDec: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.fill }]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || count <= 0}
        onPress={onDec}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
        <SymbolView
          name={{ ios: 'minus', android: 'remove', web: 'remove' }}
          size={16}
          tintColor={theme.text}
        />
      </Pressable>
      <ThemedText style={styles.count}>{count}</ThemedText>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onInc}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
        <SymbolView
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={16}
          tintColor={theme.text}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: CompanyRadius.button,
    overflow: 'hidden',
  },
  btn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});
