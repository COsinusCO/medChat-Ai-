import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTranslate, type Translate } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { deleteChat, fetchChats } from '@/services/chat-service';
import type { ChatSummary } from '@/types/chat';

/** Matches the web panel: 0.4s slide, 0.3s dim. */
const PANEL_DURATION = 400;
const BACKDROP_DURATION = 300;

type ChatHistorySheetProps = {
  isOpen: boolean;
  activeChatId: string | null;
  onClose: () => void;
  onSelect: (chatId: string) => void;
  onNewChat: () => void;
};

/**
 * Saved conversations in a drawer that slides in from the left — the same panel the Mini App
 * shows through `OpenFromLeft` (85% width, capped at 400, dimmed backdrop).
 *
 * Rendered inline rather than in a `Modal` so the exit animation can play before unmount; the
 * content itself is mounted only while open, so every open starts from a clean loading state.
 */
export function ChatHistorySheet({ isOpen, ...props }: ChatHistorySheetProps) {
  // Android hardware back closes the drawer instead of leaving the screen.
  useEffect(() => {
    if (!isOpen) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      props.onClose();
      return true;
    });
    return () => subscription.remove();
  }, [isOpen, props]);

  if (!isOpen) return null;

  return <ChatHistoryContent {...props} />;
}

function ChatHistoryContent({
  activeChatId,
  onClose,
  onSelect,
  onNewChat,
}: Omit<ChatHistorySheetProps, 'isOpen'>) {
  const theme = useTheme();
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  /** `null` while the list is still loading. */
  const [chats, setChats] = useState<ChatSummary[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchChats(controller.signal)
      .then((loaded) => {
        if (!controller.signal.aborted) setChats(loaded);
      })
      .catch(() => {
        if (!controller.signal.aborted) setChats([]);
      });

    return () => controller.abort();
  }, []);

  const handleDelete = useCallback(async (chatId: string) => {
    setChats((current) => (current ?? []).filter((chat) => chat.id !== chatId));
    try {
      await deleteChat(chatId);
    } catch {
      // Keep the optimistic removal; the next open refetches the real list.
    }
  }, []);

  const sections = groupChats(chats ?? [], t);

  return (
    <>
      <Animated.View
        entering={FadeIn.duration(BACKDROP_DURATION)}
        exiting={FadeOut.duration(BACKDROP_DURATION)}
        style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
      </Animated.View>

      <Animated.View
        entering={SlideInLeft.duration(PANEL_DURATION)}
        exiting={SlideOutLeft.duration(PANEL_DURATION)}
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            paddingTop: insets.top + Spacing.two,
            paddingBottom: insets.bottom + Spacing.three,
          },
        ]}>
        <View style={styles.header}>
          <ThemedText type="heading">{t('chatHistory')}</ThemedText>
          <IconButton
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            accessibilityLabel={t('cancel')}
            size={20}
            onPress={onClose}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onNewChat}
          style={({ pressed }) => [
            styles.newChat,
            { backgroundColor: theme.primaryMuted },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'plus', android: 'add', web: 'add' }}
            size={18}
            tintColor={theme.primary}
          />
          <ThemedText type="smallBold" themeColor="primary">
            {t('newChat')}
          </ThemedText>
        </Pressable>

        {chats === null ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.centered}>
            <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
              {t('emptyChats')}
            </ThemedText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {sections.map((section) => (
              <View key={section.title} style={styles.section}>
                <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionTitle}>
                  {section.title.toUpperCase()}
                </ThemedText>

                {section.items.map((chat) => (
                  <Pressable
                    key={chat.id}
                    accessibilityRole="button"
                    onPress={() => onSelect(chat.id)}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        backgroundColor:
                          chat.id === activeChatId ? theme.backgroundSelected : theme.backgroundElement,
                      },
                      pressed && styles.pressed,
                    ]}>
                    {chat.is_favorite && (
                      <SymbolView
                        name={{ ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }}
                        size={14}
                        tintColor={theme.primary}
                      />
                    )}

                    <ThemedText type="small" numberOfLines={1} style={styles.rowTitle}>
                      {chat.title}
                    </ThemedText>

                    <IconButton
                      name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                      accessibilityLabel={t('delete')}
                      size={16}
                      color={theme.textMuted}
                      style={styles.deleteButton}
                      onPress={() => handleDelete(chat.id)}
                    />
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </>
  );
}

function groupChats(chats: ChatSummary[], t: Translate) {
  const favorites = chats.filter((chat) => chat.is_favorite);
  const rest = chats.filter((chat) => !chat.is_favorite);

  return [
    { title: t('favorites'), items: favorites },
    { title: t('today'), items: rest.filter((chat) => chat.section === 'today') },
    { title: t('yesterday'), items: rest.filter((chat) => chat.section === 'yesterday') },
    {
      title: t('earlier'),
      items: rest.filter((chat) => chat.section !== 'today' && chat.section !== 'yesterday'),
    },
  ].filter((section) => section.items.length > 0);
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  sheet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '85%',
    maxWidth: 400,
    zIndex: 1001,
    paddingHorizontal: Spacing.three,
    borderTopRightRadius: Radius.large,
    borderBottomRightRadius: Radius.large,
    gap: Spacing.three,
    // Same lift as the web panel's `box-shadow: 2px 0 10px rgba(0,0,0,.2)`.
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 0 },
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  newChat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingVertical: Spacing.two + 4,
    borderRadius: Radius.large,
  },
  list: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  section: {
    gap: Spacing.one,
  },
  sectionTitle: {
    letterSpacing: 0.6,
    marginLeft: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
  rowTitle: {
    flex: 1,
  },
  deleteButton: {
    width: 28,
    height: 28,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
