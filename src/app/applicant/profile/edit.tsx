import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenContainer } from '@/components/ui/screen-container';
import { SectionHeader } from '@/components/ui/section-header';
import { useApplicantProfile } from '@/features/profile/profile-context';
import { normalizeText, validateApplicantProfile } from '@/features/profile/validation';
import type { ApplicantProfile, ApplicantProfileErrors } from '@/features/profile/types';

type PersonalInformationDraft = Pick<
  ApplicantProfile,
  'fullName' | 'email' | 'phoneNumber' | 'birthdate' | 'location'
> & {
  phoneNumber: string;
  birthdate: string;
  location: string;
};

export default function EditProfileScreen() {
  const { profile, updateProfile } = useApplicantProfile();
  const [draft, setDraft] = useState<PersonalInformationDraft>(() => ({
    fullName: profile.fullName,
    email: profile.email,
    phoneNumber: profile.phoneNumber ?? '',
    birthdate: profile.birthdate ?? '',
    location: profile.location ?? '',
  }));
  const [errors, setErrors] = useState<ApplicantProfileErrors>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const updateField = (field: keyof PersonalInformationDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleSave = () => {
    const personalInformation = {
      fullName: normalizeText(draft.fullName),
      email: normalizeText(draft.email),
      phoneNumber: normalizeText(draft.phoneNumber) || undefined,
      birthdate: normalizeText(draft.birthdate) || undefined,
      location: normalizeText(draft.location) || undefined,
    };

    const validation = validateApplicantProfile({
      ...profile,
      ...personalInformation,
      professionalSummary: '',
    });
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    updateProfile((current) => ({ ...current, ...personalInformation }));
    router.replace('/applicant/profile/resume');
  };

  const handleCancel = () => {
    const hasChanges =
      normalizeText(draft.fullName) !== profile.fullName ||
      normalizeText(draft.email) !== profile.email ||
      normalizeText(draft.phoneNumber) !== normalizeText(profile.phoneNumber) ||
      normalizeText(draft.birthdate) !== normalizeText(profile.birthdate) ||
      normalizeText(draft.location) !== normalizeText(profile.location);

    if (hasChanges) {
      setConfirmDiscard(true);
      return;
    }

    router.replace('/applicant/profile/resume');
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="mx-auto w-full max-w-lg gap-6 px-5 pb-8 pt-6">
          <SectionHeader
            title="Personal information"
            description="Update the contact details shown on your Online Resume. Changes are held in app memory for this session only."
          />

          <Card className="gap-5">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-text">Full name</Text>
              <TextInput
                value={draft.fullName}
                onChangeText={(value) => updateField('fullName', value)}
                placeholder="Full name"
                autoCapitalize="words"
                accessibilityLabel="Full name"
                className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
              />
              {errors.fullName ? <Text className="text-xs text-error">{errors.fullName}</Text> : null}
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-text">Email</Text>
              <TextInput
                value={draft.email}
                onChangeText={(value) => updateField('email', value)}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Email"
                className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
              />
              {errors.email ? <Text className="text-xs text-error">{errors.email}</Text> : null}
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-text">Phone number</Text>
              <TextInput
                value={draft.phoneNumber ?? ''}
                onChangeText={(value) => updateField('phoneNumber', value)}
                placeholder="Optional"
                keyboardType="phone-pad"
                accessibilityLabel="Phone number"
                className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
              />
              {errors.phoneNumber ? <Text className="text-xs text-error">{errors.phoneNumber}</Text> : null}
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-text">Date of birth</Text>
              <TextInput
                value={draft.birthdate}
                onChangeText={(value) => updateField('birthdate', value)}
                placeholder="YYYY-MM-DD (optional)"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                accessibilityLabel="Date of birth"
                className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
              />
              {errors.birthdate ? <Text className="text-xs text-error">{errors.birthdate}</Text> : null}
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-text">Location</Text>
              <TextInput
                value={draft.location ?? ''}
                onChangeText={(value) => updateField('location', value)}
                placeholder="Optional"
                accessibilityLabel="Location"
                className="rounded-md border border-border bg-background px-3 py-3 text-base text-text"
              />
              {errors.location ? <Text className="text-xs text-error">{errors.location}</Text> : null}
            </View>

            <View className="flex-row gap-3">
              <Button title="Save" onPress={handleSave} />
              <Button title="Cancel" variant="secondary" onPress={handleCancel} />
            </View>
          </Card>
          {confirmDiscard ? (
            <Card className="gap-3">
              <Text className="text-sm font-semibold text-text">Discard unsaved changes?</Text>
              <Text className="text-sm leading-5 text-muted">Your edits will be lost.</Text>
              <View className="flex-row gap-3">
                <Button title="Keep editing" variant="secondary" onPress={() => setConfirmDiscard(false)} />
                <Button title="Discard changes" onPress={() => router.replace('/applicant/profile/resume')} />
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
