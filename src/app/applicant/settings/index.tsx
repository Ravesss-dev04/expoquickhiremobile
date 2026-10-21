import Constants from 'expo-constants';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ScreenContainer } from '@/components/ui/screen-container';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors } from '@/constants/theme';
import { useLocalization } from '@/features/localization/language-context';
import { LANGUAGE_OPTIONS, type TranslationKey } from '@/features/localization/translations';
import { useApplicantProfile } from '@/features/profile/profile-context';
import { useApplicantSettings } from '@/features/settings/settings-context';
import type { ApplicantPreferenceKey } from '@/features/settings/preferences';
import type { VerificationStatusKey } from '@/features/verification/status';

const notificationPreferences: {
  key: ApplicantPreferenceKey;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
}[] = [
  {
    key: 'gigUpdates',
    titleKey: 'settings.gigUpdates',
    descriptionKey: 'settings.gigUpdatesDescription',
  },
  {
    key: 'scheduleReminders',
    titleKey: 'settings.scheduleReminders',
    descriptionKey: 'settings.scheduleRemindersDescription',
  },
  {
    key: 'feedbackUpdates',
    titleKey: 'settings.feedbackUpdates',
    descriptionKey: 'settings.feedbackUpdatesDescription',
  },
];

const verificationLabelKeys: Record<VerificationStatusKey, TranslationKey> = {
  NOT_STARTED: 'settings.verificationNotStarted',
  PENDING: 'settings.verificationPending',
  VERIFIED: 'settings.verificationVerified',
  REJECTED: 'settings.verificationRejected',
};

