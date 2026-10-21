import {
  addExpertiseCategory,
  getProfileCompletion,
  validateApplicantProfile,
  validateProfessionalSummary,
  validateExpertiseSelection,
} from './validation';

const profileValid = {
  id: 'app-1',
  fullName: 'Alex Rivera',
  email: 'alex@example.com',
  phoneNumber: '555-1234',
  location: 'Austin, TX',
  professionalSummary: 'Customer support specialist with events experience.',
  skills: [],
  expertiseIds: ['event-staff', 'customer-service'],
  resume: null,
  verificationStatus: 'NOT_STARTED' as const,
};

const invalidProfile = {
  ...profileValid,
  fullName: ' ',
  email: 'bad-email',
  birthdate: '2024-02-30',
};

const expertise = ['event-staff', 'service-crew'];
const emptyProfile = {
  ...profileValid,
  fullName: '',
  email: '',
  phoneNumber: '',
  location: '',
  professionalSummary: '',
  expertiseIds: [],
};
const completeProfile = {
  ...profileValid,
  resume: {
    fileName: 'Alex_Rivera_Resume.pdf',
    mimeType: 'application/pdf',
  },
};

const emptyCompletion = getProfileCompletion(emptyProfile);
if (emptyCompletion.percentage !== 0 || emptyCompletion.sections.some((section) => section.complete)) {
  throw new Error(`An empty profile should safely have zero completion: ${JSON.stringify(emptyCompletion)}`);
}
if (getProfileCompletion(null).percentage !== 0) {
  throw new Error('A missing profile should safely have zero completion.');
}

const partialCompletion = getProfileCompletion(profileValid);
if (partialCompletion.percentage !== 85 || partialCompletion.sections.find((section) => section.id === 'resume')?.complete) {
  throw new Error(`A profile without a resume should be partially complete: ${JSON.stringify(partialCompletion)}`);
}
if (partialCompletion.sections.find((section) => section.id === 'resume')?.href !== '/applicant/profile/resume') {
  throw new Error('The incomplete resume section should link to the existing resume route.');
}

const completeCompletion = getProfileCompletion(completeProfile);
if (
  completeCompletion.percentage !== 100 ||
  completeCompletion.sections.some((section) => !section.complete)
) {
  throw new Error(`A complete profile should earn 100%: ${JSON.stringify(completeCompletion)}`);
}

const aboutEmptyCompletion = getProfileCompletion({
  ...completeProfile,
  professionalSummary: '',
});
if (
  aboutEmptyCompletion.percentage !== 75 ||
  aboutEmptyCompletion.sections.find((section) => section.id === 'professionalSummary')?.complete
) {
  throw new Error(`An empty About summary should reduce completion by its configured weight: ${JSON.stringify(aboutEmptyCompletion)}`);
}

const invalidCompletion = getProfileCompletion({
  ...completeProfile,
  email: 'bad-email',
  phoneNumber: '123',
  location: 'x'.repeat(201),
  professionalSummary: 'x'.repeat(501),
  expertiseIds: ['unknown-category'],
  resume: { fileName: 'resume.exe' },
});
if (
  invalidCompletion.sections.find((section) => section.id === 'personalDetails')?.completionPercentage !== 25 ||
  invalidCompletion.sections.find((section) => section.id === 'professionalSummary')?.complete ||
  invalidCompletion.sections.find((section) => section.id === 'expertise')?.complete ||
  invalidCompletion.sections.find((section) => section.id === 'resume')?.complete
) {
  throw new Error(`Invalid profile data must not earn completion credit: ${JSON.stringify(invalidCompletion)}`);
}
if (
  invalidCompletion.sections.find((section) => section.id === 'professionalSummary')?.href !==
  '/applicant/profile/resume'
) {
  throw new Error('The incomplete About section should link to the Online Resume, not the personal editor.');
}

const validResult = validateApplicantProfile(profileValid);
if (!validResult.ok || Object.keys(validResult.errors).length !== 0) {
  throw new Error(`Expected valid profile to pass validation: ${JSON.stringify(validResult)}`);
}

if (validateProfessionalSummary('  ')) {
  throw new Error('An empty About summary should remain optional.');
}
if (validateProfessionalSummary('a'.repeat(500))) {
  throw new Error('An About summary at the character limit should pass.');
}
if (!validateProfessionalSummary('a'.repeat(501))) {
  throw new Error('An About summary over the character limit should be rejected.');
}

const invalidResult = validateApplicantProfile(invalidProfile);
if (invalidResult.ok || invalidResult.errors.fullName !== 'Full name is required.') {
  throw new Error(`Unexpected invalid profile result: ${JSON.stringify(invalidResult)}`);
}
if (invalidResult.errors.email !== 'Please enter a valid email address.') {
  throw new Error(`Unexpected email validation result: ${JSON.stringify(invalidResult.errors)}`);
}
if (!invalidResult.errors.birthdate) {
  throw new Error('An impossible date of birth should be rejected.');
}

const tomorrow = new Date();
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
const futureBirthdate = tomorrow.toISOString().slice(0, 10);
const futureBirthdateResult = validateApplicantProfile({ ...profileValid, birthdate: futureBirthdate });
if (futureBirthdateResult.ok || !futureBirthdateResult.errors.birthdate) {
  throw new Error('A future date of birth should be rejected.');
}

const validBirthdate = validateApplicantProfile({ ...profileValid, birthdate: '2000-02-29' });
if (!validBirthdate.ok) {
  throw new Error(`A valid date of birth should pass validation: ${JSON.stringify(validBirthdate.errors)}`);
}

const invalidPhone = validateApplicantProfile({ ...profileValid, phoneNumber: '123' });
if (invalidPhone.ok || !invalidPhone.errors.phoneNumber) {
  throw new Error('A phone number with too few digits should be rejected.');
}

const expertiseResult = validateExpertiseSelection(expertise);
if (!expertiseResult.ok || expertiseResult.selected.length !== expertise.length) {
  throw new Error(`Unexpected expertise validation result: ${JSON.stringify(expertiseResult)}`);
}

const duplicateResult = addExpertiseCategory(expertise, 'event-staff');
if (duplicateResult.ok) {
  throw new Error('Duplicate expertise selection should be rejected.');
}

const addResult = addExpertiseCategory(expertise, 'sales-promoter');
if (!addResult.ok || addResult.selected.length !== 3) {
  throw new Error(`Expected additional category to be accepted: ${JSON.stringify(addResult)}`);
}

const fourthResult = addExpertiseCategory(['event-staff', 'service-crew', 'sales-promoter'], 'customer-service');
if (fourthResult.ok) {
  throw new Error('Fourth expertise selection should be rejected.');
}

console.log('profile validation tests passed');
