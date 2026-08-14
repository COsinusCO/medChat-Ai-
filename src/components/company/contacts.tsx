import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ActionRow, ExpandableRow } from '@/components/company/action-row';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useUserLocation } from '@/features/location/location-context';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { fetchTaxiPrice, type TaxiPrice } from '@/services/company-service';
import type { CompanyDetail, CompanyMetro } from '@/types/chat';

const TAXI_APPS = {
  fasten: {
    android: 'https://play.google.com/store/apps/details?id=com.fasten.rider',
    ios: 'https://apps.apple.com/si/app/fasten-safarlar-va-yetkazish/id6578446117',
  },
  uklon: {
    android: 'https://play.google.com/store/apps/details?id=ua.com.uklontaxi',
    ios: 'https://apps.apple.com/ru/app/uklon-more-than-a-taxi/id654646098',
  },
  myTaxi: 'https://my-taxi.onelink.me/sda5/s0pn2a00',
};

/**
 * `Contacts` — the grouped list at the foot of the company page: taxi, social networks, the
 * nearest metro, the venue's apps, its website and its email. Rows the venue has nothing for are
 * dropped, exactly as the web filters out `isDisabled` entries.
 */
export function Contacts({ company }: { company: CompanyDetail }) {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [taxiOpen, setTaxiOpen] = useState(false);

  const networks = Object.entries(company.social_media ?? {}).filter(([, url]) => !!url) as [
    string,
    string,
  ][];
  const hasApps = !!company.mobile_apps?.ios || !!company.mobile_apps?.android;

  // Order matters — this is the Mini App's `actions` array.
  const rows: { key: string; render: (last: boolean) => React.ReactNode }[] = [
    {
      key: 'taxi',
      render: (last) => (
        <ActionRow
          icon={{ ios: 'car.fill', android: 'directions_car', web: 'directions_car' }}
          label={t('taxi')}
          last={last}
          onPress={() => setTaxiOpen(true)}
        />
      ),
    },
  ];

  if (networks.length > 0) {
    rows.push({
      key: 'social',
      render: (last) => (
        <ExpandableRow
          icon={{ ios: 'face.smiling', android: 'mood', web: 'mood' }}
          label={networks.map(([name]) => name).join(', ')}
          last={last}>
          {networks.map(([name, url]) => (
            <SubRow
              key={name}
              icon={socialIcon(name)}
              label={name}
              onPress={() => openUrl(socialUrl(name, url))}
            />
          ))}
        </ExpandableRow>
      ),
    });
  }

  if (company.nearest_metro?.name || company.company_nearest_metro?.name) {
    rows.push({
      key: 'metro',
      render: (last) => (
        <ExpandableRow
          icon={{ ios: 'tram.fill', android: 'subway', web: 'subway' }}
          label={t('nearestMetroToYou')}
          last={last}>
          <Metro metro={company.nearest_metro} from={t('nearestMetroToYou')} />
          <Metro metro={company.company_nearest_metro} from={t('nearestMetroToLocation')} />
        </ExpandableRow>
      ),
    });
  }

  if (hasApps) {
    rows.push({
      key: 'apps',
      render: (last) => (
        <ExpandableRow
          icon={{ ios: 'square.and.arrow.down.fill', android: 'download', web: 'download' }}
          label={t('downloadApps')}
          last={last}>
          {!!company.mobile_apps?.ios && (
            <SubRow
              icon={{ ios: 'apple.logo', android: 'phone_iphone', web: 'phone_iphone' }}
              label={`${t('linkTo')} App Store`}
              onPress={() => openUrl(company.mobile_apps!.ios!)}
            />
          )}
          {!!company.mobile_apps?.android && (
            <SubRow
              icon={{ ios: 'play.rectangle.fill', android: 'shop', web: 'shop' }}
              label={`${t('linkTo')} Google Play`}
              onPress={() => openUrl(company.mobile_apps!.android!)}
            />
          )}
        </ExpandableRow>
      ),
    });
  }

  if (company.website) {
    rows.push({
      key: 'website',
      render: (last) => (
        <ActionRow
          icon={{ ios: 'globe', android: 'language', web: 'language' }}
          label={company.website!.replace('https://', '')}
          last={last}
          onPress={() => openUrl(company.website!)}
        />
      ),
    });
  }

  if (company.email) {
    rows.push({
      key: 'email',
      render: (last) => (
        <ExpandableRow
          icon={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }}
          label={company.email!}
          last={last}>
          <SubRow
            icon={{ ios: 'paperplane.fill', android: 'send', web: 'send' }}
            label={t('openEmail')}
            onPress={() => openUrl(`mailto:${company.email}`)}
          />
        </ExpandableRow>
      ),
    });
  }

  rows.push({
    key: 'edit',
    render: (last) => (
      <ActionRow
        icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
        label={t('editCompany')}
        last={last}
        onPress={() => router.push(`/company/${company._id}/edit`)}
      />
    ),
  });

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText style={styles.heading}>{t('contactsTitle')}</ThemedText>
      </View>

      <View style={[styles.list, { backgroundColor: theme.cardBackground }]}>
        {rows.map((row, index) => (
          <View key={row.key}>{row.render(index === rows.length - 1)}</View>
        ))}
      </View>

      <TaxiSheet visible={taxiOpen} company={company} onClose={() => setTaxiOpen(false)} />
    </View>
  );
}

