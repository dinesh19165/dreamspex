import { isValidCoordinates, type Coordinates } from './deliveryNavigation';

export type StoreOpenStatus = 'open' | 'closed' | 'unknown';

const STORE_TIME_ZONE = 'Asia/Kolkata';
const DAY_NAMES = [
  ['Sunday', 'Sun'],
  ['Monday', 'Mon'],
  ['Tuesday', 'Tue'],
  ['Wednesday', 'Wed'],
  ['Thursday', 'Thu'],
  ['Friday', 'Fri'],
  ['Saturday', 'Sat'],
] as const;
const DAY_NAME_PATTERN = DAY_NAMES.flatMap(([full, short]) => [full, short])
  .sort((left, right) => right.length - left.length)
  .join('|');

export function calculateDistanceKm(origin: Coordinates, destination: Coordinates): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(destination.latitude - origin.latitude);
  const longitudeDelta = radians(destination.longitude - origin.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(origin.latitude)) * Math.cos(radians(destination.latitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function timeInMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase();
  if (hour > 23 || minute > 59 || (meridiem && (hour < 1 || hour > 12))) return null;
  if (meridiem === 'pm' && hour !== 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function normalizeTime(value: string) {
  const minutes = timeInMinutes(value);
  if (minutes === null) return null;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const meridiem = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${meridiem}`;
}

function dayIndex(value: string): number | null {
  const normalized = value.toLowerCase();
  return DAY_NAMES.findIndex(([full, short]) =>
    normalized === full.toLowerCase() || normalized === short.toLowerCase());
}

function dayLabel(index: number) {
  return DAY_NAMES[index][0];
}

type ParsedOpeningHours = {
  display: string;
  schedule: Map<number, string>;
};

function parseOpeningHours(hours: string): ParsedOpeningHours {
  const schedule = new Map<number, string>();
  const displaySegments: string[] = [];
  const segments = hours.split(/[;|/\n]+/).map((segment) => segment.trim()).filter(Boolean);
  const dayPattern = new RegExp(`^(${DAY_NAME_PATTERN})(?:\\s*[-–]\\s*(${DAY_NAME_PATTERN}))?\\s*(?::\\s*|\\s+)?(.+)$`, 'i');

  for (const segment of segments) {
    if (/^holiday(?:s)?\s*[:-]?\s*(?:closed|off|holiday|holidays)?$/i.test(segment)) {
      displaySegments.push('Holiday: Closed');
      continue;
    }

    const match = segment.match(dayPattern);
    if (!match) {
      displaySegments.push(segment);
      continue;
    }

    const startDay = dayIndex(match[1]);
    const endDay = match[2] ? dayIndex(match[2]) : startDay;
    if (startDay === null || endDay === null) {
      displaySegments.push(segment);
      continue;
    }

    const rawValue = match[3].trim().replace(/^[-–:]+/, '').trim();
    let displayValue = rawValue;
    if (/^(closed|close|off|holiday|holidays|weekly off)$/i.test(rawValue)) {
      displayValue = 'Closed';
    } else if (/^24\s*hours?$/i.test(rawValue)) {
      displayValue = '24 hours';
    } else {
      const range = rawValue.match(/^(.+?)\s*(?:-|–|—|\bto\b)\s*(.+)$/i);
      const opensAt = range ? normalizeTime(range[1]) : null;
      const closesAt = range ? normalizeTime(range[2]) : null;
      if (opensAt && closesAt) displayValue = `${opensAt} – ${closesAt}`;
    }

    for (let day = startDay; ; day = (day + 1) % 7) {
      schedule.set(day, displayValue === 'Closed' ? 'Closed' : rawValue);
      if (day === endDay) break;
    }

    const days = startDay === endDay
      ? dayLabel(startDay)
      : `${dayLabel(startDay)}–${dayLabel(endDay)}`;
    displaySegments.push(`${days}: ${displayValue}`);
  }

  return {
    display: schedule.size ? displaySegments.join(' · ') : hours,
    schedule,
  };
}

export function formatStoreOpeningHours(hours: string | null | undefined): string | null {
  const trimmedHours = hours?.trim();
  return trimmedHours ? parseOpeningHours(trimmedHours).display : null;
}

function localDayAndMinutes(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  const day = weekday ? dayIndex(weekday) : null;
  if (day === null || !Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  return { day, minutes: hour * 60 + minute };
}

export function getStoreOpenStatus(
  hours: string | null | undefined,
  now = new Date(),
  timeZone = STORE_TIME_ZONE,
): StoreOpenStatus {
  if (!hours?.trim()) return 'unknown';
  const { schedule } = parseOpeningHours(hours.trim());
  const localTime = localDayAndMinutes(now, timeZone);
  if (!localTime) return 'unknown';
  const todayHours = schedule.get(localTime.day);
  if (!todayHours) return 'unknown';
  if (/^(closed|off)$/i.test(todayHours)) return 'closed';
  if (/^24\s*hours?$/i.test(todayHours)) return 'open';

  const range = todayHours.match(/^(.+?)\s*(?:-|–|—|\bto\b)\s*(.+)$/i);
  if (!range) return 'unknown';
  const opensAt = timeInMinutes(range[1]);
  const closesAt = timeInMinutes(range[2]);
  if (opensAt === null || closesAt === null) return 'unknown';
  const isOpen = closesAt < opensAt
    ? localTime.minutes >= opensAt || localTime.minutes < closesAt
    : localTime.minutes >= opensAt && localTime.minutes < closesAt;
  return isOpen ? 'open' : 'closed';
}

export function getStoreCoordinates(latitude: number | null, longitude: number | null): Coordinates | null {
  return latitude !== null && longitude !== null && isValidCoordinates(latitude, longitude)
    ? { latitude, longitude }
    : null;
}
