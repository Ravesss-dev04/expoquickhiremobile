import {
  decimalAmountToMinorUnits,
  EMPTY_PAST_GIG_FILTERS,
  filterAndSortPastGigs,
  filterEarningsByPeriod,
  formatCurrencyMinor,
  getPastGigs,
  submitApplicantFeedback,
  summarizeCompanyReviews,
  summarizeEarnings,
  validateFeedback,
} from './past-gigs';
import type {
  ApplicantFeedback,
  AttendanceRecord,
  CompanyApplicantReview,
  EarningRecord,
  Gig,
  GigCommitment,
} from './types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function makeGig(id: string, title: string, startAt: string, compensationAmount: number): Gig {
  return {
    id,
    title,
    companyName: `Company ${id}`,
    companyDescription: 'Test company',
    categoryId: 'event-staff',
    description: 'A test event gig',
    responsibilities: [],
    requirements: [],
    location: 'Test location',
    compensationAmount,
    compensationType: 'SHIFT',
    startDate: startAt.slice(0, 10),
    startTime: '09:00',
    endTime: '12:00',
    schedule: {
      timeZone: 'UTC',
      occurrences: [{ startAt, endAt: startAt.replace('09:00:00', '12:00:00') }],
    },
    duration: 'One shift',
    gigType: 'SINGLE_SHIFT',
    status: 'OPEN',
    postedAt: '2026-10-01',
  };
}

function makeCommitment(
  id: string,
  gigId: string,
  status: GigCommitment['status'] = 'COMPLETED',
  applicantId = 'applicant-001',
): GigCommitment {
  return { id, gigId, applicantId, status };
}

function makeEarning(
  id: string,
  commitmentId: string,
  gigId: string,
  values: Partial<EarningRecord> = {},
): EarningRecord {
  return {
    id,
    commitmentId,
    gigId,
    applicantId: 'applicant-001',
    amountMinor: 15000,
    currency: 'PHP',
    compensationType: 'SHIFT',
    status: 'CONFIRMED',
    confirmedAt: '2026-11-05T10:00:00Z',
    ...values,
  };
}

const applicantId = 'applicant-001';
const firstGig = makeGig('gig-1', 'Guest Welcome Team', '2026-11-01T09:00:00Z', 180);
const secondGig = makeGig('gig-2', 'Customer Care Assistant', '2026-11-10T09:00:00Z', 27);
const firstCommitment = makeCommitment('commitment-1', firstGig.id);
const secondCommitment = makeCommitment('commitment-2', secondGig.id);
const completed = getPastGigs(
  [
    firstCommitment,
    { ...firstCommitment },
    secondCommitment,
    makeCommitment('active', firstGig.id, 'ACTIVE'),
    makeCommitment('cancelled', firstGig.id, 'CANCELLED'),
    makeCommitment('missing-gig', 'missing-gig'),
    makeCommitment('other-applicant', firstGig.id, 'COMPLETED', 'applicant-002'),
  ],
  [firstGig, secondGig],
  applicantId,
);
assert(completed.length === 2, 'Only unique, owned completed commitments with a valid gig should appear.');
assert(completed.every((entry) => entry.commitment.status === 'COMPLETED'), 'Active and cancelled work must not appear as completed.');
assert(completed.every((entry) => entry.commitment.applicantId === applicantId), 'History must only include the current applicant.');
assert(
  getPastGigs(
    [firstCommitment, { ...firstCommitment, gigId: secondGig.id }],
    [firstGig, secondGig],
    applicantId,
  ).length === 0,
  'Conflicting duplicate commitment references must not be resolved to an arbitrary gig.',
);
assert(
  getPastGigs([firstCommitment], [firstGig, { ...firstGig, title: 'Ambiguous duplicate' }], applicantId).length === 0,
  'Duplicate gig IDs must not be resolved to an arbitrary gig record.',
);