/** `.dropDownMenuHolderStyle__icons` — a row inside an expanded panel. */
function SubRow({
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
      onPress={onPress}
      style={({ pressed }) => [styles.subRow, pressed && styles.pressed]}>
      <SymbolView name={icon} size={22} tintColor={theme.text} />
      <ThemedText style={styles.subLabel}>{label}</ThemedText>
    </Pressable>
  );
}

/** `NearestMetroHolder` — the station with the walk time and the distance. */
function Metro({ metro, from }: { metro?: CompanyMetro; from: string }) {
  const theme = useTheme();
  if (!metro?.name) return null;

  return (
    <View style={styles.metro}>
      <ThemedText style={[styles.metroHint, { color: theme.hint }]}>{from}</ThemedText>
      <View style={styles.metroRow}>
        <ThemedText style={styles.metroText}>{metro.name} - </ThemedText>
        <SymbolView
          name={{ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' }}
          size={15}
          tintColor={theme.text}
        />
        <ThemedText style={styles.metroText}>{metro.distance?.walking_duration}</ThemedText>
        <ThemedText style={styles.metroText}>•</ThemedText>
        <ThemedText style={styles.metroText}>{metro.distance?.distance}</ThemedText>
      </View>
    </View>
  );
}

/** `Taxi` — the ride-hailing apps, with Yandex Go's live estimate on top. */
function TaxiSheet({
  visible,
  company,
  onClose,
}: {
  visible: boolean;
  company: CompanyDetail;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <BottomSheet visible={visible} title={t('taxi')} onClose={onClose}>
      {/* Mounted fresh on every open, so the estimate starts from its loading state. */}
      {visible && <TaxiApps company={company} />}
    </BottomSheet>
  );
}

function TaxiApps({ company }: { company: CompanyDetail }) {
  const { t } = useI18n();
  const { coords } = useUserLocation();
  /** `undefined` while the estimate is in flight, `null` when it could not be read. */
  const [price, setPrice] = useState<TaxiPrice | null | undefined>(undefined);

  const lat = company.latitude ?? company.location?.coordinates?.[1];
  const lon = company.longitude ?? company.location?.coordinates?.[0];

  useEffect(() => {
    const controller = new AbortController();

    fetchTaxiPrice(coords, { lat, lon }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setPrice(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPrice(null);
      });

    return () => controller.abort();
  }, [coords, lat, lon]);

  const option = price?.options?.[0];
  const estimate =
    price === undefined
      ? t('wait')
      : option?.price != null
        ? [
            company.distance?.distance,
            price?.estimatedTime ? `${(price.estimatedTime / 60).toFixed(1)} min` : null,
            `${option.price} ${price?.currency ?? ''}`.trim(),
          ]
            .filter(Boolean)
            .join(' • ')
        : t('unavailable');

  const yandexUrl =
    `https://3.redirect.appmetrica.yandex.com/route?start-lat=${coords.lat}&start-lon=${coords.lon}` +
    `&end-lat=${lat}&end-lon=${lon}&tariffClass=econom&ref=https://truegiswebapp.uz/` +
    `&appmetrica_tracking_id=1178268795219780156`;

  const store = Platform.OS === 'android' ? 'android' : 'ios';

  return (
    <>
      <TaxiRow title="Yandex Go" subtitle={estimate} onPress={() => openUrl(yandexUrl)} />
      <TaxiRow
        title="Fasten"
        subtitle={t('learnMoreInApp')}
        onPress={() => openUrl(TAXI_APPS.fasten[store])}
      />
      <TaxiRow
        title="My taxi"
        subtitle={t('learnMoreInApp')}
        onPress={() => openUrl(TAXI_APPS.myTaxi)}
      />
      <TaxiRow
        title="Uklon"
        subtitle={t('learnMoreInApp')}
        onPress={() => openUrl(TAXI_APPS.uklon[store])}
        last
      />
    </>
  );
}

/** `EditAction` with `smallInfo` — the title over a 12px hint, and a chevron. */
function TaxiRow({
  title,
  subtitle,
  onPress,
  last,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.taxiRow, pressed && styles.pressed]}>
      <View style={styles.taxiIcon}>
        <SymbolView
          name={{ ios: 'car.fill', android: 'local_taxi', web: 'local_taxi' }}
          size={24}
          tintColor={theme.text}
        />
      </View>

      <View style={styles.taxiText}>
        <ThemedText style={[styles.taxiSubtitle, { color: theme.hint }]}>{subtitle}</ThemedText>
        <ThemedText style={styles.taxiTitle}>{title}</ThemedText>
      </View>

      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={14}
        tintColor={theme.hint}
      />

      {!last && <View style={[styles.separator, { backgroundColor: theme.separatorStrong }]} />}
    </Pressable>
  );
}

