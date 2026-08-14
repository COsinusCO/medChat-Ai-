import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { MapResults } from '@/components/chat/map-results';
import { Markdown } from '@/components/chat/markdown';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTranslate, type Translate } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import type { CatalogCompany, ChatMessage } from '@/types/chat';

type MessageProps = {
  message: ChatMessage;
  onSuggestion: (suggestion: string) => void;
  onCompanyPress: (company: CatalogCompany) => void;
  onCompanyAction: (company: CatalogCompany) => void;
  /** Asks for location, then retries the search this message was waiting on. */
  onRequestLocation: (messageId: string) => void;
  /** Re-sends the prompt behind a failed turn. */
  onRetry: (messageId: string) => void;
  /** Re-runs just the catalog search of this turn. */
  onRetrySearch: (messageId: string) => void;
};

/** The gateway's error names, mapped to what the web client says for each. */
function errorMessage(errorName: string | undefined, t: Translate) {
  if (errorName === 'DAILY_LIMIT_EXCEEDED') return t('errorDailyLimit');
  if (errorName === 'RATE_LIMITED') return t('errorRateLimited');
  if (errorName === 'UNAVAILABLE') return t('errorUnavailable');
  return t('error');
}

/**
 * User turns are grey bubbles on the right; assistant turns are full-width text, the same split
 * the Mini App uses (`aiFoodAssistant__message--user` / `--ai`).
 */
export const Message = memo(function Message({
  message,
  onSuggestion,
  onCompanyPress,
  onCompanyAction,
  onRequestLocation,
  onRetry,
  onRetrySearch,
}: MessageProps) {
  const theme = useTheme();
  const t = useTranslate();

  if (message.isUser) {
    return (
      <View style={[styles.userBubble, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText>{message.text}</ThemedText>
      </View>
    );
  }

  // An empty streaming turn shows nothing: the thinking bubble under the list is the feedback.
  const hasBody = !!message.text || message.hasError;

  return (
    <View style={styles.assistant}>
      {message.hasError ? (
        <View style={[styles.errorCard, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="danger">
            {errorMessage(message.errorName, t)}
          </ThemedText>

          {!!message.errorDetail && (
            <ThemedText type="caption" themeColor="textMuted" selectable>
              {message.errorDetail}
            </ThemedText>
          )}

          {!!message.sourceText && (
            <Pressable
              accessibilityRole="button"
              onPress={() => onRetry(message.id)}
              style={({ pressed }) => [
                styles.retryButton,
                { backgroundColor: theme.primary },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                {t('retry')}
              </ThemedText>
            </Pressable>
          )}
        </View>
      ) : (
        hasBody && <Markdown text={message.text} />
      )}

      {message.isSearching && (
        <View style={styles.searching}>
          <ActivityIndicator size="small" color={theme.primary} />
          <ThemedText type="caption" themeColor="textSecondary">
            {t('searching')}
          </ThemedText>
        </View>
      )}

      {message.needsLocation && (
        <View style={[styles.locationCard, { backgroundColor: theme.primaryMuted }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('locationNeeded')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => onRequestLocation(message.id)}
            style={({ pressed }) => [
              styles.locationButton,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              {t('locationAllow')}
            </ThemedText>
          </Pressable>
        </View>
      )}

      {!!message.searchResults?.length && (
        <MapResults
          companies={message.searchResults}
          onSelect={onCompanyPress}
          onAction={onCompanyAction}
        />
      )}

      {!!message.searchError && (
        <View style={[styles.errorCard, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="danger">
            {t('searchFailed')}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted" selectable>
            {message.searchError}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => onRetrySearch(message.id)}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              {t('retry')}
            </ThemedText>
          </Pressable>
        </View>
      )}

      {message.searchResults?.length === 0 &&
        !message.isSearching &&
        !message.needsLocation &&
        !message.searchError && (
          <ThemedText type="caption" themeColor="textMuted">
            {t('nothingFound')}
          </ThemedText>
        )}

      {!!message.suggestions?.length && !message.isStreaming && (
        <View style={styles.suggestions}>
          {message.suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              accessibilityRole="button"
              onPress={() => onSuggestion(suggestion)}
              style={({ pressed }) => [
                styles.suggestion,
                { borderColor: theme.border, backgroundColor: theme.bubbleIn },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" themeColor="primary">
                {suggestion}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.bubble + 4,
    borderTopRightRadius: Radius.small / 2,
  },
  assistant: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    paddingHorizontal: Spacing.half,
  },
  errorCard: {
    padding: Spacing.three,
    borderRadius: Radius.large,
    gap: Spacing.two,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
  },
  searching: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  locationCard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
  },
  locationButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
  },
  suggestions: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  suggestion: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.7,
  },
});
