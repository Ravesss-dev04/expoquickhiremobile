import { useMemo, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { GigCard } from '@/components/features/gigs/gig-card';
import { GigFilterModal } from '@/components/features/gigs/gig-filter-modal';
import { Card } from '@/components/ui/card';
import { ScreenContainer } from '@/components/ui/screen-container';
import { SectionHeader } from '@/components/ui/section-header';
import { useGigs } from '@/features/gigs/gigs-context';
import { emptyGigFilters, filterGigs, getDiscoverableGigs } from '@/features/gigs/discovery';
import { mockGigs } from '@/features/gigs/mock-data';
import type { GigFilters } from '@/features/gigs/types';

export default function FindGigsScreen() {
	const { savedGigIds, isSaved, toggleSaved } = useGigs();
	const [query, setQuery] = useState('');
	const [filters, setFilters] = useState<GigFilters>(emptyGigFilters);
	const [filterModalVisible, setFilterModalVisible] = useState(false);
	const [showSaved, setShowSaved] = useState(false);
	const discoverableGigs = useMemo(() => getDiscoverableGigs(mockGigs), []);
	const locations = useMemo(
		() => [...new Set(discoverableGigs.map((gig) => gig.location))].sort(),
		[discoverableGigs],
	);
	const filteredGigs = filterGigs(mockGigs, query, filters);
	const visibleGigs = showSaved
		? filteredGigs.filter((gig) => savedGigIds.includes(gig.id))
		: filteredGigs;
	const activeFilterCount = Number(Boolean(filters.categoryId)) + Number(Boolean(filters.location)) + Number(Boolean(filters.gigType));

	return (
		<ScreenContainer>
			<ScrollView className="flex-1" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 28 }}>
				<View className="mx-auto w-full max-w-lg gap-5 px-5 pb-8 pt-6">
					<SectionHeader
						title="Find Gigs"
						description="Explore local opportunities from fictional QuickHire demo companies."
					/>

					<View className="flex-row items-center gap-2 rounded-md border border-border bg-surface px-3">
						<SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} tintColor="#53686C" size={18} />
						<TextInput
							accessibilityLabel="Search gigs by title, company, category, or location"
							className="min-h-12 flex-1 py-2 text-sm text-text"
							onChangeText={setQuery}
							placeholder="Title, company, category, or location"
							placeholderTextColor="#53686C"
							returnKeyType="search"
							value={query}
						/>
						{query.length > 0 ? (
							<Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} className="h-10 w-10 items-center justify-center">
								<SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} tintColor="#53686C" size={18} />
							</Pressable>
						) : null}
					</View>

					<View className="flex-row items-center justify-between gap-3">
						<Text className="flex-1 text-sm font-semibold text-text">
							{visibleGigs.length} {visibleGigs.length === 1 ? 'gig' : 'gigs'}
						</Text>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={activeFilterCount ? `Filters, ${activeFilterCount} active` : 'Filter gigs'}
							onPress={() => setFilterModalVisible(true)}
							className="min-h-11 flex-row items-center gap-2 rounded-md border border-border bg-surface px-3">
							<SymbolView name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }} tintColor="#173B4A" size={17} />
							<Text className="text-sm font-semibold text-primary">Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}</Text>
						</Pressable>
					</View>

					<View accessibilityRole="tablist" className="flex-row rounded-md bg-secondary p-1">
						{[
							{ saved: false, label: 'All gigs' },
							{ saved: true, label: `Saved${savedGigIds.length ? ` (${savedGigIds.length})` : ''}` },
						].map((tab) => (
							<Pressable
								key={tab.label}
								accessibilityRole="tab"
								accessibilityState={{ selected: showSaved === tab.saved }}
								onPress={() => setShowSaved(tab.saved)}
								className={`min-h-11 flex-1 items-center justify-center rounded-sm px-3 ${showSaved === tab.saved ? 'bg-surface' : ''}`}>
								<Text className={`text-sm font-semibold ${showSaved === tab.saved ? 'text-primary' : 'text-muted'}`}>{tab.label}</Text>
							</Pressable>
						))}
					</View>

					{visibleGigs.length ? (
						<View className="gap-3">
							{visibleGigs.map((gig) => (
								<GigCard key={gig.id} gig={gig} saved={isSaved(gig.id)} onToggleSaved={() => toggleSaved(gig.id)} />
							))}
						</View>
					) : (
						<Card>
							<Text className="text-base font-semibold text-text">{showSaved && savedGigIds.length === 0 ? 'No saved gigs yet' : 'No gigs match your search'}</Text>
							<Text className="text-sm leading-5 text-muted">
								{showSaved && savedGigIds.length === 0
									? 'Save an opportunity with the bookmark control and it will appear here.'
									: 'Try another search or adjust your filters to see more opportunities.'}
							</Text>
							{activeFilterCount > 0 ? (
								<Pressable accessibilityRole="button" onPress={() => setFilters(emptyGigFilters)} className="min-h-11 justify-center self-start">
									<Text className="text-sm font-semibold text-primary">Clear filters</Text>
								</Pressable>
							) : null}
						</Card>
					)}
				</View>
			</ScrollView>
			<GigFilterModal
				visible={filterModalVisible}
				locations={locations}
				filters={filters}
				onClose={() => setFilterModalVisible(false)}
				onApply={(nextFilters) => {
					setFilters(nextFilters);
					setFilterModalVisible(false);
				}}
			/>
		</ScreenContainer>
	);
}
