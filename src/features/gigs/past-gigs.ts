import { expertiseCategories } from '../expertise/constants';

import { parseIsoInstant } from './commitments';
import type {
  ApplicantFeedback,
  AttendanceRecord,
  CompanyApplicantReview,
  EarningRecord,
  Gig,
  GigCommitment,
} from './types';

export const MAX_FEEDBACK_COMMENT_LENGTH = 500;

export type GigHistoryEntry = {
  commitment: GigCommitment;
  gig: Gig;
  attendance?: AttendanceRecord;
  applicantFeedback?: ApplicantFeedback;
  hasApplicantFeedback: boolean;
  companyReviews: CompanyApplicantReview[];
  earnings: EarningRecord[];
};

export type FeedbackStateFilter = 'ALL' | 'SUBMITTED' | 'NOT_SUBMITTED';
export type EarningsStateFilter = 'ALL' | 'CONFIRMED' | 'PAID' | 'NOT_RECORDED';
export type PastGigSort = 'SCHEDULED_NEWEST' | 'SCHEDULED_OLDEST';

export type PastGigFilters = {
  search: string;
  categoryId: string | null;
  companyName: string | null;
  feedback: FeedbackStateFilter;
  earnings: EarningsStateFilter;
};

export const EMPTY_PAST_GIG_FILTERS: PastGigFilters = {
  search: '',
  categoryId: null,
  companyName: null,
  feedback: 'ALL',
  earnings: 'ALL',
};

export type FeedbackValidation =
  | { ok: true; comment?: string }
  | { ok: false; reason: 'INVALID_RATING' | 'COMMENT_TOO_LONG' | 'INVALID_TIMESTAMP' };

export type FeedbackSubmission =
  | { ok: true; feedback: ApplicantFeedback }
  | {
      ok: false;
      reason: 'INVALID_RATING' | 'COMMENT_TOO_LONG' | 'INVALID_TIMESTAMP' |
        'COMMITMENT_NOT_FOUND' | 'NOT_OWNER' | 'NOT_COMPLETED' | 'GIG_NOT_FOUND' | 'ALREADY_SUBMITTED';
    };

export type EarningsSummary = {
  recordCount: number;
  confirmedTotals: { currency: string; amountMinor: number | null }[];
  paidTotals: { currency: string; amountMinor: number | null }[];
};

export type EarningsPeriod = 'ALL' | 'THIS_MONTH';

function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

function isValidCurrency(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency);
}

function isValidTimestamp(value: string): boolean {
  return parseIsoInstant(value) !== null;
}

function scheduledTimestamp(gig: Gig): number | null {
  const occurrences = gig.schedule?.occurrences;
  const scheduled = Array.isArray(occurrences)
    ? occurrences
      .map((occurrence) => occurrence && typeof occurrence.startAt === 'string'
        ? parseIsoInstant(occurrence.startAt)
        : null)
      .filter((timestamp): timestamp is number => timestamp !== null)
    : [];
  if (scheduled.length > 0) return scheduled.reduce((earliest, timestamp) => Math.min(earliest, timestamp));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(gig.startDate)) return null;
  return parseIsoInstant(`${gig.startDate}T00:00:00Z`);
}

function matchingCompanyReviews(
  reviews: readonly CompanyApplicantReview[],
  commitment: GigCommitment,
  gig: Gig,
): CompanyApplicantReview[] {
  const matching = reviews.filter((review) =>
    review.commitmentId === commitment.id &&
    review.gigId === gig.id &&
    review.applicantId === commitment.applicantId &&
    review.companyName === gig.companyName &&
    isValidRating(review.rating) &&
    isValidTimestamp(review.submittedAt),
  );
  const ids = new Set<string>();
  const commitments = new Set<string>();
  return matching.filter((review) => {
    if (!review.id || ids.has(review.id) || commitments.has(review.commitmentId)) return false;
    ids.add(review.id);
    commitments.add(review.commitmentId);
    return true;
  });
}

function validAttendance(
  records: readonly AttendanceRecord[],
  commitment: GigCommitment,
  gig: Gig,
): AttendanceRecord | undefined {
  const matching = records.filter((record) => record.commitmentId === commitment.id);
  if (matching.length !== 1) return undefined;

  const [record] = matching;
  if (
    record.applicantId !== commitment.applicantId ||
    record.gigId !== gig.id ||
    !record.id ||
    !isValidTimestamp(record.checkedInAt)
  ) return undefined;

  if (record.checkedOutAt !== undefined) {
    const checkIn = parseIsoInstant(record.checkedInAt);
    const checkOut = parseIsoInstant(record.checkedOutAt);
    if (checkOut === null || checkIn === null || checkOut <= checkIn) return undefined;
  }
  return record;
}