const attendance: AttendanceRecord = {
  id: 'attendance-1',
  commitmentId: firstCommitment.id,
  gigId: firstGig.id,
  applicantId,
  checkedInAt: '2026-11-01T09:03:00Z',
  checkedOutAt: '2026-11-01T12:04:00Z',
};
const historyWithAttendance = getPastGigs([firstCommitment], [firstGig], applicantId, [attendance]);
assert(historyWithAttendance[0].attendance?.checkedInAt === attendance.checkedInAt, 'A valid attendance record should be associated with its commitment.');
assert(
  getPastGigs([{ ...firstCommitment, status: 'ACTIVE' }], [firstGig], applicantId, [attendance]).length === 0,
  'Attendance and an elapsed schedule must not establish completion.',
);
assert(
  getPastGigs([firstCommitment], [firstGig], applicantId, [{ ...attendance, gigId: secondGig.id }])[0].attendance === undefined,
  'An attendance record with a mismatched gig reference must be ignored.',
);

const searchAndFilters = filterAndSortPastGigs(completed, {
  ...EMPTY_PAST_GIG_FILTERS,
  search: '  GUEST WELCOME  ',
  categoryId: 'event-staff',
  companyName: 'Company gig-1',
}, 'SCHEDULED_NEWEST');
assert(searchAndFilters.length === 1 && searchAndFilters[0].gig.id === firstGig.id, 'Trimmed case-insensitive search and filters should compose.');

const originalOrder = completed.map((entry) => entry.commitment.id).join(',');
const oldestScheduled = filterAndSortPastGigs(completed, EMPTY_PAST_GIG_FILTERS, 'SCHEDULED_OLDEST');
assert(oldestScheduled[0].gig.id === firstGig.id, 'Oldest-first sorting should use actual scheduled timestamps.');
filterAndSortPastGigs(completed, { ...EMPTY_PAST_GIG_FILTERS, companyName: 'none' }, 'SCHEDULED_NEWEST');
assert(completed.map((entry) => entry.commitment.id).join(',') === originalOrder, 'Filtering and clearing must not mutate source history.');
assert(
  filterAndSortPastGigs(completed, EMPTY_PAST_GIG_FILTERS, 'SCHEDULED_NEWEST')[0].gig.id === secondGig.id,
  'Date sorting should use scheduled timestamps rather than formatted strings.',
);
const undatedGig = { ...secondGig, id: 'undated', schedule: undefined, startDate: 'invalid-date' };
const undatedHistory = getPastGigs(
  [firstCommitment, makeCommitment('undated-commitment', undatedGig.id)],
  [firstGig, undatedGig],
  applicantId,
);
const undatedSorted = filterAndSortPastGigs(undatedHistory, EMPTY_PAST_GIG_FILTERS, 'SCHEDULED_OLDEST');
assert(
  undatedSorted[undatedSorted.length - 1]?.gig.id === undatedGig.id,
  'Missing or invalid dates should sort safely after dated records.',
);

const submitted = submitApplicantFeedback(
  firstCommitment.id,
  applicantId,
  5,
  '  Great team.  ',
  '2026-11-12T10:00:00Z',
  [firstCommitment],
  [firstGig],
  [],
);
assert(submitted.ok, 'A valid owner may submit feedback for a completed commitment.');
assert(submitted.ok && submitted.feedback.comment === 'Great team.', 'Feedback comments must be trimmed before saving.');
assert(submitted.ok && submitted.feedback.companyName === firstGig.companyName, 'Feedback must reference the canonical company.');

