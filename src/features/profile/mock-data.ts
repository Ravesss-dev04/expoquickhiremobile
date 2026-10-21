import type { ApplicantProfile } from './types';

export const mockApplicantProfile: ApplicantProfile = {
  id: 'applicant-001',
  fullName: 'Jordan Lee',
  email: 'jordan.lee@quickhire.app',
  phoneNumber: '+1 (415) 555-0134',
  location: 'San Francisco, CA',
  professionalSummary:
    'Friendly customer support specialist with hands-on experience in events, retail, and front-of-house service operations.',
  skills: [],
  expertiseIds: ['customer-service', 'event-staff', 'retail-assistant'],
  resume: {
    fileName: 'Jordan_Lee_Resume.pdf',
    mimeType: 'application/pdf',
    fileSize: 418_234,
    localUri: 'mock://local-resume/Jordan_Lee_Resume.pdf',
  },
  verificationStatus: 'PENDING',
};
