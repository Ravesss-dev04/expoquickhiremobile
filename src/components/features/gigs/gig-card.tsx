import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';

import { StatusBadge } from '@/components/ui/status-badge';
import { expertiseCategories } from '@/features/expertise/constants';
import type { Gig } from '@/features/gigs/types';

type GigCardProps = {
  gig: Gig;
  saved: boolean;
  onToggleSaved: () => void;
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function GigCard({ gig, saved, onToggleSaved }: GigCardProps) {
  const category = expertiseCategories.find((item) => item.id === gig.categoryId)?.label ?? gig.categoryId;
  const payBasis = gig.compensationType === 'HOUR' ? '/ hour' : gig.compensationType === 'SHIFT' ? '/ shift' : ' fixed';

  return (
    <View className="gap-3 rounded-md border border-border bg-surface p-4">
      <View className="flex-row items-start gap-3">
        <Link href={`/applicant/find-gigs/${gig.id}`} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${gig.title} at ${gig.companyName}`}
            className="min-h-11 flex-1 gap-1">
            <Text className="text-base font-semibold leading-6 text-text">{gig.title}</Text>
            <Text className="text-sm text-muted">{gig.companyName}</Text>
          </Pressable>
        </Link>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? `Remove ${gig.title} from saved gigs` : `Save ${gig.title}`}
          accessibilityState={{ selected: saved }}
          hitSlop={8}
          onPress={onToggleSaved}
          className="h-11 w-11 items-center justify-center rounded-md bg-secondary">
          <SymbolView
            name={{ ios: saved ? 'bookmark.fill' : 'bookmark', android: saved ? 'bookmark' : 'bookmark_border', web: saved ? 'bookmark' : 'bookmark_border' }}
            tintColor={saved ? '#0F8B78' : '#53686C'}
            size={19}
          />
        </Pressable>
      </View>

      <View className="flex-row flex-wrap items-center gap-x-3 gap-y-2">
        <Text className="text-sm text-muted">{gig.location}</Text>
        <Text className="text-sm font-semibold text-text">{currency.format(gig.compensationAmount)}{payBasis}</Text>
      </View>

      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row flex-wrap items-center gap-2">
          <StatusBadge label={category} />
          <StatusBadge label="Open" tone="success" />
        </View>
        <Text className="text-xs text-muted">{formatDate(gig.startDate)} · {gig.startTime}</Text>
      </View>
    </View>
  );
}