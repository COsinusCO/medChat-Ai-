import { StyleSheet, View } from 'react-native';

import { TypingIndicator } from '@/components/chat/typing-indicator';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTranslate } from '@/i18n';
import type { TranslationKey } from '@/i18n/translations';
import type { ThinkingPhase, ToolStatus } from '@/hooks/use-chat-stream';

/** Tool keys the gateway emits in its `status` events (see AIFoodAssistant's STATUS_LABEL_KEYS). */
const TOOL_LABELS: Record<string, TranslationKey> = {
  search_catalog: 'toolSearchCatalog',
  generate_image: 'toolGenerateImage',
  edit_image: 'toolEditImage',
  search_marketplace: 'toolSearchMarketplace',
  create_listing: 'toolCreateListing',
  web_search: 'toolWebSearch',
};

/** Dots plus what the assistant is busy with right now. */
export function ThinkingBubble({
  phase,
  toolStatus,
}: {
  phase: ThinkingPhase;
  toolStatus: ToolStatus;
}) {
  const t = useTranslate();

  const label = toolStatus.key && TOOL_LABELS[toolStatus.key] ? t(TOOL_LABELS[toolStatus.key]) : null;
  const statusText = label ?? toolStatus.text;

  if (phase === 'idle') return null;
  // Once the text starts flowing the message itself is the feedback.
  if (phase === 'streaming' && !statusText) return null;

  return (
    <View style={styles.container}>
      <TypingIndicator />
      <ThemedText type="small" themeColor="textSecondary">
        {statusText ?? (phase === 'connecting' ? t('connecting') : t('thinking'))}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
