import { hrApiGet, hrApiPost } from "@shared/services";
import type { Birthday, BirthdayRequest, MyBirthdayStatus } from "../types/birthday.types";

export const birthdayService = {
  async getTodayBirthdays(): Promise<Birthday[]> {
    return hrApiGet<Birthday[]>("/api/v1/birthdays/today");
  },

  async getMyBirthdayStatus(): Promise<MyBirthdayStatus> {
    return hrApiGet<MyBirthdayStatus>("/api/v1/birthdays/my-status");
  },

  async triggerWishes(): Promise<{ success: boolean; sentCount: number }> {
    return hrApiPost<{ success: boolean; sentCount: number }>("/api/v1/birthdays/trigger-wishes", {});
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