function socialUrl(name: string, url: string): string {
  const key = name.toLowerCase();
  if (key === 'telegram') return `https://t.me/${url.replace(/(@|https:\/\/|t\.me\/)/g, '')}`;
  if (key === 'whatsapp') return `https://wa.me/${url.replace('+', '').trim()}`;
  return url;
}

function socialIcon(name: string): SymbolViewProps['name'] {
  switch (name.toLowerCase()) {
    case 'telegram':
      return { ios: 'paperplane.fill', android: 'send', web: 'send' };
    case 'instagram':
      return { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' };
    case 'youtube':
      return { ios: 'play.rectangle.fill', android: 'smart_display', web: 'smart_display' };
    case 'whatsapp':
      return { ios: 'phone.bubble.fill', android: 'chat', web: 'chat' };
    default:
      return { ios: 'link', android: 'link', web: 'link' };
  }
}

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

const styles = StyleSheet.create({
  section: {
    padding: Spacing.three,
  },
  header: {
    paddingVertical: Spacing.three,
  },
  heading: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  list: {
    paddingHorizontal: 12,
    borderRadius: CompanyRadius.card,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: Spacing.three,
  },
  subLabel: {
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  metro: {
    padding: Spacing.three,
  },
  metroHint: {
    fontSize: 12,
    lineHeight: 16,
    paddingBottom: 2,
  },
  metroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  metroText: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.34,
  },
  taxiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  taxiIcon: {
    padding: 2,
  },
  taxiText: {
    flex: 1,
    gap: 10,
  },
  taxiSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  taxiTitle: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.51,
  },
  separator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '93%',
    height: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  pressed: {
    opacity: 0.7,
  },
});