function earningsForHistory(
  records: readonly EarningRecord[],
  entries: readonly Pick<GigHistoryEntry, 'commitment' | 'gig'>[],
): Map<string, EarningRecord[]> {
  const entriesByCommitment = new Map(entries.map((entry) => [entry.commitment.id, entry]));
  const candidates = records.filter((record) => {
    const entry = entriesByCommitment.get(record.commitmentId);
    if (!entry) return false;
    const confirmedTimestamp = parseIsoInstant(record.confirmedAt);
    const paidTimestamp = record.paidAt ? parseIsoInstant(record.paidAt) : null;
    return record.gigId === entry.gig.id &&
      record.applicantId === entry.commitment.applicantId &&
      record.compensationType === entry.gig.compensationType &&
      Number.isSafeInteger(record.amountMinor) &&
      record.amountMinor >= 0 &&
      isValidCurrency(record.currency) &&
      confirmedTimestamp !== null &&
      (record.status === 'CONFIRMED' ||
        (record.status === 'PAID' && paidTimestamp !== null && paidTimestamp >= confirmedTimestamp));
  });

  const countByCommitment = new Map<string, number>();
  const countById = new Map<string, number>();
  for (const record of candidates) {
    countByCommitment.set(record.commitmentId, (countByCommitment.get(record.commitmentId) ?? 0) + 1);
    countById.set(record.id, (countById.get(record.id) ?? 0) + 1);
  }

  const eligible = candidates.filter((record) =>
    Boolean(record.id) &&
    countByCommitment.get(record.commitmentId) === 1 &&
    countById.get(record.id) === 1,
  );
  const byCommitment = new Map<string, EarningRecord[]>();
  for (const record of eligible) byCommitment.set(record.commitmentId, [record]);
  return byCommitment;
}

export function getPastGigs(
  commitments: readonly GigCommitment[],
  gigs: readonly Gig[],
  applicantId: string,
  attendanceRecords: readonly AttendanceRecord[] = [],
  applicantFeedback: readonly ApplicantFeedback[] = [],
  companyReviews: readonly CompanyApplicantReview[] = [],
  earningRecords: readonly EarningRecord[] = [],
): GigHistoryEntry[] {
  const commitmentsById = new Map<string, GigCommitment[]>();
  for (const commitment of commitments) {
    if (!commitment.id) continue;
    const group = commitmentsById.get(commitment.id) ?? [];
    group.push(commitment);
    commitmentsById.set(commitment.id, group);
  }

  const baseEntries: Pick<GigHistoryEntry, 'commitment' | 'gig'>[] = [];

  for (const [commitmentId, matches] of commitmentsById) {
    const commitment = matches[0];
    if (
      matches.some((match) =>
        match.applicantId !== commitment.applicantId ||
        match.gigId !== commitment.gigId ||
        match.status !== commitment.status,
      ) ||
      commitment.applicantId !== applicantId ||
      commitment.status !== 'COMPLETED' ||
      !commitmentId
    ) continue;

    const gigMatches = gigs.filter((gig) => gig.id === commitment.gigId);
    if (gigMatches.length !== 1) continue;
    const [gig] = gigMatches;
    baseEntries.push({ commitment, gig });
  }

  const earningsByCommitment = earningsForHistory(earningRecords, baseEntries);

  return baseEntries
    .map(({ commitment, gig }) => {
      const matchingFeedback = applicantFeedback.filter((feedback) =>
        feedback.commitmentId === commitment.id &&
        feedback.gigId === gig.id &&
        feedback.applicantId === applicantId,
      );
      const feedback = matchingFeedback.length === 1 &&
        Boolean(matchingFeedback[0].id) &&
        matchingFeedback[0].companyName === gig.companyName &&
        isValidRating(matchingFeedback[0].rating) &&
        isValidTimestamp(matchingFeedback[0].submittedAt) &&
        (matchingFeedback[0].comment === undefined ||
          (typeof matchingFeedback[0].comment === 'string' &&
            matchingFeedback[0].comment.length <= MAX_FEEDBACK_COMMENT_LENGTH &&
            matchingFeedback[0].comment.trim() === matchingFeedback[0].comment))
        ? matchingFeedback[0]
        : undefined;

      return {
        commitment,
        gig,
        attendance: validAttendance(attendanceRecords, commitment, gig),
        applicantFeedback: feedback,
        hasApplicantFeedback: matchingFeedback.length > 0,
        companyReviews: matchingCompanyReviews(companyReviews, commitment, gig),
        earnings: earningsByCommitment.get(commitment.id) ?? [],
      };
    })
    .sort((first, second) => {
      const firstTime = scheduledTimestamp(first.gig);
      const secondTime = scheduledTimestamp(second.gig);
      if (firstTime === null && secondTime === null) return first.gig.id.localeCompare(second.gig.id);
      if (firstTime === null) return 1;
      if (secondTime === null) return -1;
      return secondTime - firstTime;
    });
}

