export const verificationStatusMeta = {
  NOT_STARTED: {
    label: 'Not started',
    description: 'Verification helps us confirm the applicant is ready for future gig opportunities.',
    tone: 'neutral' as const,
  },
  PENDING: {
    label: 'Pending review',
    description: 'Your identity verification is already in review and has not been confirmed yet.',
    tone: 'warning' as const,
  },
  VERIFIED: {
    label: 'Verified',
    description: 'This mock verification status indicates successful review based on the current app state only.',
    tone: 'success' as const,
  },
  REJECTED: {
    label: 'Rejected',
    description: 'This mock status indicates a rejected verification step and requires a fresh review attempt.',
    tone: 'error' as const,
  },
};

export type VerificationStatusKey = keyof typeof verificationStatusMeta;

export const verificationSteps = [
  'Selfie verification',
  'Valid-ID submission',
  'Review status',
];
