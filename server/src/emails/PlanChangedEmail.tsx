import { Text, Button, Section } from '@react-email/components';
import { Layout } from './components/Layout';
import { env } from '../env';
import { heading, paragraph, ctaButton, ctaSection } from './styles';

interface PlanChangedEmailProps {
  name: string;
  oldTier: string;
  newTier: string;
  direction: 'upgrade' | 'downgrade';
  effectiveDate?: string;
}

export function PlanChangedEmail({ name, oldTier, newTier, direction, effectiveDate }: PlanChangedEmailProps) {
  const firstName = name.split(' ')[0];
  const isUpgrade = direction === 'upgrade';

  return (
    <Layout preview={`Your plan has been changed to ${newTier}`}>
      <Text style={heading}>
        {isUpgrade ? 'Plan Upgraded' : 'Plan Change Scheduled'}
      </Text>
      <Text style={paragraph}>
        Hi {firstName}, your plan has been changed from <strong>{oldTier}</strong> to{' '}
        <strong>{newTier}</strong>.
      </Text>
      {isUpgrade ? (
        <Text style={paragraph}>
          Your upgrade is effective immediately. Enjoy your new features!
        </Text>
      ) : (
        <Text style={paragraph}>
          Your downgrade will take effect{effectiveDate ? ` on ${effectiveDate}` : ' at the end of your current billing period'}.
          You'll keep full access to your current plan until then.
        </Text>
      )}
      <Section style={ctaSection}>
        <Button style={ctaButton} href={`${env.FRONTEND_URL}/app/settings`}>
          View Settings
        </Button>
      </Section>
    </Layout>
  );
}
