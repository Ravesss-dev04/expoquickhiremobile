import { attemptCommitment, countActiveCommitments, schedulesOverlap } from './commitments';
import type { Gig, GigCommitment, GigSchedule } from './types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function makeGig(id: string, startAt: string, endAt: string): Gig {
  return {
    id,
    title: id,
    companyName: 'Test company',
    companyDescription: '',
    categoryId: 'event-staff',
    description: '',
    responsibilities: [],
    requirements: [],
    location: 'Oakland, CA',
    compensationAmount: 100,
    compensationType: 'SHIFT',
    startDate: startAt.slice(0, 10),
    startTime: '09:00',
    endTime: '12:00',
    schedule: {
      timeZone: startAt.endsWith('Z') ? 'UTC' : 'America/Los_Angeles',
      occurrences: [{ startAt, endAt }],
    },
    duration: 'One shift',
    gigType: 'SINGLE_SHIFT',
    status: 'OPEN',
    postedAt: '2026-10-01',
  };
}

function active(gigId: string, applicantId = 'applicant-001'): GigCommitment {
  return { id: `commitment:${applicantId}:${gigId}`, gigId, applicantId, status: 'ACTIVE' };
}

const applicantId = 'applicant-001';

const first = makeGig('first', '2026-11-01T09:00:00-08:00', '2026-11-01T12:00:00-08:00');
const second = makeGig('second', '2026-11-02T09:00:00-08:00', '2026-11-02T12:00:00-08:00');
const third = makeGig('third', '2026-11-03T09:00:00-08:00', '2026-11-03T12:00:00-08:00');

const zero = attemptCommitment(first, [], [first], applicantId);
assert(zero.ok && zero.activeCount === 1, 'A valid gig should be accepted with zero active commitments.');

const one = attemptCommitment(second, [active(first.id)], [first, second], applicantId);
assert(one.ok && one.activeCount === 2, 'A non-conflicting second gig should be accepted.');

const two = attemptCommitment(third, [active(first.id), active(second.id)], [first, second, third], applicantId);
assert(!two.ok && two.reason === 'LIMIT_REACHED' && two.activeCount === 2, 'A third active commitment should be rejected with a count of two.');

const duplicate = attemptCommitment(first, [active(first.id)], [first], applicantId);
assert(!duplicate.ok && duplicate.reason === 'DUPLICATE', 'A duplicate gig commitment should be rejected.');
assert(countActiveCommitments([active(first.id), active(first.id)], applicantId) === 1, 'Duplicate records for one gig should count as one commitment.');

const unlisted = makeGig('unlisted', '2026-11-04T09:00:00Z', '2026-11-04T12:00:00Z');
const unlistedResult = attemptCommitment(unlisted, [], [first, second, third], applicantId);
assert(!unlistedResult.ok && unlistedResult.reason === 'GIG_UNAVAILABLE', 'A caller-supplied gig outside the canonical dataset should be rejected.');

const overlapping = makeGig('overlapping', '2026-11-01T11:00:00-08:00', '2026-11-01T13:00:00-08:00');
const overlapResult = attemptCommitment(overlapping, [active(first.id)], [first, overlapping], applicantId);
assert(!overlapResult.ok && overlapResult.reason === 'CONFLICT' && overlapResult.conflictingGigId === first.id, 'Overlapping intervals should identify the conflicting gig.');

const backToBack = makeGig('back-to-back', '2026-11-01T12:00:00-08:00', '2026-11-01T15:00:00-08:00');
assert(schedulesOverlap(first.schedule as GigSchedule, backToBack.schedule as GigSchedule) === false, 'Back-to-back half-open intervals should not overlap.');
assert(attemptCommitment(backToBack, [active(first.id)], [first, backToBack], applicantId).ok, 'Back-to-back commitments should be accepted.');

const overnight = makeGig('overnight', '2026-11-01T22:00:00-08:00', '2026-11-02T02:00:00-08:00');
const overnightOverlap = makeGig('overnight-overlap', '2026-11-02T01:00:00-08:00', '2026-11-02T04:00:00-08:00');
assert(schedulesOverlap(overnight.schedule as GigSchedule, overnightOverlap.schedule as GigSchedule) === true, 'Overnight intervals should overlap by absolute instant.');

const multiDay = makeGig('multi-day', '2026-11-01T09:00:00Z', '2026-11-03T12:00:00Z');
const insideMultiDay = makeGig('inside-multi-day', '2026-11-02T10:00:00Z', '2026-11-02T11:00:00Z');
assert(schedulesOverlap(multiDay.schedule as GigSchedule, insideMultiDay.schedule as GigSchedule) === true, 'An interval within a multi-day schedule should overlap.');

assert(schedulesOverlap(first.schedule as GigSchedule, second.schedule as GigSchedule) === false, 'Different non-overlapping dates should not conflict.');

const completed: GigCommitment = { ...active(first.id), status: 'COMPLETED' };
const completedGig = makeGig('completed-case', '2026-11-01T10:00:00-08:00', '2026-11-01T11:00:00-08:00');
const completedResult = attemptCommitment(completedGig, [completed], [first, completedGig], applicantId);
assert(completedResult.ok && countActiveCommitments([completed], applicantId) === 0, 'Completed commitments should not count or conflict.');

const cancelled: GigCommitment = { ...active(first.id), status: 'CANCELLED' };
assert(countActiveCommitments([cancelled], applicantId) === 0, 'Cancelled commitments should not count toward the limit.');
const cancelledGig = makeGig('cancelled-case', '2026-11-01T10:00:00-08:00', '2026-11-01T11:00:00-08:00');
const cancelledResult = attemptCommitment(cancelledGig, [cancelled], [first, cancelledGig], applicantId);
assert(cancelledResult.ok, 'Cancelled commitments should not block overlapping schedules.');

const missing = { ...third, schedule: undefined };
const missingResult = attemptCommitment(missing, [], [missing], applicantId);
assert(!missingResult.ok && missingResult.reason === 'SCHEDULE_UNVERIFIABLE', 'Missing schedules should be rejected safely.');

const invalid = makeGig('invalid', '2026-02-30T09:00:00Z', '2026-02-30T11:00:00Z');
assert(!attemptCommitment(invalid, [], [invalid], applicantId).ok, 'Invalid calendar dates should be rejected.');

const reversed = makeGig('reversed', '2026-11-01T12:00:00Z', '2026-11-01T09:00:00Z');
assert(!attemptCommitment(reversed, [], [reversed], applicantId).ok, 'Reversed intervals should be rejected.');

const existing = [active(first.id)];
const rejected = attemptCommitment(overlapping, existing, [first, overlapping], applicantId);
assert(!rejected.ok && rejected.commitments === existing && existing.length === 1, 'Failed validation should leave the commitment state unchanged.');

const savedGigIds = [first.id];
const bookmarkOnly = attemptCommitment(second, [], [first, second], applicantId);
assert(savedGigIds.includes(first.id) && bookmarkOnly.ok && bookmarkOnly.activeCount === 1, 'Bookmarks should not count as commitments.');

const successful = attemptCommitment(third, [active(first.id)], [first, third], applicantId);
assert(successful.ok && successful.commitments.length === 2 && successful.activeCount === 2, 'A successful commitment should update the state and visible count.');

const anotherApplicant = attemptCommitment(first, [active(first.id, 'applicant-002')], [first], applicantId);
assert(anotherApplicant.ok && anotherApplicant.activeCount === 1, 'Another applicant commitment must not block this applicant.');

console.log('gig commitment tests passed');
