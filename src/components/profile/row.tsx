import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type RowProps = {
  icon?: SymbolViewProps['name'];
  label: string;
  /** Right-aligned static value. */
  value?: string;
  /** Renders a chevron and makes the row pressable. */
  onPress?: () => void;
  /** Renders a switch instead of a value. */
  toggle?: { value: boolean; onChange: (next: boolean) => void };
  danger?: boolean;
  /** Drops the divider for the last row of a section. */
  last?: boolean;
  children?: ReactNode;
};

export function Row({ icon, label, value, onPress, toggle, danger, last, children }: RowProps) {
  const theme = useTheme();
  const tint = danger ? theme.danger : theme.primary;

  const content = (
    <View
      style={[
        styles.row,
        { borderBottomColor: theme.separator },
        last && styles.rowLast,
      ]}>
      {icon && (
        <View style={[styles.iconBox, { backgroundColor: theme.background }]}>
          <SymbolView name={icon} size={18} tintColor={tint} />
        </View>
      )}

      <View style={styles.labelBox}>
        <ThemedText type="small" themeColor={danger ? 'danger' : 'text'}>
          {label}
        </ThemedText>
        {children}
      </View>

      {!!value && (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.value}>
          {value}
        </ThemedText>
      )}

      {toggle && (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ true: theme.primary, false: theme.backgroundSelected }}
        />
      )}

      {!!onPress && (
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={14}
          tintColor={theme.textMuted}
        />
      )}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => pressed && { backgroundColor: theme.backgroundSelected }}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelBox: {
    flex: 1,
    gap: Spacing.half,
  },
  value: {
    flexShrink: 1,
    maxWidth: '45%',
    textAlign: 'right',
  },
});
