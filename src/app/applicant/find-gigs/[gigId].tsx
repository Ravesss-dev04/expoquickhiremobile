import { Link, router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ScreenContainer } from '@/components/ui/screen-container';
import { StatusBadge } from '@/components/ui/status-badge';
import { expertiseCategories } from '@/features/expertise/constants';
import { getAttendanceStatus } from '@/features/gigs/attendance';
import type { AttendanceAttempt } from '@/features/gigs/attendance';
import { isValidGigSchedule } from '@/features/gigs/commitments';
import type { CommitmentAttempt } from '@/features/gigs/commitments';
import { findGigById } from '@/features/gigs/discovery';
import { useGigs } from '@/features/gigs/gigs-context';
import { mockGigs } from '@/features/gigs/mock-data';
import { formatAttendanceTimestamp, formatScheduleOccurrence } from '@/features/gigs/schedule-display';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function formatDate(date: string) {
	return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	});
}

function commitmentFailureMessage(result: Extract<CommitmentAttempt, { ok: false }>) {
	switch (result.reason) {
		case 'DUPLICATE':
			return 'This gig is already recorded in My Gigs.';
		case 'GIG_UNAVAILABLE':
			return 'This opportunity is not open for a local commitment.';
		case 'LIMIT_REACHED':
			return `You already have ${result.activeCount} active commitments. The limit is two.`;
		case 'SCHEDULE_UNVERIFIABLE':
			return 'Exact shift dates and a timezone are not provided, so this schedule cannot be verified.';
		case 'INVALID_SCHEDULE':
			return 'This gig has an invalid schedule and cannot be committed safely.';
		case 'CONFLICT': {
			const conflictingGig = findGigById(mockGigs, result.conflictingGigId);
			return conflictingGig
				? `This schedule overlaps with ${conflictingGig.title}.`
				: 'This schedule overlaps with another active commitment.';
		}
	}
}

function attendanceFailureMessage(result: Extract<AttendanceAttempt, { ok: false }>) {
	switch (result.reason) {
		case 'COMMITMENT_NOT_FOUND': return 'The commitment could not be found.';
		case 'NOT_OWNER': return 'This commitment belongs to another applicant.';
		case 'COMMITMENT_NOT_ACTIVE': return 'Attendance is only available for active commitments.';
		case 'GIG_NOT_FOUND': return 'Gig details are unavailable, so attendance cannot be changed.';
		case 'SCHEDULE_UNVERIFIABLE': return 'Check-in is unavailable because exact scheduled times are missing.';
		case 'INVALID_SCHEDULE': return 'Check-in is unavailable because the gig schedule is invalid.';
		case 'ALREADY_CHECKED_IN': return 'This commitment has already been checked in.';
		case 'ALREADY_CHECKED_OUT': return 'This attendance session has already been checked out.';
		case 'NOT_CHECKED_IN': return 'Check in before checking out.';
		case 'INVALID_TIMESTAMP': return 'A valid timestamp could not be recorded.';
		case 'CHECK_OUT_NOT_LATER': return 'Check-out must be later than the recorded check-in.';
		case 'DUPLICATE_ATTENDANCE': return 'Multiple attendance records were found; no changes were made.';
		case 'ATTENDANCE_MISMATCH': return 'The attendance record does not match this commitment.';
	}
}

