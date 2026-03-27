import { Text, Button, Section } from '@react-email/components';
import { Layout } from './components/Layout';
import { env } from '../env';
import { heading, paragraph, ctaButton, ctaSection } from './styles';

interface WelcomeEmailProps {
  name: string;
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  const firstName = name.split(' ')[0];

  return (
    <Layout preview="Welcome to The Practice Atlas">
      <Text style={heading}>Welcome to The Practice Atlas</Text>
      <Text style={paragraph}>
        Hi {firstName}, thanks for signing up! The Practice Atlas helps you track
        obligations, stay on top of deadlines, and never miss what matters.
      </Text>
      <Text style={paragraph}>
        Explore our plans to unlock the full experience.
      </Text>
      <Section style={ctaSection}>
        <Button style={ctaButton} href={`${env.FRONTEND_URL}/#pricing`}>
          View Plans
        </Button>
      </Section>
    </Layout>
  );
}
