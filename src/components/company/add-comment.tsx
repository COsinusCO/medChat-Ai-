import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { RatingStars } from '@/components/company/rating-stars';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { CompanyRadius, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/api';
import { sendCompanyComment } from '@/services/company-service';
import { uploadImage, type LocalImage } from '@/services/upload-service';
import type { CompanyDetail } from '@/types/chat';

/** `maxLength` in the web's `TextArea` — the meter fills up at 120 characters. */
const METER_MAX = 120;

/** `AddFoto maxLength` — the web refuses a fifth photo. */
const MAX_PHOTOS = 4;

/** `.progress-bar.low / .medium / .nice / .good` */
const METER_COLORS = {
  low: '#FF3B30',
  medium: '#FF9500',
  nice: '#FFCC00',
  good: '#34C759',
} as const;

/**
 * `AddComment` — the review composer the Mini App opens from the rating row: the venue's name,
 * the five stars, a message with its quality meter, up to four photos, and the send bar.
 */
export function AddComment({
  company,
  visible,
  rating,
  onChangeRating,
  onClose,
  onSubmitted,
}: {
  company: CompanyDetail;
  visible: boolean;
  rating: number;
  onChangeRating: (value: number) => void;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  const [message, setMessage] = useState('');
  const [photos, setPhotos] = useState<LocalImage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPhotos = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert(t('addPhotoLimit'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.8,
    });

    if (result.canceled) return;

    const picked = result.assets.map((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    }));

    if (photos.length + picked.length > MAX_PHOTOS) {
      Alert.alert(t('addPhotoLimit'));
      return;
    }

    setPhotos((current) => [...current, ...picked]);
  };

  const submit = async () => {
    if (!message.trim() || !rating) {
      setError(t('fillAllFields'));
      return;
    }

    setSending(true);
    setError(null);

    try {
      // Photos are uploaded to the bucket first; the review carries only their URLs.
      const urls = await Promise.all(photos.map((photo) => uploadImage(photo)));
      await sendCompanyComment(company._id, { message: message.trim(), rating, images: urls });

      setMessage('');
      setPhotos([]);
      onSubmitted();
      onClose();
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.errorName === 'PENDING_COMMENT_EXISTS'
          ? t('commentAlreadyPending')
          : t('errorSendingComment')
      );
    } finally {
      setSending(false);
    }
  };

  const length = message.trim().length;
  const meterWidth = Math.min((length / METER_MAX) * 100, 100);
  const meterColor =
    length < 30
      ? METER_COLORS.low
      : length < 70
        ? METER_COLORS.medium
        : length < 115
          ? METER_COLORS.nice
          : METER_COLORS.good;

  const hint = [
    t('messageLow'),
    t('messageMedium'),
    t('messageNeutral'),
    t('messageGood'),
    t('messageExcellent'),
  ][rating - 1];

  return (
    <BottomSheet
      visible={visible}
      title={t('leaveReview')}
      onClose={onClose}
      footer={
        <View style={[styles.sendBar, { backgroundColor: theme.cardBackground }]}>
          <ThemedText style={[styles.sendHint, { color: theme.hint }]}>
            {error ?? t('yourRatingReviewVisible')}
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            disabled={sending}
            onPress={submit}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: theme.link },
              (pressed || sending) && styles.pressed,
            ]}>
            <ThemedText style={[styles.sendLabel, { color: '#FFFFFF' }]}>
              {sending ? t('loading') : t('send')}
            </ThemedText>
          </Pressable>
        </View>
      }>
      <View style={[styles.info, { borderColor: theme.separatorStrong }]}>
        <ThemedText style={styles.infoName}>{company.name}</ThemedText>
        <ThemedText style={[styles.infoAddress, { color: theme.hint }]}>
          {company.address || company.full_address}
        </ThemedText>
      </View>

      <View style={styles.stars}>
        <RatingStars count={rating} size={36} onRate={onChangeRating} />
      </View>

      <TextInput
        multiline
        numberOfLines={5}
        placeholder={t('placeholder')}
        placeholderTextColor={theme.hint}
        value={message}
        onChangeText={setMessage}
        style={[styles.textArea, { backgroundColor: theme.fill, color: theme.text }]}
      />

      <View style={styles.meter}>
        <View style={styles.meterTrack}>
          <View style={[styles.meterBar, { width: `${meterWidth}%`, backgroundColor: meterColor }]} />
        </View>
        <ThemedText style={[styles.meterMessage, { color: theme.hint }]}>
          {rating ? `${t('ratingAccepted')} ${hint}` : ''}
        </ThemedText>
      </View>

      <ThemedText style={styles.photosTitle}>{t('addPhoto')}</ThemedText>

      <View style={styles.photos}>
        {photos.map((photo, index) => (
          <View key={photo.uri} style={styles.photo}>
            <Image source={{ uri: photo.uri }} style={styles.photoImage} contentFit="cover" />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('delete')}
              hitSlop={6}
              onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}
              style={styles.photoCross}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={12}
                tintColor="#000000"
              />
            </Pressable>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={pickPhotos}
          style={({ pressed }) => [
            styles.photoAdd,
            { backgroundColor: theme.fill },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
            size={28}
            tintColor={theme.text}
          />
          <ThemedText style={styles.photoAddLabel}>{t('addPhoto')}</ThemedText>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  info: {
    borderWidth: 1,
    borderRadius: CompanyRadius.inner,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
  },
  infoName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.32,
    paddingBottom: 5,
  },
  infoAddress: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
  },
  stars: {
    alignItems: 'center',
    marginVertical: 20,
  },
  textArea: {
    minHeight: 120,
    borderRadius: CompanyRadius.inner,
    paddingVertical: Spacing.three,
    paddingHorizontal: 12,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.32,
    textAlignVertical: 'top',
  },
  meter: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 10,
  },
  meterTrack: {
    width: '100%',
    height: 5,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  meterBar: {
    height: '100%',
    borderRadius: 5,
  },
  meterMessage: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.36,
    marginTop: 5,
    textAlign: 'center',
  },
  photosTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginVertical: Spacing.three,
  },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  photo: {
    width: 105,
    height: 100,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: CompanyRadius.inner,
  },
  photoCross: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEEEEF',
  },
  photoAdd: {
    minWidth: 105,
    minHeight: 100,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 5,
    borderRadius: CompanyRadius.inner,
  },
  photoAddLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.13,
    textAlign: 'center',
  },
  sendBar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderTopLeftRadius: CompanyRadius.inner,
    borderTopRightRadius: CompanyRadius.inner,
    boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
  },
  sendHint: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.13,
    textAlign: 'center',
    marginBottom: 20,
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sendLabel: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.34,
  },
  pressed: {
    opacity: 0.7,
  },
});
