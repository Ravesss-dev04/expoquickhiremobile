import { isValidGigSchedule, parseIsoInstant } from './commitments';
import type { CommitmentStatus, Gig, GigCommitment } from './types';

export type CommitmentGroup = {
  status: CommitmentStatus;
  commitments: GigCommitment[];
};

const statuses: CommitmentStatus[] = ['ACTIVE', 'COMPLETED', 'CANCELLED'];

function scheduledStart(commitment: GigCommitment, gigsById: ReadonlyMap<string, Gig>) {
  const schedule = gigsById.get(commitment.gigId)?.schedule;
  if (!schedule || !isValidGigSchedule(schedule)) return null;

  return Math.min(...schedule.occurrences.map((occurrence) => parseIsoInstant(occurrence.startAt) ?? Infinity));
}

export function getApplicantCommitmentGroups(
  commitments: readonly GigCommitment[],
  gigs: readonly Gig[],
  applicantId: string,
): CommitmentGroup[] {
  const gigsById = new Map(gigs.map((gig) => [gig.id, gig]));
  const ownedCommitments = commitments.filter((commitment) => commitment.applicantId === applicantId);

  return statuses.map((status) => ({
    status,
    commitments: ownedCommitments
      .filter((commitment) => commitment.status === status)
      .sort((first, second) => {
        const firstStart = scheduledStart(first, gigsById);
        const secondStart = scheduledStart(second, gigsById);
        if (firstStart === null && secondStart === null) return first.gigId.localeCompare(second.gigId);
        if (firstStart === null) return 1;
        if (secondStart === null) return -1;
        return firstStart - secondStart;
      }),
  }));
}