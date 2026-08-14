import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { useTranslate } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

type ComposerProps = {
  onSend: (text: string) => void;
  placeholder: string;
  /** While the assistant streams, the send button turns into a stop button. */
  isStreaming?: boolean;
  onStop?: () => void;
  disabled?: boolean;
};

export function Composer({ onSend, placeholder, isStreaming, onStop, disabled }: ComposerProps) {
  const theme = useTheme();
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [text, setText] = useState('');

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !disabled && !isStreaming;

  const handlePress = () => {
    if (isStreaming) {
      onStop?.();
      return;
    }
    if (!canSend) return;

    Haptics.selectionAsync().catch(() => {});
    onSend(trimmed);
    setText('');
  };

  return (
    <View
      style={[
        styles.container,
        {
          // The home-indicator inset only matters while the keyboard is down.
          paddingBottom: keyboardVisible ? Spacing.two : Math.max(insets.bottom, Spacing.two),
          backgroundColor: theme.background,
          borderTopColor: theme.separator,
        },
      ]}>
      <View style={[styles.wrapper, { backgroundColor: theme.backgroundElement }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }]}
          multiline
          maxLength={4000}
          submitBehavior="newline"
          editable={!disabled}
          accessibilityLabel={placeholder}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isStreaming ? t('stop') : t('send')}
          disabled={!canSend && !isStreaming}
          onPress={handlePress}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: canSend || isStreaming ? theme.primary : theme.backgroundSelected,
            },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={
              isStreaming
                ? { ios: 'stop.fill', android: 'stop', web: 'stop' }
                : { ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }
            }
            size={20}
            tintColor={canSend || isStreaming ? theme.onPrimary : theme.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    borderRadius: Radius.bubble + 4,
    padding: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    maxHeight: 120,
    minHeight: 28,
    paddingHorizontal: Spacing.two,
    paddingVertical: Platform.select({ ios: Spacing.two, default: Spacing.one }),
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
