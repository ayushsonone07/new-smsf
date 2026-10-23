import { hrApiGet, hrApiPost } from "@shared/services";
import type { Birthday, BirthdayRequest } from "../types/birthday.types";

export const birthdayService = {
  async getTodayBirthdays(): Promise<Birthday[]> {
    return hrApiGet<Birthday[]>("/api/v1/birthdays/today");
  },

  async getUpcomingBirthdays(days: number = 30): Promise<Birthday[]> {
    return hrApiGet<Birthday[]>(`/api/v1/birthdays/upcoming/${days}`);
  },

  async getEmployeeBirthday(employeeCode: string): Promise<Birthday> {
    return hrApiGet<Birthday>(`/api/v1/birthdays/employee/${employeeCode}`);
  },

  async saveBirthday(data: BirthdayRequest): Promise<void> {
    return hrApiPost<void>("/api/v1/birthdays/save", data);
  },
};
