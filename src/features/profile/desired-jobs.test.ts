import {
  createDesiredJobDraft,
  normalizeDesiredJobDrafts,
  validateDesiredJobDrafts,
} from './desired-jobs';

const validDraft = createDesiredJobDraft({
  categoryId: 'event-staff',
  gigType: 'SHORT_TERM',
  location: 'Oakland, CA',
});

const validResult = validateDesiredJobDrafts([validDraft]);
if (!validResult.ok) {
  throw new Error(`Expected a valid desired job: ${JSON.stringify(validResult.errors)}`);
}

const missingRole = validateDesiredJobDrafts([createDesiredJobDraft()]);
if (missingRole.ok || !missingRole.errors[0]?.categoryId) {
  throw new Error('A desired job without a role should be rejected.');
}

const invalidRole = validateDesiredJobDrafts([{ ...validDraft, categoryId: 'unknown-role' }]);
if (invalidRole.ok || !invalidRole.errors[0]?.categoryId) {
  throw new Error('A role outside the existing gig categories should be rejected.');
}

const invalidSchedule = validateDesiredJobDrafts([
  { ...validDraft, gigType: 'INVALID' as typeof validDraft.gigType },
]);
if (invalidSchedule.ok || !invalidSchedule.errors[0]?.gigType) {
  throw new Error('A schedule outside the existing gig types should be rejected.');
}

const tooLongLocation = validateDesiredJobDrafts([{ ...validDraft, location: 'x'.repeat(201) }]);
if (tooLongLocation.ok || !tooLongLocation.errors[0]?.location) {
  throw new Error('A location over the supported length should be rejected.');
}

const duplicatePreferences = validateDesiredJobDrafts([
  validDraft,
  { ...validDraft, location: '  oakland, ca ' },
]);
if (duplicatePreferences.ok || !duplicatePreferences.errors[1]?.duplicate) {
  throw new Error('Duplicate desired job preferences should be rejected after normalization.');
}

const distinctPreferences = validateDesiredJobDrafts([
  validDraft,
  { ...validDraft, gigType: 'SINGLE_SHIFT' },
]);
if (!distinctPreferences.ok) {
  throw new Error('The same role with a different schedule should be allowed.');
}

const moreThanThree = validateDesiredJobDrafts(
  ['event-staff', 'customer-service', 'retail-assistant', 'delivery-support'].map((categoryId) =>
    createDesiredJobDraft({ categoryId }),
  ),
);
if (!moreThanThree.ok) {
  throw new Error('Desired jobs should not inherit the three-expertise-category limit.');
}

const normalized = normalizeDesiredJobDrafts([validDraft, createDesiredJobDraft({ categoryId: 'retail-assistant' })]);
if (
  normalized[0]?.location !== 'Oakland, CA' ||
  normalized[0]?.gigType !== 'SHORT_TERM' ||
  normalized[1]?.gigType !== undefined ||
  normalized[1]?.location !== undefined
) {
  throw new Error(`Optional desired job fields should be normalized: ${JSON.stringify(normalized)}`);
}

console.log('desired jobs tests passed');
