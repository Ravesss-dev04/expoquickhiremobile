import {
  DEFAULT_APPLICANT_PREFERENCES,
  parseApplicantPreferences,
  updateApplicantPreference,
} from './preferences';

const updated = updateApplicantPreference(DEFAULT_APPLICANT_PREFERENCES, 'gigUpdates', true);
if (!updated.gigUpdates || updated.scheduleReminders || updated.feedbackUpdates) {
  throw new Error('Updating one preference must not change the other preferences.');
}

const restored = parseApplicantPreferences(JSON.stringify(updated));
if (JSON.stringify(restored) !== JSON.stringify(updated)) {
  throw new Error('Preferences should round-trip through persistent storage.');
}

const withDefaults = parseApplicantPreferences('{"scheduleReminders":true}');
if (withDefaults.gigUpdates || !withDefaults.scheduleReminders || withDefaults.feedbackUpdates) {
  throw new Error('Missing preferences should use their declared defaults.');
}

let invalidValueRejected = false;
try {
  parseApplicantPreferences('{"gigUpdates":"yes"}');
} catch {
  invalidValueRejected = true;
}
if (!invalidValueRejected) {
  throw new Error('Invalid stored preference values must be rejected.');
}

console.log('applicant preference tests passed');