export function filterAndSortPastGigs(
  entries: readonly GigHistoryEntry[],
  filters: PastGigFilters,
  sort: PastGigSort,
): GigHistoryEntry[] {
  const query = filters.search.trim().toLocaleLowerCase();
  const categoryLabels = new Map(expertiseCategories.map((category) => [category.id, category.label]));
  const filtered = entries.filter((entry) => {
    if (filters.categoryId && entry.gig.categoryId !== filters.categoryId) return false;
    if (filters.companyName && entry.gig.companyName !== filters.companyName) return false;
    if (filters.feedback === 'SUBMITTED' && !entry.hasApplicantFeedback) return false;
    if (filters.feedback === 'NOT_SUBMITTED' && entry.hasApplicantFeedback) return false;
    if (filters.earnings === 'CONFIRMED' && !entry.earnings.some((record) => record.status === 'CONFIRMED')) return false;
    if (filters.earnings === 'PAID' && !entry.earnings.some((record) => record.status === 'PAID')) return false;
    if (filters.earnings === 'NOT_RECORDED' && entry.earnings.length > 0) return false;
    if (!query) return true;

    const searchable = [
      entry.gig.title,
      entry.gig.companyName,
      entry.gig.categoryId,
      categoryLabels.get(entry.gig.categoryId) ?? '',
      entry.gig.description,
      entry.gig.location,
    ].join(' ').toLocaleLowerCase();
    return searchable.includes(query);
  });

  return filtered
    .map((entry, index) => ({ entry, index }))
    .sort((first, second) => {
      const firstDate = scheduledTimestamp(first.entry.gig);
      const secondDate = scheduledTimestamp(second.entry.gig);
      if (firstDate === null && secondDate === null) return first.index - second.index;
      if (firstDate === null) return 1;
      if (secondDate === null) return -1;
      const difference = firstDate - secondDate;
      return (sort === 'SCHEDULED_NEWEST' ? -difference : difference) || first.index - second.index;
    })
    .map(({ entry }) => entry);
}

export function validateFeedback(
  rating: number,
  comment: string,
  submittedAt: string,
): FeedbackValidation {
  if (!isValidRating(rating)) return { ok: false, reason: 'INVALID_RATING' };
  if (comment.length > MAX_FEEDBACK_COMMENT_LENGTH) return { ok: false, reason: 'COMMENT_TOO_LONG' };
  if (!isValidTimestamp(submittedAt)) return { ok: false, reason: 'INVALID_TIMESTAMP' };

  const trimmedComment = comment.trim();
  return { ok: true, ...(trimmedComment ? { comment: trimmedComment } : {}) };
}

export function submitApplicantFeedback(
  commitmentId: string,
  applicantId: string,
  rating: number,
  comment: string,
  submittedAt: string,
  commitments: readonly GigCommitment[],
  gigs: readonly Gig[],
  existingFeedback: readonly ApplicantFeedback[],
): FeedbackSubmission {
  const validation = validateFeedback(rating, comment, submittedAt);
  if (!validation.ok) return validation;

  const matches = commitments.filter((commitment) => commitment.id === commitmentId);
  if (matches.length === 0) return { ok: false, reason: 'COMMITMENT_NOT_FOUND' };
  if (matches.length !== 1) return { ok: false, reason: 'COMMITMENT_NOT_FOUND' };

  const commitment = matches[0];
  if (commitment.applicantId !== applicantId) return { ok: false, reason: 'NOT_OWNER' };
  if (commitment.status !== 'COMPLETED') return { ok: false, reason: 'NOT_COMPLETED' };

  const gigMatches = gigs.filter((gig) => gig.id === commitment.gigId);
  if (gigMatches.length !== 1) return { ok: false, reason: 'GIG_NOT_FOUND' };
  const gig = gigMatches[0];

  const feedbackId = `applicant-feedback:${commitment.id}`;
  if (existingFeedback.some((feedback) =>
    feedback.id === feedbackId ||
    (feedback.applicantId === applicantId &&
      feedback.commitmentId === commitment.id &&
      feedback.gigId === gig.id),
  )) return { ok: false, reason: 'ALREADY_SUBMITTED' };

  const feedback: ApplicantFeedback = {
    id: feedbackId,
    commitmentId: commitment.id,
    gigId: gig.id,
    applicantId,
    companyName: gig.companyName,
    rating,
    ...(validation.comment ? { comment: validation.comment } : {}),
    submittedAt,
  };
  return { ok: true, feedback };
}

