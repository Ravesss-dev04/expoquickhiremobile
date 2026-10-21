import '../global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { LocalizationProvider } from '@/features/localization/language-context';
import { ProfileProvider } from '@/features/profile/profile-context';
import { ApplicantSettingsProvider } from '@/features/settings/settings-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LocalizationProvider>
        <ApplicantSettingsProvider>
          <ProfileProvider>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }} />
          </ProfileProvider>
        </ApplicantSettingsProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
