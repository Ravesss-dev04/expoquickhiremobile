import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ScreenContainer } from '@/components/ui/screen-container';
import { expertiseCategories } from '@/features/expertise/constants';
import { useGigs } from '@/features/gigs/gigs-context';
import { useLocalization } from '@/features/localization/language-context';
import type { TranslationKey } from '@/features/localization/translations';
import { useApplicantProfile } from '@/features/profile/profile-context';
import { getProfileCompletion, type ProfileCompletionSection } from '@/features/profile/validation';

const sectionTranslationKeys: Record<
  ProfileCompletionSection['id'],
  { title: TranslationKey; action: TranslationKey }
> = {
  personalDetails: { title: 'profile.personalDetails', action: 'profile.addDetails' },
  professionalSummary: { title: 'profile.professionalSummary', action: 'profile.viewAbout' },
  expertise: { title: 'profile.expertise', action: 'profile.addExpertise' },
  resume: { title: 'profile.resume', action: 'profile.addResumeAction' },
};

const expertiseTranslationKeys: Record<string, TranslationKey> = {
  'event-staff': 'expertise.eventStaff',
  'service-crew': 'expertise.serviceCrew',
  'sales-promoter': 'expertise.salesPromoter',
  'customer-service': 'expertise.customerService',
  'warehouse-assistant': 'expertise.warehouseAssistant',
  'delivery-support': 'expertise.deliverySupport',
  'administrative-assistant': 'expertise.administrativeAssistant',
  'retail-assistant': 'expertise.retailAssistant',
};

