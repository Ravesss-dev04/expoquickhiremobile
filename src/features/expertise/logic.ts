import { MAX_EXPERTISE_SELECTIONS } from './constants';

export function validateExpertiseSelection(selectedIds: string[]): {
  ok: boolean;
  selected: string[];
  error?: string;
} {
  const normalized = (selectedIds ?? [])
    .map((id) => id.trim())
    .filter(Boolean);

  const uniqueSelection = [...new Set(normalized)];

  if (uniqueSelection.length !== normalized.length) {
    return {
      ok: false,
      selected: uniqueSelection,
      error: 'Each category can only be selected once.',
    };
  }

  if (uniqueSelection.length > MAX_EXPERTISE_SELECTIONS) {
    return {
      ok: false,
      selected: uniqueSelection,
      error: 'You can select up to three expertise categories.',
    };
  }

  return {
    ok: true,
    selected: uniqueSelection,
  };
}

export function addExpertiseCategory(
  selectedIds: string[],
  candidateId: string,
): { ok: boolean; selected: string[]; error?: string } {
  const normalizedCandidate = candidateId.trim();

  if (!normalizedCandidate) {
    return {
      ok: false,
      selected: selectedIds,
      error: 'Please choose a category.',
    };
  }

  if (selectedIds.includes(normalizedCandidate)) {
    return {
      ok: false,
      selected: selectedIds,
      error: 'This category is already selected.',
    };
  }

  const nextSelection = [...selectedIds, normalizedCandidate];
  const validation = validateExpertiseSelection(nextSelection);

  if (!validation.ok) {
    return {
      ok: false,
      selected: selectedIds,
      error: validation.error,
    };
  }

  return {
    ok: true,
    selected: validation.selected,
  };
}

export function removeExpertiseCategory(
  selectedIds: string[],
  candidateId: string,
): { ok: boolean; selected: string[] } {
  return {
    ok: true,
    selected: selectedIds.filter((id) => id !== candidateId),
  };
}