export default function SettingsScreen() {
  const { profile } = useApplicantProfile();
  const { t, language, isLoading: isLanguageLoading, isSaving: isLanguageSaving,
    hasLoadError: hasLanguageLoadError, hasSaveError: hasLanguageSaveError,
    reloadLanguage, saveLanguage } = useLocalization();
  const {
    preferences,
    isLoading,
    isSaving,
    hasLoadError,
    hasSaveError,
    reloadPreferences,
    savePreference,
  } = useApplicantSettings();
  const version = Constants.expoConfig?.version;

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mx-auto w-full max-w-lg gap-6 px-5 pb-8 pt-6">
          <SectionHeader
            title={t('settings.title')}
            description={t('settings.description')}
          />

          <View className="gap-3">
            <SectionHeader
              title={t('settings.account')}
              description={t('settings.accountDescription')}
            />
            <Card className="gap-4">
              <View className="gap-3">
                <AccountDetail label={t('settings.name')} value={profile.fullName} />
                <AccountDetail
                  label={t('settings.email')}
                  value={profile.email || t('settings.notProvided')}
                  description={t('settings.contactOnly')}
                />
                <AccountDetail label={t('settings.phone')} value={profile.phoneNumber || t('settings.notProvided')} />
                <AccountDetail label={t('settings.location')} value={profile.location || t('settings.notProvided')} />
                <AccountDetail
                  label={t('settings.verification')}
                  value={t(verificationLabelKeys[profile.verificationStatus])}
                />
              </View>
              <View className="gap-2 border-t border-border pt-3">
                <ProfileLink href="/applicant/profile/edit" label={t('settings.editProfile')} />
                <ProfileLink href="/applicant/profile/expertise" label={t('settings.manageExpertise')} />
                <ProfileLink href="/applicant/profile/resume" label={t('settings.manageResume')} />
                <ProfileLink href="/applicant/profile/verification" label={t('settings.reviewVerification')} />
              </View>
            </Card>
          </View>

          <View className="gap-3">
            <SectionHeader
              title={t('settings.language')}
              description={t('settings.languageDescription')}
            />
            <Card className="gap-3">
              <Text className="text-sm font-semibold text-text">{t('settings.selectLanguage')}</Text>
              <View className="flex-row gap-3">
                {LANGUAGE_OPTIONS.map((option) => {
                  const selected = language === option.code;
                  const disabled = isLanguageLoading || isLanguageSaving || hasLanguageLoadError;
                  return (
                    <Pressable
                      key={option.code}
                      accessibilityRole="button"
                      accessibilityLabel={
                        selected
                          ? t('settings.languageSelected', { language: option.label })
                          : option.label
                      }
                      accessibilityState={{ selected, disabled }}
                      disabled={disabled}
                      onPress={() => void saveLanguage(option.code)}
                      className={`min-h-12 flex-1 items-center justify-center rounded-md border px-3 ${
                        selected ? 'border-primary bg-secondary' : 'border-border bg-surface'
                      } ${disabled ? 'opacity-60' : 'active:opacity-80'}`}>
                      <Text className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-text'}`}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {isLanguageLoading ? (
                <Text className="text-xs text-muted">{t('settings.languageLoading')}</Text>
              ) : null}
              {hasLanguageLoadError ? (
                <View className="gap-2">
                  <Text accessibilityRole="alert" className="text-sm leading-5 text-error">
                    {t('settings.languageLoadError')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.retryLanguage')}
                    onPress={() => void reloadLanguage()}
                    className="min-h-11 justify-center">
                    <Text className="text-sm font-semibold text-primary">{t('settings.retryLanguage')}</Text>
                  </Pressable>
                </View>
              ) : null}
              {isLanguageSaving ? (
                <Text className="text-xs text-muted">{t('settings.languageSaving')}</Text>
              ) : null}
              {hasLanguageSaveError ? (
                <Text accessibilityRole="alert" className="text-sm leading-5 text-error">
                  {t('settings.languageSaveError')}
                </Text>
              ) : null}
            </Card>
          </View>

          <View className="gap-3">
            <SectionHeader
              title={t('settings.notifications')}
              description={t('settings.notificationsDescription')}
            />
            <Card className="gap-0">
              {isLoading ? (
                <View className="min-h-14 flex-row items-center gap-3 py-2">
                  <ActivityIndicator color={Colors.light.primary} />
                  <Text className="flex-1 text-sm text-muted">{t('settings.preferencesLoading')}</Text>
                </View>
              ) : null}
              {hasLoadError ? (
                <View className="gap-3 py-2">
                  <Text accessibilityRole="alert" className="text-sm leading-5 text-error">
                    {t('settings.preferencesLoadError')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.retryPreferences')}
                    onPress={() => void reloadPreferences()}
                    className="min-h-11 justify-center">
                    <Text className="text-sm font-semibold text-primary">{t('settings.retryPreferences')}</Text>
                  </Pressable>
                </View>
              ) : null}
              {!isLoading && !hasLoadError
                ? notificationPreferences.map((item, index) => (
                    <View
                      key={item.key}
                      className={`min-h-16 flex-row items-center gap-3 py-3 ${
                        index < notificationPreferences.length - 1 ? 'border-b border-border' : ''
                      }`}>
                      <View className="flex-1 gap-1">
                        <Text className="text-sm font-semibold text-text">{t(item.titleKey)}</Text>
                        <Text className="text-xs leading-5 text-muted">{t(item.descriptionKey)}</Text>
                      </View>
                      <Switch
                        accessibilityLabel={t('settings.notificationPreference', { title: t(item.titleKey) })}
                        accessibilityHint={t('settings.notificationHint')}
                        accessibilityState={{
                          checked: preferences[item.key],
                          disabled: isSaving,
                        }}
                        disabled={isSaving}
                        value={preferences[item.key]}
                        onValueChange={(value) => void savePreference(item.key, value)}
                        trackColor={{
                          false: Colors.light.backgroundElement,
                          true: Colors.light.primary,
                        }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  ))
                : null}
              {isSaving ? (
                <Text accessibilityRole="text" className="pt-3 text-xs text-muted">
                  {t('settings.preferenceSaving')}
                </Text>
              ) : null}
              {hasSaveError ? (
                <Text accessibilityRole="alert" className="pt-3 text-xs leading-5 text-error">
                  {t('settings.preferenceSaveError')}
                </Text>
              ) : null}
            </Card>
          </View>

          <View className="gap-3">
            <SectionHeader title={t('settings.privacy')} description={t('settings.privacyDescription')} />
            <Card>
              <Text className="text-sm leading-5 text-muted">
                {t('settings.privacyDetails')}
              </Text>
            </Card>
          </View>

          <View className="gap-3">
            <SectionHeader
              title={t('settings.security')}
              description={t('settings.securityDescription')}
            />
            <Card>
              <Text className="text-sm font-semibold text-text">{t('settings.unavailable')}</Text>
              <Text className="text-sm leading-5 text-muted">{t('settings.securityDetails')}</Text>
            </Card>
          </View>

          <View className="gap-3">
            <SectionHeader title={t('settings.about')} />
            <Card className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-text">{t('settings.appVersion')}</Text>
              <Text className="text-sm text-muted">{version ?? t('settings.versionUnavailable')}</Text>
            </Card>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function AccountDetail({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold text-muted">{label}</Text>
      <Text className="text-sm text-text">{value}</Text>
      {description ? <Text className="text-xs leading-5 text-muted">{description}</Text> : null}
    </View>
  );
}

function ProfileLink({
  href,
  label,
}: {
  href:
    | '/applicant/profile/edit'
    | '/applicant/profile/expertise'
    | '/applicant/profile/resume'
    | '/applicant/profile/verification';
  label: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        className="min-h-11 justify-center py-2">
        <Text className="text-sm font-semibold text-primary">{label}</Text>
      </Pressable>
    </Link>
  );
}
