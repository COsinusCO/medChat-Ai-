import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SplashGate } from '@/components/splash-gate';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { AddressProvider } from '@/features/address/address-context';
import { BasketProvider } from '@/features/basket/basket-context';
import { LocationProvider } from '@/features/location/location-context';
import { I18nProvider } from '@/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <I18nProvider>
          <LocationProvider>
            <AuthProvider>
              <BasketProvider>
                <AddressProvider>
                  <RootNavigator />
                  <StatusBar style={isDark ? 'light' : 'dark'} />
                </AddressProvider>
              </BasketProvider>
            </AuthProvider>
          </LocationProvider>
        </I18nProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Two screens behind the login gate — chat is the root, profile is pushed on top. No tab bar.
 * While the stored session is being read, neither branch is mounted, so nothing flashes.
 */
function RootNavigator() {
  const { ready, isAuthenticated } = useAuth();

  return (
    <>
      {ready && (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen name="index" />
            <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
            {/* Company card sits over the chat, like the bottom sheet in the Mini App. */}
            <Stack.Screen name="company/[id]" options={{ presentation: 'modal' }} />
          </Stack.Protected>

          <Stack.Protected guard={!isAuthenticated}>
            <Stack.Screen name="login" options={{ animation: 'fade' }} />
          </Stack.Protected>
        </Stack>
      )}

      <SplashGate hold={!ready} />
    </>
  );
}
