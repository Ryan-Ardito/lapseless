import { Text, Button, Section } from '@react-email/components';
import { Layout } from './components/Layout';
import { env } from '../env';
import { heading, paragraph, ctaButton, ctaSection } from './styles';

interface TestEmailProps {
  name: string;
}

export function TestEmail({ name }: TestEmailProps) {
  const firstName = name.split(' ')[0];

  return (
    <Layout preview="Test email from The Practice Atlas">
      <Text style={heading}>Test Email</Text>
      <Text style={paragraph}>
        Hi {firstName}, this is a test email to confirm that email notifications
        are working for your account.
      </Text>
      <Text style={paragraph}>
        If you received this, everything is set up correctly!
      </Text>
      <Section style={ctaSection}>
        <Button style={ctaButton} href={`${env.FRONTEND_URL}/app/settings`}>
          Go to Settings
        </Button>
      </Section>
    </Layout>
  );
}
