export interface Interview {
  id: number;
  candidateId: number;
  candidateName: string;
  candidateEmail?: string;
  interviewerId?: number;
  interviewerName?: string;
  round: string;
  mode: string;
  scheduledDate: string;
  scheduledTime: string;
  scheduledDateTime?: string;
  durationMinutes: number;
  location?: string;
  meetingLink?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewInput {
  candidateId: number;
  interviewerId?: number;
  round: string;
  mode: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes?: number;
  location?: string;
  meetingLink?: string;
  notes?: string;
}

export interface InterviewStatusChange {
  status: string;
  note?: string;
}
