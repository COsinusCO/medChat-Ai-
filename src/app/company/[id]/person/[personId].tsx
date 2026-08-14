import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CollapseMore } from '@/components/company/collapse-more';
import { RatingStars } from '@/components/company/rating-stars';
import { CompanyStackHeader } from '@/components/company/stack-header';
import { FixedCta } from '@/components/company/fixed-cta';
import { StoriesViewer } from '@/components/company/stories-viewer';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useCompany } from '@/features/company/company-context';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/api';
import {
  createAppointment,
  fetchInfoPerson,
  fetchInfoPersonComments,
  fetchOccupiedSlots,
  fetchPersonInstagram,
  sendInfoPersonComment,
  toggleSaveInfoPerson,
  type OccupiedRange,
} from '@/services/info-service';
import type { InfoPerson, InfoPersonComment, InfoService, InstagramStory } from '@/types/chat';
import { dateToStr, slotsForDate, workingDates } from '@/utils/booking-slots';
import { currencyLabel, formatPrice } from '@/utils/price';
import { telegramHref } from '@/utils/telegram';

type Tab = 'main' | 'reviews' | 'gallery' | 'services';

export default function PersonScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { companyId, company } = useCompany();
  const { personId } = useLocalSearchParams<{ personId: string }>();

  const [person, setPerson] = useState<InfoPerson | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('main');
  const [comments, setComments] = useState<InfoPersonComment[]>([]);
  const [stories, setStories] = useState<InstagramStory[]>([]);
  const [storiesOpen, setStoriesOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dates, setDates] = useState<Date[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [occupied, setOccupied] = useState<OccupiedRange[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [bookOpen, setBookOpen] = useState(false);
  const [clientName, setClientName] = useState(user?.full_name || user?.telegram_name || '');
  const [clientPhone, setClientPhone] = useState(user?.phone || '');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);

  useEffect(() => {
    if (!personId) return;
    const controller = new AbortController();
    fetchInfoPerson(personId, companyId, controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setPerson(loaded);
        setSaved(!!loaded?.is_saved);
        const nextDates = workingDates(loaded?.schedule ?? []);
        setDates(nextDates);
        setDate(nextDates[0] ?? null);
      })
      .catch(() => !controller.signal.aborted && setFailed(true));
    fetchInfoPersonComments(personId, controller.signal)
      .then((data) => !controller.signal.aborted && setComments(data.comments))
      .catch(() => {});
    fetchPersonInstagram(personId, controller.signal)
      .then((data) => !controller.signal.aborted && setStories(data?.stories ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [personId, companyId]);

  useEffect(() => {
    if (!personId || !date) return;
    fetchOccupiedSlots(personId, dateToStr(date))
      .then(setOccupied)
      .catch(() => setOccupied([]));
  }, [personId, date]);

  useEffect(() => {
    if (!person || !date) return;
    setSlots(slotsForDate(person.schedule ?? [], date, occupied));
    setSelectedSlot(null);
  }, [person, date, occupied]);

  const services = person?.services ?? [];
  const duration = useMemo(() => {
    const selected = services.filter((item) => selectedServices.includes(item._id));
    const sum = selected.reduce((acc, item) => acc + (item.duration ?? 0), 0);
    return Math.max(15, sum || 15);
  }, [services, selectedServices]);

  if (!person) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: theme.pageBackground }]}>
        {failed ? <ThemedText>{t('infoNotFound')}</ThemedText> : <ActivityIndicator color={theme.buttonColor} />}
      </View>
    );
  }

  const contact = person.telegram_username || person.phone || company?.phone_number;

  const submitBooking = async () => {
    if (!date || !selectedSlot) return;
    if (!clientName.trim()) return Alert.alert(t('infoBookingNameRequired'));
    if (!clientPhone.trim()) return Alert.alert(t('infoBookingPhoneRequired'));
    if (services.length > 0 && selectedServices.length === 0) {
      return Alert.alert(t('infoBookingSelectService'));
    }
    try {
      await createAppointment({
        person_id: person._id,
        company_id: companyId,
        date: dateToStr(date),
        start_time: selectedSlot,
        duration_min: duration,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        service_ids: selectedServices.length ? selectedServices : undefined,
        service_id: selectedServices[0],
      });
      setBookOpen(false);
      Alert.alert(t('infoBookingSuccess'));
    } catch (error) {
      const name = error instanceof ApiError ? error.errorName : '';
      Alert.alert(
        name === 'SLOT_TAKEN'
          ? t('infoBookingSlotTaken')
          : name === 'PHONE_REQUIRED'
            ? t('infoBookingPhoneRequired')
            : t('infoBookingError')
      );
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <CompanyStackHeader title={person.name} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={styles.hero}>
          <Pressable onPress={() => stories.length > 0 && setStoriesOpen(true)}>
            {person.image ? (
              <Image source={{ uri: person.image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.fill }]} />
            )}
          </Pressable>
          <ThemedText type="heading" style={styles.heroName}>
            {person.name}
          </ThemedText>
          {!!person.specialty && (
            <ThemedText themeColor="hint" style={styles.heroName}>
              {person.specialty}
            </ThemedText>
          )}
          <View style={styles.actions}>
            <SmallBtn
              label={saved ? t('successSaved') : t('favorites')}
              onPress={async () => setSaved(await toggleSaveInfoPerson(person._id))}
            />
            <SmallBtn
              label={t('share')}
              onPress={() => Share.share({ message: person.name }).catch(() => {})}
            />
            {!!contact && (
              <SmallBtn label={t('chat')} onPress={() => Linking.openURL(telegramHref(contact)).catch(() => {})} />
            )}
          </View>
        </View>

        <View style={[styles.tabs, { borderBottomColor: theme.separatorStrong }]}>
          {(['main', 'reviews', 'gallery', 'services'] as const).map((id) => (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              style={[
                styles.tab,
                { borderBottomColor: tab === id ? theme.buttonColor : 'transparent' },
              ]}>
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={[styles.tabLabel, tab === id && { color: theme.buttonColor, fontWeight: '600' }]}>
                {id === 'main'
                  ? t('generalInfo')
                  : id === 'reviews'
                    ? t('infoReviews')
                    : id === 'gallery'
                      ? t('infoGallery')
                      : t('infoServices')}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={{ padding: Spacing.three }}>
          {tab === 'main' && (
            <>
              {!!person.description && <CollapseMore text={person.description} maxLength={120} />}
              {!!person.experience && (
                <ThemedText style={styles.block}>
                  {t('infoExperience')}: {person.experience}
                </ThemedText>
              )}
              {!!person.price && (
                <ThemedText type="heading">
                  {formatPrice(person.price)} {currencyLabel(person.currency)}
                </ThemedText>
              )}
              <ThemedText type="heading" style={styles.block}>
                {t('infoSchedule')}
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dates}>
                {dates.map((item) => {
                  const selected = date && dateToStr(item) === dateToStr(date);
                  return (
                    <Pressable
                      key={dateToStr(item)}
                      onPress={() => setDate(item)}
                      style={[styles.dateChip, { backgroundColor: selected ? theme.buttonColor : theme.fill }]}>
                      <ThemedText style={{ color: selected ? theme.buttonTextColor : theme.text }}>
                        {item.getDate()}.{item.getMonth() + 1}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={styles.slots}>
                {slots.length === 0 ? (
                  <ThemedText themeColor="hint">{t('noSlots')}</ThemedText>
                ) : (
                  slots.map((slot) => {
                    const selected = selectedSlot === slot;
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => setSelectedSlot(slot)}
                        style={[styles.slot, { backgroundColor: selected ? theme.buttonColor : theme.fill }]}>
                        <ThemedText style={{ color: selected ? theme.buttonTextColor : theme.text }}>{slot}</ThemedText>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </>
          )}

          {tab === 'reviews' && (
            <>
              <Pressable onPress={() => setReviewOpen(true)} style={[styles.cta, { backgroundColor: theme.fill }]}>
                <ThemedText>{t('leaveReview')}</ThemedText>
              </Pressable>
              {comments.map((comment) => (
                <View key={comment._id} style={[styles.review, { backgroundColor: theme.cardBackground }]}>
                  <ThemedText type="bodyStrong">{comment.user?.name || t('infoReviewAnonymous')}</ThemedText>
                  <RatingStars count={comment.rating} size={14} />
                  <ThemedText>{comment.message}</ThemedText>
                </View>
              ))}
            </>
          )}

          {tab === 'gallery' && (
            <View style={styles.gallery}>
              {(person.gallery ?? []).map((item) => (
                <Image key={item.id} source={{ uri: item.thumbnail || item.url }} style={styles.gImg} />
              ))}
            </View>
          )}

          {tab === 'services' &&
            services.map((service) => (
              <ServiceRow
                key={service._id}
                service={service}
                selected={selectedServices.includes(service._id)}
                onToggle={() =>
                  setSelectedServices((current) =>
                    current.includes(service._id)
                      ? current.filter((id) => id !== service._id)
                      : [...current, service._id]
                  )
                }
                onOpen={() => router.push(`/company/${companyId}/service/${service._id}`)}
              />
            ))}
        </View>
      </ScrollView>

      <FixedCta label={t('infoBookAction')} onPress={() => setBookOpen(true)} disabled={!selectedSlot} />

      <BottomSheet visible={bookOpen} title={t('infoBookingConfirm')} onClose={() => setBookOpen(false)}>
        <ThemedText>
          {t('infoBookingDate')}: {date ? dateToStr(date) : ''}
        </ThemedText>
        <ThemedText>
          {t('infoBookingTime')}: {selectedSlot}
        </ThemedText>
        <TextInput
          placeholder={t('infoBookingName')}
          placeholderTextColor={theme.hint}
          value={clientName}
          onChangeText={setClientName}
          style={[styles.input, { color: theme.text, backgroundColor: theme.fill }]}
        />
        <TextInput
          placeholder={t('infoBookingPhone')}
          placeholderTextColor={theme.hint}
          value={clientPhone}
          onChangeText={setClientPhone}
          keyboardType="phone-pad"
          style={[styles.input, { color: theme.text, backgroundColor: theme.fill }]}
        />
        <Pressable onPress={submitBooking} style={[styles.cta, { backgroundColor: theme.buttonColor }]}>
          <ThemedText style={{ color: theme.buttonTextColor, fontWeight: '600', textAlign: 'center' }}>{t('confirm')}</ThemedText>
        </Pressable>
      </BottomSheet>

      <BottomSheet visible={reviewOpen} title={t('leaveReview')} onClose={() => setReviewOpen(false)}>
        <RatingStars count={reviewRating} size={32} onRate={setReviewRating} />
        <TextInput
          multiline
          value={reviewText}
          onChangeText={setReviewText}
          placeholder={t('placeholder')}
          placeholderTextColor={theme.hint}
          style={[styles.input, { minHeight: 100, color: theme.text, backgroundColor: theme.fill }]}
        />
        <Pressable
          onPress={async () => {
            if (!reviewText.trim()) return;
            await sendInfoPersonComment(person._id, { message: reviewText.trim(), rating: reviewRating });
            setReviewOpen(false);
            setReviewText('');
            const data = await fetchInfoPersonComments(person._id);
            setComments(data.comments);
          }}
          style={[styles.cta, { backgroundColor: theme.buttonColor }]}>
          <ThemedText style={{ color: theme.buttonTextColor, fontWeight: '600', textAlign: 'center' }}>{t('send')}</ThemedText>
        </Pressable>
      </BottomSheet>

      <StoriesViewer
        visible={storiesOpen}
        stories={stories}
        title={person.name}
        avatar={person.image ?? undefined}
        onClose={() => setStoriesOpen(false)}
      />
    </View>
  );
}

function SmallBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.small, { backgroundColor: theme.fill }]}>
      <ThemedText type="caption" style={styles.smallLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ServiceRow({
  service,
  selected,
  onToggle,
  onOpen,
}: {
  service: InfoService;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.service, { backgroundColor: theme.cardBackground }]}>
      <Pressable onPress={onOpen} style={{ flex: 1 }}>
        <ThemedText type="bodyStrong">{service.name}</ThemedText>
        <ThemedText>
          {formatPrice(service.promotion?.discounted_price ?? service.price)} {currencyLabel(service.currency)}
        </ThemedText>
      </Pressable>
      <Pressable onPress={onToggle} style={[styles.small, { backgroundColor: selected ? theme.buttonColor : theme.fill }]}>
        <ThemedText style={{ color: selected ? theme.buttonTextColor : theme.text, textAlign: 'center' }}>
          +
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', padding: Spacing.three, gap: 6 },
  heroName: { textAlign: 'center' },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two, marginTop: Spacing.two },
  small: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: CompanyRadius.button,
  },
  smallLabel: { textAlign: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 2 },
  tabLabel: { textAlign: 'center' },
  block: { marginTop: Spacing.three },
  dates: { gap: Spacing.two, marginVertical: Spacing.two },
  dateChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: CompanyRadius.button, alignItems: 'center' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  slot: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: CompanyRadius.button, alignItems: 'center' },
  review: { padding: Spacing.three, borderRadius: CompanyRadius.card, marginTop: Spacing.two, gap: 4 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gImg: { width: '31%', aspectRatio: 1, borderRadius: CompanyRadius.tile },
  service: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, borderRadius: CompanyRadius.card, marginBottom: Spacing.two, gap: Spacing.two },
  cta: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingVertical: 14, borderRadius: CompanyRadius.button, marginTop: Spacing.two },
  input: { borderRadius: CompanyRadius.button, padding: Spacing.three, marginTop: Spacing.two, fontSize: 16 },
  pressed: { opacity: 0.5 },
});
