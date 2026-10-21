import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ScreenContainer } from '@/components/ui/screen-container';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { expertiseCategories } from '@/features/expertise/constants';
import {
  formatCurrencyMinor,
  formatEarningsTimestamp,
  formatOfferedCompensation,
  getPastGigs,
  MAX_FEEDBACK_COMMENT_LENGTH,
} from '@/features/gigs/past-gigs';
import { useGigs } from '@/features/gigs/gigs-context';
import { mockGigs } from '@/features/gigs/mock-data';
import { formatAttendanceTimestamp, formatScheduleOccurrence } from '@/features/gigs/schedule-display';
import { isValidGigSchedule } from '@/features/gigs/commitments';

function feedbackError(reason: string): string {
  switch (reason) {
    case 'INVALID_RATING':
      return 'Choose a rating from 1 to 5 stars.';
    case 'COMMENT_TOO_LONG':
      return `Keep your comment to ${MAX_FEEDBACK_COMMENT_LENGTH} characters or fewer.`;
    case 'NOT_OWNER':
      return 'This commitment is not part of your history.';
    case 'NOT_COMPLETED':
      return 'Feedback is available only for completed commitments.';
    case 'ALREADY_SUBMITTED':
      return 'Feedback has already been submitted for this gig.';
    case 'COMMITMENT_NOT_FOUND':
    case 'GIG_NOT_FOUND':
      return 'The work record could not be verified. No feedback was saved.';
    default:
      return 'The feedback could not be submitted. Please check the form and try again.';
  }
}

