import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ChatHeader } from '@/components/chat/chat-header';
import { ChatWelcome } from '@/components/chat/welcome';
import { Composer } from '@/components/chat/composer';
import { Message } from '@/components/chat/message';
import { ThinkingBubble } from '@/components/chat/thinking-bubble';
import { Spacing } from '@/constants/theme';
import { ChatHistorySheet } from '@/features/chat/chat-history-sheet';
import { useAuth } from '@/features/auth/auth-context';
import { useUserLocation } from '@/features/location/location-context';
import { useChat } from '@/hooks/use-chat';
import { usePartner } from '@/hooks/use-partner';
import { useTheme } from '@/hooks/use-theme';
import { useTranslate } from '@/i18n';
import { setChatFavorite } from '@/services/chat-service';
import type { CatalogCompany, ChatMessage } from '@/types/chat';
import { mediaUrl } from '@/utils/media-url';
import { openCompanyAction } from '@/utils/open-company-action';

export default function ChatScreen() {
  const theme = useTheme();
  const t = useTranslate();
  const router = useRouter();
  const { user } = useAuth();
  const { coords, request: requestLocation } = useUserLocation();
  const partner = usePartner();
  const [historyOpen, setHistoryOpen] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const displayName = user?.telegram_name || user?.full_name || 'TrueGis';
  const {
    messages,
    chatId,
    isFavorite,
    setIsFavorite,
    isStreaming,
    thinkingPhase,
    toolStatus,
    send,
    abort,
    startNewChat,
    openChat,
    retrySearch,
    retrySend,
  } = useChat({
    partnerName: partner.name,
    specialPrompt: partner.prompt,
    userDisplayName: displayName,
    coords,
  });

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleQuickAction = useCallback(
    (label: string) => {
      send(`${t('find')} ${label}`);
    },
    [send, t]
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!chatId) return;

    const next = !isFavorite;
    setIsFavorite(next);
    Haptics.selectionAsync().catch(() => {});

    try {
      await setChatFavorite(chatId, next);
    } catch {
      setIsFavorite(!next);
    }
  }, [chatId, isFavorite, setIsFavorite]);

  const handleCompanyPress = useCallback(
    (company: CatalogCompany) => router.push(`/company/${company._id}`),
    [router]
  );

  /** Grant location, then re-run the search that was blocked on it. */
  const handleRequestLocation = useCallback(
    async (messageId: string) => {
      await requestLocation();
      retrySearch(messageId);
    },
    [requestLocation, retrySearch]
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <Message
        message={item}
        onSuggestion={send}
        onCompanyPress={handleCompanyPress}
        onCompanyAction={(company) =>
          openCompanyAction(company, (place) => router.push(`/company/${place._id}/menu`))
        }
        onRequestLocation={handleRequestLocation}
        onRetry={retrySend}
        onRetrySearch={retrySearch}
      />
    ),
    [handleCompanyPress, handleRequestLocation, retrySearch, retrySend, send, router]
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ChatHeader
        photoUrl={mediaUrl(user?.telegram_profile_photo)}
        isFavorite={isFavorite}
        onOpenProfile={() => router.push('/profile')}
        onOpenHistory={() => setHistoryOpen(true)}
        onToggleFavorite={handleToggleFavorite}
        onNewChat={startNewChat}
      />

      {/* The composer is pinned to the bottom; only the keyboard lifts it. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.flex}>
          {messages.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.welcome}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <ChatWelcome
                industryTypes={partner.industryTypes}
                onPickIndustry={handleQuickAction}
              />
            </ScrollView>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
              ListFooterComponent={<ThinkingBubble phase={thinkingPhase} toolStatus={toolStatus} />}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            />
          )}
        </View>

        <Composer
          onSend={send}
          onStop={abort}
          isStreaming={isStreaming}
          placeholder={t('inputPlaceholder')}
        />
      </KeyboardAvoidingView>

      <ChatHistorySheet
        isOpen={historyOpen}
        activeChatId={chatId}
        onClose={() => setHistoryOpen(false)}
        onNewChat={() => {
          startNewChat();
          setHistoryOpen(false);
        }}
        onSelect={(id) => {
          setHistoryOpen(false);
          openChat(id).catch(() => {});
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  welcome: {
    flexGrow: 1,
    paddingBottom: Spacing.four,
  },
});