const whitespaceOnly = submitApplicantFeedback(
  firstCommitment.id,
  applicantId,
  4,
  '   ',
  '2026-11-12T10:00:00Z',
  [firstCommitment],
  [firstGig],
  [],
);
assert(whitespaceOnly.ok && whitespaceOnly.feedback.comment === undefined, 'Whitespace-only optional comments should be stored as empty.');
assert(!submitApplicantFeedback(firstCommitment.id, applicantId, 0, '', '2026-11-12T10:00:00Z', [firstCommitment], [firstGig], []).ok, 'Ratings below one must be rejected.');
assert(!submitApplicantFeedback(firstCommitment.id, applicantId, 6, '', '2026-11-12T10:00:00Z', [firstCommitment], [firstGig], []).ok, 'Ratings above five must be rejected.');
assert(!submitApplicantFeedback(firstCommitment.id, applicantId, 2.5, '', '2026-11-12T10:00:00Z', [firstCommitment], [firstGig], []).ok, 'Non-integer ratings must be rejected.');
assert(!submitApplicantFeedback(firstCommitment.id, applicantId, 5, '', 'invalid', [firstCommitment], [firstGig], []).ok, 'Invalid submission timestamps must be rejected.');
assert(
  validateFeedback(5, 'x'.repeat(501), '2026-11-12T10:00:00Z').ok === false,
  'Comments over the shared limit must be rejected.',
);
assert(
  !submitApplicantFeedback(firstCommitment.id, applicantId, 5, '', '2026-11-12T10:00:00Z', [makeCommitment('active', firstGig.id, 'ACTIVE')], [firstGig], []).ok,
  'Active commitments are not eligible for feedback.',
);
assert(
  !submitApplicantFeedback(firstCommitment.id, applicantId, 5, '', '2026-11-12T10:00:00Z', [makeCommitment(firstCommitment.id, firstGig.id, 'CANCELLED')], [firstGig], []).ok,
  'Cancelled commitments are not eligible for feedback.',
);
assert(
  !submitApplicantFeedback(firstCommitment.id, applicantId, 5, '', '2026-11-12T10:00:00Z', [firstCommitment], [], []).ok,
  'Feedback cannot be submitted when the canonical gig is missing.',
);
assert(
  !submitApplicantFeedback('missing-commitment', applicantId, 5, '', '2026-11-12T10:00:00Z', [firstCommitment], [firstGig], []).ok,
  'Feedback cannot be submitted for an unknown commitment.',
);
assert(
  !submitApplicantFeedback(firstCommitment.id, 'applicant-002', 5, '', '2026-11-12T10:00:00Z', [firstCommitment], [firstGig], []).ok,
  'Another applicant cannot submit feedback for this commitment.',
);
const existingFeedback = submitted.ok ? [submitted.feedback] : [];
assert(
  !submitApplicantFeedback(firstCommitment.id, applicantId, 5, '', '2026-11-12T10:00:00Z', [firstCommitment], [firstGig], existingFeedback).ok,
  'Repeated feedback for the same applicant and commitment must be rejected.',
);

const feedbackForHistory: ApplicantFeedback[] = existingFeedback;
const historyWithFeedback = getPastGigs(
  [firstCommitment],
  [firstGig],
  applicantId,
  [],
  feedbackForHistory,
);
assert(historyWithFeedback[0].hasApplicantFeedback, 'Successful feedback must immediately change the derived feedback status.');
assert(
  filterAndSortPastGigs(historyWithFeedback, { ...EMPTY_PAST_GIG_FILTERS, feedback: 'SUBMITTED' }, 'SCHEDULED_NEWEST').length === 1,
  'Feedback filters should use the saved applicant record.',
);
assert(!submitted.ok || submitted.feedback.comment === 'Great team.', 'A failed or repeated submission must not alter saved feedback.');

