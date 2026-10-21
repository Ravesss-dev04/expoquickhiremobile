export const APPLICANT_SKILLS_STORAGE_KEY = 'quickhire.applicant.resume-skills.v1';

export type ApplicantSkillsStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type SkillMutation =
  | { ok: true; skills: string[] }
  | { ok: false; error: string };

export function normalizeSkill(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeApplicantSkills(values: readonly string[]): string[] {
  const skills: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== 'string') {
      throw new Error('Saved skills must all be text.');
    }

    const skill = normalizeSkill(value);
    if (!skill) {
      throw new Error('Saved skills must not be blank.');
    }

    const key = skill.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      skills.push(skill);
    }
  }

  return skills;
}

export function addApplicantSkill(
  currentSkills: readonly string[],
  value: string,
): SkillMutation {
  const skill = normalizeSkill(value);
  if (!skill) {
    return { ok: false, error: 'Enter a skill before adding it.' };
  }

  if (currentSkills.some((current) => normalizeSkill(current).toLowerCase() === skill.toLowerCase())) {
    return { ok: false, error: 'That skill is already in your list.' };
  }

  return { ok: true, skills: [...normalizeApplicantSkills(currentSkills), skill] };
}

export function removeApplicantSkill(
  currentSkills: readonly string[],
  value: string,
): string[] {
  const key = normalizeSkill(value).toLowerCase();
  return normalizeApplicantSkills(currentSkills).filter(
    (skill) => skill.toLowerCase() !== key,
  );
}

export function parseApplicantSkills(value: string | null): string[] {
  if (value === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Saved skills are not valid JSON.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Saved skills have an invalid format.');
  }

  return normalizeApplicantSkills(parsed);
}

export async function loadApplicantSkills(
  storage: ApplicantSkillsStorage,
): Promise<string[]> {
  return parseApplicantSkills(await storage.getItem(APPLICANT_SKILLS_STORAGE_KEY));
}

export async function saveApplicantSkills(
  storage: ApplicantSkillsStorage,
  skills: readonly string[],
): Promise<string[]> {
  const normalizedSkills = normalizeApplicantSkills(skills);
  await storage.setItem(APPLICANT_SKILLS_STORAGE_KEY, JSON.stringify(normalizedSkills));
  return normalizedSkills;
}
