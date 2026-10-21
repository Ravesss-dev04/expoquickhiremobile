import type { WorkExperience } from './types';

export const WORK_EXPERIENCE_DESCRIPTION_MAX_LENGTH = 1000;

export type WorkExperienceDraft = Pick<
  WorkExperience,
  'jobTitle' | 'companyName' | 'startDate' | 'isCurrent'
> & {
  id?: string;
  endDate: string;
  description: string;
};

export type WorkExperienceErrors = Partial<
  Record<'jobTitle' | 'companyName' | 'startDate' | 'endDate' | 'description', string>
>;

function isValidMonth(value: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const currentMonth = new Date().toISOString().slice(0, 7);
  return year >= 1000 && month >= 1 && month <= 12 && value <= currentMonth;
}

export function validateWorkExperienceDraft(draft: WorkExperienceDraft): WorkExperienceErrors {
  const errors: WorkExperienceErrors = {};
  const jobTitle = draft.jobTitle.trim();
  const companyName = draft.companyName.trim();
  const startDate = draft.startDate.trim();
  const endDate = draft.endDate?.trim() ?? '';
  const description = draft.description.trim();

  if (!jobTitle) {
    errors.jobTitle = 'Job title is required.';
  }

  if (!companyName) {
    errors.companyName = 'Company name is required.';
  }

  if (!startDate) {
    errors.startDate = 'Start date is required.';
  } else if (!isValidMonth(startDate)) {
    errors.startDate = 'Enter a valid start month in YYYY-MM format that is not in the future.';
  }

  if (!draft.isCurrent) {
    if (!endDate) {
      errors.endDate = 'Enter an end date or mark this role as Present.';
    } else if (!isValidMonth(endDate)) {
      errors.endDate = 'Enter a valid end month in YYYY-MM format that is not in the future.';
    } else if (isValidMonth(startDate) && endDate < startDate) {
      errors.endDate = 'End date cannot be before the start date.';
    }
  }

  if (description.length > WORK_EXPERIENCE_DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${WORK_EXPERIENCE_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }

  return errors;
}

export function sortWorkExperience(entries: WorkExperience[]): WorkExperience[] {
  return [...entries].sort(
    (left, right) =>
      right.startDate.localeCompare(left.startDate) ||
      (right.endDate ?? '9999-99').localeCompare(left.endDate ?? '9999-99') ||
      left.jobTitle.localeCompare(right.jobTitle),
  );
}

export function saveWorkExperience(
  entries: WorkExperience[],
  draft: WorkExperienceDraft,
  id: string,
): WorkExperience[] {
  const savedEntry: WorkExperience = {
    id: draft.id ?? id,
    jobTitle: draft.jobTitle.trim(),
    companyName: draft.companyName.trim(),
    startDate: draft.startDate.trim(),
    isCurrent: draft.isCurrent,
    ...(draft.isCurrent ? {} : { endDate: draft.endDate.trim() }),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
  };
  const existingIndex = entries.findIndex((entry) => entry.id === savedEntry.id);
  const updatedEntries =
    existingIndex < 0
      ? [...entries, savedEntry]
      : entries.map((entry) => (entry.id === savedEntry.id ? savedEntry : entry));

  return sortWorkExperience(updatedEntries);
}

export function deleteWorkExperience(entries: WorkExperience[], id: string): WorkExperience[] {
  return entries.filter((entry) => entry.id !== id);
}

export function createWorkExperienceDraft(entry?: WorkExperience): WorkExperienceDraft {
  return {
    id: entry?.id,
    jobTitle: entry?.jobTitle ?? '',
    companyName: entry?.companyName ?? '',
    startDate: entry?.startDate ?? '',
    endDate: entry?.endDate ?? '',
    isCurrent: entry?.isCurrent ?? false,
    description: entry?.description ?? '',
  };
}

export function formatWorkExperienceDate(value: string): string {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(date);
}
