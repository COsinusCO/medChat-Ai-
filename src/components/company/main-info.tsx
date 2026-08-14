import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, View } from 'react-native';

import { ActionRow } from '@/components/company/action-row';
import { CollapseMore } from '@/components/company/collapse-more';
import { Distance } from '@/components/company/distance';
import { WorkTime } from '@/components/company/work-time';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Toast } from '@/components/ui/toast';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { toggleFavorite } from '@/services/company-service';
import type { CompanyDetail } from '@/types/chat';
import { localizedText } from '@/utils/company';
import { mediaUrl } from '@/utils/media-url';
import { companyShareLink } from '@/utils/share-company';
import { convertTo24HourFormat, translateWeekday, WEEKDAYS } from '@/utils/working-hours';

/** How many `about.details` chips are shown before "Show more". */
const VISIBLE_DETAILS = 5;

/**
 * `MainInfo` — the identity card under the hero: logo, name, bookmark, short description,
 * today's hours next to the distance, the partner's primary button, the four quick actions and
 * the amenity chips.
 */
export function MainInfo({
  company,
  hasStories,
  onOpenMenu,
  onOpenStories,
}: {
  company: CompanyDetail;
  hasStories: boolean;
  onOpenMenu?: () => void;
  onOpenStories?: () => void;
}) {
  const theme = useTheme();
  const { t, language } = useI18n();

  const [favorite, setFavorite] = useState(!!company.is_favorite);
  const [toast, setToast] = useState<string | null>(null);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);

  const details = useMemo(() => collectDetails(company), [company]);
  const shownDetails = showAllDetails ? details : details.slice(0, VISIBLE_DETAILS);

  const logo = mediaUrl(
    company.logo || company.logoThumbnail || company.image || company.logo_icon_light
  );
  const phone = company.phone_number?.replace(/[^\d+]/g, '');
  // The catalog types `description` as `any`; only a real string is renderable.
  const description = typeof company.description === 'string' ? company.description : '';

  const toggleBookmark = async () => {
    const next = !favorite;
    setFavorite(next);
    Haptics.selectionAsync().catch(() => {});

    try {
      await toggleFavorite(company._id);
      setToast(next ? t('successSaved') : t('successUnSaved'));
    } catch {
      setFavorite(!next);
    }
  };

  /** `handleOrder` — the configured button wins, otherwise the venue is simply called. */
  const runPrimaryAction = () => {
    const button = company.button;

    if (!button?.value) {
      if (phone) openUrl(`tel:${phone}`);
      return;
    }

    switch (button.type) {
      case 'call_number':
        openUrl(`tel:${button.value.replace(/[^\d+]/g, '')}`);
        return;
      case 'link':
        openUrl(
          button.value.startsWith('http')
            ? button.value
            : `https://t.me/${button.value.replace(/^@/, '')}`
        );
        return;
      case 'web_url':
        openUrl(button.value);
        return;
      case 'inside_app':
        // There is no in-app menu screen here, so those partners are called instead.
        if (onOpenMenu) onOpenMenu();
        else if (phone) openUrl(`tel:${phone}`);
        return;
      default:
        if (phone) openUrl(`tel:${phone}`);
    }
  };

  /**
   * `handleChatNumber` — Uzbek landline prefixes have no Telegram account, so those companies
   * are reached through their support number instead.
   */
  const telegramLink = () => {
    if (!phone) return null;

    const landlineCodes = ['71', '72', '73', '74', '75', '76', '77', '79', '61', '62', '65', '66', '67', '36'];
    if (phone.startsWith('+998') && landlineCodes.includes(phone.slice(4, 6))) {
      const support = company.support_number?.replace(/[^\d+]/g, '');
      return support ? `https://t.me/${support}` : null;
    }

    return `https://t.me/${phone}`;
  };

  const openRoute = () => {
    const lat = company.latitude ?? company.location?.coordinates?.[1];
    const lon = company.longitude ?? company.location?.coordinates?.[0];
    if (lat == null || lon == null) return;

    openUrl(`https://maps.google.com/?q=${lat},${lon}(${encodeURIComponent(company.name)})`);
  };

  const share = () => {
    Share.share({
      message: `${company.name}\n${companyShareLink(company._id)}`,
      url: companyShareLink(company._id),
    }).catch(() => {});
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.logoRow}>
          <StoryAvatar uri={logo} hasStories={hasStories} onPress={onOpenStories} />

          <View style={styles.nameColumn}>
            <View style={styles.partnerRow}>
              <ThemedText style={styles.name} numberOfLines={2}>
                {company.name}
              </ThemedText>
              {company.is_partner && (
                <SymbolView
                  name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
                  size={17}
                  tintColor={theme.buttonColor}
                />
              )}
            </View>
            {!!company.type && <ThemedText style={styles.type}>{company.type}</ThemedText>}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('favorites')}
            hitSlop={8}
            onPress={toggleBookmark}>
            <SymbolView
              name={
                favorite
                  ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }
                  : { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }
              }
              size={22}
              tintColor={theme.text}
            />
          </Pressable>
        </View>

        {!!description && (
          <>
            <ThemedText style={[styles.shortText, { color: theme.hint }]}>
              {t('shortDescription')}
            </ThemedText>
            <CollapseMore text={description} maxLength={90} textStyle={styles.mainText} />
          </>
        )}

        <View style={styles.timeDistance}>
          <Pressable style={styles.half} onPress={() => setHoursOpen(true)}>
            <WorkTime hours={company.working_hours} />
          </Pressable>
          <View style={styles.half}>
            <Distance company={company} />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!company.button && !company.phone_number}
          onPress={runPrimaryAction}
          style={({ pressed }) => [
            styles.orderButton,
            { backgroundColor: theme.buttonColor },
            (pressed || (!company.button && !company.phone_number)) && styles.pressed,
          ]}>
          {company.button?.type === 'inside_app' && company.button?.value === 'menu' && (
            <SymbolView
              name={{ ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' }}
              size={20}
              tintColor={theme.buttonTextColor}
            />
          )}
          <ThemedText style={[styles.orderText, { color: theme.buttonTextColor }]}>
            {localizedText(company.button?.name, language, t('call'))}
          </ThemedText>
        </Pressable>

        <View style={styles.actionButtons}>
          <ActionTile
            icon={{ ios: 'map.fill', android: 'map', web: 'map' }}
            label={t('route')}
            onPress={openRoute}
          />
          {!!company.phone_number && (
            <ActionTile
              icon={{ ios: 'paperplane.fill', android: 'send', web: 'send' }}
              label={t('chat')}
              onPress={() => {
                const link = telegramLink();
                if (link) openUrl(link);
              }}
            />
          )}
          <ActionTile
            icon={{ ios: 'phone.fill', android: 'call', web: 'call' }}
            label={t('call')}
            onPress={() => phone && openUrl(`tel:${phone}`)}
          />
          <ActionTile
            icon={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
            label={t('share')}
            onPress={share}
          />
        </View>

        {details.length > 0 && (
          <View style={[styles.details, { borderTopColor: theme.separatorStrong }]}>
            {shownDetails.map((detail) => (
              <View key={detail} style={[styles.chip, { backgroundColor: theme.fill }]}>
                <ThemedText style={styles.chipText}>{detail}</ThemedText>
              </View>
            ))}

            {details.length > VISIBLE_DETAILS && !showAllDetails && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAllDetails(true)}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: theme.fill },
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.chipText}>{t('showMore')}</ThemedText>
              </Pressable>
            )}
          </View>
        )}

        <Toast message={toast} onHide={() => setToast(null)} />
      </View>

      <BottomSheet
        visible={hoursOpen}
        title={t('workingHours')}
        onClose={() => setHoursOpen(false)}>
        <WorkingHoursList company={company} />
      </BottomSheet>
    </>
  );
}

