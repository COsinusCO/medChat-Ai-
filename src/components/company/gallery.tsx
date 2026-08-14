import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

/** `slice(0, 3)` in the web — one row before "Show more". */
const VISIBLE = 3;

/** `grid-template-columns: repeat(3, 1fr); gap: 8px` */
const COLUMNS = 3;
const GRID_GAP = Spacing.two;

export type GalleryItem = {
  id: string;
  url: string;
  thumbnail?: string;
  isVideo?: boolean;
};

/**
 * `EstablishmentGallery` — a three-column square grid of the venue's photos and Instagram media,
 * opening into the fullscreen viewer.
 */
export function EstablishmentGallery({ items }: { items: GalleryItem[] }) {
  const theme = useTheme();
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

  if (items.length === 0) return null;

  const shown = showAll ? items : items.slice(0, VISIBLE);
  const tileSize = gridWidth ? (gridWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS : 0;

  return (
    <View style={styles.section}>
      <ThemedText style={styles.heading}>{t('establishmentGallery')}</ThemedText>

      <View
        style={styles.grid}
        onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
        {shown.map((item, index) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => setViewerAt(index)}
            style={({ pressed }) => [
              styles.tile,
              { width: tileSize, height: tileSize, backgroundColor: theme.pageBackground },
              pressed && styles.pressed,
            ]}>
            <Image
              source={{ uri: item.thumbnail || item.url }}
              style={styles.fill}
              contentFit="cover"
              transition={150}
            />

            {item.isVideo && (
              <View style={styles.videoBadge}>
                <SymbolView
                  name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
                  size={16}
                  tintColor="#FFFFFF"
                />
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {items.length > VISIBLE && !showAll && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAll(true)}
          style={({ pressed }) => [
            styles.showMore,
            { backgroundColor: theme.cardBackground },
            pressed && styles.pressed,
          ]}>
          <ThemedText style={styles.showMoreText}>
            {t('showMore')} ({items.length - VISIBLE})
          </ThemedText>
        </Pressable>
      )}

      <GalleryViewer items={items} startAt={viewerAt} onClose={() => setViewerAt(null)} />
    </View>
  );
}

/** `MediaViewer` — the tapped photo full-bleed, swipeable through the rest. */
function GalleryViewer({
  items,
  startAt,
  onClose,
}: {
  items: GalleryItem[];
  startAt: number | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  if (startAt === null) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={[styles.viewer, { backgroundColor: theme.pageBackground }]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: startAt * width, y: 0 }}>
          {items.map((item) => (
            <Pressable key={item.id} onPress={onClose}>
              <Image
                source={{ uri: item.url }}
                style={{ width, height }}
                contentFit="contain"
                transition={150}
              />
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.viewerClose, { top: insets.top + Spacing.two }]}>
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={18}
            tintColor={theme.text}
          />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: Spacing.three,
    borderRadius: CompanyRadius.card,
  },
  heading: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: 12,
  },
  tile: {
    // Sized from the measured row width so three squares fill it exactly.
    borderRadius: CompanyRadius.tile,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  showMore: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    borderRadius: CompanyRadius.tile,
  },
  showMoreText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  viewer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerClose: {
    position: 'absolute',
    right: Spacing.three,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
