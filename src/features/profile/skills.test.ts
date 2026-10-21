import {
  addApplicantSkill,
  APPLICANT_SKILLS_STORAGE_KEY,
  loadApplicantSkills,
  normalizeSkill,
  parseApplicantSkills,
  removeApplicantSkill,
  saveApplicantSkills,
} from './skills';

const normalized = normalizeSkill('  Customer   support\tand\nservice  ');
if (normalized !== 'Customer support and service') {
  throw new Error(`Skill whitespace should be normalized: ${normalized}`);
}

const blankSkill = addApplicantSkill([], ' \t\n ');
if (blankSkill.ok || !blankSkill.error.includes('Enter a skill')) {
  throw new Error('Blank skills should be rejected with a useful validation message.');
}

const firstSkill = addApplicantSkill([], '  Microsoft   Excel ');
if (!firstSkill.ok || firstSkill.skills[0] !== 'Microsoft Excel') {
  throw new Error(`A skill should be normalized when added: ${JSON.stringify(firstSkill)}`);
}

const duplicate = addApplicantSkill(firstSkill.ok ? firstSkill.skills : [], 'mICROSOFT   excel');
if (duplicate.ok || !duplicate.error.includes('already')) {
  throw new Error('Skills should be unique regardless of letter case and whitespace.');
}

let manySkills: string[] = [];
for (const skill of ['Excel', 'Customer service', 'Event setup', 'Inventory', 'Scheduling']) {
  const result = addApplicantSkill(manySkills, skill);
  if (!result.ok) {
    throw new Error(result.error);
  }
  manySkills = result.skills;
}
if (manySkills.length !== 5) {
  throw new Error('The full skills list should not inherit the three-category expertise limit.');
}

const removed = removeApplicantSkill(manySkills, 'cUSTOMER SERVICE');
if (removed.length !== 4 || removed.some((skill) => skill.toLowerCase() === 'customer service')) {
  throw new Error(`A skill should be removable regardless of letter case: ${JSON.stringify(removed)}`);
}

if (JSON.stringify(parseApplicantSkills('["  First   aid ","FIRST AID","Excel"]')) !== JSON.stringify(['First aid', 'Excel'])) {
  throw new Error('Stored skills should be normalized and deduplicated when loaded.');
}

async function testSkillPersistence() {
  let stored: string | null = null;
  const storage = {
    async getItem(key: string) {
      if (key !== APPLICANT_SKILLS_STORAGE_KEY) {
        throw new Error(`Unexpected skills storage key: ${key}`);
      }
      return stored;
    },
    async setItem(key: string, value: string) {
      if (key !== APPLICANT_SKILLS_STORAGE_KEY) {
        throw new Error(`Unexpected skills storage key: ${key}`);
      }
      stored = value;
    },
  };

  const saved = await saveApplicantSkills(storage, ['  Event   setup ', 'Excel']);
  const reloaded = await loadApplicantSkills(storage);
  if (
    JSON.stringify(saved) !== JSON.stringify(['Event setup', 'Excel']) ||
    JSON.stringify(reloaded) !== JSON.stringify(saved)
  ) {
    throw new Error(`Skills should persist and reload: ${JSON.stringify({ saved, reloaded })}`);
  }
}

void testSkillPersistence().then(() => console.log('profile skills tests passed'));