export default function GigDetailsScreen() {
	const { gigId } = useLocalSearchParams<{ gigId: string }>();
	const gig = findGigById(mockGigs, typeof gigId === 'string' ? gigId : undefined);
	const {
		isSaved,
		toggleSaved,
		activeCommitmentCount,
		getCommitmentForGig,
		previewCommitment,
		attemptCommitment,
		lastCommitmentAttempt,
		getAttendanceForCommitment,
		checkIn,
		checkOut,
		lastAttendanceAttempt,
	} = useGigs();

	const goBack = () => {
		if (router.canGoBack()) router.back();
		else router.replace('/applicant/find-gigs');
	};

	if (!gig) {
		return (
			<ScreenContainer>
				<View className="mx-auto w-full max-w-lg flex-1 justify-center gap-5 px-5">
					<Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} className="min-h-11 flex-row items-center gap-2 self-start">
						<SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor="#173B4A" size={18} />
						<Text className="text-sm font-semibold text-primary">Back</Text>
					</Pressable>
					<Card>
						<Text className="text-lg font-semibold text-text">Gig not found</Text>
						<Text className="text-sm leading-5 text-muted">This opportunity may have been removed or the link may be incorrect.</Text>
						<Link href="/applicant/find-gigs" asChild>
							<Pressable accessibilityRole="button" className="min-h-11 justify-center rounded-md bg-primary px-4">
								<Text className="text-center text-sm font-semibold text-white">Return to Find Gigs</Text>
							</Pressable>
						</Link>
					</Card>
				</View>
			</ScreenContainer>
		);
	}

	const category = expertiseCategories.find((item) => item.id === gig.categoryId)?.label ?? gig.categoryId;
	const available = gig.status === 'OPEN';
	const payBasis = gig.compensationType === 'HOUR' ? 'per hour' : gig.compensationType === 'SHIFT' ? 'per shift' : 'fixed';
	const saved = isSaved(gig.id);
	const existingCommitment = getCommitmentForGig(gig.id);
	const preview = previewCommitment(gig);
	const lastAttempt = lastCommitmentAttempt?.gigId === gig.id ? lastCommitmentAttempt.result : null;
	const commitmentMessage = lastAttempt?.ok
		? 'Local mock commitment recorded for this app session. This is not employer approval.'
		: lastAttempt
			? commitmentFailureMessage(lastAttempt)
			: preview.ok
				? 'The schedule is verified and there is room for this commitment.'
				: commitmentFailureMessage(preview);
	const attendance = existingCommitment ? getAttendanceForCommitment(existingCommitment.id) : undefined;
	const attendanceStatus = getAttendanceStatus(attendance);
	const attendanceAttempt = existingCommitment && lastAttendanceAttempt?.commitmentId === existingCommitment.id
		? lastAttendanceAttempt.result
		: null;
	const attendanceFeedback = attendanceAttempt?.ok
		? `${attendanceAttempt.record.checkedOutAt ? 'Check-out' : 'Check-in'} recorded at ${formatAttendanceTimestamp(
				attendanceAttempt.record.checkedOutAt ?? attendanceAttempt.record.checkedInAt,
				gig.schedule?.timeZone,
			)}`
		: attendanceAttempt
			? attendanceFailureMessage(attendanceAttempt)
			: null;
	const scheduleValid = isValidGigSchedule(gig.schedule);
	const checkInBlockedReason = !existingCommitment
		? 'A local mock commitment is required before attendance is available.'
		: existingCommitment.status !== 'ACTIVE'
			? 'Attendance is unavailable for completed or cancelled commitments.'
			: !gig.schedule
				? 'Check-in is unavailable because exact scheduled times are missing.'
				: !scheduleValid
					? 'Check-in is unavailable because the gig schedule is invalid.'
					: null;
	const canCheckIn = attendanceStatus === 'NOT_CHECKED_IN' && checkInBlockedReason === null;
	const canCheckOut = existingCommitment?.status === 'ACTIVE' && attendanceStatus === 'CHECKED_IN';

	return (
		<ScreenContainer>
			<ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
				<View className="mx-auto w-full max-w-lg gap-5 px-5 pb-8 pt-4">
					<Pressable accessibilityRole="button" accessibilityLabel="Go back to gigs" onPress={goBack} className="min-h-11 flex-row items-center gap-2 self-start">
						<SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor="#173B4A" size={18} />
						<Text className="text-sm font-semibold text-primary">Back to gigs</Text>
					</Pressable>

					<View className="gap-3">
						<View className="flex-row items-start justify-between gap-3">
							<Text className="flex-1 text-2xl font-bold leading-8 text-text">{gig.title}</Text>
							{available ? (
								<Pressable
									accessibilityRole="button"
									accessibilityLabel={saved ? `Remove ${gig.title} from saved gigs` : `Save ${gig.title}`}
									accessibilityState={{ selected: saved }}
									onPress={() => toggleSaved(gig.id)}
									className="h-11 w-11 items-center justify-center rounded-md bg-secondary">
									<SymbolView name={{ ios: saved ? 'bookmark.fill' : 'bookmark', android: saved ? 'bookmark' : 'bookmark_border', web: saved ? 'bookmark' : 'bookmark_border' }} tintColor={saved ? '#0F8B78' : '#53686C'} size={19} />
								</Pressable>
							) : null}
						</View>
						<Text className="text-base font-semibold text-muted">{gig.companyName}</Text>
						<View className="flex-row flex-wrap gap-2">
							<StatusBadge label={category} />
							<StatusBadge label={available ? 'Open' : gig.status === 'CLOSED' ? 'Closed' : 'Not yet open'} tone={available ? 'success' : 'warning'} />
						</View>
					</View>

					{!available ? (
						<Card>
							<Text className="text-sm font-semibold text-text">This opportunity is unavailable</Text>
							<Text className="text-sm leading-5 text-muted">You can review the details, but this gig is not currently accepting interest.</Text>
						</Card>
					) : null}

					<Card>
						<Text className="text-base font-semibold text-text">Gig details</Text>
						<Text className="text-sm leading-6 text-muted">{gig.description}</Text>
						<View className="gap-2">
							<Text className="text-sm font-semibold text-text">Company</Text>
							<Text className="text-sm leading-5 text-muted">{gig.companyDescription}</Text>
						</View>
					</Card>

					<Card>
						<Text className="text-base font-semibold text-text">Schedule and compensation</Text>
						<View className="gap-2">
							<Text className="text-sm text-muted">Location: {gig.location}</Text>
							<Text className="text-sm text-muted">Pay: {currency.format(gig.compensationAmount)} {payBasis}</Text>
							{gig.schedule && scheduleValid ? (
								<>
									<Text className="text-sm font-semibold text-text">Verified shift times ({gig.schedule.timeZone})</Text>
									{gig.schedule.occurrences.map((occurrence, index) => (
										<Text key={`${occurrence.startAt}-${index}`} className="text-sm leading-5 text-muted">
											{formatScheduleOccurrence(occurrence, gig.schedule!.timeZone)}
										</Text>
									))}
								</>
							) : gig.schedule ? (
								<Text className="text-sm leading-5 text-error">Schedule details are invalid and cannot be verified.</Text>
							) : (
								<>
									<Text className="text-sm text-muted">Listed dates: {formatDate(gig.startDate)}{gig.endDate ? ` to ${formatDate(gig.endDate)}` : ''}</Text>
									<Text className="text-sm text-muted">Listed hours: {gig.startTime} to {gig.endTime}</Text>
									<Text className="text-sm leading-5 text-muted">Exact shift dates and timezone are not provided; a commitment cannot be verified.</Text>
								</>
							)}
							<Text className="text-sm text-muted">Duration: {gig.duration}</Text>
							<Text className="text-sm text-muted">Schedule: {gig.gigType === 'SINGLE_SHIFT' ? 'Single shift' : gig.gigType === 'SHORT_TERM' ? 'Short-term' : 'Part-time'}</Text>
						</View>
					</Card>

					<Card>
						<Text className="text-base font-semibold text-text">Local commitment</Text>
						<Text className="text-sm leading-5 text-muted">Active commitments: {activeCommitmentCount} of 2</Text>
						<Text accessibilityLiveRegion="polite" className="text-sm leading-5 text-muted">
							{lastAttempt?.ok
								? commitmentMessage
								: existingCommitment
									? `This gig is already recorded as ${existingCommitment.status.toLowerCase()}.`
									: commitmentMessage}
						</Text>
						{available ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={existingCommitment ? `${gig.title} already has a local commitment` : `Record a local mock commitment for ${gig.title}`}
								accessibilityState={{ disabled: Boolean(existingCommitment) || !preview.ok }}
								disabled={Boolean(existingCommitment) || !preview.ok}
								onPress={() => attemptCommitment(gig)}
								className={`min-h-12 items-center justify-center rounded-md px-4 py-3 ${existingCommitment || !preview.ok ? 'bg-secondary' : 'bg-primary'}`}>
								<Text className={`text-center text-sm font-semibold ${existingCommitment || !preview.ok ? 'text-muted' : 'text-white'}`}>
									{existingCommitment ? 'Already recorded' : preview.ok ? 'Record local mock commitment' : 'Commitment unavailable'}
								</Text>
							</Pressable>
						) : null}
					</Card>

					<Card>
						<Text className="text-base font-semibold text-text">Attendance</Text>
						<View className="flex-row flex-wrap items-center gap-2">
							<Text className="text-sm font-semibold text-text">Session status</Text>
							<StatusBadge
								label={attendanceStatus === 'NOT_CHECKED_IN' ? 'Not checked in' : attendanceStatus === 'CHECKED_IN' ? 'Checked in' : 'Checked out'}
								tone={attendanceStatus === 'CHECKED_IN' ? 'success' : 'neutral'}
							/>
						</View>
						{attendance ? (
							<Text className="text-sm leading-5 text-muted">
								Actual check-in: {formatAttendanceTimestamp(attendance.checkedInAt, gig.schedule?.timeZone)}
							</Text>
						) : null}
						{attendance?.checkedOutAt ? (
							<Text className="text-sm leading-5 text-muted">
								Actual check-out: {formatAttendanceTimestamp(attendance.checkedOutAt, gig.schedule?.timeZone)}
							</Text>
						) : null}
						{attendanceStatus === 'NOT_CHECKED_IN' ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Check in to this commitment"
								accessibilityState={{ disabled: !canCheckIn }}
								disabled={!canCheckIn}
								onPress={() => existingCommitment && checkIn(existingCommitment.id)}
								className={`min-h-12 items-center justify-center rounded-md px-4 ${canCheckIn ? 'bg-primary' : 'bg-secondary'}`}>
								<Text className={`text-sm font-semibold ${canCheckIn ? 'text-white' : 'text-muted'}`}>
									{canCheckIn ? 'Check In' : 'Check In unavailable'}
								</Text>
							</Pressable>
						) : attendanceStatus === 'CHECKED_IN' ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Check out of this commitment"
								accessibilityState={{ disabled: !canCheckOut }}
								disabled={!canCheckOut}
								onPress={() => existingCommitment && checkOut(existingCommitment.id)}
								className={`min-h-12 items-center justify-center rounded-md px-4 ${canCheckOut ? 'bg-primary' : 'bg-secondary'}`}>
								<Text className={`text-sm font-semibold ${canCheckOut ? 'text-white' : 'text-muted'}`}>Check Out</Text>
							</Pressable>
						) : (
							<Text className="text-sm leading-5 text-muted">This attendance session is closed. Work status remains {existingCommitment?.status.toLowerCase() ?? 'unavailable'}.</Text>
						)}
						{attendanceStatus === 'NOT_CHECKED_IN' && checkInBlockedReason ? (
							<Text className="text-sm leading-5 text-muted">{checkInBlockedReason}</Text>
						) : null}
						{attendanceStatus === 'CHECKED_IN' && !canCheckOut ? (
							<Text className="text-sm leading-5 text-muted">Attendance actions are unavailable for completed or cancelled commitments.</Text>
						) : null}
						<Text accessibilityLiveRegion="polite" className="text-sm leading-5 text-muted">
							{attendanceFeedback ?? 'Attendance timestamps record mock actions only; they do not complete the work commitment.'}
						</Text>
					</Card>

					<Card>
						<Text className="text-base font-semibold text-text">Responsibilities</Text>
						{gig.responsibilities.map((responsibility) => (
							<Text key={responsibility} className="text-sm leading-5 text-muted">• {responsibility}</Text>
						))}
					</Card>

					<Card>
						<Text className="text-base font-semibold text-text">Requirements</Text>
						{gig.requirements.map((requirement) => (
							<Text key={requirement} className="text-sm leading-5 text-muted">• {requirement}</Text>
						))}
					</Card>

					<Text className="text-xs leading-5 text-muted">Demo listing only. Company and opportunity details are fictional.</Text>
				</View>
			</ScrollView>
		</ScreenContainer>
	);
}
