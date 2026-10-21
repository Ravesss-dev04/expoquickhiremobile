import type { GigType } from '../gigs/types';

export type VerificationStatus = 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export type DesiredJobPreference = {
  categoryId: string;
  gigType?: GigType;
  location?: string;
};

export type WorkExperience = {
  id: string;
  jobTitle: string;
  companyName: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
};

export type Education = {
  id: string;
  institution: string;
  qualification: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
};

export type ResumeMetadata = {
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  localUri?: string;
};

export type ApplicantProfile = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  birthdate?: string;
  location?: string;
  professionalSummary?: string;
  desiredJobs?: DesiredJobPreference[];
  workExperience?: WorkExperience[];
  education?: Education[];
  skills: string[];
  expertiseIds: string[];
  resume: ResumeMetadata | null;
  verificationStatus: VerificationStatus;
};

export type ApplicantProfileErrors = Partial<
  Record<'fullName' | 'email' | 'phoneNumber' | 'birthdate' | 'location' | 'professionalSummary', string>
>;
