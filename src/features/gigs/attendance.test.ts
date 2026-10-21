import { checkInCommitment, checkOutCommitment, getAttendanceStatus } from './attendance';
import type { Gig, GigCommitment } from './types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const applicantId = 'applicant-001';
const gig: Gig = {
  id: 'gig-1',
  title: 'Test gig',
  companyName: 'Test company',
  companyDescription: '',
  categoryId: 'event-staff',
  description: '',
  responsibilities: [],
  requirements: [],
  location: 'Oakland, CA',
  compensationAmount: 100,
  compensationType: 'SHIFT',
  startDate: '2026-11-01',
  startTime: '09:00',
  endTime: '12:00',
  schedule: {
    timeZone: 'America/Los_Angeles',
    occurrences: [{ startAt: '2026-11-01T09:00:00-08:00', endAt: '2026-11-01T12:00:00-08:00' }],
  },
  duration: 'One shift',
  gigType: 'SINGLE_SHIFT',
  status: 'OPEN',
  postedAt: '2026-10-01',
};
const commitment: GigCommitment = {
  id: 'commitment:applicant-001:gig-1',
  gigId: gig.id,
  applicantId,
  status: 'ACTIVE',
};
const checkInAt = '2026-11-01T09:05:00-08:00';
const checkOutAt = '2026-11-01T12:10:00-08:00';

const checkedIn = checkInCommitment(commitment.id, applicantId, [commitment], [], [gig], checkInAt);
assert(checkedIn.ok, 'An owned active commitment with a valid schedule should check in.');
assert(checkedIn.ok && checkedIn.record.checkedInAt === checkInAt, 'Check-in should retain the actual action timestamp.');
assert(checkedIn.ok && getAttendanceStatus(checkedIn.record) === 'CHECKED_IN', 'Check-in should create one checked-in record.');

const repeatedCheckIn = checkInCommitment(commitment.id, applicantId, [commitment], checkedIn.ok ? checkedIn.records : [], [gig], checkOutAt);
assert(!repeatedCheckIn.ok && repeatedCheckIn.reason === 'ALREADY_CHECKED_IN', 'Repeated check-in must not create another session.');
assert(!repeatedCheckIn.ok && repeatedCheckIn.records === checkedIn.records, 'Failed check-in must leave records unchanged.');

const wrongOwner = checkInCommitment(commitment.id, 'applicant-002', [commitment], [], [gig], checkInAt);
assert(!wrongOwner.ok && wrongOwner.reason === 'NOT_OWNER', 'A different applicant must not check in.');

const completed = { ...commitment, status: 'COMPLETED' as const };
const ineligible = checkInCommitment(completed.id, applicantId, [completed], [], [gig], checkInAt);
assert(!ineligible.ok && ineligible.reason === 'COMMITMENT_NOT_ACTIVE', 'Completed commitments must reject check-in.');

const missingSchedule = { ...gig, schedule: undefined };
const unverifiable = checkInCommitment(commitment.id, applicantId, [commitment], [], [missingSchedule], checkInAt);
assert(!unverifiable.ok && unverifiable.reason === 'SCHEDULE_UNVERIFIABLE', 'Missing schedules must reject check-in safely.');

const invalidSchedule = { ...gig, schedule: { ...gig.schedule!, occurrences: [{ startAt: 'not-a-date', endAt: checkOutAt }] } };
const invalid = checkInCommitment(commitment.id, applicantId, [commitment], [], [invalidSchedule], checkInAt);
assert(!invalid.ok && invalid.reason === 'INVALID_SCHEDULE', 'Invalid schedules must reject check-in safely.');

const noCheckIn = checkOutCommitment(commitment.id, applicantId, [commitment], [], [gig], checkOutAt);
assert(!noCheckIn.ok && noCheckIn.reason === 'NOT_CHECKED_IN', 'Check-out without check-in must fail.');

if (checkedIn.ok) {
  for (const timestamp of [checkInAt, '2026-11-01T09:04:00-08:00']) {
    const tooEarly = checkOutCommitment(commitment.id, applicantId, [commitment], checkedIn.records, [gig], timestamp);
    assert(!tooEarly.ok && tooEarly.reason === 'CHECK_OUT_NOT_LATER', 'Check-out must be strictly later than check-in.');
    assert(!tooEarly.ok && tooEarly.records === checkedIn.records, 'Failed check-out must preserve the prior record array.');
  }

  const checkedOut = checkOutCommitment(commitment.id, applicantId, [commitment], checkedIn.records, [gig], checkOutAt);
  assert(checkedOut.ok && checkedOut.record.checkedInAt === checkInAt && checkedOut.record.checkedOutAt === checkOutAt, 'Check-out must update the same attendance record.');
  assert(checkedOut.ok && checkedOut.records.length === 1, 'Check-out must not create a second record.');
  assert(checkedOut.ok && getAttendanceStatus(checkedOut.record) === 'CHECKED_OUT', 'Check-out status should be derived from its timestamps.');
  assert(commitment.status === 'ACTIVE', 'Attendance transitions must not complete the work commitment.');

  const repeatedCheckOut = checkOutCommitment(commitment.id, applicantId, [commitment], checkedOut.ok ? checkedOut.records : [], [gig], '2026-11-01T12:20:00-08:00');
  assert(!repeatedCheckOut.ok && repeatedCheckOut.reason === 'ALREADY_CHECKED_OUT', 'Repeated check-out must fail.');

  const checkedOutAgain = checkInCommitment(commitment.id, applicantId, [commitment], checkedOut.ok ? checkedOut.records : [], [gig], '2026-11-01T13:00:00-08:00');
  assert(!checkedOutAgain.ok && checkedOutAgain.reason === 'ALREADY_CHECKED_OUT', 'A checked-out commitment cannot start another attendance session.');
}

const invalidActionTime = checkInCommitment(commitment.id, applicantId, [commitment], [], [gig], 'yesterday');
assert(!invalidActionTime.ok && invalidActionTime.reason === 'INVALID_TIMESTAMP', 'Invalid actual timestamps must be rejected.');

console.log('gig attendance tests passed');