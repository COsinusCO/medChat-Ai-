import * as Haptics from 'expo-haptics';
import { openURL } from 'expo-linking';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BrandLogo } from '@/components/brand-logo';
import { PARTNER_FALLBACK_NAME } from '@/constants/config';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useTranslate } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const theme = useTheme();
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const { loginPhase, deepLink, loginError, beginLogin, checkLoginNow, cancelLogin } = useAuth();
  const [checking, setChecking] = useState(false);

  const waiting = loginPhase === 'waiting';
  const busy = loginPhase === 'starting' || waiting;

  const handleLogin = async () => {
    Haptics.selectionAsync().catch(() => {});
    const link = await beginLogin();
    if (link) await openLink(link);
  };

  /** Manual re-check: the app also polls on its own and whenever it returns to the foreground. */
  const handleCheckNow = () => {
    Haptics.selectionAsync().catch(() => {});
    setChecking(true);
    checkLoginNow();
    setTimeout(() => setChecking(false), 1500);
  };

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}>
      <View style={styles.content}>
        <BrandLogo variant="icon" style={styles.logo} />

        <ThemedText type="title" style={styles.centered}>
          {t('loginTitle')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          {t('loginSubtitle')}
        </ThemedText>

        <View style={[styles.partnerPill, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="caption" themeColor="textSecondary">
            {PARTNER_FALLBACK_NAME}
          </ThemedText>
        </View>
      </View>

      <View style={styles.actions}>
        {waiting && (
          <View style={[styles.waiting, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.waitingRow}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="smallBold">
                {checking ? t('loginChecking') : t('loginWaiting')}
              </ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.centered}>
              {t('loginHint')}
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted" style={styles.centered}>
              {t('loginBotAnswer')}
            </ThemedText>
          </View>
        )}

        {!!loginError && (
          <ThemedText type="small" themeColor="danger" style={styles.centered}>
            {loginError}
          </ThemedText>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={loginPhase === 'starting'}
          onPress={waiting ? handleCheckNow : handleLogin}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
            loginPhase === 'starting' && styles.disabled,
          ]}>
          {loginPhase === 'starting' ? (
            <ActivityIndicator color={theme.onPrimary} />
          ) : (
            <>
              <SymbolView
                name={
                  waiting
                    ? { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }
                    : { ios: 'paperplane.fill', android: 'send', web: 'send' }
                }
                size={18}
                tintColor={theme.onPrimary}
              />
              <ThemedText type="bodyStrong" style={{ color: theme.onPrimary }}>
                {waiting ? t('loginCheckNow') : t('loginButton')}
              </ThemedText>
            </>
          )}
        </Pressable>

        {waiting && !!deepLink && (
          <Pressable
            accessibilityRole="button"
            onPress={() => openLink(deepLink)}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" themeColor="primary">
              {t('loginOpenAgain')}
            </ThemedText>
          </Pressable>
        )}

        {busy && (
          <Pressable
            accessibilityRole="button"
            onPress={cancelLogin}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('cancel')}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

async function openLink(url: string) {
  try {
    await openURL(url);
  } catch {
    // Telegram is not installed — the browser handles t.me links too.
    await Linking.openURL(url).catch(() => {});
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: Spacing.three,
  },
  centered: {
    textAlign: 'center',
  },
  partnerPill: {
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  actions: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  waiting: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 52,
    borderRadius: Radius.large,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
});
