import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

import { Avatar } from '@/components/avatar';
import { IconButton } from '@/components/icon-button';
import { Row } from '@/components/profile/row';
import { Section } from '@/components/profile/section';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useI18n, useTranslate } from '@/i18n';
import { LANGUAGES, LANGUAGE_NAMES, type Language } from '@/i18n/translations';
import { useTheme } from '@/hooks/use-theme';
import { getInitials } from '@/utils/format';
import { mediaUrl } from '@/utils/media-url';

export default function ProfileScreen() {
  const theme = useTheme();
  const t = useTranslate();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useI18n();
  const { user, logout } = useAuth();
  const [languageOpen, setLanguageOpen] = useState(false);

  const name = user?.telegram_name || user?.full_name || 'TrueGis';
  const username = user?.telegram_username;
  const photo = mediaUrl(user?.telegram_profile_photo);

  const confirmLogout = () => {
    Alert.alert(t('logoutConfirmTitle'), t('logoutConfirmText'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t('profile')}
        left={
          <IconButton
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            accessibilityLabel={t('cancel')}
            color={theme.primary}
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}>
        <View style={styles.identity}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
          ) : (
            <Avatar initials={getInitials(name, '')} size={88} />
          )}

          <ThemedText type="title" style={styles.centered}>
            {name}
          </ThemedText>
          {!!username && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
              @{username}
            </ThemedText>
          )}
        </View>

        <Section>
          <Row
            icon={{ ios: 'phone.fill', android: 'call', web: 'call' }}
            label={t('profilePhone')}
            value={user?.phone || t('profileNotSet')}
          />
          <Row
            icon={{ ios: 'at', android: 'alternate_email', web: 'alternate_email' }}
            label={t('profileUsername')}
            value={username ? `@${username}` : t('profileNotSet')}
          />
          <Row
            icon={{ ios: 'globe', android: 'language', web: 'language' }}
            label={t('profileLanguage')}
            value={LANGUAGE_NAMES[language]}
            onPress={() => setLanguageOpen(true)}
            last
          />
        </Section>

        <Section>
          <Row
            icon={{
              ios: 'rectangle.portrait.and.arrow.right',
              android: 'logout',
              web: 'logout',
            }}
            label={t('logout')}
            danger
            onPress={confirmLogout}
            last
          />
        </Section>
      </ScrollView>

      <Modal
        visible={languageOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setLanguageOpen(false)} />
          <View style={styles.modalWrapper} pointerEvents="box-none">
            <View style={[styles.modal, { backgroundColor: theme.backgroundElement }]}>
              {LANGUAGES.map((code: Language, index) => (
                <Pressable
                  key={code}
                  accessibilityRole="button"
                  onPress={() => {
                    setLanguage(code);
                    setLanguageOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.languageRow,
                    index < LANGUAGES.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.separator,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="small"
                    themeColor={code === language ? 'primary' : 'text'}
                    style={styles.centered}>
                    {LANGUAGE_NAMES[code]}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  identity: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  photo: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
  },
  centered: {
    textAlign: 'center',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modal: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  languageRow: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  pressed: {
    opacity: 0.7,
  },
});
