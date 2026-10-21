import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenContainer } from '@/components/ui/screen-container';
import { SectionHeader } from '@/components/ui/section-header';
import { expertiseCategories, MAX_EXPERTISE_SELECTIONS } from '@/features/expertise/constants';
import { addExpertiseCategory, removeExpertiseCategory, validateExpertiseSelection } from '@/features/expertise/logic';
import { useApplicantProfile } from '@/features/profile/profile-context';

export default function ExpertiseScreen() {
  const { profile, updateProfile } = useApplicantProfile();
  const [selectedIds, setSelectedIds] = useState<string[]>(profile.expertiseIds);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = selectedIds.length;

  const selectedCategories = useMemo(
    () => expertiseCategories.filter((category) => selectedIds.includes(category.id)),
    [selectedIds],
  );

  const handleToggle = (categoryId: string) => {
    if (selectedIds.includes(categoryId)) {
      const result = removeExpertiseCategory(selectedIds, categoryId);
      setSelectedIds(result.selected);
      setError(null);
      return;
    }

    const result = addExpertiseCategory(selectedIds, categoryId);
    if (!result.ok) {
      setError(result.error ?? 'Unable to add this category.');
      return;
    }

    setSelectedIds(result.selected);
    setError(null);
  };

  const handleSave = () => {
    const validation = validateExpertiseSelection(selectedIds);
    if (!validation.ok) {
      setError(validation.error ?? 'Invalid expertise selection.');
      return;
    }

    updateProfile((current) => ({ ...current, expertiseIds: validation.selected }));
    router.back();
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="mx-auto w-full max-w-lg gap-6 px-5 pb-8 pt-6">
          <SectionHeader
            title="Expertise"
            description="Choose up to three categories that match the work you are best suited for."
          />

          <Card>
            <Text className="text-sm font-semibold text-text">
              {selectedCount} of {MAX_EXPERTISE_SELECTIONS} selected
            </Text>
            {selectedCount >= MAX_EXPERTISE_SELECTIONS ? (
              <Text className="text-xs text-muted">
                Maximum reached. Remove a category to make space for another option.
              </Text>
            ) : (
              <Text className="text-xs text-muted">
                Choose another category to keep building your profile.
              </Text>
            )}

            {error ? <Text className="text-xs text-error">{error}</Text> : null}

            <View className="gap-3">
              {expertiseCategories.map((category) => {
                const selected = selectedIds.includes(category.id);
                return (
                  <Button
                    key={category.id}
                    title={selected ? `${category.label} selected` : category.label}
                    variant={selected ? 'primary' : 'secondary'}
                    onPress={() => handleToggle(category.id)}
                  />
                );
              })}
            </View>
          </Card>

          <Card>
            <Text className="text-sm font-semibold text-text">Current selection</Text>
            {selectedCategories.length === 0 ? (
              <Text className="text-sm text-muted">No categories selected yet.</Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {selectedCategories.map((category) => (
                  <View key={category.id} className="rounded-full bg-secondary px-3 py-2">
                    <Text className="text-xs font-semibold text-primary">{category.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <View className="flex-row gap-3">
            <Button title="Save selection" onPress={handleSave} />
            <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
