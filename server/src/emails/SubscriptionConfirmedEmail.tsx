import { Text, Button, Section } from '@react-email/components';
import { Layout } from './components/Layout';
import { env } from '../env';
import { heading, paragraph, ctaButton, ctaSection } from './styles';

interface SubscriptionConfirmedEmailProps {
  name: string;
  tierName: string;
}

export function SubscriptionConfirmedEmail({ name, tierName }: SubscriptionConfirmedEmailProps) {
  const firstName = name.split(' ')[0];

  return (
    <Layout preview={`Your ${tierName} plan is active`}>
      <Text style={heading}>Subscription Confirmed</Text>
      <Text style={paragraph}>
        Hi {firstName}, your <strong>{tierName}</strong> plan is now active.
        You have full access to all features included in your plan.
      </Text>
      <Text style={paragraph}>
        You can manage your subscription anytime from Settings. Payment receipts
        are sent directly by Stripe.
      </Text>
      <Section style={ctaSection}>
        <Button style={ctaButton} href={`${env.FRONTEND_URL}/app/dashboard`}>
          View Dashboard
        </Button>
      </Section>
    </Layout>
  );
}
