import { memo, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompanyCard } from '@/components/chat/company-card';
import { mapPinsFrom } from '@/components/chat/map-pins';
import { SearchMap } from '@/components/chat/search-map';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTranslate } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import type { CatalogCompany } from '@/types/chat';
import { getExpoMaps } from '@/utils/expo-maps';

const PREVIEW_HEIGHT = 350;
const canShowMap = Platform.OS === 'web' || !!getExpoMaps();

type MapResultsProps = {
  companies: CatalogCompany[];
  onSelect: (company: CatalogCompany) => void;
  onAction: (company: CatalogCompany) => void;
};

/**
 * Search results as in the Mini App's `MapResultsBubble`: a tappable map card, then the clinic
 * list. Opening the card fills the screen with the same map (web: MapLibre, native: Apple/Google).
 */
export const MapResults = memo(function MapResults({
  companies,
  onSelect,
  onAction,
}: MapResultsProps) {
  const theme = useTheme();
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const pins = useMemo(() => mapPinsFrom(companies), [companies]);

  const ordered = useMemo(() => {
    if (!focusedId) return companies;
    const focused = companies.find((company) => company._id === focusedId);
    if (!focused) return companies;
    return [focused, ...companies.filter((company) => company._id !== focusedId)];
  }, [companies, focusedId]);

  const openCompany = (company: CatalogCompany) => {
    setExpanded(false);
    onSelect(company);
  };

  return (
    <View style={styles.container}>
      {canShowMap && pins.length > 0 && (
        <View
          style={[
            styles.preview,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
          ]}>
          <SearchMap pins={pins} interactive={false} style={styles.previewMap} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('expandMap')}
            onPress={() => setExpanded(true)}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      <View style={styles.cards}>
        {ordered.map((company) => (
          <CompanyCard
            key={company._id}
            company={company}
            onPress={onSelect}
            onAction={onAction}
          />
        ))}
      </View>

      <Modal
        visible={expanded}
        animationType="slide"
        onRequestClose={() => setExpanded(false)}>
        <View style={[styles.expanded, { backgroundColor: theme.background, paddingTop: insets.top }]}>
          <View style={styles.expandedHeader}>
            <ThemedText type="bodyStrong">{t('expandMap')}</ThemedText>
            <IconButton
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              accessibilityLabel={t('cancel')}
              onPress={() => setExpanded(false)}
            />
          </View>

          <SearchMap
            pins={pins}
            interactive
            onMarkerPress={setFocusedId}
            style={styles.expandedMap}
          />

          <ScrollView
            style={styles.expandedCards}
            contentContainerStyle={{
              gap: Spacing.two,
              padding: Spacing.three,
              paddingBottom: insets.bottom + Spacing.two,
            }}>
            {ordered.map((company) => (
              <CompanyCard
                key={company._id}
                company={company}
                onPress={openCompany}
                onAction={onAction}
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
});

export function MapResultsSkeleton() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.preview,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  preview: {
    height: PREVIEW_HEIGHT,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  previewMap: {
    ...StyleSheet.absoluteFill,
  },
  cards: {
    gap: Spacing.two,
  },
  expanded: {
    flex: 1,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  expandedMap: {
    flex: 1,
    minHeight: 240,
  },
  expandedCards: {
    maxHeight: 280,
  },
});