export default function GigHistoryDetailScreen() {
  const { commitmentId: rawCommitmentId } = useLocalSearchParams<{ commitmentId?: string | string[] }>();
  const commitmentId = typeof rawCommitmentId === 'string' ? rawCommitmentId : '';
  const router = useRouter();
  const {
    applicantId,
    commitments,
    attendanceRecords,
    applicantFeedback,
    companyReviews,
    earningRecords,
    submitFeedback,
  } = useGigs();
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
  const entry = entries.find((item) => item.commitment.id === commitmentId);
  const categoryLabel = entry
    ? expertiseCategories.find((category) => category.id === entry.gig.categoryId)?.label ?? entry.gig.categoryId
    : '';
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cancelFeedback = () => {
    setFormOpen(false);
    setRating(0);
    setComment('');
    setError('');
  };

  const handleSubmit = () => {
    if (submitting || !entry) return;
    setSubmitting(true);
    const result = submitFeedback(entry.commitment.id, rating, comment);
    setSubmitting(false);
    if (!result.ok) {
      setError(feedbackError(result.reason));
      return;
    }
    setError('');
    setSuccess(true);
    setFormOpen(false);
    setRating(0);
    setComment('');
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="mx-auto w-full max-w-lg gap-5 px-5 pb-8 pt-6">
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/applicant/my-gigs/past');
            }}
            className="min-h-11 justify-center self-start">
            <Text className="text-sm font-semibold text-primary">‹  Back to Past Gigs</Text>
          </Pressable>

          {!entry ? (
            <Card>
              <SectionHeader title="History record unavailable" />
              <Text className="text-sm leading-5 text-muted">
                This commitment could not be found in your completed work history. It may be invalid, belong to another applicant, or not have a completed status.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/applicant/my-gigs/past')}
                className="min-h-12 items-center justify-center rounded-md bg-primary px-4">
                <Text className="text-sm font-semibold text-white">Return to Past Gigs</Text>
              </Pressable>
            </Card>
          ) : (
            <>
              <SectionHeader title={entry.gig.title} description={entry.gig.companyName} />
              <Card>
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <Text className="text-base font-semibold text-text">Work details</Text>
                  <StatusBadge label="Completed commitment" tone="success" />
                </View>
                <Text className="text-xs text-muted">Completion timestamp: not recorded in the current commitment model.</Text>
                <Text className="text-sm leading-5 text-muted">{entry.gig.description}</Text>
                <Text className="text-sm text-text">Category: {categoryLabel}</Text>
                <Text className="text-sm text-text">Location: {entry.gig.location}</Text>
                <Text className="text-sm leading-5 text-muted">{entry.gig.companyDescription}</Text>
                {entry.gig.responsibilities.length > 0 ? (
                  <View className="gap-1">
                    <Text className="text-sm font-semibold text-text">Responsibilities</Text>
                    {entry.gig.responsibilities.map((responsibility) => (
                      <Text key={responsibility} className="text-sm leading-5 text-muted">• {responsibility}</Text>
                    ))}
                  </View>
                ) : null}
              </Card>

              <Card>
                <Text className="text-base font-semibold text-text">Scheduled work</Text>
                {entry.gig.schedule && isValidGigSchedule(entry.gig.schedule) ? (
                  <>
                    {entry.gig.schedule.occurrences.map((occurrence, index) => (
                      <Text key={`${occurrence.startAt}-${index}`} className="text-sm leading-5 text-text">
                        {formatScheduleOccurrence(occurrence, entry.gig.schedule!.timeZone)}
                      </Text>
                    ))}
                    <Text className="text-xs text-muted">Scheduled times · {entry.gig.schedule.timeZone}</Text>
                  </>
                ) : (
                  <Text className="text-sm text-muted">
                    {entry.gig.startDate} · {entry.gig.startTime}–{entry.gig.endTime} (scheduled; time zone unavailable)
                  </Text>
                )}

                <View className="gap-1 border-t border-border pt-3">
                  <Text className="text-sm font-semibold text-text">Recorded attendance</Text>
                  {entry.attendance ? (
                    <>
                      <Text className="text-sm text-muted">
                        Actual check-in: {formatAttendanceTimestamp(entry.attendance.checkedInAt, entry.gig.schedule?.timeZone)}
                      </Text>
                      <Text className="text-sm text-muted">
                        Actual check-out: {entry.attendance.checkedOutAt
                          ? formatAttendanceTimestamp(entry.attendance.checkedOutAt, entry.gig.schedule?.timeZone)
                          : 'Not recorded'}
                      </Text>
                    </>
                  ) : (
                    <Text className="text-sm text-muted">No valid attendance record is available.</Text>
                  )}
                  <Text className="text-xs leading-5 text-muted">
                    Scheduled duration is not presented as verified work hours. No actual hours total is calculated.
                  </Text>
                </View>
              </Card>

              <Card>
                <Text className="text-base font-semibold text-text">Compensation and earnings</Text>
                <Text className="text-sm text-muted">Listed offer: {formatOfferedCompensation(entry.gig) ?? 'Amount unavailable'}</Text>
                {entry.earnings.length > 0 ? entry.earnings.map((record) => (
                  <View key={record.id} className="gap-1 border-t border-border pt-3">
                    <Text className="text-sm font-semibold text-text">
                      {record.status === 'PAID' ? 'Paid amount' : 'Confirmed amount'}: {formatCurrencyMinor(record.amountMinor, record.currency)}
                    </Text>
                    <Text className="text-sm text-muted">Basis: {record.compensationType.toLowerCase()}</Text>
                    <Text className="text-sm text-muted">Earnings confirmed: {formatEarningsTimestamp(record.confirmedAt)}</Text>
                    {record.status === 'PAID' ? (
                      <Text className="text-sm text-muted">
                        Payment recorded: {record.paidAt ? formatEarningsTimestamp(record.paidAt) : 'Date not recorded'}
                      </Text>
                    ) : null}
                  </View>
                )) : (
                  <Text className="text-sm leading-5 text-muted">
                    No confirmed earnings record is available. A listed offer is not a payment or earnings confirmation.
                  </Text>
                )}
              </Card>

              <Card>
                <Text className="text-base font-semibold text-text">Your feedback to the company</Text>
                {entry.applicantFeedback ? (
                  <View className="gap-2">
                    <StatusBadge label="Feedback submitted" tone="success" />
                    <Text accessibilityLabel={`Your rating: ${entry.applicantFeedback.rating} out of 5 stars`} className="text-base text-primary">
                      {'★'.repeat(entry.applicantFeedback.rating)}{'☆'.repeat(5 - entry.applicantFeedback.rating)}
                    </Text>
                    <Text className="text-sm text-muted">{entry.applicantFeedback.comment || 'No written comment.'}</Text>
                    <Text className="text-xs text-muted">Submitted {formatEarningsTimestamp(entry.applicantFeedback.submittedAt)}</Text>
                    <Text className="text-xs text-muted">
                      This feedback is in local session state only. It is not sent to the company or saved permanently.
                    </Text>
                    <Text className="text-xs text-muted">Submitted feedback cannot be edited in this mock workflow.</Text>
                    {success ? (
                      <Text accessibilityRole="alert" className="text-sm font-semibold text-success">
                        Your feedback was saved to local session state for this completed gig.
                      </Text>
                    ) : null}
                  </View>
                ) : entry.hasApplicantFeedback ? (
                  <Text className="text-sm text-muted">Feedback is already recorded for this commitment; another submission is disabled.</Text>
                ) : (
                  <>
                    <Text className="text-sm leading-5 text-muted">
                      Share optional feedback about {entry.gig.companyName}. Only you can submit feedback for your completed commitment.
                    </Text>
                    {!formOpen ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setFormOpen(true)}
                        className="min-h-12 items-center justify-center rounded-md bg-primary px-4">
                        <Text className="text-sm font-semibold text-white">Leave company feedback</Text>
                      </Pressable>
                    ) : (
                      <View className="gap-3">
                        <Text className="text-sm font-semibold text-text">Your rating (required)</Text>
                        <View className="flex-row gap-1">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Pressable
                              key={value}
                              accessibilityRole="radio"
                              accessibilityLabel={`${value} out of 5 stars`}
                              accessibilityState={{ checked: rating === value }}
                              onPress={() => {
                                setRating(value);
                                setError('');
                              }}
                              className="min-h-12 min-w-12 items-center justify-center rounded-md">
                              <Text className={`text-2xl ${rating >= value ? 'text-primary' : 'text-muted'}`}>
                                {rating >= value ? '★' : '☆'}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <TextInput
                          accessibilityLabel="Optional feedback comment"
                          placeholder="Add an optional comment"
                          placeholderTextColor="#53686C"
                          value={comment}
                          onChangeText={(value) => {
                            setComment(value);
                            setError('');
                          }}
                          maxLength={MAX_FEEDBACK_COMMENT_LENGTH}
                          multiline
                          textAlignVertical="top"
                          className="min-h-28 rounded-md border border-border bg-surface px-4 py-3 text-sm text-text"
                        />
                        <Text className="text-xs text-muted">
                          {comment.length}/{MAX_FEEDBACK_COMMENT_LENGTH} characters · comment optional
                        </Text>
                        {error ? <Text accessibilityRole="alert" className="text-sm text-error">{error}</Text> : null}
                        <View className="gap-2">
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ disabled: submitting }}
                            disabled={submitting}
                            onPress={handleSubmit}
                            className={`min-h-12 items-center justify-center rounded-md px-4 ${submitting ? 'bg-secondary' : 'bg-primary'}`}>
                            <Text className={`text-sm font-semibold ${submitting ? 'text-muted' : 'text-white'}`}>
                              {submitting ? 'Submitting…' : 'Submit feedback'}
                            </Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            disabled={submitting}
                            onPress={cancelFeedback}
                            className="min-h-12 items-center justify-center rounded-md border border-border bg-surface px-4">
                            <Text className="text-sm font-semibold text-primary">Cancel</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </Card>

              <Card>
                <Text className="text-base font-semibold text-text">Company feedback about you</Text>
                {entry.companyReviews.length > 0 ? entry.companyReviews.map((review) => (
                  <View key={review.id} className="gap-2 border-t border-border pt-3">
                    <Text className="text-sm font-semibold text-text">Received from {entry.gig.companyName}</Text>
                    <Text accessibilityLabel={`Company rating: ${review.rating} out of 5 stars`} className="text-base text-primary">
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </Text>
                    <Text className="text-sm leading-5 text-muted">{review.comment || 'No written feedback provided.'}</Text>
                    <Text className="text-xs text-muted">Review date: {formatEarningsTimestamp(review.submittedAt)}</Text>
                  </View>
                )) : (
                  <Text className="text-sm leading-5 text-muted">
                    No company review is recorded for this commitment. No rating or response has been assumed.
                  </Text>
                )}
              </Card>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
