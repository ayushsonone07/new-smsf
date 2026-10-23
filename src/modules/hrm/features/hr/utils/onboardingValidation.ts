import type { ManualOnboardingInput } from "../types";

export interface OnboardingFormErrors {
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianNumber?: string;
  address?: string;
  vehicleNumber?: string;
  vehicleBrand?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  resume?: string;
  aadhaarCard?: string;
  panCard?: string;
  experienceLetter?: string;
  bankPassbook?: string;
  passportPhoto?: string;
  marksheet10?: string;
  marksheet12?: string;
  marksheetGraduation?: string;
}

export const MAX_ONBOARDING_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

export const VALID_BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export const ALLOWED_DOC_EXTENSIONS = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "webp"];
export const ALLOWED_PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateDateOfBirth(dob: string): string | null {
  if (!dob || !dob.trim()) {
    return "Date of birth is required";
  }
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) {
    return "Please enter a valid date of birth";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (birthDate > today) {
    return "Date of birth cannot be in the future";
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 18) {
    return `Candidate must be at least 18 years old (currently ${age} years)`;
  }
  if (age > 90) {
    return "Please enter a valid date of birth";
  }
  return null;
}

export function validateGender(gender: string): string | null {
  if (!gender || !gender.trim()) {
    return "Gender is required";
  }
  const valid = ["male", "female", "other"];
  if (!valid.includes(gender.trim().toLowerCase())) {
    return "Please select a valid gender option";
  }
  return null;
}

export function validateBloodGroup(bg: string): string | null {
  if (!bg || !bg.trim()) {
    return null; // optional
  }
  const cleaned = bg.trim().toUpperCase();
  if (!(VALID_BLOOD_GROUPS as readonly string[]).includes(cleaned)) {
    return "Invalid blood group (e.g. A+, B+, O+, AB+)";
  }
  return null;
}

export function validateGuardianName(name: string): string | null {
  if (!name || !name.trim()) {
    return "Guardian name is required";
  }
  if (name.trim().length < 2) {
    return "Guardian name must be at least 2 characters";
  }
  if (name.trim().length > 100) {
    return "Guardian name cannot exceed 100 characters";
  }
  return null;
}

export function validateGuardianRelation(rel: string): string | null {
  if (!rel || !rel.trim()) {
    return "Guardian relation is required";
  }
  if (rel.trim().length < 2) {
    return "Guardian relation must be at least 2 characters (e.g. Father, Mother)";
  }
  return null;
}

export function validateGuardianNumber(num: string): string | null {
  if (!num || !num.trim()) {
    return "Guardian mobile number is required";
  }
  const cleaned = num.trim().replace(/\D/g, "");
  if (cleaned.length !== 10) {
    return `Guardian mobile number must be exactly 10 digits (currently ${cleaned.length})`;
  }
  if (!/^[6-9]/.test(cleaned)) {
    return "Mobile number must start with 6, 7, 8, or 9";
  }
  return null;
}

export function validateAddress(address: string): string | null {
  if (!address || !address.trim()) {
    return "Address is required";
  }
  if (address.trim().length < 5) {
    return "Address must be at least 5 characters";
  }
  return null;
}

export function validateAadhaarNumber(aadhaar: string): string | null {
  if (!aadhaar || !aadhaar.trim()) {
    return "Aadhaar number is required";
  }
  const cleaned = aadhaar.trim().replace(/\s|-/g, "");
  if (!/^\d+$/.test(cleaned)) {
    return "Aadhaar number must contain only digits";
  }
  if (cleaned.length !== 12) {
    return `Aadhaar number must be exactly 12 digits (currently ${cleaned.length})`;
  }
  return null;
}

export function validatePanNumber(pan: string): string | null {
  if (!pan || !pan.trim()) {
    return null; // optional
  }
  const cleaned = pan.trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(cleaned)) {
    return "Invalid PAN format. Must be 10 characters (e.g. ABCDE1234F)";
  }
  return null;
}

export function validateBankAccountNumber(acc: string): string | null {
  if (!acc || !acc.trim()) {
    return "Bank account number is required";
  }
  const cleaned = acc.trim();
  if (!/^\d+$/.test(cleaned)) {
    return "Account number must contain only digits";
  }
  if (cleaned.length < 9 || cleaned.length > 18) {
    return `Bank account number must be between 9 and 18 digits (currently ${cleaned.length})`;
  }
  return null;
}

export function validateBankIfsc(ifsc: string): string | null {
  if (!ifsc || !ifsc.trim()) {
    return "Bank IFSC code is required";
  }
  const cleaned = ifsc.trim().toUpperCase();
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(cleaned)) {
    return "Invalid IFSC code (e.g. SBIN0001234: 4 letters, 0, 6 letters/digits)";
  }
  return null;
}

