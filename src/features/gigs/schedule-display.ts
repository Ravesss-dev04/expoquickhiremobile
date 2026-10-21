import type { GigScheduleOccurrence } from './types';
import { parseIsoInstant } from './commitments';

export function formatScheduleOccurrence(occurrence: GigScheduleOccurrence, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  });

  return `${formatter.format(new Date(occurrence.startAt))} to ${formatter.format(new Date(occurrence.endAt))}`;
}

export function formatAttendanceTimestamp(value: string, timeZone?: string) {
  const timestamp = parseIsoInstant(value);
  if (timestamp === null) return 'Timestamp unavailable';

  let displayTimeZone = timeZone ?? 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: displayTimeZone }).format(timestamp);
  } catch {
    displayTimeZone = 'UTC';
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: displayTimeZone,
    timeZoneName: 'short',
  }).format(timestamp);
}
