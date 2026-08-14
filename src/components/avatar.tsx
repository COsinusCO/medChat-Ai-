import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AvatarProps = {
  initials: string;
  uri?: string;
  size?: number;
  /** Renders a small status dot in the bottom-right corner. */
  online?: boolean;
};

export function Avatar({ initials, uri, size = 40, online }: AvatarProps) {
  const theme = useTheme();
  const dotSize = Math.max(8, Math.round(size * 0.26));

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, { width: size, height: size }]} />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, backgroundColor: theme.primaryMuted },
          ]}>
          <ThemedText
            themeColor="primary"
            style={{ fontSize: size * 0.38, fontWeight: '600', lineHeight: size * 0.46 }}>
            {initials}
          </ThemedText>
        </View>
      )}

      {online && (
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: theme.success,
              borderColor: theme.background,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: Radius.pill,
  },
  fallback: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 2,
  },
});
