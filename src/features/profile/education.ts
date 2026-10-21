import type { Education } from './types';

export type EducationDraft = Pick<
  Education,
  'institution' | 'qualification' | 'startDate' | 'isCurrent'
> & {
  id?: string;
  fieldOfStudy: string;
  endDate: string;
};

export type EducationErrors = Partial<
  Record<'institution' | 'qualification' | 'startDate' | 'endDate', string>
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

export function validateEducationDraft(draft: EducationDraft): EducationErrors {
  const errors: EducationErrors = {};
  const institution = draft.institution.trim();
  const qualification = draft.qualification.trim();
  const startDate = draft.startDate.trim();
  const endDate = draft.endDate.trim();

  if (!institution) {
    errors.institution = 'Institution is required.';
  }

  if (!qualification) {
    errors.qualification = 'Degree or qualification is required.';
  }

  if (!startDate) {
    errors.startDate = 'Start date is required.';
  } else if (!isValidMonth(startDate)) {
    errors.startDate = 'Enter a valid start month in YYYY-MM format that is not in the future.';
  }

  if (!draft.isCurrent) {
    if (!endDate) {
      errors.endDate = 'Enter an end date or mark that you currently study here.';
    } else if (!isValidMonth(endDate)) {
      errors.endDate = 'Enter a valid end month in YYYY-MM format that is not in the future.';
    } else if (isValidMonth(startDate) && endDate < startDate) {
      errors.endDate = 'End date cannot be before the start date.';
    }
  }

  return errors;
}

export function sortEducation(entries: Education[]): Education[] {
  return [...entries].sort(
    (left, right) =>
      right.startDate.localeCompare(left.startDate) ||
      (right.endDate ?? '9999-99').localeCompare(left.endDate ?? '9999-99') ||
      left.institution.localeCompare(right.institution),
  );
}

export function saveEducation(
  entries: Education[],
  draft: EducationDraft,
  id: string,
): Education[] {
  const savedEntry: Education = {
    id: draft.id ?? id,
    institution: draft.institution.trim(),
    qualification: draft.qualification.trim(),
    startDate: draft.startDate.trim(),
    isCurrent: draft.isCurrent,
    ...(draft.fieldOfStudy.trim() ? { fieldOfStudy: draft.fieldOfStudy.trim() } : {}),
    ...(draft.isCurrent ? {} : { endDate: draft.endDate.trim() }),
  };
  const existingIndex = entries.findIndex((entry) => entry.id === savedEntry.id);
  const updatedEntries =
    existingIndex < 0
      ? [...entries, savedEntry]
      : entries.map((entry) => (entry.id === savedEntry.id ? savedEntry : entry));

  return sortEducation(updatedEntries);
}

export function deleteEducation(entries: Education[], id: string): Education[] {
  return entries.filter((entry) => entry.id !== id);
}

export function createEducationDraft(entry?: Education): EducationDraft {
  return {
    id: entry?.id,
    institution: entry?.institution ?? '',
    qualification: entry?.qualification ?? '',
    fieldOfStudy: entry?.fieldOfStudy ?? '',
    startDate: entry?.startDate ?? '',
    endDate: entry?.endDate ?? '',
    isCurrent: entry?.isCurrent ?? false,
  };
}

export function formatEducationDate(value: string): string {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(date);
}
