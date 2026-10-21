import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ScreenContainer } from '@/components/ui/screen-container';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Colors } from '@/constants/theme';

export default function HomeScreen() {
	return (
		<ScreenContainer>
			<ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
				<View className="mx-auto w-full max-w-lg gap-7 px-5 pb-8 pt-6">
					<View className="gap-3">
						<Text className="text-xs font-bold uppercase tracking-widest text-accent">QuickHire</Text>
						<Text className="text-2xl font-bold leading-9 text-text">
							Make room for work that works for you.
						</Text>
						<Text className="text-base leading-6 text-muted">
							Your next opportunity starts with a search.
						</Text>
					</View>

					<Link href="/applicant/find-gigs" asChild>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Search gigs"
							className="min-h-16 flex-row items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 active:opacity-80">
							<View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
								<SymbolView
									name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
									tintColor={Colors.light.primary}
									size={19}
								/>
							</View>
							<View className="flex-1 gap-0.5">
								<Text className="text-sm font-semibold text-text">Find gigs</Text>
								<Text className="text-xs leading-5 text-muted">Search and filters are coming soon</Text>
							</View>
							<SymbolView
								name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
								tintColor={Colors.light.textSecondary}
								size={16}
							/>
						</Pressable>
					</Link>

					<View className="gap-3">
						<SectionHeader
							title="Start exploring"
							description="A clear place to begin your QuickHire journey."
						/>
						<Card>
							<StatusBadge label="Search, filters, and results" />
							<Text className="text-base font-semibold text-text">Find work on your terms</Text>
							<Text className="text-sm leading-5 text-muted">
								Gig discovery will be available here in a future update.
							</Text>
						</Card>
					</View>

					<View className="gap-3">
						<SectionHeader title="Your activity" description="Keep your work in one place." />
						<Card>
							<Text className="text-sm leading-5 text-muted">
								Upcoming and completed gig activity will appear here.
							</Text>
						</Card>
					</View>
				</View>
			</ScrollView>
		</ScreenContainer>
	);
}
