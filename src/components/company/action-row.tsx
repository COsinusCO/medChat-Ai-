import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ActionIcon = SymbolViewProps['name'];

/**
 * `ContactsActions` — one row of the contacts list: a 24px icon, the label, and a hairline that
 * stops 7% short of the left edge (`width: 93%`, right-aligned) unless it is the last row.
 */
export function ActionRow({
  icon,
  label,
  leading,
  disabled,
  last,
  trailing,
  onPress,
}: {
  icon?: ActionIcon;
  label: string;
  /** `mainText` — replaces the icon with a text column (the weekday in the hours list). */
  leading?: string;
  disabled?: boolean;
  last?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress || disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}>
      {leading ? (
        <ThemedText style={styles.leading}>{leading}</ThemedText>
      ) : icon ? (
        <View style={styles.icon}>
          <SymbolView name={icon} size={24} tintColor={theme.text} />
        </View>
      ) : null}

      <ThemedText
        numberOfLines={1}
        style={[styles.label, { color: disabled ? theme.destructive : theme.text }]}>
        {label}
      </ThemedText>

      {trailing}

      {!last && <View style={[styles.separator, { backgroundColor: theme.separatorStrong }]} />}
    </Pressable>
  );
}

/**
 * `DropDownMenu` — the same row with a chevron that flips, revealing its panel underneath.
 * The web transitions `max-height` over 0.5s; here the panel fades in and out.
 */
export function ExpandableRow({
  icon,
  label,
  last,
  children,
}: {
  icon?: ActionIcon;
  label: string;
  last?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <ActionRow
        icon={icon}
        label={label}
        last={last || open}
        onPress={() => setOpen((value) => !value)}
        trailing={
          <SymbolView
            name={
              open
                ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
                : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }
            }
            size={14}
            tintColor={theme.text}
          />
        }
      />

      {open && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.panel}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 20,
  },
  icon: {
    padding: 2,
  },
  leading: {
    minWidth: 96,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  label: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  separator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '93%',
    height: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  panel: {
    paddingBottom: 15,
  },
  pressed: {
    opacity: 0.7,
  },
});