const earningOne = makeEarning('earning-1', firstCommitment.id, firstGig.id, {
  amountMinor: 18000,
  status: 'PAID',
  paidAt: '2026-11-08T10:00:00Z',
});
const earningTwo = makeEarning('earning-2', secondCommitment.id, secondGig.id, {
  amountMinor: 2700,
  currency: 'USD',
  confirmedAt: '2026-10-30T10:00:00Z',
});
const earningsHistory = getPastGigs(
  [firstCommitment, secondCommitment],
  [firstGig, secondGig],
  applicantId,
  [],
  [],
  [],
  [
    earningOne,
    earningTwo,
    makeEarning('invalid', firstCommitment.id, firstGig.id, { amountMinor: -1 }),
    makeEarning('invalid-currency', firstCommitment.id, firstGig.id, { currency: 'EUR!' }),
    makeEarning('paid-without-date', firstCommitment.id, firstGig.id, { status: 'PAID', paidAt: undefined }),
    makeEarning('invalid-confirmation-date', secondCommitment.id, secondGig.id, { confirmedAt: 'not-a-date' }),
    makeEarning('wrong-basis', firstCommitment.id, firstGig.id, { compensationType: 'HOUR' }),
  ],
);
const earningsSummary = summarizeEarnings(earningsHistory);
assert(earningsSummary.recordCount === 2, 'Only valid explicit earnings associated with completed gigs should count.');
assert(earningsSummary.confirmedTotals.find((total) => total.currency === 'PHP')?.amountMinor === 18000, 'Paid earnings should also be included in confirmed totals.');
assert(earningsSummary.confirmedTotals.find((total) => total.currency === 'USD')?.amountMinor === 2700, 'Different currencies must remain separate.');
assert(earningsSummary.paidTotals.length === 1 && earningsSummary.paidTotals[0].amountMinor === 18000, 'Paid totals must include only explicitly paid records.');
assert(
  filterAndSortPastGigs(earningsHistory, { ...EMPTY_PAST_GIG_FILTERS, earnings: 'PAID' }, 'SCHEDULED_NEWEST').length === 1,
  'The earnings filter should match an explicit paid status.',
);
assert(
  filterAndSortPastGigs(earningsHistory, { ...EMPTY_PAST_GIG_FILTERS, earnings: 'CONFIRMED' }, 'SCHEDULED_NEWEST').length === 1,
  'The earnings filter should match an explicit confirmed status.',
);
assert(
  filterEarningsByPeriod(earningsHistory, 'THIS_MONTH', '2026-11-20T00:00:00Z')
    .flatMap((entry) => entry.earnings).length === 1,
  'Monthly earnings breakdown must use the confirmation timestamp.',
);
assert(
  getPastGigs([firstCommitment], [firstGig], applicantId, [], [], [], [
    earningOne,
    makeEarning('earning-duplicate', firstCommitment.id, firstGig.id),
  ])[0].earnings.length === 0,
  'Duplicate earning records for a commitment must not inflate a total.',
);
assert(decimalAmountToMinorUnits(27.5) === 2750, 'Decimal compensation normalization should preserve cents.');
assert(decimalAmountToMinorUnits(0) === 0, 'A known zero amount must remain distinguishable from a missing amount.');
assert(decimalAmountToMinorUnits(1.001) === null, 'Amounts with unsupported precision must not be rounded silently.');
assert(decimalAmountToMinorUnits(Number.NaN) === null, 'Invalid monetary amounts must be rejected.');
assert(formatCurrencyMinor(12345, 'PHP').includes('\u20B1'), 'Philippine peso records should render with the peso symbol.');
assert(summarizeEarnings(completed).recordCount === 0, 'Missing earnings records must remain unavailable rather than becoming zero earnings.');

const companyReview: CompanyApplicantReview = {
  id: 'company-review-1',
  commitmentId: firstCommitment.id,
  gigId: firstGig.id,
  applicantId,
  companyName: firstGig.companyName,
  rating: 4,
  comment: 'Reliable teammate.',
  submittedAt: '2026-11-12T10:00:00Z',
};
assert(summarizeCompanyReviews(completed).count === 0, 'No review records must produce a no-reviews state, not a zero-star rating.');
const historyWithCompanyReview = getPastGigs(
  [firstCommitment],
  [firstGig],
  applicantId,
  [],
  [],
  [
    companyReview,
    { ...companyReview, id: 'invalid-rating', rating: 7 },
    { ...companyReview, id: 'duplicate-review' },
  ],
);
const companyReviewSummary = summarizeCompanyReviews(historyWithCompanyReview);
assert(companyReviewSummary.count === 1 && companyReviewSummary.averageRating === 4, 'Only one valid received review per completed commitment should contribute to the aggregate.');
assert(historyWithCompanyReview[0].companyReviews[0].comment === companyReview.comment, 'Received feedback must be linked to the correct gig and applicant.');

console.log('past gig history tests passed');