/** `.actionButtons button` — a square-ish tile with the icon over a 12px label. */
function ActionTile({
  icon,
  label,
  onPress,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: theme.fill },
        pressed && styles.pressed,
      ]}>
      <SymbolView name={icon} size={24} tintColor={theme.text} />
      <ThemedText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        style={styles.tileLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** The logo, wrapped in the Instagram-stories ring when the venue has live stories. */
function StoryAvatar({
  uri,
  hasStories,
  onPress,
}: {
  uri?: string;
  hasStories: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable style={styles.avatarWrap} onPress={hasStories ? onPress : undefined}>
      {hasStories && <View style={styles.storyRing} />}

      <View
        style={[
          styles.avatar,
          { borderColor: theme.cardBackground, backgroundColor: theme.pageBackground },
        ]}>
        {uri ? (
          <Image source={{ uri }} style={styles.avatarImage} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.avatarImage, styles.avatarFallback]}>
            <SymbolView
              name={{
                ios: 'cross.case.fill',
                android: 'health_and_safety',
                web: 'health_and_safety',
              }}
              size={24}
              tintColor={theme.buttonColor}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
}

/** `WorkingHoursList` — every weekday with its 24h span, today first. */
function WorkingHoursList({ company }: { company: CompanyDetail }) {
  const { t } = useI18n();
  const todayIndex = new Date().getDay();

  const days = WEEKDAYS.map((_, offset) => WEEKDAYS[(todayIndex + offset) % 7]);

  return (
    <View>
      {days.map((day, index) => {
        const spans = company.working_hours?.[day];

        return (
          <ActionRow
            key={day}
            leading={translateWeekday(day, t)}
            label={spans ? convertTo24HourFormat(spans, t) : t('closed')}
            disabled={!spans || spans[0] === 'Closed'}
            last={index === days.length - 1}
          />
        );
      })}
    </View>
  );
}

/** `about.details` is `{ category: { name: boolean } }` — every enabled name becomes a chip. */
function collectDetails(company: CompanyDetail): string[] {
  const details = company.about?.details;
  if (!details) return [];

  return Object.values(details).flatMap((category) =>
    category ? Object.entries(category).filter(([, on]) => on === true).map(([name]) => name) : []
  );
}

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

const styles = StyleSheet.create({
  card: {
    borderRadius: CompanyRadius.card,
    paddingVertical: 19,
    paddingHorizontal: Spacing.three,
    marginBottom: 2,
    overflow: 'hidden',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRing: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 18,
    // The `linearGradient(#4ffeb2 → #00f2fe)` stroke of the stories ring.
    experimental_backgroundImage: 'linear-gradient(180deg, #4FFEB2 10%, #00F2FE 100%)',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: CompanyRadius.tile,
    borderWidth: 3,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameColumn: {
    flex: 1,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  name: {
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.32,
  },
  type: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
    letterSpacing: -0.32,
  },
  shortText: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.13,
    marginTop: Spacing.three,
    paddingBottom: 2,
  },
  mainText: {
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  timeDistance: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
  half: {
    flex: 1,
    justifyContent: 'center',
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: 13,
    paddingHorizontal: 50,
    borderRadius: CompanyRadius.button,
    marginVertical: 12,
  },
  orderText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.34,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: 6,
    borderRadius: CompanyRadius.button,
  },
  tileLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 2,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: 14,
    borderRadius: CompanyRadius.button,
  },
  chipText: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.14,
  },
  pressed: {
    opacity: 0.7,
  },
});
