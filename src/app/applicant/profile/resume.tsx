import { Link, router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { SymbolView } from 'expo-symbols';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenContainer } from '@/components/ui/screen-container';
import { StatusBadge } from '@/components/ui/status-badge';
import { expertiseCategories } from '@/features/expertise/constants';
import type { GigType } from '@/features/gigs/types';
import { useApplicantProfile } from '@/features/profile/profile-context';
import { addApplicantSkill, removeApplicantSkill } from '@/features/profile/skills';
import {
  createDesiredJobDraft,
  DESIRED_JOB_LOCATION_MAX_LENGTH,
  DESIRED_JOB_SCHEDULE_OPTIONS,
  normalizeDesiredJobDrafts,
  validateDesiredJobDrafts,
} from '@/features/profile/desired-jobs';
import type { DesiredJobDraft, DesiredJobDraftErrors } from '@/features/profile/desired-jobs';
import {
  createEducationDraft,
  deleteEducation,
  formatEducationDate,
  saveEducation,
  sortEducation,
  validateEducationDraft,
} from '@/features/profile/education';
import type { EducationDraft, EducationErrors } from '@/features/profile/education';
import {
  createWorkExperienceDraft,
  deleteWorkExperience,
  formatWorkExperienceDate,
  saveWorkExperience,
  sortWorkExperience,
  validateWorkExperienceDraft,
  WORK_EXPERIENCE_DESCRIPTION_MAX_LENGTH,
} from '@/features/profile/work-experience';
import type { WorkExperienceDraft, WorkExperienceErrors } from '@/features/profile/work-experience';
import { MAX_PROFESSIONAL_SUMMARY_LENGTH, normalizeText, validateProfessionalSummary } from '@/features/profile/validation';
import { validateResumeFile } from '@/features/resume/validation';

function getScheduleLabel(gigType?: GigType) {
  return DESIRED_JOB_SCHEDULE_OPTIONS.find((option) => option.value === (gigType ?? ''))?.label;
}

