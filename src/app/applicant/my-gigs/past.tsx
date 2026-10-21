import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ScreenContainer } from '@/components/ui/screen-container';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { expertiseCategories } from '@/features/expertise/constants';
import {
  EMPTY_PAST_GIG_FILTERS,
  filterAndSortPastGigs,
  formatCurrencyMinor,
  formatOfferedCompensation,
  getPastGigs,
  summarizeCompanyReviews,
  type PastGigFilters,
  type PastGigSort,
} from '@/features/gigs/past-gigs';
import { useGigs } from '@/features/gigs/gigs-context';
import { mockGigs } from '@/features/gigs/mock-data';
import { formatAttendanceTimestamp, formatScheduleOccurrence } from '@/features/gigs/schedule-display';
import { isValidGigSchedule } from '@/features/gigs/commitments';

function FilterChoice({
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
      className={`min-h-10 justify-center rounded-full border px-3 ${selected ? 'border-primary bg-secondary' : 'border-border bg-surface'}`}>
      <Text className={`text-xs font-semibold ${selected ? 'text-primary' : 'text-muted'}`}>{label}</Text>
    </Pressable>
  );
}

function PastGigCard({ entry }: { entry: ReturnType<typeof getPastGigs>[number] }) {
  const schedule = entry.gig.schedule;
  const validSchedule = Boolean(schedule && isValidGigSchedule(schedule));
  const offer = formatOfferedCompensation(entry.gig);
  const receivedRating = entry.companyReviews[0]?.rating;
  const record = entry.earnings[0];
  const scheduledLabel = validSchedule && schedule
    ? schedule.occurrences.map((occurrence) => formatScheduleOccurrence(occurrence, schedule.timeZone)).join('\n')
    : `${entry.gig.startDate} · ${entry.gig.startTime}${entry.gig.endTime ? `–${entry.gig.endTime}` : ''}`;

  return (
    <Link
      href={{ pathname: '/applicant/my-gigs/history/[commitmentId]', params: { commitmentId: entry.commitment.id } }}
      asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open completed gig history for ${entry.gig.title} at ${entry.gig.companyName}`}
        className="rounded-md">
        <Card>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-base font-semibold text-text">{entry.gig.title}</Text>
              <Text className="text-sm text-muted">{entry.gig.companyName}</Text>
            </View>
            <StatusBadge label="Completed" tone="success" />
          </View>
          <Text className="text-xs text-muted">Completion timestamp not recorded</Text>

          <View className="gap-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Scheduled work</Text>
            <Text className="text-sm leading-5 text-text">{scheduledLabel}</Text>
            <Text className="text-xs text-muted">Scheduled times · {schedule?.timeZone ?? 'time zone unavailable'}</Text>
          </View>

          {entry.attendance ? (
            <View className="gap-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Recorded attendance</Text>
              <Text className="text-sm text-text">
                Check-in: {formatAttendanceTimestamp(entry.attendance.checkedInAt, schedule?.timeZone)}
              </Text>
              <Text className="text-sm text-text">
                Check-out: {entry.attendance.checkedOutAt
                  ? formatAttendanceTimestamp(entry.attendance.checkedOutAt, schedule?.timeZone)
                  : 'Not recorded'}
              </Text>
            </View>
          ) : null}

          <View className="flex-row flex-wrap gap-2">
            <StatusBadge
              label={entry.hasApplicantFeedback ? 'Feedback saved locally' : 'Your feedback not submitted'}
              tone={entry.hasApplicantFeedback ? 'success' : 'neutral'}
            />
            <StatusBadge
              label={receivedRating ? `Company review · ${receivedRating}/5` : 'No company review recorded'}
              tone={receivedRating ? 'success' : 'neutral'}
            />
            {record ? (
              <StatusBadge
                label={`Earnings ${record.status === 'PAID' ? 'paid' : 'confirmed'}`}
                tone={record.status === 'PAID' ? 'success' : 'neutral'}
              />
            ) : null}
          </View>

          <Text className="text-sm font-semibold text-primary">
            {record
              ? `${record.status === 'PAID' ? 'Paid' : 'Confirmed'} earnings: ${formatCurrencyMinor(record.amountMinor, record.currency)}`
              : offer
                ? `Offer: ${offer}`
                : 'Offer details unavailable'}
          </Text>
          <Text className="text-xs text-muted">Open history details</Text>
        </Card>
      </Pressable>
    </Link>
  );
}

export default function PastGigsScreen() {
  const {
    applicantId,
    commitments,
    attendanceRecords,
    applicantFeedback,
    companyReviews,
    earningRecords,
  } = useGigs();
  const [filters, setFilters] = useState<PastGigFilters>(EMPTY_PAST_GIG_FILTERS);
  const [sort, setSort] = useState<PastGigSort>('SCHEDULED_NEWEST');
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
  const results = useMemo(
    () => filterAndSortPastGigs(entries, filters, sort),
    [entries, filters, sort],
  );
  const companyOptions = [...new Set(entries.map((entry) => entry.gig.companyName))].sort();
  const categoryOptions = [...new Set(entries.map((entry) => entry.gig.categoryId))];
  const reviewSummary = summarizeCompanyReviews(entries);
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_PAST_GIG_FILTERS) ||
    sort !== 'SCHEDULED_NEWEST';

  const cycleSort = () => {
    setSort((current) => current === 'SCHEDULED_NEWEST'
      ? 'SCHEDULED_OLDEST'
      : 'SCHEDULED_NEWEST');
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="mx-auto w-full max-w-lg gap-5 px-5 pb-8 pt-6">
          <SectionHeader
            title="Past Gigs"
            description="A record of commitments marked completed. Attendance and scheduled dates alone do not establish completion."
          />

          <Card>
            <Text className="text-base font-semibold text-text">Completed gigs</Text>
            <Text className="text-2xl font-bold text-primary">{entries.length}</Text>
            <Text className="text-sm leading-5 text-muted">Counted from your valid completed commitments only.</Text>
            {reviewSummary.count > 0 ? (
              <Text className="text-sm text-muted">
                Company reviews received: {reviewSummary.count} · average {reviewSummary.averageRating?.toFixed(1)}/5
              </Text>
            ) : null}
            <Link href="/applicant/my-gigs/earnings" asChild>
              <Pressable accessibilityRole="button" className="min-h-11 justify-center self-start">
                <Text className="text-sm font-semibold text-primary">View earnings records</Text>
              </Pressable>
            </Link>
          </Card>

          <View className="gap-3">
            <TextInput
              accessibilityLabel="Search past gigs"
              placeholder="Search title, company, category, or location"
              placeholderTextColor="#53686C"
              value={filters.search}
              onChangeText={(search) => setFilters((current) => ({ ...current, search }))}
              className="min-h-12 rounded-md border border-border bg-surface px-4 text-sm text-text"
              returnKeyType="search"
            />

            {categoryOptions.length > 0 ? (
              <View className="gap-2">
                <Text className="text-sm font-semibold text-text">Category</Text>
                <View className="flex-row flex-wrap gap-2">
                  <FilterChoice
                    label="All"
                    selected={!filters.categoryId}
                    onPress={() => setFilters((current) => ({ ...current, categoryId: null }))}
                  />
                  {categoryOptions.map((categoryId) => {
                    const categoryLabel = expertiseCategories.find((item) => item.id === categoryId)?.label ?? categoryId;
                    return (
                      <FilterChoice
                        key={categoryId}
                        label={categoryLabel}
                        selected={filters.categoryId === categoryId}
                        onPress={() => setFilters((current) => ({ ...current, categoryId }))}
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}

            {companyOptions.length > 0 ? (
              <View className="gap-2">
                <Text className="text-sm font-semibold text-text">Company</Text>
                <View className="flex-row flex-wrap gap-2">
                  <FilterChoice
                    label="All companies"
                    selected={!filters.companyName}
                    onPress={() => setFilters((current) => ({ ...current, companyName: null }))}
                  />
                  {companyOptions.map((companyName) => (
                    <FilterChoice
                      key={companyName}
                      label={companyName}
                      selected={filters.companyName === companyName}
                      onPress={() => setFilters((current) => ({ ...current, companyName }))}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View className="gap-2">
              <Text className="text-sm font-semibold text-text">Your feedback</Text>
              <View className="flex-row flex-wrap gap-2">
                {([
                  ['ALL', 'All'],
                  ['SUBMITTED', 'Submitted'],
                  ['NOT_SUBMITTED', 'Not submitted'],
                ] as const).map(([value, label]) => (
                  <FilterChoice
                    key={value}
                    label={label}
                    selected={filters.feedback === value}
                    onPress={() => setFilters((current) => ({ ...current, feedback: value }))}
                  />
                ))}
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-text">Earnings records</Text>
              <View className="flex-row flex-wrap gap-2">
                {([
                  ['ALL', 'All'],
                  ['CONFIRMED', 'Confirmed'],
                  ['PAID', 'Paid'],
                  ['NOT_RECORDED', 'Not recorded'],
                ] as const).map(([value, label]) => (
                  <FilterChoice
                    key={value}
                    label={label}
                    selected={filters.earnings === value}
                    onPress={() => setFilters((current) => ({ ...current, earnings: value }))}
                  />
                ))}
              </View>
            </View>

            <View className="flex-row flex-wrap items-center justify-between gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Change sort order. Current order: ${sort === 'SCHEDULED_NEWEST' ? 'scheduled newest' : 'scheduled oldest'}`}
                onPress={cycleSort}
                className="min-h-11 justify-center">
                <Text className="text-sm font-semibold text-primary">
                  Sort: {sort === 'SCHEDULED_NEWEST' ? 'Scheduled newest' : 'Scheduled oldest'}
                </Text>
              </Pressable>
              {hasActiveFilters ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setFilters(EMPTY_PAST_GIG_FILTERS);
                    setSort('SCHEDULED_NEWEST');
                  }}
                  className="min-h-11 justify-center">
                  <Text className="text-sm font-semibold text-primary">Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
            <Text accessibilityLiveRegion="polite" className="text-xs text-muted">
              Showing {results.length} of {entries.length} completed gigs
            </Text>
          </View>

          {entries.length === 0 ? (
            <Card>
              <Text className="text-base font-semibold text-text">No completed gigs yet</Text>
              <Text className="text-sm leading-5 text-muted">
                Past Gigs includes only commitments with a completed status. Your current local workflow does not mark commitments completed, so attendance or an ended schedule will not appear as completed work.
              </Text>
              <Link href="/applicant/my-gigs" asChild>
                <Pressable accessibilityRole="button" className="min-h-12 items-center justify-center rounded-md bg-primary px-4">
                  <Text className="text-sm font-semibold text-white">Back to My Gigs</Text>
                </Pressable>
              </Link>
            </Card>
          ) : results.length === 0 ? (
            <Card>
              <Text className="text-base font-semibold text-text">No gigs match these filters</Text>
              <Text className="text-sm leading-5 text-muted">Try another search or clear the filters to view all completed gigs.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setFilters(EMPTY_PAST_GIG_FILTERS);
                  setSort('SCHEDULED_NEWEST');
                }}
                className="min-h-12 items-center justify-center rounded-md bg-secondary px-4">
                <Text className="text-sm font-semibold text-primary">Clear filters</Text>
              </Pressable>
            </Card>
          ) : (
            <View className="gap-3">
              {results.map((entry) => <PastGigCard key={entry.commitment.id} entry={entry} />)}
            </View>
          )}

          {reviewSummary.count === 0 ? (
            <Text className="text-xs leading-5 text-muted">
              Company reviews will appear here only when an actual review record is available.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
