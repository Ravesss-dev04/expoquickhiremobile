import type { Gig, GigCommitment, GigSchedule } from './types';

export const MAX_ACTIVE_COMMITMENTS = 2;

export type CommitmentFailureReason =
  | 'GIG_UNAVAILABLE'
  | 'DUPLICATE'
  | 'LIMIT_REACHED'
  | 'SCHEDULE_UNVERIFIABLE'
  | 'INVALID_SCHEDULE'
  | 'CONFLICT';

export type CommitmentAttempt =
  | {
      ok: true;
      commitments: readonly GigCommitment[];
      activeCount: number;
    }
  | {
      ok: false;
      commitments: readonly GigCommitment[];
      activeCount: number;
      reason: CommitmentFailureReason;
      conflictingGigId?: string;
    };

type Interval = { start: number; end: number };
type ScheduleValidation =
  | { ok: true; intervals: Interval[] }
  | { ok: false; reason: 'SCHEDULE_UNVERIFIABLE' | 'INVALID_SCHEDULE' };

export function parseIsoInstant(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '0', offset] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (
    year < 1000 ||
    month < 1 || month > 12 ||
    day < 1 || day > daysInMonth ||
    hour > 23 || minute > 59 || second > 59
  ) return null;

  if (offset !== 'Z') {
    const offsetHours = Number(offset.slice(1, 3));
    const offsetMinutes = Number(offset.slice(4, 6));
    if (offsetHours > 14 || offsetMinutes > 59 || (offsetHours === 14 && offsetMinutes !== 0)) return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function timestampMatchesTimeZone(value: string, timestamp: number, timeZone: string): boolean {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/.exec(value);
  if (!match) return false;

  const [, date, hourAndMinute, second = '00'] = match;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(timestamp);
  const localParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localDate = `${localParts.year}-${localParts.month}-${localParts.day}`;
  const localTime = `${localParts.hour}:${localParts.minute}:${localParts.second}`;

  return localDate === date && localTime === `${hourAndMinute}:${second}`;
}

function validateSchedule(schedule: GigSchedule | undefined): ScheduleValidation {
  if (!schedule || !schedule.timeZone || !Array.isArray(schedule.occurrences) || schedule.occurrences.length === 0) {
    return { ok: false, reason: 'SCHEDULE_UNVERIFIABLE' };
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: schedule.timeZone });
  } catch {
    return { ok: false, reason: 'INVALID_SCHEDULE' };
  }

  const intervals: Interval[] = [];
  for (const occurrence of schedule.occurrences) {
    if (!occurrence || typeof occurrence.startAt !== 'string' || typeof occurrence.endAt !== 'string') {
      return { ok: false, reason: 'INVALID_SCHEDULE' };
    }
    const start = parseIsoInstant(occurrence.startAt);
    const end = parseIsoInstant(occurrence.endAt);
    if (
      start === null || end === null || end <= start ||
      !timestampMatchesTimeZone(occurrence.startAt, start, schedule.timeZone) ||
      !timestampMatchesTimeZone(occurrence.endAt, end, schedule.timeZone)
    ) return { ok: false, reason: 'INVALID_SCHEDULE' };
    intervals.push({ start, end });
  }

  intervals.sort((first, second) => first.start - second.start);
  for (let index = 1; index < intervals.length; index += 1) {
    if (intervals[index].start < intervals[index - 1].end) {
      return { ok: false, reason: 'INVALID_SCHEDULE' };
    }
  }

  return { ok: true, intervals };
}

export function isValidGigSchedule(schedule: GigSchedule | undefined): boolean {
  return validateSchedule(schedule).ok;
}

// Only distinct ACTIVE gigs count; COMPLETED and CANCELLED commitments do not.
export function countActiveCommitments(commitments: readonly GigCommitment[], applicantId: string): number {
  return new Set(
    commitments
      .filter((commitment) => commitment.applicantId === applicantId && commitment.status === 'ACTIVE')
      .map((commitment) => commitment.gigId),
  ).size;
}

export function schedulesOverlap(first: GigSchedule, second: GigSchedule): boolean | null {
  const firstIntervals = validateSchedule(first);
  const secondIntervals = validateSchedule(second);
  if (!firstIntervals.ok || !secondIntervals.ok) return null;

  return firstIntervals.intervals.some((firstInterval) =>
    secondIntervals.intervals.some((secondInterval) =>
      firstInterval.start < secondInterval.end && secondInterval.start < firstInterval.end,
    ),
  );
}

function failure(
  commitments: readonly GigCommitment[],
  reason: CommitmentFailureReason,
  applicantId: string,
  conflictingGigId?: string,
): CommitmentAttempt {
  return {
    ok: false,
    commitments,
    activeCount: countActiveCommitments(commitments, applicantId),
    reason,
    ...(conflictingGigId ? { conflictingGigId } : {}),
  };
}

export function attemptCommitment(
  proposedGig: Gig,
  commitments: readonly GigCommitment[],
  gigs: readonly Gig[],
  applicantId: string,
): CommitmentAttempt {
  const canonicalGig = gigs.find((gig) => gig.id === proposedGig.id);
  if (!canonicalGig) return failure(commitments, 'GIG_UNAVAILABLE', applicantId);

  if (commitments.some((commitment) => commitment.applicantId === applicantId && commitment.gigId === canonicalGig.id)) {
    return failure(commitments, 'DUPLICATE', applicantId);
  }

  if (canonicalGig.status !== 'OPEN') return failure(commitments, 'GIG_UNAVAILABLE', applicantId);

  if (countActiveCommitments(commitments, applicantId) >= MAX_ACTIVE_COMMITMENTS) {
    return failure(commitments, 'LIMIT_REACHED', applicantId);
  }

  const proposedIntervals = validateSchedule(canonicalGig.schedule);
  if (!proposedIntervals.ok) return failure(commitments, proposedIntervals.reason, applicantId);

  const gigsById = new Map(gigs.map((gig) => [gig.id, gig]));
  for (const commitment of commitments) {
    if (commitment.applicantId !== applicantId || commitment.status !== 'ACTIVE') continue;
    const existingGig = gigsById.get(commitment.gigId);
    if (!existingGig) return failure(commitments, 'SCHEDULE_UNVERIFIABLE', applicantId);

    const existingIntervals = validateSchedule(existingGig.schedule);
    if (!existingIntervals.ok) return failure(commitments, existingIntervals.reason, applicantId);

    const overlaps = proposedIntervals.intervals.some((proposedInterval) =>
      existingIntervals.intervals.some((existingInterval) =>
        proposedInterval.start < existingInterval.end && existingInterval.start < proposedInterval.end,
      ),
    );
    if (overlaps) return failure(commitments, 'CONFLICT', applicantId, existingGig.id);
  }

  const newCommitment: GigCommitment = {
    id: `commitment:${applicantId}:${canonicalGig.id}`,
    gigId: canonicalGig.id,
    applicantId,
    status: 'ACTIVE',
  };

  return {
    ok: true,
    commitments: [...commitments, newCommitment],
    activeCount: countActiveCommitments(commitments, applicantId) + 1,
  };
}
