import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Colors } from '@/constants/theme';
import { useLocalization } from '@/features/localization/language-context';

const tabItems = [
  { name: 'home', labelKey: 'tab.home', symbol: 'house.fill', android: 'home' },
  { name: 'find-gigs/index', labelKey: 'tab.findGigs', symbol: 'magnifyingglass', android: 'search' },
  { name: 'my-gigs/index', labelKey: 'tab.myGigs', symbol: 'briefcase.fill', android: 'work' },
  {
    name: 'profile/index',
    labelKey: 'tab.profile',
    symbol: 'person.crop.circle.fill',
    android: 'account_circle',
  },
] as const;

export default function ApplicantTabs() {
  const { language, t } = useLocalization();

  return (
    <Tabs
      key={language}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.light.background,
          borderTopColor: Colors.light.backgroundElement,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarItemStyle: { minHeight: 52 },
      }}>
      {tabItems.map((item) => (
        <Tabs.Screen
          key={item.name}
          name={item.name}
          options={{
            title: t(item.labelKey),
            tabBarLabel: t(item.labelKey),
            tabBarAccessibilityLabel: `${t(item.labelKey)} tab`,
            tabBarIcon: ({ color, size }) => (
              <SymbolView
                name={{ ios: item.symbol, android: item.android, web: item.android }}
                tintColor={color}
                size={size}
              />
            ),
          }}
        />
      ))}
      <Tabs.Screen name="find-gigs/[gigId]" options={{ href: null }} />
      <Tabs.Screen name="my-gigs/ongoing" options={{ href: null }} />
      <Tabs.Screen name="my-gigs/past" options={{ href: null }} />
      <Tabs.Screen name="my-gigs/earnings" options={{ href: null }} />
      <Tabs.Screen name="my-gigs/history/[commitmentId]" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/resume" options={{ href: null }} />
      <Tabs.Screen name="profile/expertise" options={{ href: null }} />
      <Tabs.Screen name="profile/verification" options={{ href: null }} />
      <Tabs.Screen name="settings/index" options={{ href: null }} />
    </Tabs>
  );
}