export type OfferType = "FULL_TIME" | "INTERNSHIP";

export type OfferStatus = "ISSUED" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export interface OfferLetter {
  id: number;
  letterNumber: string;
  offerType: OfferType;
  candidateId?: number | null;
  employeeId?: number | null;
  recipientName: string;
  employeeCode?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  recipientAddress?: string | null;
  designation: string;
  department?: string | null;
  location?: string | null;
  reportingManager?: string | null;
  issuedDate: string;
  joiningDate: string;
  endDate?: string | null;
  durationLabel?: string | null;
  workingHours?: string | null;
  probationMonths?: number | null;
  noticePeriod?: string | null;
  monthlyBasic?: number | null;
  monthlyHra?: number | null;
  monthlyOtherAllowance?: number | null;
  monthlyVariable?: number | null;
  monthlyStipend?: number | null;
  annualCtc?: number | null;
  directorName?: string | null;
  hrSignatoryName?: string | null;
  issuedByName?: string | null;
  status: OfferStatus;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfferLetterInput {
  offerType: OfferType;
  candidateId?: number | "";
  employeeId?: number | "";
  recipientName: string;
  employeeCode?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  designation: string;
  department?: string;
  location?: string;
  reportingManager?: string;
  issuedDate?: string;
  joiningDate: string;
  endDate?: string;
  durationLabel?: string;
  workingHours?: string;
  probationMonths?: number | "";
  noticePeriod?: string;
  monthlyBasic?: number | "";
  monthlyHra?: number | "";
  monthlyOtherAllowance?: number | "";
  monthlyVariable?: number | "";
  monthlyStipend?: number | "";
  directorName?: string;
  hrSignatoryName?: string;
  sendEmail: boolean;
}

export interface OfferLetterSummary {
  totalOffers: number;
  fullTimeCount: number;
  internshipCount: number;
  acceptedCount: number;
  issuedCount: number;
}

export interface OfferLetterListParams {
  page?: number;
  size?: number;
  offerType?: OfferType | "";
  status?: OfferStatus | "";
  search?: string;
  sort?: string;
}