export default function OnlineResumeScreen() {
  const {
    profile,
    updateProfile,
    isSkillsLoading,
    isSkillsSaving,
    skillsLoadError,
    skillsSaveError,
    reloadSkills,
    saveSkills,
  } = useApplicantProfile();
  const [error, setError] = useState<string | null>(null);
  const [skillDraft, setSkillDraft] = useState('');
  const [skillError, setSkillError] = useState<string | null>(null);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState(profile.professionalSummary ?? '');
  const [aboutError, setAboutError] = useState<string | null>(null);
  const [isEditingDesiredJobs, setIsEditingDesiredJobs] = useState(false);
  const [desiredJobDrafts, setDesiredJobDrafts] = useState<DesiredJobDraft[]>([]);
  const [desiredJobErrors, setDesiredJobErrors] = useState<DesiredJobDraftErrors[]>([]);
  const [categoryPickerIndex, setCategoryPickerIndex] = useState<number | null>(null);
  const [isAddingExperience, setIsAddingExperience] = useState(false);
  const [experienceDraft, setExperienceDraft] = useState<WorkExperienceDraft | null>(null);
  const [experienceErrors, setExperienceErrors] = useState<WorkExperienceErrors>({});
  const [confirmDeleteExperienceId, setConfirmDeleteExperienceId] = useState<string | null>(null);
  const [isAddingEducation, setIsAddingEducation] = useState(false);
  const [educationDraft, setEducationDraft] = useState<EducationDraft | null>(null);
  const [educationErrors, setEducationErrors] = useState<EducationErrors>({});
  const [confirmDeleteEducationId, setConfirmDeleteEducationId] = useState<string | null>(null);
  const [isConfirmingResumeRemoval, setIsConfirmingResumeRemoval] = useState(false);
  const sortedWorkExperience = sortWorkExperience(profile.workExperience ?? []);
  const sortedEducation = sortEducation(profile.education ?? []);
  const initials = profile.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  const existingSkillNames = new Set(profile.skills.map((skill) => skill.toLowerCase()));
  const suggestedSkills = expertiseCategories.filter(
    (category) => !existingSkillNames.has(category.label.toLowerCase()),
  );

  const addSkill = async (value = skillDraft) => {
    const result = addApplicantSkill(profile.skills, value);
    if (!result.ok) {
      setSkillError(result.error);
      return;
    }

    if (await saveSkills(result.skills)) {
      setSkillDraft('');
      setSkillError(null);
    }
  };

  const removeSkill = async (skill: string) => {
    const nextSkills = removeApplicantSkill(profile.skills, skill);
    if (await saveSkills(nextSkills)) {
      setSkillError(null);
    }
  };

  const startEditingAbout = () => {
    setAboutDraft(profile.professionalSummary ?? '');
    setAboutError(null);
    setIsEditingAbout(true);
  };

  const saveAbout = () => {
    const summary = normalizeText(aboutDraft);
    const validationError = validateProfessionalSummary(summary);
    if (validationError) {
      setAboutError(validationError);
      return;
    }

    updateProfile((current) => ({ ...current, professionalSummary: summary || undefined }));
    setAboutDraft(summary);
    setAboutError(null);
    setIsEditingAbout(false);
  };

  const cancelAbout = () => {
    setAboutDraft(profile.professionalSummary ?? '');
    setAboutError(null);
    setIsEditingAbout(false);
  };

  const startEditingDesiredJobs = () => {
    setDesiredJobDrafts((profile.desiredJobs ?? []).map(createDesiredJobDraft));
    setDesiredJobErrors([]);
    setCategoryPickerIndex(null);
    setIsEditingDesiredJobs(true);
  };

  const updateDesiredJob = (index: number, patch: Partial<DesiredJobDraft>) => {
    setDesiredJobDrafts((current) =>
      current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft)),
    );
    setDesiredJobErrors([]);
  };

  const addDesiredJob = () => {
    setDesiredJobDrafts((current) => [...current, createDesiredJobDraft()]);
    setDesiredJobErrors([]);
    setCategoryPickerIndex(null);
  };

  const removeDesiredJob = (index: number) => {
    setDesiredJobDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index));
    setDesiredJobErrors([]);
    setCategoryPickerIndex(null);
  };

  const saveDesiredJobs = () => {
    const validation = validateDesiredJobDrafts(desiredJobDrafts);
    if (!validation.ok) {
      setDesiredJobErrors(validation.errors);
      return;
    }

    updateProfile((current) => ({
      ...current,
      desiredJobs: normalizeDesiredJobDrafts(desiredJobDrafts),
    }));
    setDesiredJobErrors([]);
    setIsEditingDesiredJobs(false);
  };

  const cancelDesiredJobs = () => {
    setDesiredJobDrafts((profile.desiredJobs ?? []).map(createDesiredJobDraft));
    setDesiredJobErrors([]);
    setCategoryPickerIndex(null);
    setIsEditingDesiredJobs(false);
  };

  const startAddingExperience = () => {
    setExperienceDraft(createWorkExperienceDraft());
    setExperienceErrors({});
    setIsAddingExperience(true);
    setConfirmDeleteExperienceId(null);
  };

  const startEditingExperience = (id: string) => {
    const entry = profile.workExperience?.find((item) => item.id === id);
    if (!entry) {
      return;
    }

    setExperienceDraft(createWorkExperienceDraft(entry));
    setExperienceErrors({});
    setIsAddingExperience(false);
    setConfirmDeleteExperienceId(null);
  };

  const updateExperienceDraft = (patch: Partial<WorkExperienceDraft>) => {
    setExperienceDraft((current) => (current ? { ...current, ...patch } : current));
    setExperienceErrors({});
  };

  const saveExperience = () => {
    if (!experienceDraft) {
      return;
    }

    const validationErrors = validateWorkExperienceDraft(experienceDraft);
    if (Object.keys(validationErrors).length) {
      setExperienceErrors(validationErrors);
      return;
    }

    const id = experienceDraft.id ?? `experience-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    updateProfile((current) => ({
      ...current,
      workExperience: saveWorkExperience(current.workExperience ?? [], experienceDraft, id),
    }));
    setExperienceDraft(null);
    setExperienceErrors({});
    setIsAddingExperience(false);
  };

  const cancelExperience = () => {
    setExperienceDraft(null);
    setExperienceErrors({});
    setIsAddingExperience(false);
  };

  const confirmDeleteExperience = (id: string) => {
    updateProfile((current) => ({
      ...current,
      workExperience: deleteWorkExperience(current.workExperience ?? [], id),
    }));
    setConfirmDeleteExperienceId(null);
  };

  const startAddingEducation = () => {
    setEducationDraft(createEducationDraft());
    setEducationErrors({});
    setIsAddingEducation(true);
    setConfirmDeleteEducationId(null);
  };

  const startEditingEducation = (id: string) => {
    const entry = profile.education?.find((item) => item.id === id);
    if (!entry) {
      return;
    }

    setEducationDraft(createEducationDraft(entry));
    setEducationErrors({});
    setIsAddingEducation(false);
    setConfirmDeleteEducationId(null);
  };

  const updateEducationDraft = (patch: Partial<EducationDraft>) => {
    setEducationDraft((current) => (current ? { ...current, ...patch } : current));
    setEducationErrors({});
  };

  const saveEducationEntry = () => {
    if (!educationDraft) {
      return;
    }

    const validationErrors = validateEducationDraft(educationDraft);
    if (Object.keys(validationErrors).length) {
      setEducationErrors(validationErrors);
      return;
    }

    const id = educationDraft.id ?? `education-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    updateProfile((current) => ({
      ...current,
      education: saveEducation(current.education ?? [], educationDraft, id),
    }));
    setEducationDraft(null);
    setEducationErrors({});
    setIsAddingEducation(false);
  };

  const cancelEducation = () => {
    setEducationDraft(null);
    setEducationErrors({});
    setIsAddingEducation(false);
  };

  const confirmDeleteEducation = (id: string) => {
    updateProfile((current) => ({
      ...current,
      education: deleteEducation(current.education ?? [], id),
    }));
    setConfirmDeleteEducationId(null);
  };

  const handleSelectResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets?.[0];
      if (!file) {
        setError('No resume was selected. Please try again.');
        return;
      }

      const validation = validateResumeFile(file.name, file.mimeType);
      if (!validation.ok) {
        setError(validation.error ?? 'Unsupported resume format.');
        return;
      }

      updateProfile((current) => ({
        ...current,
        resume: {
          fileName: validation.fileName ?? file.name,
          mimeType: validation.mimeType ?? file.mimeType,
          fileSize: file.size,
          localUri: file.uri,
        },
      }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to choose a resume. Please try again.');
    }
  };

  const handleRemove = () => {
    setIsConfirmingResumeRemoval(true);
  };

  const confirmRemoveResume = () => {
    updateProfile((current) => ({ ...current, resume: null }));
    setIsConfirmingResumeRemoval(false);
    router.replace('/applicant/profile');
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="mx-auto w-full max-w-lg gap-5 px-5 pb-8 pt-6">
          <View className="gap-1">
            <Text className="text-2xl font-bold text-text">Online Resume</Text>
            <Text className="text-sm leading-5 text-muted">
              A resume-style view of the information in your applicant profile.
            </Text>
          </View>

          <Card className="gap-5">
            <View className="flex-row items-start gap-4">
              <View
                accessible
                accessibilityLabel={`${profile.fullName ? 'Initials' : 'Default'} avatar`}
                className="h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Text className="text-lg font-bold text-primary">{initials || 'QH'}</Text>
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-xl font-bold text-text">{profile.fullName || 'Name not provided'}</Text>
                {profile.location ? <Text className="text-sm text-muted">{profile.location}</Text> : null}
                <Text className="text-xs leading-5 text-muted">
                  Job-seeking status is not available in this profile yet.
                </Text>
              </View>
            </View>

            <View className="gap-3 border-t border-border pt-4">
              <Text className="text-base font-bold text-text">Personal information</Text>
              {profile.birthdate ? (
                <View className="gap-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Date of birth</Text>
                  <Text className="text-sm text-text">{profile.birthdate}</Text>
                </View>
              ) : null}
              <View className="gap-1">
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Phone</Text>
                <Text className="text-sm text-text">{profile.phoneNumber || 'Not provided'}</Text>
              </View>
              <View className="gap-1">
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Email</Text>
                <Text className="text-sm text-text">{profile.email || 'Not provided'}</Text>
              </View>
            </View>

            <Link href="/applicant/profile/edit" asChild>
              <Pressable
                accessibilityRole="button"
                className="min-h-12 items-center justify-center rounded-md bg-primary px-4 py-3 active:opacity-80">
                <Text className="text-sm font-semibold text-white">Edit personal information</Text>
              </Pressable>
            </Link>
          </Card>

          <Card className="gap-3">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-lg font-bold text-text">About</Text>
              {!isEditingAbout ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit About section"
                  accessibilityHint="Opens the form to update your About summary."
                  onPress={startEditingAbout}
                  className="h-11 w-11 items-center justify-center rounded-md bg-secondary active:opacity-80">
                  <SymbolView
                    name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                    tintColor="#173B4A"
                    size={18}
                  />
                </Pressable>
              ) : null}
            </View>
            {isEditingAbout ? (
              <View className="gap-3">
                <TextInput
                  value={aboutDraft}
                  onChangeText={(value) => {
                    setAboutDraft(value);
                    setAboutError(null);
                  }}
                  accessibilityLabel="About summary"
                  placeholder="Share a short introduction about yourself and your experience."
                  multiline
                  maxLength={MAX_PROFESSIONAL_SUMMARY_LENGTH + 1}
                  numberOfLines={5}
                  textAlignVertical="top"
                  className="min-h-[132px] rounded-md border border-border bg-background px-3 py-3 text-base leading-6 text-text"
                />
                <View className="flex-row items-center justify-between">
                  {aboutError ? (
                    <Text accessibilityRole="alert" className="flex-1 text-xs text-error">
                      {aboutError}
                    </Text>
                  ) : (
                    <View className="flex-1" />
                  )}
                  <Text
                    accessibilityLabel={`${aboutDraft.length} of ${MAX_PROFESSIONAL_SUMMARY_LENGTH} characters`}
                    className="text-xs text-muted">
                    {aboutDraft.length}/{MAX_PROFESSIONAL_SUMMARY_LENGTH}
                  </Text>
                </View>
                <View className="flex-row gap-3">
                  <Button title="Save About" onPress={saveAbout} />
                  <Button title="Cancel" variant="secondary" onPress={cancelAbout} />
                </View>
              </View>
            ) : profile.professionalSummary ? (
              <Text className="text-sm leading-5 text-muted">{profile.professionalSummary}</Text>
            ) : (
              <View className="gap-2 rounded-md bg-backgroundElement p-4">
                <Text className="text-sm font-semibold text-text">Tell employers a little about yourself</Text>
                <Text className="text-sm leading-5 text-muted">
                  Add a short introduction to highlight what you bring to your next opportunity.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add About summary"
                  onPress={startEditingAbout}
                  className="min-h-11 flex-row items-center justify-center rounded-md bg-primary px-4 py-2 active:opacity-80">
                  <Text className="text-sm font-semibold text-white">Add About</Text>
                </Pressable>
              </View>
            )}
          </Card>

          <Card className="gap-3">
            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-lg font-bold text-text">Desired Jobs</Text>
                <Text className="text-xs leading-5 text-muted">
                  Your preferences, separate from applications and accepted gigs.
                </Text>
              </View>
              {!isEditingDesiredJobs && profile.desiredJobs?.length ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit desired jobs"
                  onPress={startEditingDesiredJobs}
                  className="min-h-11 justify-center rounded-md bg-secondary px-3 active:opacity-80">
                  <Text className="text-sm font-semibold text-primary">Edit</Text>
                </Pressable>
              ) : null}
            </View>

            {isEditingDesiredJobs ? (
              <View className="gap-4">
                {desiredJobDrafts.length === 0 ? (
                  <View className="gap-1 rounded-md bg-backgroundElement p-4">
                    <Text className="text-sm font-semibold text-text">Add roles you would like to work in</Text>
                    <Text className="text-sm leading-5 text-muted">
                      Select a category from the roles currently used by QuickHire gigs.
                    </Text>
                  </View>
                ) : null}

                {desiredJobDrafts.map((draft, index) => {
                  const category = expertiseCategories.find((item) => item.id === draft.categoryId);
                  const rowErrors = desiredJobErrors[index] ?? {};

                  return (
                    <View key={`desired-job-${index}`} className="gap-3 rounded-md border border-border p-4">
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="text-sm font-semibold text-text">Job preference {index + 1}</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove job preference ${index + 1}`}
                          onPress={() => removeDesiredJob(index)}
                          className="min-h-11 justify-center px-2 active:opacity-80">
                          <Text className="text-sm font-semibold text-error">Remove</Text>
                        </Pressable>
                      </View>

                      <View className="gap-2">
                        <Text className="text-sm font-semibold text-text">Role</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Choose role for preference ${index + 1}`}
                          accessibilityState={{ expanded: categoryPickerIndex === index }}
                          onPress={() =>
                            setCategoryPickerIndex((current) => (current === index ? null : index))
                          }
                          className="min-h-11 justify-center rounded-md border border-border bg-background px-3 py-2">
                          <Text className={`text-sm ${category ? 'font-semibold text-text' : 'text-muted'}`}>
                            {category?.label ?? 'Choose a job role'}
                          </Text>
                        </Pressable>
                        {categoryPickerIndex === index ? (
                          <View className="flex-row flex-wrap gap-2">
                            {expertiseCategories.map((option) => (
                              <Pressable
                                key={option.id}
                                accessibilityRole="button"
                                accessibilityState={{ selected: draft.categoryId === option.id }}
                                onPress={() => {
                                  updateDesiredJob(index, { categoryId: option.id });
                                  setCategoryPickerIndex(null);
                                }}
                                className={`min-h-10 justify-center rounded-md border px-3 py-2 ${
                                  draft.categoryId === option.id
                                    ? 'border-primary bg-secondary'
                                    : 'border-border bg-surface'
                                }`}>
                                <Text
                                  className={`text-xs font-semibold ${
                                    draft.categoryId === option.id ? 'text-primary' : 'text-text'
                                  }`}>
                                  {option.label}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                        {rowErrors.categoryId ? (
                          <Text accessibilityRole="alert" className="text-xs text-error">
                            {rowErrors.categoryId}
                          </Text>
                        ) : null}
                      </View>

                      <View className="gap-2">
                        <Text className="text-sm font-semibold text-text">Schedule preference</Text>
                        <View className="flex-row flex-wrap gap-2">
                          {DESIRED_JOB_SCHEDULE_OPTIONS.map((option) => (
                            <Pressable
                              key={option.label}
                              accessibilityRole="button"
                              accessibilityState={{ selected: draft.gigType === option.value }}
                              onPress={() => updateDesiredJob(index, { gigType: option.value })}
                              className={`min-h-10 justify-center rounded-md border px-3 py-2 ${
                                draft.gigType === option.value
                                  ? 'border-primary bg-secondary'
                                  : 'border-border bg-surface'
                              }`}>
                              <Text
                                className={`text-xs font-semibold ${
                                  draft.gigType === option.value ? 'text-primary' : 'text-text'
                                }`}>
                                {option.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        {rowErrors.gigType ? (
                          <Text accessibilityRole="alert" className="text-xs text-error">
                            {rowErrors.gigType}
                          </Text>
                        ) : null}
                      </View>

                      <View className="gap-2">
                        <Text className="text-sm font-semibold text-text">Location (optional)</Text>
                        <TextInput
                          value={draft.location}
                          onChangeText={(value) => updateDesiredJob(index, { location: value })}
                          accessibilityLabel={`Location for preference ${index + 1}`}
                          placeholder="City or area"
                          maxLength={DESIRED_JOB_LOCATION_MAX_LENGTH + 1}
                          className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
                        />
                        <View className="flex-row items-center justify-between">
                          {rowErrors.location || rowErrors.duplicate ? (
                            <Text accessibilityRole="alert" className="flex-1 text-xs text-error">
                              {rowErrors.location ?? rowErrors.duplicate}
                            </Text>
                          ) : (
                            <View className="flex-1" />
                          )}
                          <Text
                            accessibilityLabel={`${draft.location.length} of ${DESIRED_JOB_LOCATION_MAX_LENGTH} location characters`}
                            className="text-xs text-muted">
                            {draft.location.length}/{DESIRED_JOB_LOCATION_MAX_LENGTH}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                <Button title="Add another role" variant="secondary" onPress={addDesiredJob} />
                <View className="flex-row gap-3">
                  <Button title="Save desired jobs" onPress={saveDesiredJobs} />
                  <Button title="Cancel" variant="secondary" onPress={cancelDesiredJobs} />
                </View>
              </View>
            ) : profile.desiredJobs?.length ? (
              <View className="gap-3">
                {profile.desiredJobs.map((preference, index) => {
                  const category = expertiseCategories.find((item) => item.id === preference.categoryId);
                  return (
                    <View key={`${preference.categoryId}-${preference.gigType ?? 'any'}-${preference.location ?? 'any'}-${index}`} className="gap-1 rounded-md bg-backgroundElement p-4">
                      <Text className="text-sm font-semibold text-text">
                        {category?.label ?? 'Unrecognized role'}
                      </Text>
                      <Text className="text-sm leading-5 text-muted">
                        {[getScheduleLabel(preference.gigType), preference.location].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="gap-2 rounded-md bg-backgroundElement p-4">
                <Text className="text-sm font-semibold text-text">What kind of work are you looking for?</Text>
                <Text className="text-sm leading-5 text-muted">
                  Add roles, schedules, or locations that interest you. These preferences do not represent applications or commitments.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add desired job"
                  onPress={startEditingDesiredJobs}
                  className="min-h-11 flex-row items-center justify-center rounded-md bg-primary px-4 py-2 active:opacity-80">
                  <Text className="text-sm font-semibold text-white">Add desired job</Text>
                </Pressable>
              </View>
            )}
          </Card>

          <View className="gap-3">
            <Card className="gap-3">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-lg font-bold text-text">Work Experience</Text>
                {!experienceDraft ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add work experience"
                    onPress={startAddingExperience}
                    className="min-h-11 justify-center rounded-md bg-secondary px-3 active:opacity-80">
                    <Text className="text-sm font-semibold text-primary">Add</Text>
                  </Pressable>
                ) : null}
              </View>

              {experienceDraft ? (
                <View className="gap-4 rounded-md border border-border p-4">
                  <Text className="text-base font-semibold text-text">
                    {isAddingExperience ? 'Add work experience' : 'Edit work experience'}
                  </Text>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-text">Job title</Text>
                    <TextInput
                      value={experienceDraft.jobTitle}
                      onChangeText={(value) => updateExperienceDraft({ jobTitle: value })}
                      accessibilityLabel="Job title"
                      placeholder="e.g. Customer Support Intern"
                      maxLength={120}
                      className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
                    />
                    {experienceErrors.jobTitle ? (
                      <Text accessibilityRole="alert" className="text-xs text-error">
                        {experienceErrors.jobTitle}
                      </Text>
                    ) : null}
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-text">Company name</Text>
                    <TextInput
                      value={experienceDraft.companyName}
                      onChangeText={(value) => updateExperienceDraft({ companyName: value })}
                      accessibilityLabel="Company name"
                      placeholder="Company or organization"
                      maxLength={120}
                      className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
                    />
                    {experienceErrors.companyName ? (
                      <Text accessibilityRole="alert" className="text-xs text-error">
                        {experienceErrors.companyName}
                      </Text>
                    ) : null}
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-text">Start date</Text>
                    <TextInput
                      value={experienceDraft.startDate}
                      onChangeText={(value) => updateExperienceDraft({ startDate: value })}
                      accessibilityLabel="Start date"
                      placeholder="YYYY-MM"
                      keyboardType="numbers-and-punctuation"
                      maxLength={7}
                      className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
                    />
                    {experienceErrors.startDate ? (
                      <Text accessibilityRole="alert" className="text-xs text-error">
                        {experienceErrors.startDate}
                      </Text>
                    ) : null}
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-text">End date</Text>
                    {!experienceDraft.isCurrent ? (
                      <>
                        <TextInput
                          value={experienceDraft.endDate ?? ''}
                          onChangeText={(value) => updateExperienceDraft({ endDate: value })}
                          accessibilityLabel="End date"
                          placeholder="YYYY-MM"
                          keyboardType="numbers-and-punctuation"
                          maxLength={7}
                          className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
                        />
                        {experienceErrors.endDate ? (
                          <Text accessibilityRole="alert" className="text-xs text-error">
                            {experienceErrors.endDate}
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text className="text-sm text-muted">Present</Text>
                    )}
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel="I currently work here"
                      accessibilityState={{ checked: experienceDraft.isCurrent }}
                      onPress={() =>
                        updateExperienceDraft({
                          isCurrent: !experienceDraft.isCurrent,
                          ...(!experienceDraft.isCurrent ? { endDate: '' } : {}),
                        })
                      }
                      className="min-h-11 flex-row items-center gap-2 py-1">
                      <View
                        className={`h-5 w-5 items-center justify-center rounded border ${
                          experienceDraft.isCurrent ? 'border-primary bg-primary' : 'border-border bg-background'
                        }`}>
                        {experienceDraft.isCurrent ? <Text className="text-xs font-bold text-white">✓</Text> : null}
                      </View>
                      <Text className="text-sm text-text">I currently work here</Text>
                    </Pressable>
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-text">Description (optional)</Text>
                    <TextInput
                      value={experienceDraft.description}
                      onChangeText={(value) => updateExperienceDraft({ description: value })}
                      accessibilityLabel="Work experience description"
                      placeholder="Describe your responsibilities and accomplishments."
                      multiline
                      maxLength={WORK_EXPERIENCE_DESCRIPTION_MAX_LENGTH + 1}
                      numberOfLines={4}
                      textAlignVertical="top"
                      className="min-h-[112px] rounded-md border border-border bg-background px-3 py-3 text-base leading-6 text-text"
                    />
                    <View className="flex-row items-center justify-between">
                      {experienceErrors.description ? (
                        <Text accessibilityRole="alert" className="flex-1 text-xs text-error">
                          {experienceErrors.description}
                        </Text>
                      ) : (
                        <View className="flex-1" />
                      )}
                      <Text
                        accessibilityLabel={`${experienceDraft.description.length} of ${WORK_EXPERIENCE_DESCRIPTION_MAX_LENGTH} description characters`}
                        className="text-xs text-muted">
                        {experienceDraft.description.length}/{WORK_EXPERIENCE_DESCRIPTION_MAX_LENGTH}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <Button title="Save experience" onPress={saveExperience} />
                    <Button title="Cancel" variant="secondary" onPress={cancelExperience} />
                  </View>
                </View>
              ) : null}

              {sortedWorkExperience.length ? (
                <View className="gap-3">
                  {sortedWorkExperience.map((entry) => (
                    <View key={entry.id} className="gap-3 rounded-md border border-border p-4">
                      <View className="gap-1">
                        <Text className="text-base font-bold text-text">{entry.jobTitle}</Text>
                        <Text className="text-sm font-medium text-primary">{entry.companyName}</Text>
                        <Text className="text-xs text-muted">
                          {formatWorkExperienceDate(entry.startDate)} –{' '}
                          {entry.isCurrent ? 'Present' : formatWorkExperienceDate(entry.endDate ?? entry.startDate)}
                        </Text>
                      </View>
                      {entry.description ? (
                        <Text className="text-sm leading-5 text-muted">{entry.description}</Text>
                      ) : null}
                      {confirmDeleteExperienceId === entry.id ? (
                        <View className="gap-3 rounded-md bg-backgroundElement p-3">
                          <Text className="text-sm text-text">
                            Delete this work experience entry? This cannot be undone.
                          </Text>
                          <View className="flex-row gap-3">
                            <Button
                              title="Keep entry"
                              variant="secondary"
                              onPress={() => setConfirmDeleteExperienceId(null)}
                            />
                            <Button
                              title="Delete entry"
                              onPress={() => confirmDeleteExperience(entry.id)}
                            />
                          </View>
                        </View>
                      ) : (
                        <View className="flex-row gap-3">
                          <Button
                            title="Edit"
                            variant="secondary"
                            accessibilityLabel={`Edit ${entry.jobTitle} at ${entry.companyName}`}
                            onPress={() => startEditingExperience(entry.id)}
                          />
                          <Button
                            title="Delete"
                            variant="secondary"
                            accessibilityLabel={`Delete ${entry.jobTitle} at ${entry.companyName}`}
                            onPress={() => setConfirmDeleteExperienceId(entry.id)}
                          />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : !experienceDraft ? (
                <View className="gap-2 rounded-md bg-backgroundElement p-4">
                  <Text className="text-sm font-semibold text-text">Build your work history</Text>
                  <Text className="text-sm leading-5 text-muted">
                    Add paid work, internships, or part-time roles to show employers what you have done.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add your first work experience"
                    onPress={startAddingExperience}
                    className="min-h-11 flex-row items-center justify-center rounded-md bg-primary px-4 py-2 active:opacity-80">
                    <Text className="text-sm font-semibold text-white">Add work experience</Text>
                  </Pressable>
                </View>
              ) : null}
            </Card>
            <Card className="min-w-0 flex-1 gap-3">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-lg font-bold text-text">Education</Text>
                {!educationDraft ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add education"
                    onPress={startAddingEducation}
                    className="min-h-11 justify-center rounded-md bg-secondary px-3 active:opacity-80">
                    <Text className="text-sm font-semibold text-primary">Add</Text>
                  </Pressable>
                ) : null}
              </View>

              {educationDraft ? (
                <View className="gap-4 rounded-md border border-border p-4">
                  <Text className="text-base font-semibold text-text">
                    {isAddingEducation ? 'Add education' : 'Edit education'}
                  </Text>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-text">Institution</Text>
                    <TextInput
                      value={educationDraft.institution}
                      onChangeText={(value) => updateEducationDraft({ institution: value })}
                      accessibilityLabel="Institution"
                      placeholder="School, college, or university"
                      maxLength={160}
                      className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
                    />
                    {educationErrors.institution ? (
                      <Text accessibilityRole="alert" className="text-xs text-error">
                        {educationErrors.institution}
                      </Text>
                    ) : null}
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-text">Degree or qualification</Text>
                    <TextInput
                      value={educationDraft.qualification}
                      onChangeText={(value) => updateEducationDraft({ qualification: value })}
                      accessibilityLabel="Degree or qualification"
                      placeholder="Degree, diploma, or qualification"
                      maxLength={160}
                      className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
                    />
                    {educationErrors.qualification ? (
                      <Text accessibilityRole="alert" className="text-xs text-error">
                        {educationErrors.qualification}
                      </Text>
                    ) : null}
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-text">Field of study (optional)</Text>
                    <TextInput
                      value={educationDraft.fieldOfStudy}
                      onChangeText={(value) => updateEducationDraft({ fieldOfStudy: value })}
                      accessibilityLabel="Field of study"
                      placeholder="e.g. Hospitality"
                      maxLength={160}
                      className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
                    />
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-text">Start date</Text>
                    <TextInput
                      value={educationDraft.startDate}
                      onChangeText={(value) => updateEducationDraft({ startDate: value })}
                      accessibilityLabel="Education start date"
                      placeholder="YYYY-MM"
                      keyboardType="numbers-and-punctuation"
                      maxLength={7}
                      className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
                    />
                    {educationErrors.startDate ? (
                      <Text accessibilityRole="alert" className="text-xs text-error">
                        {educationErrors.startDate}
                      </Text>
                    ) : null}
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-text">End date</Text>
                    {!educationDraft.isCurrent ? (
                      <>
                        <TextInput
                          value={educationDraft.endDate}
                          onChangeText={(value) => updateEducationDraft({ endDate: value })}
                          accessibilityLabel="Education end date"
                          placeholder="YYYY-MM"
                          keyboardType="numbers-and-punctuation"
                          maxLength={7}
                          className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
                        />
                        {educationErrors.endDate ? (
                          <Text accessibilityRole="alert" className="text-xs text-error">
                            {educationErrors.endDate}
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text className="text-sm text-muted">Present</Text>
                    )}
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel="I currently study here"
                      accessibilityState={{ checked: educationDraft.isCurrent }}
                      onPress={() =>
                        updateEducationDraft({
                          isCurrent: !educationDraft.isCurrent,
                          ...(!educationDraft.isCurrent ? { endDate: '' } : {}),
                        })
                      }
                      className="min-h-11 flex-row items-center gap-2 py-1">
                      <View
                        className={`h-5 w-5 items-center justify-center rounded border ${
                          educationDraft.isCurrent ? 'border-primary bg-primary' : 'border-border bg-background'
                        }`}>
                        {educationDraft.isCurrent ? <Text className="text-xs font-bold text-white">✓</Text> : null}
                      </View>
                      <Text className="text-sm text-text">I currently study here</Text>
                    </Pressable>
                  </View>

                  <View className="flex-row gap-3">
                    <Button title="Save education" onPress={saveEducationEntry} />
                    <Button title="Cancel" variant="secondary" onPress={cancelEducation} />
                  </View>
                </View>
              ) : null}

              {sortedEducation.length ? (
                <View className="gap-3">
                  {sortedEducation.map((entry) => (
                    <View key={entry.id} className="gap-3 rounded-md border border-border p-4">
                      <View className="gap-1">
                        <Text className="text-base font-bold text-text">{entry.qualification}</Text>
                        <Text className="text-sm font-medium text-primary">{entry.institution}</Text>
                        {entry.fieldOfStudy ? (
                          <Text className="text-sm text-muted">{entry.fieldOfStudy}</Text>
                        ) : null}
                        <Text className="text-xs text-muted">
                          {formatEducationDate(entry.startDate)} –{' '}
                          {entry.isCurrent
                            ? 'Present'
                            : formatEducationDate(entry.endDate ?? entry.startDate)}
                        </Text>
                      </View>
                      {confirmDeleteEducationId === entry.id ? (
                        <View className="gap-3 rounded-md bg-backgroundElement p-3">
                          <Text className="text-sm text-text">
                            Delete this education entry? This cannot be undone.
                          </Text>
                          <View className="flex-row gap-3">
                            <Button
                              title="Keep entry"
                              variant="secondary"
                              onPress={() => setConfirmDeleteEducationId(null)}
                            />
                            <Button
                              title="Delete entry"
                              onPress={() => confirmDeleteEducation(entry.id)}
                            />
                          </View>
                        </View>
                      ) : (
                        <View className="flex-row gap-3">
                          <Button
                            title="Edit"
                            variant="secondary"
                            accessibilityLabel={`Edit ${entry.qualification} at ${entry.institution}`}
                            onPress={() => startEditingEducation(entry.id)}
                          />
                          <Button
                            title="Delete"
                            variant="secondary"
                            accessibilityLabel={`Delete ${entry.qualification} at ${entry.institution}`}
                            onPress={() => setConfirmDeleteEducationId(entry.id)}
                          />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : !educationDraft ? (
                <View className="gap-2 rounded-md bg-backgroundElement p-4">
                  <Text className="text-sm font-semibold text-text">Add your education</Text>
                  <Text className="text-sm leading-5 text-muted">
                    Include a school or qualification to give employers more context about your background.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add your first education entry"
                    onPress={startAddingEducation}
                    className="min-h-11 flex-row items-center justify-center rounded-md bg-primary px-4 py-2 active:opacity-80">
                    <Text className="text-sm font-semibold text-white">Add education</Text>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          </View>

          <Card className="gap-4">
            <View className="gap-1">
              <Text className="text-lg font-bold text-text">Skills</Text>
              <Text className="text-sm leading-5 text-muted">
                Highlight the abilities you want employers to notice. Add as many as you need.
              </Text>
            </View>

            {isSkillsLoading ? (
              <Text className="text-sm text-muted">Loading your saved skills…</Text>
            ) : skillsLoadError ? (
              <View className="gap-2">
                <Text accessibilityRole="alert" className="text-sm leading-5 text-error">
                  {skillsLoadError}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading saved skills"
                  onPress={() => void reloadSkills()}
                  className="self-start rounded-md bg-secondary px-3 py-2 active:opacity-80">
                  <Text className="text-sm font-semibold text-primary">Retry loading skills</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View className="flex-row gap-2">
                  <TextInput
                    accessibilityLabel="New skill"
                    value={skillDraft}
                    onChangeText={(value) => {
                      setSkillDraft(value);
                      setSkillError(null);
                    }}
                    onSubmitEditing={() => void addSkill()}
                    returnKeyType="done"
                    placeholder="e.g. Excel, event setup, first aid"
                    placeholderTextColor="#718096"
                    editable={!isSkillsSaving}
                    className="min-h-12 min-w-0 flex-1 rounded-md border border-border bg-backgroundElement px-3 text-sm text-text"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add skill"
                    accessibilityState={{ disabled: isSkillsSaving }}
                    disabled={isSkillsSaving}
                    onPress={() => void addSkill()}
                    className="min-h-12 items-center justify-center rounded-md bg-primary px-4 active:opacity-80 disabled:opacity-50">
                    <Text className="text-sm font-semibold text-white">
                      {isSkillsSaving ? 'Saving…' : 'Add'}
                    </Text>
                  </Pressable>
                </View>
                {skillError ? (
                  <Text accessibilityRole="alert" className="text-sm text-error">
                    {skillError}
                  </Text>
                ) : null}
                {skillsSaveError ? (
                  <Text accessibilityRole="alert" className="text-sm leading-5 text-error">
                    {skillsSaveError}
                  </Text>
                ) : null}

                {profile.skills.length ? (
                  <View className="flex-row flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <View
                        key={skill.toLowerCase()}
                        className="flex-row items-center gap-2 rounded-full border border-border bg-secondary px-3 py-2">
                        <Text className="text-sm font-semibold text-primary">{skill}</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${skill}`}
                          accessibilityState={{ disabled: isSkillsSaving }}
                          disabled={isSkillsSaving}
                          onPress={() => void removeSkill(skill)}
                          className="min-h-6 min-w-6 items-center justify-center rounded-full active:bg-surface disabled:opacity-50">
                          <Text className="text-base font-bold leading-5 text-primary">×</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="gap-1 rounded-md border border-dashed border-border bg-backgroundElement p-4">
                    <Text className="text-sm font-semibold text-text">Your skills will show up here</Text>
                    <Text className="text-sm leading-5 text-muted">
                      Add a skill to give employers a clearer picture of what you can do.
                    </Text>
                  </View>
                )}

                {suggestedSkills.length ? (
                  <View className="gap-2">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Suggested from expertise categories
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {suggestedSkills.map((category) => (
                        <Pressable
                          key={category.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${category.label}`}
                          accessibilityState={{ disabled: isSkillsSaving }}
                          disabled={isSkillsSaving}
                          onPress={() => void addSkill(category.label)}
                          className="rounded-full border border-border bg-surface px-3 py-2 active:bg-backgroundElement disabled:opacity-50">
                          <Text className="text-xs font-medium text-muted">+ {category.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </Card>

          <Card className="gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-md bg-secondary">
                <SymbolView
                  name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
                  tintColor="#173B4A"
                  size={18}
                />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-base font-bold text-text">Resume file</Text>
                <Text className="text-sm text-muted">
                  {profile.resume ? profile.resume.fileName : 'No file attached'}
                </Text>
              </View>
            </View>
            {profile.resume ? (
              <>
                <StatusBadge label="Resume ready" tone="success" />
                <Text className="text-xs text-muted">
                  {profile.resume.mimeType ?? 'Document'}
                  {profile.resume.fileSize ? ` • ${(profile.resume.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                </Text>
                {isConfirmingResumeRemoval ? (
                  <View className="gap-3 rounded-md bg-backgroundElement p-3">
                    <Text className="text-sm text-text">
                      Remove resume? This will clear the selected resume from the mock applicant profile.
                    </Text>
                    <View className="flex-row gap-3">
                      <Button
                        title="Cancel"
                        variant="secondary"
                        onPress={() => setIsConfirmingResumeRemoval(false)}
                      />
                      <Button title="Remove resume" onPress={confirmRemoveResume} />
                    </View>
                  </View>
                ) : (
                  <View className="flex-row gap-3">
                    <Button title="Replace" onPress={handleSelectResume} />
                    <Button title="Remove" variant="secondary" onPress={handleRemove} />
                  </View>
                )}
              </>
            ) : (
              <>
                <StatusBadge label="No resume" tone="neutral" />
                <Text className="text-sm leading-5 text-muted">
                  Add a PDF or DOCX file. The file reference is kept in app memory only; it is not uploaded.
                </Text>
                <Button title="Upload resume" onPress={handleSelectResume} />
              </>
            )}

            {error ? <Text className="text-xs text-error">{error}</Text> : null}
          </Card>

          <Text className="text-xs leading-5 text-muted">
            Profile details, experience, education, and resume file are held in app memory only. Skills are saved on this device.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
