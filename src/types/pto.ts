export type PTOType = 'vacation' | 'sick' | 'personal' | 'holiday' | 'other';

export interface PTOEntry {
  id: string;
  startDate: string;
  endDate: string;
  hours: number;
  type: PTOType;
  notes?: string;
  createdAt: string;
  deletedAt?: string;
}

export interface PTOConfig {
  yearlyAllowance: number;
  year: number;
}
