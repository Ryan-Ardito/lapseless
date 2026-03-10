import type { Category } from '../types/obligation';

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'license', label: 'License' },
  { value: 'ceu', label: 'CEU' },
  { value: 'tax', label: 'Tax' },
  { value: 'certification', label: 'Certification' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'credit-card', label: 'Credit Card Payment' },
  { value: 'mailbox', label: 'Mailbox Renewal' },
  { value: 'other', label: 'Other' },
];
