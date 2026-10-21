export type ApplicantPreferences = {
  gigUpdates: boolean;
  scheduleReminders: boolean;
  feedbackUpdates: boolean;
};

export type ApplicantPreferenceKey = keyof ApplicantPreferences;

export const APPLICANT_PREFERENCES_STORAGE_KEY = 'quickhire.applicant.preferences.v1';

export const DEFAULT_APPLICANT_PREFERENCES: ApplicantPreferences = {
  gigUpdates: false,
  scheduleReminders: false,
  feedbackUpdates: false,
};

const preferenceKeys: ApplicantPreferenceKey[] = [
  'gigUpdates',
  'scheduleReminders',
  'feedbackUpdates',
];

export function parseApplicantPreferences(value: string | null): ApplicantPreferences {
  if (value === null) {
    return { ...DEFAULT_APPLICANT_PREFERENCES };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Saved preferences are not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Saved preferences have an invalid format.');
  }

  const stored = parsed as Record<string, unknown>;
  const preferences = { ...DEFAULT_APPLICANT_PREFERENCES };

  for (const key of preferenceKeys) {
    const storedValue = stored[key];
    if (storedValue === undefined) {
      continue;
    }
    if (typeof storedValue !== 'boolean') {
      throw new Error('Saved preferences have an invalid value.');
    }
    preferences[key] = storedValue;
  }

  return preferences;
}

export function updateApplicantPreference(
  current: ApplicantPreferences,
  key: ApplicantPreferenceKey,
  value: boolean,
): ApplicantPreferences {
  if (typeof value !== 'boolean') {
    throw new Error('Preference values must be boolean.');
  }

  return { ...current, [key]: value };
}
