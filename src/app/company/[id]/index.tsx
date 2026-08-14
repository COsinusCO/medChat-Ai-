import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedRef, useScrollViewOffset } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Contacts } from '@/components/company/contacts';
import { Feedback } from '@/components/company/feedback';
import { EstablishmentGallery, type GalleryItem } from '@/components/company/gallery';
import { CompanyHero } from '@/components/company/hero';
import { MainInfo } from '@/components/company/main-info';
import { MenuStrip, SpecialistStrip } from '@/components/company/more-interest';
import { Rating } from '@/components/company/rating';
import { StoriesViewer } from '@/components/company/stories-viewer';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCompany } from '@/features/company/company-context';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { fetchInfoPersons, fetchMenu } from '@/services/company-service';
import type { InfoPerson, MenuProduct } from '@/types/chat';
import { mergeCompanyPhotos, photoUrl } from '@/utils/photos';

export default function CompanyHomeScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { companyId, company, instagram, failed } = useCompany();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const [menu, setMenu] = useState<MenuProduct[]>([]);
  const [persons, setPersons] = useState<InfoPerson[]>([]);
  const [reviewsToken, setReviewsToken] = useState(0);
  const [storiesOpen, setStoriesOpen] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    const controller = new AbortController();

    fetchMenu(companyId, 3, controller.signal)
      .then((data) => !controller.signal.aborted && setMenu(data))
      .catch(() => {});

    fetchInfoPersons(companyId, 5, controller.signal)
      .then((data) => !controller.signal.aborted && setPersons(data))
      .catch(() => {});

    return () => controller.abort();
  }, [companyId]);

  const photos = useMemo(
    () =>
      company
        ? mergeCompanyPhotos(company.photos_sample, company.photos, {
            logo: company.logo,
            logoThumbnail: company.logoThumbnail,
            image: company.image,
            imageThumbnail: company.imageThumbnail,
          })
        : [],
    [company]
  );

  const heroUrls = useMemo(
    () => photos.map(photoUrl).filter((url): url is string => !!url),
    [photos]
  );

  const galleryItems = useMemo<GalleryItem[]>(() => {
    const items: GalleryItem[] = photos.flatMap((photo, index) => {
      const url = photoUrl(photo);
      if (!url) return [];
      return [
        {
          id: photo.photo_id || `company-${index}`,
          url,
          thumbnail: photo.photo_url || photo.photo_url_large,
        },
      ];
    });

    for (const post of instagram?.posts ?? []) {
      const url = post.is_video ? post.video_url || post.image_url : post.image_url;
      if (!url) continue;
      items.push({
        id: post.id || `instagram-${post.pk}`,
        url,
        thumbnail: post.image_url || url,
        isVideo: post.is_video,
      });
    }

    return items;
  }, [photos, instagram]);

  if (!company) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.pageBackground }]}>
        {failed ? (
          <ThemedText type="small" themeColor="hint" style={{ textAlign: 'center' }}>
            {t('error')}
          </ThemedText>
        ) : (
          <ActivityIndicator color={theme.buttonColor} />
        )}
        <CloseButton onPress={() => router.back()} top={insets.top} />
      </View>
    );
  }

  const openMenu = () => router.push(`/company/${companyId}/menu`);
  const showMenu = menu.length > 0 && company.button?.type === 'inside_app';
  const stories = instagram?.stories ?? [];

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}>
        <CompanyHero photos={heroUrls} scrollOffset={scrollOffset} />

        <View style={[styles.main, { backgroundColor: theme.pageBackground }]}>
          <MainInfo
            company={company}
            hasStories={stories.length > 0}
            onOpenMenu={openMenu}
            onOpenStories={() => stories.length > 0 && setStoriesOpen(true)}
          />

          <View
            style={[
              styles.contentCard,
              {
                experimental_backgroundImage: `linear-gradient(180deg, ${theme.cardBackground} 0%, ${theme.pageBackground} 100%)`,
              },
            ]}>
            <Rating company={company} onReviewSent={() => setReviewsToken((n) => n + 1)} />
            <Feedback companyId={company._id} reloadToken={reviewsToken} />

            {showMenu && (
              <MenuStrip
                products={menu}
                title={t('youMayLike')}
                onProductPress={(product) =>
                  router.push(`/company/${companyId}/product/${product._id}`)
                }
                onNext={openMenu}
              />
            )}

            {persons.length > 0 && (
              <SpecialistStrip
                persons={persons}
                title={t('infoTabA')}
                onPersonPress={(person) => router.push(`/company/${companyId}/person/${person._id}`)}
                onNext={() => router.push(`/company/${companyId}/info`)}
              />
            )}

            <EstablishmentGallery items={galleryItems} />
            <Contacts company={company} />
          </View>
        </View>
      </Animated.ScrollView>

      <CloseButton onPress={() => router.back()} top={insets.top} />

      <StoriesViewer
        visible={storiesOpen}
        stories={stories}
        title={company.name}
        avatar={company.logo || company.logoThumbnail}
        onClose={() => setStoriesOpen(false)}
      />
    </View>
  );
}

function CloseButton({ onPress, top }: { onPress: () => void; top: number }) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <View style={[styles.closeLayer, { top: top + Spacing.two, right: Spacing.two }]}>
      <IconButton
        name={{ ios: 'xmark', android: 'close', web: 'close' }}
        accessibilityLabel={t('cancel')}
        size={20}
        style={[styles.closeButton, { backgroundColor: theme.cardBackground }]}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  main: { zIndex: 3, borderRadius: CompanyRadius.card },
  contentCard: { borderRadius: CompanyRadius.card },
  closeLayer: { position: 'absolute' },
  closeButton: { borderRadius: Radius.pill, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
});
