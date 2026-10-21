import { createContext, useContext, useReducer, useState } from 'react';

import {
  attemptCommitment as validateCommitmentAttempt,
  countActiveCommitments,
  type CommitmentAttempt,
} from './commitments';
import {
  checkInCommitment,
  checkOutCommitment,
  type AttendanceAttempt,
} from './attendance';
import { submitApplicantFeedback as createApplicantFeedback, type FeedbackSubmission } from './past-gigs';
import { mockGigs } from './mock-data';
import type {
  ApplicantFeedback,
  AttendanceRecord,
  CompanyApplicantReview,
  EarningRecord,
  Gig,
  GigCommitment,
} from './types';

const mockEarningRecords: readonly EarningRecord[] = [];
const mockCompanyReviews: readonly CompanyApplicantReview[] = [];

type StoredCommitmentAttempt = {
  gigId: string;
  result: CommitmentAttempt;
};

type CommitmentState = {
  commitments: GigCommitment[];
  attendanceRecords: AttendanceRecord[];
  applicantFeedback: ApplicantFeedback[];
  lastAttempt: StoredCommitmentAttempt | null;
  lastAttendanceAttempt: { commitmentId: string; result: AttendanceAttempt } | null;
};

type CommitmentAction =
  | { type: 'attempt'; gig: Gig; applicantId: string }
  | { type: 'checkIn' | 'checkOut'; commitmentId: string; applicantId: string; now: string }
  | { type: 'submitFeedback'; commitmentId: string; applicantId: string; rating: number; comment: string; submittedAt: string };

function commitmentReducer(state: CommitmentState, action: CommitmentAction): CommitmentState {
  if (action.type === 'attempt') {
    const result = validateCommitmentAttempt(action.gig, state.commitments, mockGigs, action.applicantId);
    return {
      ...state,
      commitments: result.ok ? [...result.commitments] : state.commitments,
      lastAttempt: { gigId: action.gig.id, result },
    };
  }

  if (action.type === 'submitFeedback') {
    const result = createApplicantFeedback(
      action.commitmentId,
      action.applicantId,
      action.rating,
      action.comment,
      action.submittedAt,
      state.commitments,
      mockGigs,
      state.applicantFeedback,
    );
    return result.ok
      ? { ...state, applicantFeedback: [...state.applicantFeedback, result.feedback] }
      : state;
  }

  const transition = action.type === 'checkIn' ? checkInCommitment : checkOutCommitment;
  const result = transition(
    action.commitmentId,
    action.applicantId,
    state.commitments,
    state.attendanceRecords,
    mockGigs,
    action.now,
  );
  return {
    ...state,
    attendanceRecords: result.ok ? [...result.records] : state.attendanceRecords,
    lastAttendanceAttempt: { commitmentId: action.commitmentId, result },
  };
}

type GigsContextValue = {
  applicantId: string;
  savedGigIds: string[];
  isSaved: (gigId: string) => boolean;
  toggleSaved: (gigId: string) => void;
  commitments: readonly GigCommitment[];
  activeCommitmentCount: number;
  getCommitmentForGig: (gigId: string) => GigCommitment | undefined;
  previewCommitment: (gig: Gig) => CommitmentAttempt;
  attemptCommitment: (gig: Gig) => void;
  lastCommitmentAttempt: StoredCommitmentAttempt | null;
  attendanceRecords: readonly AttendanceRecord[];
  getAttendanceForCommitment: (commitmentId: string) => AttendanceRecord | undefined;
  applicantFeedback: readonly ApplicantFeedback[];
  companyReviews: readonly CompanyApplicantReview[];
  earningRecords: readonly EarningRecord[];
  submitFeedback: (commitmentId: string, rating: number, comment: string) => FeedbackSubmission;
  checkIn: (commitmentId: string) => void;
  checkOut: (commitmentId: string) => void;
  lastAttendanceAttempt: { commitmentId: string; result: AttendanceAttempt } | null;
};

const GigsContext = createContext<GigsContextValue | null>(null);

export function GigsProvider({ children, applicantId }: { children: React.ReactNode; applicantId: string }) {
  const [savedGigIds, setSavedGigIds] = useState<string[]>([]);
  const [commitmentState, dispatchCommitment] = useReducer(commitmentReducer, {
    commitments: [],
    attendanceRecords: [],
    applicantFeedback: [],
    lastAttempt: null,
    lastAttendanceAttempt: null,
  });

  const isSaved = (gigId: string) => savedGigIds.includes(gigId);
  const toggleSaved = (gigId: string) => {
    setSavedGigIds((current) =>
      current.includes(gigId) ? current.filter((savedId) => savedId !== gigId) : [...current, gigId],
    );
  };

  const previewCommitment = (gig: Gig) =>
    validateCommitmentAttempt(gig, commitmentState.commitments, mockGigs, applicantId);
  const ownedCommitments = commitmentState.commitments.filter((commitment) => commitment.applicantId === applicantId);
  const ownedAttendanceRecords = commitmentState.attendanceRecords.filter((record) => record.applicantId === applicantId);

  return (
    <GigsContext.Provider value={{
      applicantId,
      savedGigIds,
      isSaved,
      toggleSaved,
      commitments: ownedCommitments,
      activeCommitmentCount: countActiveCommitments(ownedCommitments, applicantId),
      getCommitmentForGig: (gigId) => ownedCommitments.find((commitment) => commitment.gigId === gigId),
      previewCommitment,
      attemptCommitment: (gig) => dispatchCommitment({ type: 'attempt', gig, applicantId }),
      lastCommitmentAttempt: commitmentState.lastAttempt,
      attendanceRecords: ownedAttendanceRecords,
      getAttendanceForCommitment: (commitmentId) =>
        ownedAttendanceRecords.find((record) => record.commitmentId === commitmentId),
      applicantFeedback: commitmentState.applicantFeedback.filter((feedback) => feedback.applicantId === applicantId),
      companyReviews: mockCompanyReviews,
      earningRecords: mockEarningRecords,
      submitFeedback: (commitmentId, rating, comment) => {
        const submittedAt = new Date().toISOString();
        const result = createApplicantFeedback(
          commitmentId,
          applicantId,
          rating,
          comment,
          submittedAt,
          commitmentState.commitments,
          mockGigs,
          commitmentState.applicantFeedback,
        );
        if (result.ok) {
          dispatchCommitment({
            type: 'submitFeedback',
            commitmentId,
            applicantId,
            rating,
            comment,
            submittedAt,
          });
        }
        return result;
      },
      checkIn: (commitmentId) => dispatchCommitment({
        type: 'checkIn',
        commitmentId,
        applicantId,
        now: new Date().toISOString(),
      }),
      checkOut: (commitmentId) => dispatchCommitment({
        type: 'checkOut',
        commitmentId,
        applicantId,
        now: new Date().toISOString(),
      }),
      lastAttendanceAttempt: commitmentState.lastAttendanceAttempt,
    }}>
      {children}
    </GigsContext.Provider>
  );
}

export function useGigs() {
  const context = useContext(GigsContext);
  if (!context) throw new Error('useGigs must be used within the GigsProvider.');
  return context;
}