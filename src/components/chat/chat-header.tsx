import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTranslate } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

type ChatHeaderProps = {
  photoUrl?: string | null;
  isFavorite: boolean;
  onOpenProfile: () => void;
  onOpenHistory: () => void;
  onToggleFavorite: () => void;
  onNewChat: () => void;
};

/** Avatar + menu on the left, the title pill centred, bookmark + reset on the right. */
export function ChatHeader({
  photoUrl,
  isFavorite,
  onOpenProfile,
  onOpenHistory,
  onToggleFavorite,
  onNewChat,
}: ChatHeaderProps) {
  const theme = useTheme();
  const t = useTranslate();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.row}>
        <View
          style={[
            styles.group,
            { borderColor: theme.separator, backgroundColor: theme.overlaySoft },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile')}
            onPress={onOpenProfile}
            style={({ pressed }) => pressed && styles.pressed}>
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={[styles.photo, { borderColor: theme.border }]}
                contentFit="cover"
              />
            ) : (
              <BrandLogo variant="icon" style={[styles.photo, { borderColor: theme.border }]} />
            )}
          </Pressable>

          <IconButton
            name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
            accessibilityLabel={t('chatHistory')}
            size={22}
            style={styles.iconButton}
            onPress={onOpenHistory}
          />
        </View>

        <View
          style={[
            styles.group,
            { borderColor: theme.separator, backgroundColor: theme.overlaySoft },
          ]}>
          <IconButton
            name={
              isFavorite
                ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }
                : { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }
            }
            accessibilityLabel={t('favorites')}
            size={20}
            color={isFavorite ? theme.primary : theme.text}
            style={styles.iconButton}
            onPress={onToggleFavorite}
          />
          <IconButton
            name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
            accessibilityLabel={t('newChat')}
            size={20}
            style={styles.iconButton}
            onPress={onNewChat}
          />
        </View>
      </View>

      <View pointerEvents="none" style={[styles.titleLayer, { top: insets.top + Spacing.two }]}>
        <View
          style={[
            styles.titlePill,
            { borderColor: theme.separator, backgroundColor: theme.overlaySoft },
          ]}>
          <ThemedText style={styles.titleText}>{t('aiTitle')}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.one + 2,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  photo: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  iconButton: {
    width: 34,
    height: 34,
  },
  titleLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  titleText: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
