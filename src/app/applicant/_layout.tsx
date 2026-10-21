import AppTabs from '@/components/navigation/app-tabs';
import { GigsProvider } from '@/features/gigs/gigs-context';
import { useApplicantProfile } from '@/features/profile/profile-context';

export default function ApplicantLayout() {
	const { profile } = useApplicantProfile();

	return (
		<GigsProvider key={profile.id} applicantId={profile.id}>
			<AppTabs />
		</GigsProvider>
	);
}
