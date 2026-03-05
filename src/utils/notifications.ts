import type { Channel } from '../types/obligation';
import { daysUntil } from './dates';

export function generateMessage(obligationName: string, dueDate: string, channel: Channel): string {
  const days = daysUntil(dueDate);
  const prefix = channel === 'sms' ? '[Lapseless] ' : '';

  if (days < 0) {
    return `${prefix}${obligationName} is ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue! Take action now.`;
  }
  if (days === 0) {
    return `${prefix}${obligationName} is due today!`;
  }
  return `${prefix}${obligationName} is due in ${days} day${days === 1 ? '' : 's'}. Don't forget to renew.`;
}
