import { Image } from 'expo-image';
import { StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

const ICON = require('../../assets/images/logo-icon.png');
const WORDMARK = require('../../assets/images/logo-wordmark.png');

type BrandLogoProps = {
  variant?: 'icon' | 'wordmark';
  style?: StyleProp<ImageStyle>;
};

/** App mark cropped from the root `logo.png` sheet. */
export function BrandLogo({ variant = 'wordmark', style }: BrandLogoProps) {
  const isIcon = variant === 'icon';

  return (
    <Image
      source={isIcon ? ICON : WORDMARK}
      style={[isIcon ? styles.icon : styles.wordmark, style]}
      contentFit="contain"
      accessibilityLabel="MedChat"
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 96,
    height: 96,
  },
  wordmark: {
    width: 138,
    height: 24,
  },
});
