import { expertiseCategories } from '../expertise/constants';
import type { GigType } from '../gigs/types';
import type { DesiredJobPreference } from './types';

export const DESIRED_JOB_LOCATION_MAX_LENGTH = 200;

export const DESIRED_JOB_SCHEDULE_OPTIONS: { value: GigType | ''; label: string }[] = [
  { value: '', label: 'Any schedule' },
  { value: 'SINGLE_SHIFT', label: 'Single shift' },
  { value: 'SHORT_TERM', label: 'Short-term' },
  { value: 'PART_TIME', label: 'Part-time' },
];

export type DesiredJobDraft = {
  categoryId: string;
  gigType: GigType | '';
  location: string;
};

export type DesiredJobDraftErrors = {
  categoryId?: string;
  gigType?: string;
  location?: string;
  duplicate?: string;
};

const categoryIds = new Set(expertiseCategories.map((category) => category.id));
const gigTypes = new Set(
  DESIRED_JOB_SCHEDULE_OPTIONS.map((option) => option.value).filter(
    (value): value is GigType => value !== '',
  ),
);

export function validateDesiredJobDrafts(drafts: DesiredJobDraft[]): {
  ok: boolean;
  errors: DesiredJobDraftErrors[];
} {
  const errors = drafts.map((): DesiredJobDraftErrors => ({}));
  const seen = new Set<string>();

  drafts.forEach((draft, index) => {
    if (!categoryIds.has(draft.categoryId)) {
      errors[index].categoryId = 'Choose a valid job role.';
    }

    if (draft.gigType && !gigTypes.has(draft.gigType)) {
      errors[index].gigType = 'Choose a valid schedule.';
    }

    const location = draft.location.trim();
    if (location.length > DESIRED_JOB_LOCATION_MAX_LENGTH) {
      errors[index].location = `Location must be ${DESIRED_JOB_LOCATION_MAX_LENGTH} characters or fewer.`;
    }

    if (!errors[index].categoryId && !errors[index].gigType && !errors[index].location) {
      const key = JSON.stringify([draft.categoryId, draft.gigType, location.toLowerCase()]);
      if (seen.has(key)) {
        errors[index].duplicate = 'This job preference is already listed.';
      } else {
        seen.add(key);
      }
    }
  });

  return {
    ok: errors.every((error) => Object.keys(error).length === 0),
    errors,
  };
}

export function normalizeDesiredJobDrafts(drafts: DesiredJobDraft[]): DesiredJobPreference[] {
  return drafts.map((draft) => ({
    categoryId: draft.categoryId.trim(),
    ...(draft.gigType ? { gigType: draft.gigType } : {}),
    ...(draft.location.trim() ? { location: draft.location.trim() } : {}),
  }));
}

export function createDesiredJobDraft(preference?: DesiredJobPreference): DesiredJobDraft {
  return {
    categoryId: preference?.categoryId ?? '',
    gigType: preference?.gigType ?? '',
    location: preference?.location ?? '',
  };
}
