export type PTOType = 'vacation' | 'sick' | 'personal' | 'holiday' | 'other';

export interface PTOEntry {
  id: string;
  date: string; // ISO date string
  hours: number;
  type: PTOType;
  notes?: string;
  createdAt: string;
}

export interface PTOConfig {
  yearlyAllowance: number;
  year: number;
}
