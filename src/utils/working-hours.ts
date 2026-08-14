/**
 * Opening-hours logic, ported one-for-one from the Mini App
 * (TrueGisClient `hooks/convertTo24HourFormat.ts` + `hooks/useWorkingHours.ts`) so the native
 * company window says exactly what the web one says at the same moment.
 */
import type { Translate } from '@/i18n';
import type { WorkingHours } from '@/types/chat';

/** The catalog keys hours by English weekday name, `getDay()` order. */
export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** `sunday` … `saturday` — the translation key for a catalog weekday name. */
const WEEKDAY_KEYS = {
  Sunday: 'sunday',
  Monday: 'monday',
  Tuesday: 'tuesday',
  Wednesday: 'wednesday',
  Thursday: 'thursday',
  Friday: 'friday',
  Saturday: 'saturday',
} as const;

export function translateWeekday(day: string, t: Translate): string {
  const key = WEEKDAY_KEYS[day as Weekday];
  return key ? t(key) : day;
}

/** Different dashes and non-breaking spaces both show up in the Google-sourced strings. */
const DASH_REGEX = /\s*[–-]\s*/;

/** `9 AM–6 PM` → `09:00–18:00`. Arrays are joined, as the web does for multi-span days. */
export function convertTo24HourFormat(value: string | string[] | undefined, t: Translate): string {
  if (Array.isArray(value)) {
    return value.map((entry) => convertTo24HourFormat(entry, t)).join(', ');
  }

  if (!value) return t('invalidData');

  // Narrow (U+202F) and non-breaking (U+00A0) spaces come through in Google's strings.
  const normalized = value.replace(/\u202F|\u00A0/g, ' ').trim();

  if (normalized === 'Closed') return t('closed');
  if (normalized === 'Open 24 hours') return t('open24Hours');
  if (!DASH_REGEX.test(normalized)) return t('invalidData');

  const [start, end] = normalized.split(DASH_REGEX);
  const start24 = to24Hour(start);
  const end24 = to24Hour(end);

  if (!start24 || !end24) return t('invalidData');

  return `${start24}–${end24}`;
}

function to24Hour(time: string): string {
  const trimmed = time.trim();

  const amPm = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (amPm) {
    let hour = Number(amPm[1]);
    const minute = amPm[2] ?? '00';
    const period = amPm[3].toUpperCase();

    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  const h24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    const hour = Number(h24[1]);
    if (hour >= 0 && hour <= 23) return `${String(hour).padStart(2, '0')}:${h24[2]}`;
  }

  return '';
}

export type WorkingHoursStatus = {
  isOpen: boolean;
  /** Today's span in 24h form, or the translated "closed" label. */
  hours: string;
  /** `today 09:00` / `tomorrow 09:00` / `Monday 09:00` when currently closed. */
  willOpenAt: string | null;
  /** Set only in the last 30 minutes before closing. */
  closingIn: string | null;
};

function toMinutes(range: string): [number, number] {
  const [start, end] = range.split('–').map((time) => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  });
  return [start, end];
}

export function resolveWorkingHours(
  workingHours: WorkingHours | undefined,
  t: Translate,
  now: Date = new Date()
): WorkingHoursStatus {
  const closedLabel = t('closed');
  const todayIndex = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const rawFor = (index: number) => workingHours?.[WEEKDAYS[index]]?.[0];

  const todayHours = rawFor(todayIndex);
  const yesterdayHours = rawFor((todayIndex - 1 + 7) % 7);

  if (todayHours === 'Open 24 hours') {
    return { isOpen: true, hours: t('open24Hours'), willOpenAt: null, closingIn: null };
  }

  /**
   * A span that wraps past midnight (`8 PM–2 AM`) keeps the venue open into the next calendar
   * day, so yesterday's row has to be checked too.
   */
  const checkOvernight = (hours: string | undefined, isYesterday = false) => {
    if (!hours || hours === 'Closed') return null;

    const converted = convertTo24HourFormat(hours, t);
    if (!converted.includes('–')) return null;

    const [start, end] = toMinutes(converted);
    if (end > start) return null;

    const inside =
      (isYesterday && currentMinutes < end) || (!isYesterday && currentMinutes >= start);
    if (!inside) return null;

    const minutesToClose =
      currentMinutes >= start ? 1440 - currentMinutes + end : end - currentMinutes;

    return {
      isOpen: true,
      hours: converted,
      willOpenAt: null,
      closingIn: minutesToClose <= 30 ? t('closingInMinutes', { minutes: minutesToClose }) : null,
    };
  };

  const overnight = checkOvernight(yesterdayHours, true) || checkOvernight(todayHours);
  if (overnight) return overnight;

  if (todayHours && todayHours !== 'Closed') {
    const converted = convertTo24HourFormat(todayHours, t);

    if (converted.includes('–')) {
      const [start, end] = toMinutes(converted);

      if (currentMinutes < start) {
        return {
          isOpen: false,
          hours: converted,
          willOpenAt: `${t('todayAt')} ${converted.split('–')[0]}`,
          closingIn: null,
        };
      }

      if (currentMinutes < end) {
        const minutesToClose = end - currentMinutes;
        return {
          isOpen: true,
          hours: converted,
          willOpenAt: null,
          closingIn:
            minutesToClose <= 30 ? t('closingInMinutes', { minutes: minutesToClose }) : null,
        };
      }
    }
  }

  // Already closed for today — announce the next day that opens at all.
  for (let offset = 1; offset < 7; offset++) {
    const dayIndex = (todayIndex + offset) % 7;
    const hours = rawFor(dayIndex);
    if (!hours || hours === 'Closed') continue;

    const opensAt = convertTo24HourFormat(hours, t).split('–')[0];
    if (!opensAt) continue;

    const dayName = offset === 1 ? t('tomorrowAt') : translateWeekday(WEEKDAYS[dayIndex], t);
    return { isOpen: false, hours: closedLabel, willOpenAt: `${dayName} ${opensAt}`, closingIn: null };
  }

  return { isOpen: false, hours: closedLabel, willOpenAt: null, closingIn: null };
}
