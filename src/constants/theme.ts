/**
 * Design tokens for MedChat.
 *
 * Every key exists in both `light` and `dark`, so any token can be passed to
 * `<ThemedText themeColor>` or read through `useTheme()`.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** Primary text */
    text: '#0B1A2B',
    /** Secondary text: subtitles, captions */
    textSecondary: '#5A6B7D',
    /** Tertiary text: timestamps, placeholders */
    textMuted: '#8D9AA8',

    /** App background */
    background: '#FFFFFF',
    /** Cards, grouped rows, composer */
    backgroundElement: '#F4F6F9',
    /** Pressed / selected state */
    backgroundSelected: '#E6EBF1',
    /** Chat canvas behind the bubbles */
    canvas: '#F7F9FC',

    border: '#E3E8EE',
    separator: '#EDF1F5',
    /** Faint fill under the floating header pills (web: `background-color: #0000000b`). */
    overlaySoft: 'rgba(0,0,0,0.04)',

    /** Brand */
    primary: '#208AEF',
    primaryPressed: '#1877D1',
    primaryMuted: '#E7F1FD',
    onPrimary: '#FFFFFF',

    /** Incoming (doctor / assistant) bubble */
    bubbleIn: '#FFFFFF',
    bubbleInText: '#0B1A2B',
    /** Outgoing (patient) bubble */
    bubbleOut: '#208AEF',
    bubbleOutText: '#FFFFFF',

    success: '#12A150',
    danger: '#E5484D',
    warning: '#F5A524',

    /**
     * Mini App parity — the company window mirrors TrueGisClient one-for-one, and that page is
     * painted entirely from Telegram theme variables. These are those variables' own fallbacks
     * (TrueGisClient/src/assets/sass/index.scss), so the native card lands on the same colours.
     */
    /** `--bg-color` — the page behind the cards. */
    pageBackground: '#F7F7F7',
    /** `--secondary-bg-color` — a section card. */
    cardBackground: '#FFFFFF',
    /** `--hint-color` */
    hint: '#8E8E93',
    /** `--link-color` */
    link: '#007AFF',
    /** `--button-color` / `--button-text-color` */
    buttonColor: '#007AFF',
    buttonTextColor: '#FFFFFF',
    /** `--separator-color` */
    separatorStrong: '#C8C7CB',
    /** `rgba(118, 118, 128, 0.12)` — the tint under action tiles, chips and pills. */
    fill: 'rgba(118,118,128,0.12)',
    /** `--gold-color` — the rating star. */
    gold: '#EAB308',
    /** `.openWork` */
    statusOpen: '#34C759',
    /** `--destructive-color` */
    destructive: '#FF3B30',
  },
  dark: {
    text: '#F5F7FA',
    textSecondary: '#A6B0BC',
    textMuted: '#7C8794',

    background: '#0C0F13',
    backgroundElement: '#171B21',
    backgroundSelected: '#232830',
    canvas: '#0C0F13',

    border: '#252B33',
    separator: '#1D222A',
    overlaySoft: 'rgba(255,255,255,0.06)',

    primary: '#3C9FFE',
    primaryPressed: '#2F8AE0',
    primaryMuted: '#152430',
    onPrimary: '#FFFFFF',

    bubbleIn: '#1B2027',
    bubbleInText: '#F5F7FA',
    bubbleOut: '#2F8AE0',
    bubbleOutText: '#FFFFFF',

    success: '#30C26C',
    danger: '#FF6369',
    warning: '#FFB224',

    /** Telegram's dark theme values for the same variables. */
    pageBackground: '#0F0F0F',
    cardBackground: '#1C1C1D',
    hint: '#8E8E93',
    link: '#0A84FF',
    buttonColor: '#0A84FF',
    buttonTextColor: '#FFFFFF',
    separatorStrong: '#38383A',
    fill: 'rgba(118,118,128,0.24)',
    gold: '#EAB308',
    statusOpen: '#30D158',
    destructive: '#FF453A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemePalette = (typeof Colors)['light'];

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 18,
  bubble: 20,
  pill: 999,
} as const;

/** The four corner radii the Mini App's company page uses, kept apart from the chat scale. */
export const CompanyRadius = {
  /** Section cards, hero, `main`. */
  card: 20,
  /** Nested boxes: the rating pill, the "rate this place" row. */
  inner: 16,
  /** Gallery tiles. */
  tile: 12,
  /** Action tiles, chips, the order button. */
  button: 10,
} as const;

export const MaxContentWidth = 800;
