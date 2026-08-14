import type { InfoPersonSchedule } from '@/types/chat';
import type { OccupiedRange } from '@/services/info-service';

const SLOT_MIN = 15;

const LEGACY_DAY: Record<number, string[]> = {
  1: ['понедельник', 'пн', 'dushanba', 'du', 'monday'],
  2: ['вторник', 'вт', 'seshanba', 'se', 'tuesday'],
  3: ['среда', 'ср', 'chorshanba', 'ch', 'wednesday'],
  4: ['четверг', 'чт', 'payshanba', 'pa', 'thursday'],
  5: ['пятница', 'пт', 'juma', 'ju', 'friday'],
  6: ['суббота', 'сб', 'shanba', 'sh', 'saturday'],
  7: ['воскресенье', 'вс', 'yakshanba', 'ya', 'sunday'],
};

export function dateToStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function jsDayToIndex(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function resolveDayIndex(slot: InfoPersonSchedule): number | null {
  if (slot.dayIndex != null && slot.dayIndex >= 1 && slot.dayIndex <= 7) return slot.dayIndex;
  if (!slot.day) return null;
  const value = slot.day.toLowerCase().trim();
  for (const [index, keys] of Object.entries(LEGACY_DAY)) {
    if (keys.some((key) => value.startsWith(key) || key.startsWith(value))) return Number(index);
  }
  return null;
}

function isWorking(slot: InfoPersonSchedule): boolean {
  return !slot.type || slot.type === 'work';
}

export function workingDates(schedule: InfoPersonSchedule[], from = new Date(), horizon = 60): Date[] {
  const indices = new Set<number>();
  for (const slot of schedule) {
    if (!isWorking(slot)) continue;
    const index = resolveDayIndex(slot);
    if (index) indices.add(index);
  }

  const dates: Date[] = [];
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  for (let offset = 0; offset < horizon; offset++) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const index = jsDayToIndex(date.getDay());
    if (indices.size === 0) {
      if (index <= 5) dates.push(date);
    } else if (indices.has(index)) {
      dates.push(date);
    }
  }

  return dates;
}

export function slotsForDate(
  schedule: InfoPersonSchedule[],
  date: Date,
  occupied: OccupiedRange[],
  durationMin = 15
): string[] {
  const dayIndex = jsDayToIndex(date.getDay());
  const work = schedule.filter((slot) => isWorking(slot) && resolveDayIndex(slot) === dayIndex);

  const ranges =
    work.length > 0
      ? work
      : [{ startTime: '09:00', endTime: '18:00', dayIndex }];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selected = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const minMinutes =
    selected.getTime() === today.getTime()
      ? now.getHours() * 60 + now.getMinutes() + SLOT_MIN
      : 0;

  const occupiedMinutes = occupied.flatMap((range) => {
    const start = timeToMinutes(range.start);
    const end = timeToMinutes(range.end);
    const blocked: number[] = [];
    for (let t = start; t < end; t += SLOT_MIN) blocked.push(t);
    return blocked;
  });
  const blocked = new Set(occupiedMinutes);

  const slots: string[] = [];
  for (const range of ranges) {
    const start = timeToMinutes(range.startTime);
    const end = timeToMinutes(range.endTime);
    const last = end > start ? end : 24 * 60;
    for (let t = start; t + durationMin <= last; t += SLOT_MIN) {
      if (t < minMinutes) continue;
      if (blocked.has(t)) continue;
      slots.push(minutesToTime(t));
    }
  }

  return slots;
}
