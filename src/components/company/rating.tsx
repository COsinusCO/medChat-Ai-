import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AddComment } from '@/components/company/add-comment';
import { RatingStars } from '@/components/company/rating-stars';
import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import type { CompanyDetail } from '@/types/chat';

/**
 * `Raiting` — the review header: the Google-sourced score on the right, the count and a link to
 * the venue's Google reviews on the left, and the "rate this place" row underneath.
 */
export function Rating({
  company,
  onReviewSent,
}: {
  company: CompanyDetail;
  /** Bumps the reviews list so a freshly posted review shows up. */
  onReviewSent: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [stars, setStars] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);

  /** Tapping a star both records it and opens the composer, as the web's bubbling click does. */
  const rate = (value: number) => {
    setStars(value);
    setComposerOpen(true);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.separatorStrong }]}>
        <View style={styles.headerText}>
          <ThemedText style={styles.title}>{t('reviewsTitle')}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.hint }]}>
            {t('basedOnReviews', { count: company.review_count ?? 0 })}
            {!!company.reviews_link && (
              <ThemedText
                style={[styles.subtitle, { color: theme.link }]}
                onPress={() => Linking.openURL(company.reviews_link!).catch(() => {})}>
                {' Google'}
              </ThemedText>
            )}
          </ThemedText>
        </View>

        <View style={[styles.score, { backgroundColor: theme.pageBackground }]}>
          <SymbolView
            name={{ ios: 'star.fill', android: 'star', web: 'star' }}
            size={24}
            tintColor={theme.gold}
          />
          <ThemedText style={styles.scoreText}>{company.rating ?? '0'}</ThemedText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setComposerOpen(true)}
        style={({ pressed }) => [
          styles.starsRow,
          { backgroundColor: theme.pageBackground },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={[styles.ratePlace, { color: theme.hint }]}>{t('ratePlace')}</ThemedText>
        <RatingStars count={stars} onRate={rate} />
      </Pressable>

      <AddComment
        company={company}
        visible={composerOpen}
        rating={stars}
        onChangeRating={setStars}
        onClose={() => setComposerOpen(false)}
        onSubmitted={onReviewSent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 17,
    paddingHorizontal: Spacing.three,
    borderRadius: CompanyRadius.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.three,
    marginBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    borderRadius: CompanyRadius.inner,
    paddingVertical: Spacing.two,
    paddingHorizontal: 12,
  },
  scoreText: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
    letterSpacing: 0.22,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: CompanyRadius.inner,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
  },
  ratePlace: {
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  pressed: {
    opacity: 0.8,
  },
});
