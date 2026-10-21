import {
  createWorkExperienceDraft,
  deleteWorkExperience,
  saveWorkExperience,
  sortWorkExperience,
  validateWorkExperienceDraft,
} from './work-experience';
import type { WorkExperience } from './types';

const olderEntry: WorkExperience = {
  id: 'older',
  jobTitle: 'Retail Assistant',
  companyName: 'Example Shop',
  startDate: '2021-06',
  endDate: '2022-05',
  isCurrent: false,
  description: 'Seasonal shop support.',
};
const currentEntry: WorkExperience = {
  id: 'current',
  jobTitle: 'Customer Support Intern',
  companyName: 'Example Studio',
  startDate: '2024-01',
  isCurrent: true,
};

const emptyDraft = createWorkExperienceDraft();
const emptyErrors = validateWorkExperienceDraft(emptyDraft);
if (
  emptyErrors.jobTitle !== 'Job title is required.' ||
  emptyErrors.companyName !== 'Company name is required.' ||
  emptyErrors.startDate !== 'Start date is required.' ||
  !emptyErrors.endDate
) {
  throw new Error(`Required work experience fields should be validated: ${JSON.stringify(emptyErrors)}`);
}

const validDraft = createWorkExperienceDraft({
  id: 'valid',
  jobTitle: 'Part-time Assistant',
  companyName: 'Example Company',
  startDate: '2023-02',
  endDate: '2023-02',
  isCurrent: false,
  description: 'Supported weekend shifts.',
});
if (Object.keys(validateWorkExperienceDraft(validDraft)).length) {
  throw new Error('A same-month start and end date should be valid.');
}

const presentDraft = createWorkExperienceDraft({ ...currentEntry, endDate: undefined });
if (Object.keys(validateWorkExperienceDraft(presentDraft)).length) {
  throw new Error('Present work experience should not require an end date.');
}

const reversedDates = validateWorkExperienceDraft({
  ...validDraft,
  startDate: '2023-08',
  endDate: '2023-07',
});
if (!reversedDates.endDate) {
  throw new Error('An end date before the start date should be rejected.');
}

const malformedDates = validateWorkExperienceDraft({
  ...validDraft,
  startDate: '2023-13',
  endDate: 'not-a-date',
});
if (!malformedDates.startDate || !malformedDates.endDate) {
  throw new Error('Malformed work experience dates should be rejected.');
}

const futureMonth = new Date();
futureMonth.setMonth(futureMonth.getMonth() + 1);
const futureDate = `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, '0')}`;
const futureErrors = validateWorkExperienceDraft({ ...validDraft, startDate: futureDate, endDate: futureDate });
if (!futureErrors.startDate || !futureErrors.endDate) {
  throw new Error('Future work experience dates should be rejected.');
}

const ordered = sortWorkExperience([olderEntry, currentEntry]);
if (ordered[0]?.id !== 'current' || ordered[1]?.id !== 'older') {
  throw new Error(`Work experience should sort newest first: ${JSON.stringify(ordered)}`);
}

const created = saveWorkExperience([], { ...validDraft, id: undefined }, 'created');
if (created.length !== 1 || created[0]?.id !== 'created' || created[0]?.jobTitle !== 'Part-time Assistant') {
  throw new Error(`A work experience entry should be created: ${JSON.stringify(created)}`);
}

const edited = saveWorkExperience([olderEntry, currentEntry], { ...validDraft, id: 'older', jobTitle: 'Intern' }, 'ignored');
if (
  edited.length !== 2 ||
  edited.filter((entry) => entry.id === 'older').length !== 1 ||
  edited.find((entry) => entry.id === 'older')?.jobTitle !== 'Intern'
) {
  throw new Error(`Editing should replace the existing entry: ${JSON.stringify(edited)}`);
}

const deleted = deleteWorkExperience(edited, 'current');
if (deleted.length !== 1 || deleted[0]?.id !== 'older') {
  throw new Error(`Deleting should remove only the selected entry: ${JSON.stringify(deleted)}`);
}

console.log('work experience tests passed');
