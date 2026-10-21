import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenContainer } from '@/components/ui/screen-container';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { useApplicantProfile } from '@/features/profile/profile-context';
import { verificationStatusMeta, verificationSteps } from '@/features/verification/status';

export default function VerificationScreen() {
  const { profile, updateProfile } = useApplicantProfile();
  const statusMeta = verificationStatusMeta[profile.verificationStatus];

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="mx-auto w-full max-w-lg gap-6 px-5 pb-8 pt-6">
          <SectionHeader title="Verification" description="A mock identity review flow for a future background-check integration." />

          <Card>
            <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
            <Text className="text-base font-semibold text-text">{statusMeta.label}</Text>
            <Text className="text-sm leading-5 text-muted">{statusMeta.description}</Text>

            <View className="gap-3">
              {verificationSteps.map((step, index) => (
                <View key={step} className="flex-row items-center gap-3">
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-secondary">
                    <Text className="text-xs font-semibold text-primary">{index + 1}</Text>
                  </View>
                  <Text className="text-sm text-text">{step}</Text>
                </View>
              ))}
            </View>

            {profile.verificationStatus === 'NOT_STARTED' ? (
              <Button
                title="Start verification"
                onPress={() => updateProfile((current) => ({ ...current, verificationStatus: 'PENDING' }))}
              />
            ) : null}

            {profile.verificationStatus === 'PENDING' ? (
              <Text className="text-sm text-muted">
                Verification is awaiting review. This does not represent a real identity confirmation.
              </Text>
            ) : null}

            {profile.verificationStatus === 'REJECTED' ? (
              <Button
                title="Retry verification"
                onPress={() => updateProfile((current) => ({ ...current, verificationStatus: 'PENDING' }))}
              />
            ) : null}

            {profile.verificationStatus === 'VERIFIED' ? (
              <Text className="text-sm text-success">
                Your mock verification status is verified. A real provider will be introduced in a later phase.
              </Text>
            ) : null}

            <Button title="Back to profile" variant="secondary" onPress={() => router.back()} />
          </Card>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
