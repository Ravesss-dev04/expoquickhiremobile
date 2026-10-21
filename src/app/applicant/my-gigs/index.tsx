import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ScreenContainer } from '@/components/ui/screen-container';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { isValidGigSchedule } from '@/features/gigs/commitments';
import { useGigs } from '@/features/gigs/gigs-context';
import { mockGigs } from '@/features/gigs/mock-data';
import { getApplicantCommitmentGroups } from '@/features/gigs/ongoing-gigs';
import { formatAttendanceTimestamp, formatScheduleOccurrence } from '@/features/gigs/schedule-display';
import type { AttendanceRecord, CommitmentStatus, GigCommitment } from '@/features/gigs/types';

const statusLabels: Record<CommitmentStatus, string> = {
	ACTIVE: 'Active',
	COMPLETED: 'Completed',
	CANCELLED: 'Cancelled',
};

function CommitmentCard({ commitment, attendance }: { commitment: GigCommitment; attendance?: AttendanceRecord }) {
	const gig = mockGigs.find((item) => item.id === commitment.gigId);
	const schedule = gig?.schedule;
	const scheduleValid = Boolean(schedule && isValidGigSchedule(schedule));
	const attendanceLabel = attendance?.checkedOutAt ? 'Checked out' : attendance ? 'Checked in' : 'Not checked in';
	const tone = commitment.status === 'ACTIVE' ? 'success' : commitment.status === 'CANCELLED' ? 'warning' : 'neutral';

	return (
		<Card>
			<View className="flex-row items-start justify-between gap-3">
				<View className="flex-1 gap-1">
					<Text className="text-base font-semibold text-text">{gig?.title ?? 'Gig details unavailable'}</Text>
					{gig ? <Text className="text-sm text-muted">{gig.companyName}</Text> : null}
				</View>
				<StatusBadge label={statusLabels[commitment.status]} tone={tone} />
			</View>

			{gig ? <Text className="text-sm text-muted">Location: {gig.location}</Text> : null}
			{gig && schedule && scheduleValid ? (
				<View className="gap-2">
					{schedule.occurrences.map((occurrence, index) => (
						<Text key={`${occurrence.startAt}-${index}`} className="text-sm leading-5 text-muted">
							{formatScheduleOccurrence(occurrence, schedule.timeZone)}
						</Text>
					))}
					<Text className="text-xs text-muted">Scheduled times ({schedule.timeZone})</Text>
				</View>
			) : (
				<Text className="text-sm leading-5 text-muted">Schedule details are unavailable or invalid.</Text>
			)}

			<View className="gap-2">
				<View className="flex-row flex-wrap items-center gap-2">
					<Text className="text-sm font-semibold text-text">Attendance</Text>
					<StatusBadge label={attendanceLabel} tone={attendance?.checkedOutAt ? 'neutral' : attendance ? 'success' : 'warning'} />
				</View>
				{attendance ? (
					<Text className="text-sm text-muted">
						Actual check-in: {formatAttendanceTimestamp(attendance.checkedInAt, schedule?.timeZone)}
					</Text>
				) : null}
				{attendance?.checkedOutAt ? (
					<Text className="text-sm text-muted">
						Actual check-out: {formatAttendanceTimestamp(attendance.checkedOutAt, schedule?.timeZone)}
					</Text>
				) : null}
			</View>

			{gig ? (
				<Link href={`/applicant/find-gigs/${gig.id}`} asChild>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`Open ${gig.title} details and attendance`}
						className="min-h-11 justify-center self-start">
						<Text className="text-sm font-semibold text-primary">View gig and attendance</Text>
					</Pressable>
				</Link>
			) : null}
		</Card>
	);
}

export default function MyGigsScreen() {
	const { applicantId, commitments, activeCommitmentCount, attendanceRecords } = useGigs();
	const groups = getApplicantCommitmentGroups(commitments, mockGigs, applicantId);

	return (
		<ScreenContainer>
			<ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
				<View className="mx-auto w-full max-w-lg gap-6 px-5 pb-8 pt-6">
					<SectionHeader title="My Gigs" description="Your local mock commitments and their schedules." />
					<Card>
						<Text className="text-base font-semibold text-text">Active commitments</Text>
						<Text className="text-sm leading-5 text-muted">{activeCommitmentCount} of 2 slots used</Text>
					</Card>

					<Card>
						<Text className="text-base font-semibold text-text">Work history and earnings</Text>
						<Text className="text-sm leading-5 text-muted">
							Review completed commitments and any earnings records that have been confirmed.
						</Text>
						<View className="gap-2">
							<Link href="/applicant/my-gigs/past" asChild>
								<Pressable accessibilityRole="button" className="min-h-12 items-center justify-center rounded-md bg-secondary px-4">
									<Text className="text-sm font-semibold text-primary">Past gigs</Text>
								</Pressable>
							</Link>
							<Link href="/applicant/my-gigs/earnings" asChild>
								<Pressable accessibilityRole="button" className="min-h-12 items-center justify-center rounded-md bg-secondary px-4">
									<Text className="text-sm font-semibold text-primary">Earnings</Text>
								</Pressable>
							</Link>
						</View>
					</Card>

					{commitments.length === 0 ? (
						<Card>
							<Text className="text-base font-semibold text-text">No commitments yet</Text>
							<Text className="text-sm leading-5 text-muted">
								Only accepted local commitments appear here. Saved gigs and viewed opportunities are not commitments.
							</Text>
							<Link href="/applicant/find-gigs" asChild>
								<Pressable accessibilityRole="button" className="min-h-12 items-center justify-center rounded-md bg-primary px-4">
									<Text className="text-sm font-semibold text-white">Find gigs</Text>
								</Pressable>
							</Link>
						</Card>
					) : null}

					{groups.map(({ status, commitments: grouped }) => grouped.length ? (
						<View key={status} className="gap-3">
							<Text className="text-lg font-semibold text-text">{statusLabels[status]}</Text>
							{grouped.map((commitment) => (
								<CommitmentCard
									key={commitment.id}
									commitment={commitment}
									attendance={attendanceRecords.find((record) => record.commitmentId === commitment.id)}
								/>
							))}
						</View>
					) : null)}
				</View>
			</ScrollView>
		</ScreenContainer>
	);
}
