import { isValidGigSchedule, parseIsoInstant } from './commitments';
import type { AttendanceRecord, AttendanceStatus, Gig, GigCommitment } from './types';

export type AttendanceFailureReason =
  | 'COMMITMENT_NOT_FOUND'
  | 'NOT_OWNER'
  | 'COMMITMENT_NOT_ACTIVE'
  | 'GIG_NOT_FOUND'
  | 'SCHEDULE_UNVERIFIABLE'
  | 'INVALID_SCHEDULE'
  | 'ALREADY_CHECKED_IN'
  | 'ALREADY_CHECKED_OUT'
  | 'NOT_CHECKED_IN'
  | 'INVALID_TIMESTAMP'
  | 'CHECK_OUT_NOT_LATER'
  | 'DUPLICATE_ATTENDANCE'
  | 'ATTENDANCE_MISMATCH';

export type AttendanceAttempt =
  | { ok: true; records: readonly AttendanceRecord[]; record: AttendanceRecord }
  | { ok: false; records: readonly AttendanceRecord[]; reason: AttendanceFailureReason };

export function getAttendanceStatus(record: AttendanceRecord | undefined): AttendanceStatus {
  if (!record) return 'NOT_CHECKED_IN';
  return record.checkedOutAt ? 'CHECKED_OUT' : 'CHECKED_IN';
}

function resolveCommitment(
  commitmentId: string,
  applicantId: string,
  commitments: readonly GigCommitment[],
): { ok: true; commitment: GigCommitment } | { ok: false; reason: AttendanceFailureReason } {
  const commitment = commitments.find((item) => item.id === commitmentId);
  if (!commitment) return { ok: false, reason: 'COMMITMENT_NOT_FOUND' };
  if (commitment.applicantId !== applicantId) return { ok: false, reason: 'NOT_OWNER' };
  if (commitment.status !== 'ACTIVE') return { ok: false, reason: 'COMMITMENT_NOT_ACTIVE' };
  return { ok: true, commitment };
}

function failed(records: readonly AttendanceRecord[], reason: AttendanceFailureReason): AttendanceAttempt {
  return { ok: false, records, reason };
}

export function checkInCommitment(
  commitmentId: string,
  applicantId: string,
  commitments: readonly GigCommitment[],
  records: readonly AttendanceRecord[],
  gigs: readonly Gig[],
  now: string,
): AttendanceAttempt {
  const resolved = resolveCommitment(commitmentId, applicantId, commitments);
  if (!resolved.ok) return failed(records, resolved.reason);

  const gig = gigs.find((item) => item.id === resolved.commitment.gigId);
  if (!gig) return failed(records, 'GIG_NOT_FOUND');
  if (!gig.schedule) return failed(records, 'SCHEDULE_UNVERIFIABLE');
  if (!isValidGigSchedule(gig.schedule)) return failed(records, 'INVALID_SCHEDULE');

  const matchingRecords = records.filter((record) => record.commitmentId === commitmentId);
  if (matchingRecords.length > 1) return failed(records, 'DUPLICATE_ATTENDANCE');
  if (matchingRecords.length === 1) {
    return failed(records, matchingRecords[0].checkedOutAt ? 'ALREADY_CHECKED_OUT' : 'ALREADY_CHECKED_IN');
  }

  if (parseIsoInstant(now) === null) return failed(records, 'INVALID_TIMESTAMP');

  const attendanceId = `attendance:${commitmentId}`;
  if (records.some((record) => record.id === attendanceId)) return failed(records, 'DUPLICATE_ATTENDANCE');

  const record: AttendanceRecord = {
    id: attendanceId,
    commitmentId,
    gigId: gig.id,
    applicantId,
    checkedInAt: now,
  };
  return { ok: true, records: [...records, record], record };
}

export function checkOutCommitment(
  commitmentId: string,
  applicantId: string,
  commitments: readonly GigCommitment[],
  records: readonly AttendanceRecord[],
  gigs: readonly Gig[],
  now: string,
): AttendanceAttempt {
  const resolved = resolveCommitment(commitmentId, applicantId, commitments);
  if (!resolved.ok) return failed(records, resolved.reason);
  if (!gigs.some((gig) => gig.id === resolved.commitment.gigId)) return failed(records, 'GIG_NOT_FOUND');

  const matchingRecords = records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.commitmentId === commitmentId);
  if (matchingRecords.length > 1) return failed(records, 'DUPLICATE_ATTENDANCE');
  if (matchingRecords.length === 0) return failed(records, 'NOT_CHECKED_IN');

  const { record, index } = matchingRecords[0];
  if (record.applicantId !== applicantId) return failed(records, 'NOT_OWNER');
  if (record.gigId !== resolved.commitment.gigId) return failed(records, 'ATTENDANCE_MISMATCH');
  if (record.checkedOutAt) return failed(records, 'ALREADY_CHECKED_OUT');

  const checkInTimestamp = parseIsoInstant(record.checkedInAt);
  const checkOutTimestamp = parseIsoInstant(now);
  if (checkInTimestamp === null || checkOutTimestamp === null) return failed(records, 'INVALID_TIMESTAMP');
  if (checkOutTimestamp <= checkInTimestamp) return failed(records, 'CHECK_OUT_NOT_LATER');

  const updatedRecord: AttendanceRecord = { ...record, checkedOutAt: now };
  const updatedRecords = [...records];
  updatedRecords[index] = updatedRecord;
  return { ok: true, records: updatedRecords, record: updatedRecord };
}