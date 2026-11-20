export interface Birthday {
  employeeCode: string;
  employeeName: string;
  dateOfBirth: string;
  age: number;
  nextBirthday: string;
  nextBirthdayFormatted?: string;
  today: boolean;
  phone?: string;
}

export interface BirthdayRequest {
  employeeCode: string;
  dateOfBirth: string;
}

export interface MyBirthdayStatus {
  isBirthdayToday: boolean;
  employeeName: string | null;
  employeeCode: string | null;
  age: number | null;
  birthDate: string | null;
}
