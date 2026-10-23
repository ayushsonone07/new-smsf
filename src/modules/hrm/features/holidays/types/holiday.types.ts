export type HolidayType = "NATIONAL" | "REGIONAL" | "COMPANY" | "OPTIONAL";

export interface Holiday {
  id: number;
  name: string;
  holidayDate: string;
  type: HolidayType;
  region?: string | null;
  description?: string | null;
  optional: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HolidayInput {
  name: string;
  holidayDate: string;
  type: HolidayType;
  region?: string | null;
  description?: string | null;
  optional: boolean;
  active: boolean;
}

export interface HolidayListParams {
  year?: number;
  month?: number | "";
  type?: HolidayType | "";
  region?: string;
  active?: boolean | "";
  page?: number;
  size?: number;
  sort?: string;
}