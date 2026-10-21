export type GigStatus = 'OPEN' | 'DRAFT' | 'CLOSED';
export type CompensationType = 'HOUR' | 'SHIFT' | 'PROJECT';
export type GigType = 'SINGLE_SHIFT' | 'SHORT_TERM' | 'PART_TIME';

export type GigScheduleOccurrence = {
  startAt: string;
  endAt: string;
};

export type GigSchedule = {
  timeZone: string;
  occurrences: GigScheduleOccurrence[];
};

export type CommitmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type GigCommitment = {
  id: string;
  gigId: string;
  applicantId: string;
  status: CommitmentStatus;
};

export type AttendanceRecord = {
  id: string;
  commitmentId: string;
  gigId: string;
  applicantId: string;
  checkedInAt: string;
  checkedOutAt?: string;
};

export type AttendanceStatus = 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_OUT';

export type ApplicantFeedback = {
  id: string;
  commitmentId: string;
  gigId: string;
  applicantId: string;
  companyName: string;
  rating: number;
  comment?: string;
  submittedAt: string;
};

export type CompanyApplicantReview = {
  id: string;
  commitmentId: string;
  gigId: string;
  applicantId: string;
  companyName: string;
  rating: number;
  comment?: string;
  submittedAt: string;
};

export type EarningStatus = 'CONFIRMED' | 'PAID';

export type EarningRecord = {
  id: string;
  commitmentId: string;
  gigId: string;
  applicantId: string;
  amountMinor: number;
  currency: string;
  compensationType: CompensationType;
  status: EarningStatus;
  confirmedAt: string;
  paidAt?: string;
};

export type Gig = {
  id: string;
  title: string;
  companyName: string;
  companyDescription: string;
  categoryId: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  location: string;
  compensationAmount: number;
  compensationType: CompensationType;
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  schedule?: GigSchedule;
  duration: string;
  gigType: GigType;
  status: GigStatus;
  postedAt: string;
};

export type GigFilters = {
  categoryId: string | null;
  location: string | null;
  gigType: GigType | null;
};