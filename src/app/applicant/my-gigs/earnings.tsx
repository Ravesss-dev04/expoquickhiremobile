import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ScreenContainer } from '@/components/ui/screen-container';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  filterEarningsByPeriod,
  formatCurrencyMinor,
  formatEarningsTimestamp,
  getPastGigs,
  summarizeEarnings,
  type EarningsPeriod,
} from '@/features/gigs/past-gigs';
import { useGigs } from '@/features/gigs/gigs-context';
import { mockGigs } from '@/features/gigs/mock-data';
import { parseIsoInstant } from '@/features/gigs/commitments';

function PeriodChoice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-11 justify-center rounded-full border px-4 ${selected ? 'border-primary bg-secondary' : 'border-border bg-surface'}`}>
      <Text className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-muted'}`}>{label}</Text>
    </Pressable>
  );
}

export default function EarningsScreen() {
  const {
    applicantId,
    commitments,
    attendanceRecords,
    applicantFeedback,
    companyReviews,
    earningRecords,
  } = useGigs();
  const [period, setPeriod] = useState<EarningsPeriod>('ALL');
  const entries = useMemo(
    () => getPastGigs(
      commitments,
      mockGigs,
      applicantId,
      attendanceRecords,
      applicantFeedback,
      companyReviews,
      earningRecords,
    ),
    [applicantId, applicantFeedback, attendanceRecords, commitments, companyReviews, earningRecords],
  );
  const now = new Date().toISOString();
  const periodEntries = filterEarningsByPeriod(entries, period, now);
  const summary = summarizeEarnings(periodEntries);
  const records = periodEntries
    .flatMap((entry) => entry.earnings.map((earning) => ({ entry, earning })))
    .sort((first, second) =>
      (parseIsoInstant(second.earning.confirmedAt) ?? -Infinity) -
      (parseIsoInstant(first.earning.confirmedAt) ?? -Infinity),
    );

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="mx-auto w-full max-w-lg gap-5 px-5 pb-8 pt-6">
          <SectionHeader
            title="Earnings"
            description="Confirmed and paid earnings records only. A gig offer is not a confirmed earning or available balance."
          />

          <View className="flex-row flex-wrap gap-2">
            <PeriodChoice label="All time" selected={period === 'ALL'} onPress={() => setPeriod('ALL')} />
            <PeriodChoice label="This month" selected={period === 'THIS_MONTH'} onPress={() => setPeriod('THIS_MONTH')} />
          </View>
          <Text className="text-xs leading-5 text-muted">
            The selected period uses each record&apos;s confirmed date (UTC). Paid totals use those same records and period; different currencies are never combined.
          </Text>

          {summary.recordCount > 0 ? (
            <>
              <Card>
                <Text className="text-base font-semibold text-text">Confirmed earnings</Text>
                <Text className="text-xs text-muted">Explicitly confirmed records, including records later marked paid.</Text>
                {summary.confirmedTotals.map(({ currency, amountMinor }) => (
                  <Text key={currency} className="text-xl font-bold text-primary">
                    {amountMinor === null ? 'Total unavailable (amount overflow)' : formatCurrencyMinor(amountMinor, currency)}
                  </Text>
                ))}
                <Text className="text-sm text-muted">{summary.recordCount} eligible earning record{summary.recordCount === 1 ? '' : 's'}</Text>
              </Card>

              {summary.paidTotals.length > 0 ? (
                <Card>
                  <Text className="text-base font-semibold text-text">Paid earnings</Text>
                  <Text className="text-xs text-muted">Only records with an explicit paid status and valid payment date.</Text>
                  {summary.paidTotals.map(({ currency, amountMinor }) => (
                    <Text key={currency} className="text-xl font-bold text-primary">
                      {amountMinor === null ? 'Total unavailable (amount overflow)' : formatCurrencyMinor(amountMinor, currency)}
                    </Text>
                  ))}
                </Card>
              ) : null}

              <View className="gap-3">
                <Text className="text-base font-semibold text-text">Earning records</Text>
                {records.map(({ entry, earning }) => (
                  <Link
                    key={earning.id}
                    href={{ pathname: '/applicant/my-gigs/history/[commitmentId]', params: { commitmentId: entry.commitment.id } }}
                    asChild>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open earnings record for ${entry.gig.title} at ${entry.gig.companyName}`}
                      className="rounded-md">
                      <Card>
                        <View className="flex-row items-start justify-between gap-3">
                          <View className="flex-1 gap-1">
                            <Text className="text-base font-semibold text-text">{entry.gig.title}</Text>
                            <Text className="text-sm text-muted">{entry.gig.companyName}</Text>
                          </View>
                          <StatusBadge
                            label={earning.status === 'PAID' ? 'Paid' : 'Confirmed'}
                            tone={earning.status === 'PAID' ? 'success' : 'neutral'}
                          />
                        </View>
                        <Text className="text-xl font-bold text-primary">
                          {formatCurrencyMinor(earning.amountMinor, earning.currency)}
                        </Text>
                        <Text className="text-sm text-muted">Basis: {earning.compensationType.toLowerCase()}</Text>
                        <Text className="text-sm text-muted">Confirmed: {formatEarningsTimestamp(earning.confirmedAt)}</Text>
                        {earning.status === 'PAID' ? (
                          <Text className="text-sm text-muted">
                            Paid: {earning.paidAt ? formatEarningsTimestamp(earning.paidAt) : 'Date not recorded'}
                          </Text>
                        ) : null}
                        <Text className="text-xs text-primary">Open gig history</Text>
                      </Card>
                    </Pressable>
                  </Link>
                ))}
              </View>
            </>
          ) : (
            <Card>
              <Text className="text-base font-semibold text-text">No earnings records yet</Text>
              <Text className="text-sm leading-5 text-muted">
                Earnings appear here only when an eligible completed commitment has a corresponding confirmed record. The current mock workflow has no earnings or payment records; no amount is inferred from an offer, attendance, or completion.
              </Text>
              <StatusBadge label="No available-balance or withdrawal data" tone="neutral" />
            </Card>
          )}

          <Link href="/applicant/my-gigs/past" asChild>
            <Pressable accessibilityRole="button" className="min-h-11 justify-center self-start">
              <Text className="text-sm font-semibold text-primary">Back to Past Gigs</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
