import { expertiseCategories, MAX_EXPERTISE_SELECTIONS } from '../expertise/constants';
import { validateResumeFile } from '../resume/validation';
import type { ApplicantProfile, ApplicantProfileErrors } from './types';
export {
  addExpertiseCategory,
  removeExpertiseCategory,
  validateExpertiseSelection,
} from '../expertise/logic';

export const PROFILE_COMPLETION_WEIGHTS = {
  personalDetails: 40,
  professionalSummary: 25,
  expertise: 20,
  resume: 15,
} as const;

export type ProfileCompletionSection = {
  id: keyof typeof PROFILE_COMPLETION_WEIGHTS;
  title: string;
  href: '/applicant/profile/edit' | '/applicant/profile/expertise' | '/applicant/profile/resume';
  actionLabel: string;
  weight: number;
  earnedWeight: number;
  completionPercentage: number;
  complete: boolean;
};

export type ProfileCompletion = {
  percentage: number;
  sections: ProfileCompletionSection[];
};

export function normalizeText(value?: string | null): string {
  return (value ?? '').trim();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeText(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export const MAX_PROFESSIONAL_SUMMARY_LENGTH = 500;

export function validateProfessionalSummary(summary: string): string | undefined {
  return summary.length > MAX_PROFESSIONAL_SUMMARY_LENGTH
    ? `About must be ${MAX_PROFESSIONAL_SUMMARY_LENGTH} characters or fewer.`
    : undefined;
}

function isValidBirthdate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    value <= new Date().toISOString().slice(0, 10)
  );
}

export function validateApplicantProfile(profile: ApplicantProfile): {
  ok: boolean;
  errors: ApplicantProfileErrors;
} {
  const errors: ApplicantProfileErrors = {};

  const fullName = normalizeText(profile.fullName);
  const email = normalizeText(profile.email);
  const phoneNumber = normalizeText(profile.phoneNumber);
  const birthdate = normalizeText(profile.birthdate);
  const location = normalizeText(profile.location);
  const professionalSummary = normalizeText(profile.professionalSummary);

  if (!fullName) {
    errors.fullName = 'Full name is required.';
  }

  if (!email) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (phoneNumber) {
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      errors.phoneNumber = 'Enter a phone number with 7 to 15 digits.';
    }
  }

  if (birthdate && !isValidBirthdate(birthdate)) {
    errors.birthdate = 'Enter a valid date of birth in YYYY-MM-DD format that is not in the future.';
  }

  if (location && location.length > 200) {
    errors.location = 'Location is too long.';
  }

  const professionalSummaryError = validateProfessionalSummary(professionalSummary);
  if (professionalSummaryError) {
    errors.professionalSummary = professionalSummaryError;
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

export function getProfileCompletion(profile?: ApplicantProfile | null): ProfileCompletion {
  const safeProfile = profile ?? {
    fullName: '',
    email: '',
    phoneNumber: '',
    location: '',
    professionalSummary: '',
    skills: [],
    expertiseIds: [],
    resume: null,
  };
  const fullName = typeof safeProfile.fullName === 'string' ? normalizeText(safeProfile.fullName) : '';
  const email = typeof safeProfile.email === 'string' ? safeProfile.email : '';
  const phoneNumber = typeof safeProfile.phoneNumber === 'string' ? normalizeText(safeProfile.phoneNumber) : '';
  const location = typeof safeProfile.location === 'string' ? normalizeText(safeProfile.location) : '';
  const professionalSummary =
    typeof safeProfile.professionalSummary === 'string' ? normalizeText(safeProfile.professionalSummary) : '';

  const personalDetailsChecks = [
    Boolean(fullName),
    isValidEmail(email),
    phoneNumber.length >= 7,
    location.length > 0 && location.length <= 200,
  ];
  const summaryComplete = professionalSummary.length > 0 && professionalSummary.length <= 500;
  const expertiseIds = Array.isArray(safeProfile.expertiseIds)
    ? safeProfile.expertiseIds.filter((id): id is string => typeof id === 'string')
    : [];
  const uniqueExpertiseIds = new Set(expertiseIds);
  const validExpertiseIds = new Set(expertiseCategories.map((category) => category.id));
  const expertiseComplete =
    expertiseIds.length > 0 &&
    expertiseIds.length <= MAX_EXPERTISE_SELECTIONS &&
    uniqueExpertiseIds.size === expertiseIds.length &&
    expertiseIds.every((id) => validExpertiseIds.has(id));
  const resume = safeProfile.resume;
  const resumeComplete =
    resume !== null &&
    typeof resume === 'object' &&
    typeof resume.fileName === 'string' &&
    validateResumeFile(resume.fileName, typeof resume.mimeType === 'string' ? resume.mimeType : undefined).ok;

  const makeSection = (
    id: ProfileCompletionSection['id'],
    title: string,
    href: ProfileCompletionSection['href'],
    actionLabel: string,
    checks: boolean[],
  ): ProfileCompletionSection => {
    const weight = PROFILE_COMPLETION_WEIGHTS[id];
    const completedCount = checks.filter(Boolean).length;
    const completionPercentage = checks.length
      ? Math.round((completedCount / checks.length) * 100)
      : 0;

    return {
      id,
      title,
      href,
      actionLabel,
      weight,
      earnedWeight: checks.length ? (weight * completedCount) / checks.length : 0,
      completionPercentage,
      complete: checks.length > 0 && completedCount === checks.length,
    };
  };

  const sections = [
    makeSection(
      'personalDetails',
      'Personal details',
      '/applicant/profile/edit',
      'Add details',
      personalDetailsChecks,
    ),
    makeSection(
      'professionalSummary',
      'Professional summary',
      '/applicant/profile/resume',
      'View About',
      [summaryComplete],
    ),
    makeSection('expertise', 'Expertise', '/applicant/profile/expertise', 'Add expertise', [expertiseComplete]),
    makeSection('resume', 'Resume', '/applicant/profile/resume', 'Add resume', [resumeComplete]),
  ];
  const totalWeight = Object.values(PROFILE_COMPLETION_WEIGHTS).reduce((total, weight) => total + weight, 0);
  const earnedWeight = sections.reduce((total, section) => total + section.earnedWeight, 0);

  return {
    percentage: totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0,
    sections,
  };
}
