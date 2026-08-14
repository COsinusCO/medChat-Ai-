import { SymbolView } from 'expo-symbols';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import type { CatalogCompany } from '@/types/chat';
import {
  formatDistance,
  formatReviewCount,
  localizedText,
  resolveCompanyAction,
  shortAddress,
} from '@/utils/company';

/**
 * A clinic from the catalog search, laid out like the Mini App's `AIFoodAssistantPlaceItem`:
 * name, `type · district`, `★ 4.9 (139) · 9 km`, and the partner's action button.
 */
export const CompanyCard = memo(function CompanyCard({
  company,
  onPress,
  onAction,
}: {
  company: CatalogCompany;
  onPress: (company: CatalogCompany) => void;
  onAction: (company: CatalogCompany) => void;
}) {
  const theme = useTheme();
  const { t, language } = useI18n();

  const address = shortAddress(company);
  const reviews = formatReviewCount(company.review_count);
  const distance = formatDistance(company, {
    meters: t('meters'),
    kilometers: t('kilometers'),
  });
  const action = resolveCompanyAction(company);
  const showAction = company.is_partner && !!action;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(company)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.bubbleIn, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <ThemedText type="smallBold" numberOfLines={2} style={styles.name}>
            {company.name}
          </ThemedText>
          {company.is_partner && (
            <SymbolView
              name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
              size={14}
              tintColor={theme.primary}
            />
          )}
        </View>

        {(!!company.type || !!address) && (
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {[company.type, address].filter(Boolean).join(' · ')}
          </ThemedText>
        )}

        <View style={styles.metaRow}>
          {typeof company.rating === 'number' && company.rating > 0 && (
            <View style={styles.meta}>
              <SymbolView
                name={{ ios: 'star.fill', android: 'star', web: 'star' }}
                size={11}
                tintColor={theme.warning}
              />
              <ThemedText type="caption" themeColor="textSecondary">
                {company.rating.toFixed(1)}
                {!!reviews && ` ${reviews}`}
              </ThemedText>
            </View>
          )}

          {!!distance && (
            <ThemedText type="caption" themeColor="textMuted">
              {distance}
            </ThemedText>
          )}

          {company.is_open !== undefined && (
            <ThemedText type="caption" themeColor={company.is_open ? 'success' : 'textMuted'}>
              {company.is_open ? t('open') : t('closed')}
            </ThemedText>
          )}
        </View>
      </View>

      {showAction && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onAction(company)}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.primaryMuted },
            pressed && styles.pressed,
          ]}>
          {action?.kind === 'menu' && (
            <SymbolView
              name={{ ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' }}
              size={14}
              tintColor={theme.primary}
            />
          )}
          <ThemedText type="smallBold" themeColor="primary">
            {localizedText(company.button?.name, language, t('call'))}
          </ThemedText>
        </Pressable>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: {
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  name: {
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 36,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.75,
  },
});
