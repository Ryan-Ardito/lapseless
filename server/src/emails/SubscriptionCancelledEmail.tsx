import { Text, Button, Section } from '@react-email/components';
import { Layout } from './components/Layout';
import { env } from '../env';
import { heading, paragraph, ctaButton, ctaSection } from './styles';

interface SubscriptionCancelledEmailProps {
  name: string;
}

export function SubscriptionCancelledEmail({ name }: SubscriptionCancelledEmailProps) {
  const firstName = name.split(' ')[0];

  return (
    <Layout preview="Your subscription has been cancelled">
      <Text style={heading}>Subscription Cancelled</Text>
      <Text style={paragraph}>
        Hi {firstName}, your subscription has been cancelled and your account has been
        moved to the free Demo tier.
      </Text>
      <Text style={paragraph}>
        Your data is still here. You can re-subscribe anytime to regain access to
        paid features.
      </Text>
      <Section style={ctaSection}>
        <Button style={ctaButton} href={`${env.FRONTEND_URL}/app/settings`}>
          Re-subscribe
        </Button>
      </Section>
    </Layout>
  );
}
