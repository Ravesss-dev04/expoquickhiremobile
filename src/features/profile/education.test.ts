import {
  createEducationDraft,
  deleteEducation,
  saveEducation,
  sortEducation,
  validateEducationDraft,
} from './education';
import type { Education } from './types';

const earlierEntry: Education = {
  id: 'earlier',
  institution: 'Example College',
  qualification: 'Certificate',
  fieldOfStudy: 'Hospitality',
  startDate: '2021-06',
  endDate: '2022-05',
  isCurrent: false,
};
const ongoingEntry: Education = {
  id: 'ongoing',
  institution: 'Example University',
  qualification: 'Bachelor degree',
  startDate: '2024-01',
  isCurrent: true,
};

const emptyDraft = createEducationDraft();
const emptyErrors = validateEducationDraft(emptyDraft);
if (
  emptyErrors.institution !== 'Institution is required.' ||
  emptyErrors.qualification !== 'Degree or qualification is required.' ||
  emptyErrors.startDate !== 'Start date is required.' ||
  !emptyErrors.endDate
) {
  throw new Error(`Required education fields should be validated: ${JSON.stringify(emptyErrors)}`);
}

const validDraft = createEducationDraft({
  id: 'valid',
  institution: 'Example Institute',
  qualification: 'Diploma',
  fieldOfStudy: 'Business',
  startDate: '2023-02',
  endDate: '2023-02',
  isCurrent: false,
});
if (Object.keys(validateEducationDraft(validDraft)).length) {
  throw new Error('A same-month start and end date should be valid.');
}

const ongoingDraft = createEducationDraft({ ...ongoingEntry, endDate: undefined });
if (Object.keys(validateEducationDraft(ongoingDraft)).length) {
  throw new Error('Ongoing education should not require an end date.');
}

const reversedDates = validateEducationDraft({
  ...validDraft,
  startDate: '2023-08',
  endDate: '2023-07',
});
if (!reversedDates.endDate) {
  throw new Error('An end date before the start date should be rejected.');
}

const malformedDates = validateEducationDraft({
  ...validDraft,
  startDate: '2023-13',
  endDate: 'not-a-date',
});
if (!malformedDates.startDate || !malformedDates.endDate) {
  throw new Error('Malformed education dates should be rejected.');
}

const futureMonth = new Date();
futureMonth.setMonth(futureMonth.getMonth() + 1);
const futureDate = `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, '0')}`;
const futureErrors = validateEducationDraft({
  ...validDraft,
  startDate: futureDate,
  endDate: futureDate,
});
if (!futureErrors.startDate || !futureErrors.endDate) {
  throw new Error('Future education dates should be rejected.');
}

const ordered = sortEducation([earlierEntry, ongoingEntry]);
if (ordered[0]?.id !== 'ongoing' || ordered[1]?.id !== 'earlier') {
  throw new Error(`Education should sort newest first: ${JSON.stringify(ordered)}`);
}

const created = saveEducation([], { ...validDraft, id: undefined }, 'created');
if (
  created.length !== 1 ||
  created[0]?.id !== 'created' ||
  created[0]?.qualification !== 'Diploma' ||
  created[0]?.fieldOfStudy !== 'Business'
) {
  throw new Error(`An education entry should be created: ${JSON.stringify(created)}`);
}

const edited = saveEducation(
  [earlierEntry, ongoingEntry],
  { ...validDraft, id: 'earlier', institution: 'Updated Institute' },
  'ignored',
);
if (
  edited.length !== 2 ||
  edited.filter((entry) => entry.id === 'earlier').length !== 1 ||
  edited.find((entry) => entry.id === 'earlier')?.institution !== 'Updated Institute'
) {
  throw new Error(`Editing should replace the existing entry: ${JSON.stringify(edited)}`);
}

const ongoingSaved = saveEducation([], ongoingDraft, 'ongoing');
if (ongoingSaved[0]?.isCurrent !== true || ongoingSaved[0]?.endDate !== undefined) {
  throw new Error(`Ongoing education should not save an end date: ${JSON.stringify(ongoingSaved)}`);
}

const deleted = deleteEducation(edited, 'ongoing');
if (deleted.length !== 1 || deleted[0]?.id !== 'earlier') {
  throw new Error(`Deleting should remove only the selected entry: ${JSON.stringify(deleted)}`);
}

console.log('education tests passed');
