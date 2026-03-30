import { Text, Button, Section } from '@react-email/components';
import { Layout } from './components/Layout';
import { env } from '../env';
import { heading, paragraph, ctaButton, ctaSection } from './styles';

interface PaymentFailedEmailProps {
  name: string;
}

export function PaymentFailedEmail({ name }: PaymentFailedEmailProps) {
  const firstName = name.split(' ')[0];

  return (
    <Layout preview="Your payment failed — please update your payment method">
      <Text style={heading}>Payment Failed</Text>
      <Text style={paragraph}>
        Hi {firstName}, we were unable to process your most recent payment. Your
        subscription is still active, but please update your payment method to
        avoid any interruption to your service.
      </Text>
      <Text style={paragraph}>
        You can update your card or billing details through the Stripe billing
        portal below.
      </Text>
      <Section style={ctaSection}>
        <Button style={ctaButton} href={`${env.FRONTEND_URL}/app/settings`}>
          Update Payment Method
        </Button>
      </Section>
    </Layout>
  );
}