export default function ProfileScreen() {
  const { profile } = useApplicantProfile();
  const { savedGigIds, activeCommitmentCount } = useGigs();
  const { t } = useLocalization();
  const completion = getProfileCompletion(profile);
  const selectedExpertise = expertiseCategories.filter((category) => profile.expertiseIds.includes(category.id));
  const profileInitials = profile.fullName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  const headline = selectedExpertise
    .slice(0, 2)
    .map((category) => {
      const translationKey = expertiseTranslationKeys[category.id];
      return translationKey ? t(translationKey) : category.label;
    })
    .join(' · ');

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="mx-auto w-full max-w-lg gap-6 px-5 pb-8 pt-5">
          <View className="flex-row items-center justify-between">
            <View className="gap-1">
              <Text className="text-2xl font-bold text-text">{t('profile.title')}</Text>
              <Text className="text-sm text-muted">{t('profile.subtitle')}</Text>
            </View>
            <Link href="/applicant/settings" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('profile.openSettings')}
                className="h-12 w-12 items-center justify-center rounded-md border border-border bg-surface active:opacity-80">
                <SymbolView
                  name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
                  tintColor="#173B4A"
                  size={21}
                />
              </Pressable>
            </Link>
          </View>

          <Card className="gap-5 p-5">
            <View className="flex-row items-start gap-4">
              <View
                accessible
                accessibilityLabel={`Profile avatar for ${profile.fullName || 'applicant'}`}
                className="h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Text className="text-lg font-bold text-primary">{profileInitials || 'QH'}</Text>
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
                  <Text className="text-xl font-bold text-text">{profile.fullName || t('profile.yourName')}</Text>
                  {profile.verificationStatus === 'VERIFIED' ? (
                    <View className="flex-row items-center gap-1 rounded-full bg-secondary px-2 py-1">
                      <SymbolView
                        name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
                        tintColor="#1B7F52"
                        size={14}
                      />
                      <Text className="text-xs font-semibold text-success">{t('profile.verified')}</Text>
                    </View>
                  ) : null}
                </View>
                {headline ? <Text className="text-sm font-medium text-primary">{headline}</Text> : null}
                {profile.location ? <Text className="text-sm text-muted">{profile.location}</Text> : null}
              </View>
            </View>

            {profile.professionalSummary ? (
              <Text numberOfLines={2} className="text-sm leading-5 text-muted">
                {profile.professionalSummary}
              </Text>
            ) : (
              <Text className="text-sm leading-5 text-muted">
                Add a short introduction to help employers understand your strengths.
              </Text>
            )}

            <View className="gap-3 border-t border-border pt-4">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-sm font-semibold text-text">{t('profile.completion')}</Text>
                <Text className="text-sm font-bold text-primary">{completion.percentage}%</Text>
              </View>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={t('profile.completionAccessibility')}
                accessibilityValue={{ min: 0, max: 100, now: completion.percentage }}
                className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <View className="h-full rounded-full bg-accent" style={{ width: `${completion.percentage}%` }} />
              </View>
              <Text className="text-xs leading-4 text-muted">
                {t('profile.completionHint')}
              </Text>
            </View>

            <Link href="/applicant/profile/edit" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('profile.edit')}
                className="min-h-12 flex-row items-center justify-center rounded-md bg-primary px-4 active:opacity-80">
                <Text className="text-sm font-semibold text-white">{t('profile.edit')}</Text>
              </Pressable>
            </Link>
          </Card>

          <Card className="gap-3">
            <View className="gap-1">
              <Text className="text-base font-bold text-text">{t('profile.checklist')}</Text>
              <Text className="text-xs leading-5 text-muted">{t('profile.checklistDescription')}</Text>
            </View>
            <View className="gap-1">
              {completion.sections.map((section) => {
                const rowContent = (
                  <>
                    <View className="min-w-0 flex-1 gap-1">
                      <Text className="text-sm font-semibold text-text">
                        {t(sectionTranslationKeys[section.id].title)}
                      </Text>
                      <Text className="text-xs text-muted">
                        {t('profile.sectionProgress', {
                          percent: section.completionPercentage,
                          earned: section.earnedWeight,
                          weight: section.weight,
                        })}
                      </Text>
                    </View>
                    {section.complete ? (
                      <View className="flex-row items-center gap-1">
                        <SymbolView
                          name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                          tintColor="#1B7F52"
                          size={17}
                        />
                        <Text className="text-sm font-semibold text-success">{t('profile.complete')}</Text>
                      </View>
                    ) : (
                      <>
                        <Text className="text-sm font-semibold text-primary">
                          {t(sectionTranslationKeys[section.id].action)}
                        </Text>
                        <SymbolView
                          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                          tintColor="#53686C"
                          size={15}
                        />
                      </>
                    )}
                  </>
                );

                return section.complete ? (
                  <View key={section.id} className="min-h-14 flex-row items-center gap-3 border-t border-border py-2">
                    {rowContent}
                  </View>
                ) : (
                  <Link key={section.id} href={section.href} asChild>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${t(sectionTranslationKeys[section.id].action)}: ${t(sectionTranslationKeys[section.id].title)}, ${t('profile.sectionProgress', {
                        percent: section.completionPercentage,
                        earned: section.earnedWeight,
                        weight: section.weight,
                      })}`}
                      className="min-h-14 flex-row items-center gap-3 border-t border-border py-2 active:opacity-80">
                      {rowContent}
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          </Card>

          <View className="gap-3">
            <View className="gap-1">
              <Text className="text-lg font-bold text-text">{t('profile.activity')}</Text>
              <Text className="text-sm text-muted">{t('profile.activityDescription')}</Text>
            </View>
            <View className="flex-row gap-3">
              <Link href="/applicant/find-gigs" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    savedGigIds.length === 1 ? 'profile.savedGigOne' : 'profile.savedGigsMany',
                    { count: savedGigIds.length },
                  )}
                  className="min-h-36 flex-1 justify-between gap-4 rounded-md border border-border bg-surface p-4 active:opacity-80">
                  <View className="h-10 w-10 items-center justify-center rounded-md bg-secondary">
                    <SymbolView
                      name={{ ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }}
                      tintColor="#173B4A"
                      size={18}
                    />
                  </View>
                  <View className="gap-1">
                    <Text className="text-2xl font-bold text-text">{savedGigIds.length}</Text>
                    <Text className="text-sm font-semibold text-text">{t('profile.savedGigs')}</Text>
                    <Text className="text-xs text-muted">
                      {savedGigIds.length ? t('profile.browseSaved') : t('profile.bookmarkedOpportunities')}
                    </Text>
                  </View>
                </Pressable>
              </Link>

              <Link href="/applicant/my-gigs" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    activeCommitmentCount === 1 ? 'profile.commitmentOne' : 'profile.commitmentsMany',
                    { count: activeCommitmentCount },
                  )}
                  className="min-h-36 flex-1 justify-between gap-4 rounded-md border border-border bg-surface p-4 active:opacity-80">
                  <View className="h-10 w-10 items-center justify-center rounded-md bg-secondary">
                    <SymbolView
                      name={{ ios: 'briefcase.fill', android: 'work', web: 'work' }}
                      tintColor="#173B4A"
                      size={18}
                    />
                  </View>
                  <View className="gap-1">
                    <Text className="text-2xl font-bold text-text">{activeCommitmentCount}</Text>
                    <Text className="text-sm font-semibold text-text">{t('profile.activeCommitments')}</Text>
                    <Text className="text-xs text-muted">
                      {activeCommitmentCount ? t('profile.ongoingCommitments') : t('profile.acceptedCommitments')}
                    </Text>
                  </View>
                </Pressable>
              </Link>
            </View>
          </View>

          <Link href="/applicant/profile/resume" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('profile.viewResumeAccessibility')}
              className="min-h-28 flex-row items-center gap-4 rounded-md border border-border bg-surface p-5 active:opacity-80">
              <View className="h-12 w-12 items-center justify-center rounded-md bg-secondary">
                <SymbolView
                  name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
                  tintColor="#173B4A"
                  size={21}
                />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-base font-bold text-text">{t('profile.onlineResume')}</Text>
                <Text className="text-sm leading-5 text-muted">
                  {profile.resume
                    ? t('profile.resumeReady', { fileName: profile.resume.fileName })
                    : t('profile.addResume')}
                </Text>
                <Text className="pt-1 text-sm font-semibold text-primary">{t('profile.viewEdit')}</Text>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                tintColor="#53686C"
                size={16}
              />
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
