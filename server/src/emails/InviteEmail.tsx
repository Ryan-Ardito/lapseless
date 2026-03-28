import { Text, Button, Section } from '@react-email/components';
import { Layout } from './components/Layout';
import { env } from '../env';
import { heading, paragraph, ctaButton, ctaSection, highlight } from './styles';

interface InviteEmailProps {
  inviterName: string;
  orgName: string;
  role: string;
  inviteToken: string;
}

export function InviteEmail({ inviterName, orgName, role, inviteToken }: InviteEmailProps) {
  const inviteUrl = `${env.FRONTEND_URL}/invite/${inviteToken}`;

  return (
    <Layout preview={`${inviterName} invited you to join ${orgName} on The Practice Atlas`}>
      <Text style={heading}>You've been invited!</Text>
      <Text style={paragraph}>
        {inviterName} has invited you to join <strong>{orgName}</strong> as a {role} on The Practice Atlas.
      </Text>
      <Section style={highlight}>
        <Text style={{ ...paragraph, margin: 0 }}>
          <strong>Organization:</strong> {orgName}
          <br />
          <strong>Role:</strong> {role}
        </Text>
      </Section>
      <Section style={ctaSection}>
        <Button style={ctaButton} href={inviteUrl}>
          Accept Invitation
        </Button>
      </Section>
      <Text style={{ ...paragraph, fontSize: '13px', color: '#888' }}>
        This invitation will expire in 7 days. If you don't have an account yet,
        you'll be able to create one when you accept.
      </Text>
    </Layout>
  );
}
