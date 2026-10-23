export type AnnouncementType = "GENERAL" | "HR" | "COMPANY" | "URGENT";

export interface Announcement {
  id: number;
  title: string;
  content?: string | null;
  type: AnnouncementType;
  targetAudience?: string | null;
  pinned: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnnouncementInput {
  title: string;
  content?: string | null;
  type: AnnouncementType;
  targetAudience?: string | null;
  pinned: boolean;
  active: boolean;
}

export interface AnnouncementListParams {
  type?: AnnouncementType | "";
  targetAudience?: string;
  pinned?: boolean | "";
  active?: boolean | "";
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}