export function validateBankName(name: string): string | null {
  if (!name || !name.trim()) {
    return "Bank name is required";
  }
  if (name.trim().length < 2) {
    return "Bank name must be at least 2 characters";
  }
  return null;
}

export function validateFile(
  file: File | null | undefined,
  label: string,
  required: boolean,
  allowedExtensions: string[] = ALLOWED_DOC_EXTENSIONS,
  existingUrl?: string | null
): string | null {
  if (!file) {
    if (required && !existingUrl) {
      return `${label} is required`;
    }
    return null;
  }

  if (file.size > MAX_ONBOARDING_FILE_SIZE) {
    return `${label} exceeds 1 MB limit (${formatFileSize(file.size)}). Please choose a file under 1 MB.`;
  }

  const parts = file.name.split(".");
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  if (!ext || !allowedExtensions.includes(ext)) {
    return `${label} must be a valid file type (${allowedExtensions.join(", ")})`;
  }

  return null;
}

export function validateOnboardingForm(
  values: ManualOnboardingInput,
  options?: {
    existingUrls?: Partial<Record<keyof ManualOnboardingInput, string | null>>;
  }
): OnboardingFormErrors {
  const errors: OnboardingFormErrors = {};
  const urls = options?.existingUrls ?? {};

  const dobErr = validateDateOfBirth(values.dateOfBirth);
  if (dobErr) errors.dateOfBirth = dobErr;

  const genderErr = validateGender(values.gender);
  if (genderErr) errors.gender = genderErr;

  const bloodErr = validateBloodGroup(values.bloodGroup);
  if (bloodErr) errors.bloodGroup = bloodErr;

  const gNameErr = validateGuardianName(values.guardianName);
  if (gNameErr) errors.guardianName = gNameErr;

  const gRelErr = validateGuardianRelation(values.guardianRelation);
  if (gRelErr) errors.guardianRelation = gRelErr;

  const gNumErr = validateGuardianNumber(values.guardianNumber);
  if (gNumErr) errors.guardianNumber = gNumErr;

  const addrErr = validateAddress(values.address);
  if (addrErr) errors.address = addrErr;

  const aadhaarErr = validateAadhaarNumber(values.aadhaarNumber);
  if (aadhaarErr) errors.aadhaarNumber = aadhaarErr;

  const panErr = validatePanNumber(values.panNumber);
  if (panErr) errors.panNumber = panErr;

  const accErr = validateBankAccountNumber(values.bankAccountNumber);
  if (accErr) errors.bankAccountNumber = accErr;

  const ifscErr = validateBankIfsc(values.bankIfsc);
  if (ifscErr) errors.bankIfsc = ifscErr;

  const bankNameErr = validateBankName(values.bankName);
  if (bankNameErr) errors.bankName = bankNameErr;

  // Documents
  const resumeErr = validateFile(values.resume, "Updated resume", true, ALLOWED_DOC_EXTENSIONS, urls.resume);
  if (resumeErr) errors.resume = resumeErr;

  const aadhaarCardErr = validateFile(values.aadhaarCard, "Aadhaar card", true, ALLOWED_DOC_EXTENSIONS, urls.aadhaarCard);
  if (aadhaarCardErr) errors.aadhaarCard = aadhaarCardErr;

  const panCardErr = validateFile(values.panCard, "PAN card", false, ALLOWED_DOC_EXTENSIONS, urls.panCard);
  if (panCardErr) errors.panCard = panCardErr;

  const passbookErr = validateFile(values.bankPassbook, "Bank passbook", true, ALLOWED_DOC_EXTENSIONS, urls.bankPassbook);
  if (passbookErr) errors.bankPassbook = passbookErr;

  const photoErr = validateFile(values.passportPhoto, "Passport photo", true, ALLOWED_PHOTO_EXTENSIONS, urls.passportPhoto);
  if (photoErr) errors.passportPhoto = photoErr;

  const m10Err = validateFile(values.marksheet10, "10th marksheet", true, ALLOWED_DOC_EXTENSIONS, urls.marksheet10);
  if (m10Err) errors.marksheet10 = m10Err;

  const m12Err = validateFile(values.marksheet12, "12th marksheet", true, ALLOWED_DOC_EXTENSIONS, urls.marksheet12);
  if (m12Err) errors.marksheet12 = m12Err;

  const gradErr = validateFile(values.marksheetGraduation, "Graduation certificate", false, ALLOWED_DOC_EXTENSIONS, urls.marksheetGraduation);
  if (gradErr) errors.marksheetGraduation = gradErr;

  const expErr = validateFile(values.experienceLetter, "Experience letter", false, ALLOWED_DOC_EXTENSIONS, urls.experienceLetter);
  if (expErr) errors.experienceLetter = expErr;

  return errors;
}