function sumByCurrency(
  records: readonly EarningRecord[],
  eligible: (record: EarningRecord) => boolean,
): { currency: string; amountMinor: number | null }[] {
  const totals = new Map<string, number | null>();
  for (const record of records) {
    if (!eligible(record)) continue;
    const previous = totals.get(record.currency) ?? 0;
    totals.set(
      record.currency,
      previous === null || !Number.isSafeInteger(previous + record.amountMinor)
        ? null
        : previous + record.amountMinor,
    );
  }
  return [...totals.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([currency, amountMinor]) => ({ currency, amountMinor }));
}

export function summarizeEarnings(entries: readonly GigHistoryEntry[]): EarningsSummary {
  const records = entries.flatMap((entry) => entry.earnings);
  return {
    recordCount: records.length,
    confirmedTotals: sumByCurrency(records, () => true),
    paidTotals: sumByCurrency(records, (record) => record.status === 'PAID'),
  };
}

export function filterEarningsByPeriod(
  entries: readonly GigHistoryEntry[],
  period: EarningsPeriod,
  now: string,
): GigHistoryEntry[] {
  if (period === 'ALL') return [...entries];
  const nowTimestamp = parseIsoInstant(now);
  if (nowTimestamp === null) return [];

  const currentMonth = new Date(nowTimestamp).toISOString().slice(0, 7);
  return entries
    .map((entry) => ({
      ...entry,
      earnings: entry.earnings.filter((record) => {
        const timestamp = parseIsoInstant(record.confirmedAt);
        return timestamp !== null && new Date(timestamp).toISOString().slice(0, 7) === currentMonth;
      }),
    }))
    .filter((entry) => entry.earnings.length > 0);
}

export function summarizeCompanyReviews(entries: readonly GigHistoryEntry[]): {
  count: number;
  averageRating: number | null;
} {
  const reviews = entries.flatMap((entry) => entry.companyReviews);
  const seenIds = new Set<string>();
  const seenCommitments = new Set<string>();
  const uniqueReviews = reviews.filter((review) => {
    if (
      !isValidRating(review.rating) ||
      !review.id ||
      seenIds.has(review.id) ||
      seenCommitments.has(review.commitmentId)
    ) return false;
    seenIds.add(review.id);
    seenCommitments.add(review.commitmentId);
    return true;
  });
  if (uniqueReviews.length === 0) return { count: 0, averageRating: null };
  return {
    count: uniqueReviews.length,
    averageRating: uniqueReviews.reduce((sum, review) => sum + review.rating, 0) / uniqueReviews.length,
  };
}

export function formatCurrencyMinor(amountMinor: number, currency: string): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0 || !isValidCurrency(currency)) {
    return 'Amount unavailable';
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function formatEarningsTimestamp(value: string): string {
  const timestamp = parseIsoInstant(value);
  if (timestamp === null) return 'Date not recorded';
  return `${new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(timestamp)} (UTC)`;
}

export function formatOfferedCompensation(gig: Gig): string | null {
  if (!Number.isFinite(gig.compensationAmount) || gig.compensationAmount < 0) return null;
  const basis = {
    HOUR: 'per hour',
    SHIFT: 'per shift',
    PROJECT: 'per project',
  }[gig.compensationType];
  if (!basis) return null;
  const amount = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(gig.compensationAmount);
  return `${amount} / ${basis} · currency not specified`;
}

export function decimalAmountToMinorUnits(amount: number): number | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  const value = String(amount);
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;

  const [whole, fraction = ''] = value.split('.');
  const minorUnits = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minorUnits) ? minorUnits : null;
}
