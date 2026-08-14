import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import type { InstagramStory } from '@/types/chat';

const STORY_MS = 5_000;

export function StoriesViewer({
  visible,
  stories,
  title,
  avatar,
  onClose,
}: {
  visible: boolean;
  stories: InstagramStory[];
  title?: string;
  avatar?: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = stories[index];

  useEffect(() => {
    if (!visible) {
      setIndex(0);
      return;
    }
    timer.current = setTimeout(() => {
      if (index < stories.length - 1) setIndex((n) => n + 1);
      else onClose();
    }, STORY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible, index, stories.length, onClose]);

  if (!visible || !current) return null;

  const url = current.is_video || current.media_type === 2
    ? current.video_url || current.image_url
    : current.image_url;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: '#000' }]}>
        <View style={styles.bars}>
          {stories.map((_, i) => (
            <View key={i} style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: i < index ? '100%' : i === index ? '100%' : '0%', opacity: i <= index ? 1 : 0.35 },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.header}>
          {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : null}
          <ThemedText style={styles.title} numberOfLines={1}>
            {title || t('stories')}
          </ThemedText>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={20}
              tintColor="#FFFFFF"
            />
          </Pressable>
        </View>

        {url ? (
          <Image source={{ uri: url }} style={{ width, height: height * 0.8 }} contentFit="contain" />
        ) : null}

        <View style={styles.hit}>
          <Pressable style={styles.half} onPress={() => setIndex((n) => Math.max(0, n - 1))} />
          <Pressable
            style={styles.half}
            onPress={() => {
              if (index < stories.length - 1) setIndex((n) => n + 1);
              else onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  hit: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    top: 80,
  },
  half: {
    flex: 1,
  },
});
