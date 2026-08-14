import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

/** `transition: all 0.3s ease-in-out` on `.bottom-sheet` — how long the panel takes to rise. */
const SLIDE_MS = 300;

/**
 * The Mini App's `BottomSheet`: a dimmed backdrop, a `--bg-color` panel with 35px top corners,
 * a bold 20px title and a round close button. Content scrolls inside the panel.
 *
 * The dimming and the panel are animated separately, as on the web: `.bottom__wrapper` fades its
 * background in where it stands while `.bottom-sheet` translates up from below. A plain
 * `animationType="slide"` would drag the dark layer up with the panel instead.
 */
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the scroll area — the web's `position: fixed` action bar. */
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { height } = useWindowDimensions();

  return (
    // `fade` dims the whole overlay in place; the panel adds its own upward slide on top.
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable accessibilityRole="button" style={styles.dismissArea} onPress={onClose} />

        <Animated.View
          entering={SlideInDown.duration(SLIDE_MS)}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.pageBackground,
              // `max-height: 87vh` on the sheet's scroll area.
              maxHeight: height * 0.87,
              paddingBottom: insets.bottom,
            },
          ]}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: theme.separatorStrong }]} />
          </View>

          <View style={styles.header}>
            <ThemedText style={styles.title} numberOfLines={2}>
              {title}
            </ThemedText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('cancel')}
              hitSlop={8}
              onPress={onClose}
              style={[styles.close, { backgroundColor: theme.separatorStrong }]}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={14}
                tintColor={theme.text}
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}>
            {children}
          </ScrollView>

          {footer}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    overflow: 'hidden',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: Radius.pill,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  title: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    // Lets the panel keep its footer visible once the content outgrows `maxHeight`.
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
});
