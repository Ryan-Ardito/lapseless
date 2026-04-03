import { Title, Text, Stack, List, Anchor, Code, Image } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { LegalPageLayout } from './LegalPageLayout';

export function SmsPolicy() {
  return (
    <LegalPageLayout>
      <Stack gap="lg">
        <Title order={1}>SMS Policy</Title>
        <Text c="dimmed" size="sm">Last updated: April 3, 2026</Text>

        <section>
          <Title order={2} size="h3" mb="xs">Program Name</Title>
          <Text>
            The Practice Atlas SMS Notifications, operated by Data Locality LLC.
            Messages are sent from <strong>+1 (866) 975-0548</strong>.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">What Messages We Send</Title>
          <Text mb="xs">
            The Practice Atlas sends the following types of SMS text messages:
          </Text>
          <List spacing="xs">
            <List.Item><strong>Deadline Reminders:</strong> Automated notifications about upcoming obligation deadlines, renewal dates, and status changes.</List.Item>
            <List.Item><strong>Two-Factor Authentication (2FA):</strong> One-time verification codes for account security.</List.Item>
            <List.Item><strong>Account Alerts:</strong> Important account-related notifications such as billing confirmations or security alerts.</List.Item>
          </List>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Sample Messages</Title>
          <Text mb="xs">Examples of messages you may receive:</Text>
          <List spacing="xs">
            <List.Item><Code>"Annual Business License Renewal" is due in 3 day(s){'\n\n'}Reply STOP to unsubscribe</Code></List.Item>
            <List.Item><Code>"Quarterly Tax Filing" is due today{'\n\n'}Reply STOP to unsubscribe</Code></List.Item>
            <List.Item><Code>Your Practice Atlas verification code is: 123456</Code></List.Item>
          </List>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">How to Opt In</Title>
          <Text mb="xs">
            Opting in to SMS notifications is a multi-step process that requires your explicit consent:
          </Text>
          <List type="ordered" spacing="xs">
            <List.Item>Create a Practice Atlas account at <Anchor href="https://thepracticeatlas.com">thepracticeatlas.com</Anchor>.</List.Item>
            <List.Item>Navigate to Account Settings and enter your phone number.</List.Item>
            <List.Item>Click "Send Code" to receive a one-time verification code via SMS.</List.Item>
            <List.Item>Enter the verification code to confirm your phone number.</List.Item>
            <List.Item>Enable SMS as a notification channel for the obligations you want to receive reminders about.</List.Item>
          </List>
          <Image
            src="/sms-optin.png"
            alt="Screenshot of the SMS opt-in flow in The Practice Atlas account settings"
            maw={600}
            mt="md"
            radius="md"
            style={{ border: '1px solid var(--mantine-color-gray-3)' }}
          />
          <Text mt="xs">
            Consent to receive SMS messages is voluntary and is not a condition of purchasing any
            goods or services from us. SMS notifications are not enabled by default.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Message Frequency</Title>
          <Text>
            Message frequency varies based on your notification settings and the number of obligations
            you track. You control which notifications are sent via SMS in your account settings.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">How to Opt Out</Title>
          <Text>
            You can opt out of SMS messages at any time by replying <strong>STOP</strong> to any
            message you receive from us, or by disabling SMS notifications in your account settings.
            After opting out, you will receive a one-time confirmation message. You will no longer
            receive SMS messages unless you re-enable them.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Help</Title>
          <Text>
            For help with SMS messages, reply <strong>HELP</strong> to any message you receive from
            us, or contact us at <Anchor href="mailto:support@datalocalityllc.com">support@datalocalityllc.com</Anchor>.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Message and Data Rates</Title>
          <Text>
            Message and data rates may apply depending on your mobile carrier plan. You are
            responsible for any charges from your carrier related to receiving text messages.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">No Sharing</Title>
          <Text>
            We will not sell, rent, or share your phone number or any opt-in data with third parties
            or affiliates for promotional or marketing purposes. Your phone number is used solely to
            deliver the messages described above and is shared only with our SMS delivery provider
            (Twilio) as necessary to transmit messages.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Carrier Disclaimer</Title>
          <Text>
            Carriers are not liable for delayed or undelivered messages. Message delivery is subject
            to effective transmission from your network.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Contact</Title>
          <Text>
            Data Locality LLC<br />
            Email: <Anchor href="mailto:support@datalocalityllc.com">support@datalocalityllc.com</Anchor><br />
            Website: <Anchor href="https://thepracticeatlas.com">thepracticeatlas.com</Anchor>
          </Text>
        </section>

        <section>
          <Text>
            For more information, please see our{' '}
            <Anchor component={Link} to="/privacy">Privacy Policy</Anchor> and{' '}
            <Anchor component={Link} to="/terms">Terms of Service</Anchor>.
          </Text>
        </section>
      </Stack>
    </LegalPageLayout>
  );
}
