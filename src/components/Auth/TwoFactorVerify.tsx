import { useState } from 'react';
import {
  Stack, Title, Paper, Text, Button, PinInput, Group, Anchor, Center,
} from '@mantine/core';
import { IconShieldCheck } from '@tabler/icons-react';
import { verify2fa, resend2fa } from '../../api/http/two-factor';

export function TwoFactorVerify() {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  async function handleVerify() {
    if (code.length !== 6) return;
    setVerifying(true);
    setError('');
    try {
      const result = await verify2fa(code);
      window.location.href = result.redirect;
    } catch (err: any) {
      setError(err.message ?? 'Verification failed');
      setVerifying(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    try {
      await resend2fa();
    } catch (err: any) {
      setError(err.message ?? 'Failed to resend code');
    } finally {
      setResending(false);
    }
  }

  return (
    <Center mih="100vh" bg="gray.0">
      <Paper p="xl" radius="md" withBorder w={400}>
        <Stack align="center" gap="lg">
          <IconShieldCheck size={48} color="var(--mantine-color-blue-6)" />
          <Title order={3}>Two-Factor Verification</Title>
          <Text size="sm" c="dimmed" ta="center">
            Enter the 6-digit code sent to your phone
          </Text>

          <PinInput
            length={6}
            type="number"
            size="lg"
            value={code}
            onChange={setCode}
            oneTimeCode
            autoFocus
          />

          {error && (
            <Text size="sm" c="red" ta="center">{error}</Text>
          )}

          <Button
            fullWidth
            onClick={handleVerify}
            loading={verifying}
            disabled={code.length !== 6}
          >
            Verify
          </Button>

          <Group gap="xs">
            <Text size="sm" c="dimmed">Didn't receive the code?</Text>
            <Anchor size="sm" onClick={handleResend} style={{ cursor: 'pointer' }}>
              {resending ? 'Sending...' : 'Resend'}
            </Anchor>
          </Group>

          <Anchor size="sm" href="/" c="dimmed">
            Back to login
          </Anchor>
        </Stack>
      </Paper>
    </Center>
  );
}
