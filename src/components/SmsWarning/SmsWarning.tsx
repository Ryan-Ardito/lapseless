import { Alert, Anchor } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { Channel } from '../../types/obligation';
import type { SmsCredits } from '../../api/http/two-factor';

interface SmsWarningProps {
  channels: Channel[];
  phoneVerified: boolean;
  smsCredits: SmsCredits | null;
  reminderFrequency: 'once' | 'daily' | 'weekly';
}

function projectForFrequency(freq: 'once' | 'daily' | 'weekly'): number {
  if (freq === 'daily') return 30;
  if (freq === 'weekly') return 4;
  return 1;
}

export function SmsWarning({ channels, phoneVerified, smsCredits, reminderFrequency }: SmsWarningProps) {
  if (!channels.includes('sms')) return null;

  if (!phoneVerified) {
    return (
      <Alert variant="light" color="yellow" icon={<IconAlertTriangle size={16} />}>
        SMS requires a verified phone number.{' '}
        <Anchor href="/app/settings" size="sm">Set up in Settings.</Anchor>
      </Alert>
    );
  }

  if (smsCredits) {
    const newProjected = smsCredits.projected + projectForFrequency(reminderFrequency);
    if (newProjected > smsCredits.limit) {
      return (
        <Alert variant="light" color="orange" icon={<IconAlertTriangle size={16} />}>
          Your projected SMS usage (~{newProjected}/month) exceeds your plan limit ({smsCredits.limit}/month). Some messages may not be sent.
        </Alert>
      );
    }
  }

  return null;
}
