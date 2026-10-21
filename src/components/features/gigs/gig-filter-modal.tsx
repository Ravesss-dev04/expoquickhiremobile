import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { expertiseCategories } from '@/features/expertise/constants';
import type { GigFilters, GigType } from '@/features/gigs/types';

type GigFilterModalProps = {
  visible: boolean;
  locations: string[];
  filters: GigFilters;
  onClose: () => void;
  onApply: (filters: GigFilters) => void;
};

const gigTypes: { id: GigType; label: string }[] = [
  { id: 'SINGLE_SHIFT', label: 'Single shift' },
  { id: 'SHORT_TERM', label: 'Short-term' },
  { id: 'PART_TIME', label: 'Part-time' },
];

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-11 justify-center rounded-md border px-3 py-2 ${selected ? 'border-primary bg-secondary' : 'border-border bg-surface'}`}>
      <Text className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-text'}`}>{label}</Text>
    </Pressable>
  );
}

export function GigFilterModal({ visible, locations, filters, onClose, onApply }: GigFilterModalProps) {
  const [draft, setDraft] = useState(filters);

  const clearDraft = () => setDraft({ categoryId: null, location: null, gigType: null });
  const handleClose = () => {
    setDraft(filters);
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={handleClose} visible={visible}>
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right', 'bottom']}>
        <View className="flex-row items-center justify-between border-b border-border px-5 py-3">
          <Text className="text-lg font-bold text-text">Filter gigs</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={handleClose} className="min-h-11 min-w-11 items-center justify-center">
            <Text className="text-sm font-semibold text-primary">Close</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 py-5">
          <View className="gap-3">
            <Text className="text-sm font-semibold text-text">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              <Option label="Any category" selected={!draft.categoryId} onPress={() => setDraft((current) => ({ ...current, categoryId: null }))} />
              {expertiseCategories.map((category) => (
                <Option key={category.id} label={category.label} selected={draft.categoryId === category.id} onPress={() => setDraft((current) => ({ ...current, categoryId: category.id }))} />
              ))}
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-sm font-semibold text-text">Location</Text>
            <View className="flex-row flex-wrap gap-2">
              <Option label="Any location" selected={!draft.location} onPress={() => setDraft((current) => ({ ...current, location: null }))} />
              {locations.map((location) => (
                <Option key={location} label={location} selected={draft.location === location} onPress={() => setDraft((current) => ({ ...current, location }))} />
              ))}
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-sm font-semibold text-text">Schedule</Text>
            <View className="flex-row flex-wrap gap-2">
              <Option label="Any schedule" selected={!draft.gigType} onPress={() => setDraft((current) => ({ ...current, gigType: null }))} />
              {gigTypes.map((gigType) => (
                <Option key={gigType.id} label={gigType.label} selected={draft.gigType === gigType.id} onPress={() => setDraft((current) => ({ ...current, gigType: gigType.id }))} />
              ))}
            </View>
          </View>
        </ScrollView>

        <View className="gap-3 border-t border-border px-5 py-4">
          <Button title="Apply filters" onPress={() => onApply(draft)} />
          <Button title="Clear filters" variant="secondary" onPress={() => { clearDraft(); onApply({ categoryId: null, location: null, gigType: null }); }} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}