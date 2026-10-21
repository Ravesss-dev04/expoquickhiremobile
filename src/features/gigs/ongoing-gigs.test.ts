import { getApplicantCommitmentGroups } from './ongoing-gigs';
import { mockGigs } from './mock-data';
import type { GigCommitment } from './types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function commitment(gigId: string, status: GigCommitment['status'], applicantId = 'applicant-001'): GigCommitment {
  return { id: `commitment:${applicantId}:${gigId}`, gigId, applicantId, status };
}

const activeFirst = commitment('qh-gig-1004', 'ACTIVE');
const activeEarlier = commitment('qh-gig-1001', 'ACTIVE');
const completed = commitment('qh-gig-1006', 'COMPLETED');
const cancelled = commitment('qh-gig-1007', 'CANCELLED');
const missingGig = commitment('removed-gig', 'ACTIVE');
const anotherApplicant = commitment('qh-gig-1001', 'ACTIVE', 'applicant-002');

const groups = getApplicantCommitmentGroups(
  [activeFirst, activeEarlier, completed, cancelled, missingGig, anotherApplicant],
  mockGigs,
  'applicant-001',
);
const activeGroup = groups.find((group) => group.status === 'ACTIVE');
assert(activeGroup?.commitments[0]?.id === activeEarlier.id, 'Active commitments should be sorted by parsed schedule timestamps.');
assert(activeGroup?.commitments.some((item) => item.id === missingGig.id) ?? false, 'A missing gig reference should remain safely representable.');
assert(!groups.some((group) => group.commitments.some((item) => item.id === anotherApplicant.id)), 'Another applicant commitment must be excluded.');
assert(groups.find((group) => group.status === 'COMPLETED')?.commitments[0]?.id === completed.id, 'Completed commitments should be grouped separately.');
assert(groups.find((group) => group.status === 'CANCELLED')?.commitments[0]?.id === cancelled.id, 'Cancelled commitments should be grouped separately.');

const bookmarkOnly = getApplicantCommitmentGroups([], mockGigs, 'applicant-001');
assert(bookmarkOnly.every((group) => group.commitments.length === 0), 'Saved gigs without commitments must not appear as ongoing.');

console.log('ongoing gig grouping tests passed');