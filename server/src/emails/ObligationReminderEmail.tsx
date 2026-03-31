import { Text, Button, Section } from '@react-email/components';
import { Layout } from './components/Layout';
import { env } from '../env';
import { heading, paragraph, ctaButton, ctaSection, highlight } from './styles';

interface ObligationReminderEmailProps {
  name: string;
  obligationName: string;
  dueDate?: string;
  message: string;
  overdue?: boolean;
}

export function ObligationReminderEmail({ name, obligationName, dueDate, message, overdue }: ObligationReminderEmailProps) {
  const firstName = name.split(' ')[0];

  return (
    <Layout preview={`${overdue ? 'Overdue' : 'Reminder'}: ${obligationName}${dueDate ? ` — due ${dueDate}` : ''}`}>
      <Text style={heading}>{overdue ? 'Obligation Overdue' : 'Obligation Reminder'}</Text>
      <Text style={paragraph}>Hi {firstName},</Text>
      <Section style={overdue ? highlightOverdue : highlight}>
        <Text style={highlightTitle}>{obligationName}</Text>
        {dueDate && <Text style={overdue ? highlightDateOverdue : highlightDate}>Due: {dueDate}</Text>}
      </Section>
      <Text style={paragraph}>{message}</Text>
      <Section style={ctaSection}>
        <Button style={ctaButton} href={`${env.FRONTEND_URL}/app/dashboard`}>
          View Dashboard
        </Button>
      </Section>
    </Layout>
  );
}

const highlightTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 600 as const,
  margin: '0 0 4px',
};

const highlightDate = {
  color: '#619876',
  fontSize: '14px',
  margin: '0',
};

const highlightOverdue = {
  ...highlight,
  borderLeft: '4px solid #d9534f',
};

const highlightDateOverdue = {
  color: '#d9534f',
  fontSize: '14px',
  margin: '0',
};
