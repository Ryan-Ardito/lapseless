import { useState, useEffect } from 'react';
import {
  Paper, Text, Group, Button, Stack, Badge, Switch, Progress, PinInput, Modal,
} from '@mantine/core';
import { IconBell, IconMessage, IconMail, IconDeviceMobile, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { PhoneInput } from '../PhoneInput/PhoneInput';
import {
  get2faStatus, sendSetupCode, verifySetupPhone, toggle2fa, removePhone,
  sendTestSms, sendTestEmail, getSmsCredits,
  sendUserTestSms, sendUserTestEmail, getUserSmsCredits,
  type TwoFactorStatus, type SmsCredits,
} from '../../api/http/two-factor';

interface NotificationSectionProps {
  orgId?: string;
}

export function NotificationSection({ orgId }: NotificationSectionProps) {
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingTestEmailState, setSendingTestEmailState] = useState(false);
  const [tfaStatus, setTfaStatus] = useState<TwoFactorStatus | null>(null);
  const [smsCredits, setSmsCredits] = useState<SmsCredits | null>(null);
  const [setupPhone, setSetupPhone] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [setupStep, setSetupStep] = useState<'idle' | 'code-sent' | 'verifying'>('idle');
  const [sendingSetup, setSendingSetup] = useState(false);
  const [toggling2fa, setToggling2fa] = useState(false);
  const [removingPhone, setRemovingPhone] = useState(false);
  const [removePhoneModalOpen, setRemovePhoneModalOpen] = useState(false);

  useEffect(() => {
    get2faStatus().then(setTfaStatus).catch(() => {});
    const fetchCredits = orgId ? () => getSmsCredits(orgId) : getUserSmsCredits;
    fetchCredits().then(setSmsCredits).catch(() => {});
  }, [orgId]);

  async function handleTestSms() {
    setSendingTest(true);
    try {
      if (orgId) {
        await sendTestSms(orgId);
      } else {
        await sendUserTestSms();
      }
      toast.success('Test SMS sent');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to send test SMS');
    } finally {
      setSendingTest(false);
    }
  }

  async function handleTestEmail() {
    setSendingTestEmailState(true);
    try {
      if (orgId) {
        await sendTestEmail(orgId);
      } else {
        await sendUserTestEmail();
      }
      toast.success('Test email sent — check your inbox');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to send test email');
    } finally {
      setSendingTestEmailState(false);
    }
  }

  function refreshSmsCredits() {
    const fetchCredits = orgId ? () => getSmsCredits(orgId) : getUserSmsCredits;
    fetchCredits().then(setSmsCredits).catch(() => {});
  }

  return (
    <>
      <Paper p="md" radius="md" withBorder>
        <Group mb="md" gap="xs">
          <IconBell size={20} />
          <Text fw={600}>Notifications</Text>
        </Group>
        <Stack gap="md">
          <Group gap="xs" align="center">
            <Text size="sm" c="dimmed" style={{ flex: 1 }}>
              Email notifications are sent to your account email.
            </Text>
            <Button
              leftSection={<IconMail size={16} />}
              variant="light"
              disabled={sendingTestEmailState}
              loading={sendingTestEmailState}
              onClick={handleTestEmail}
            >
              Send Test Email
            </Button>
          </Group>

          <Group mb="xs" gap="xs">
            <IconDeviceMobile size={18} />
            <Text fw={600} size="sm">Phone & SMS</Text>
          </Group>
          {tfaStatus?.phoneVerified ? (
            <>
              <Group gap="xs">
                <Badge variant="light" color="green" size="sm" leftSection={<IconCheck size={12} />}>Phone Verified</Badge>
                {tfaStatus.phone && (
                  <Text size="sm" c="dimmed">Phone: {tfaStatus.phone}</Text>
                )}
              </Group>

              {smsCredits && (() => {
                const pct = smsCredits.limit > 0 ? (smsCredits.used / smsCredits.limit) * 100 : 0;
                const barColor = pct > 80 ? 'red' : pct > 50 ? 'yellow' : 'green';
                return (
                  <Stack gap="xs">
                    <Progress value={pct} size="lg" radius="xl" color={barColor} />
                    <Text size="sm" c="dimmed">
                      {smsCredits.used}/{smsCredits.limit} SMS credits used this month
                    </Text>
                    {smsCredits.projected > smsCredits.limit && (
                      <Group gap={4}>
                        <IconAlertTriangle size={14} color="var(--mantine-color-orange-6)" />
                        <Text size="xs" c="orange">
                          Projected usage (~{smsCredits.projected}/month) exceeds your plan limit. Some messages may not be sent.
                        </Text>
                      </Group>
                    )}
                    {smsCredits.resetAt && (
                      <Text size="xs" c="dimmed">
                        Credits reset {new Date(smsCredits.resetAt).toLocaleDateString()}
                      </Text>
                    )}
                  </Stack>
                );
              })()}

              <Switch
                label="Also use for login verification (Two-factor authentication)"
                checked={tfaStatus.twoFactorEnabled}
                disabled={toggling2fa}
                onChange={async (e) => {
                  const enabled = e.currentTarget.checked;
                  setToggling2fa(true);
                  try {
                    await toggle2fa(enabled);
                    setTfaStatus((s) => s ? { ...s, twoFactorEnabled: enabled } : s);
                    toast.success(enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
                  } catch (err: any) {
                    toast.error(err.message ?? 'Failed to update 2FA');
                  } finally {
                    setToggling2fa(false);
                  }
                }}
              />

              <Group gap="xs">
                <Button
                  leftSection={<IconMessage size={16} />}
                  variant="light"
                  disabled={sendingTest}
                  loading={sendingTest}
                  onClick={handleTestSms}
                >
                  Send Test SMS
                </Button>
                <Button
                  variant="light"
                  color="red"
                  size="sm"
                  onClick={() => setRemovePhoneModalOpen(true)}
                >
                  Remove Phone
                </Button>
              </Group>
            </>
          ) : setupStep === 'idle' ? (
            <>
              <Text size="sm" c="dimmed">
                Add your phone number to receive SMS reminders for your obligations.
              </Text>
              <Group align="end">
                <PhoneInput
                  label="Phone number"
                  value={setupPhone}
                  onChange={setSetupPhone}
                  style={{ flex: 1 }}
                />
                <Button
                  variant="light"
                  loading={sendingSetup}
                  disabled={!setupPhone.trim()}
                  onClick={async () => {
                    setSendingSetup(true);
                    try {
                      await sendSetupCode(setupPhone);
                      setSetupStep('code-sent');
                      toast.success('Verification code sent');
                    } catch (err: any) {
                      toast.error(err.message ?? 'Failed to send code');
                    } finally {
                      setSendingSetup(false);
                    }
                  }}
                >
                  Send Code
                </Button>
              </Group>
            </>
          ) : (
            <>
              <Text size="sm" c="dimmed">
                Enter the 6-digit code sent to {setupPhone}
              </Text>
              <PinInput
                length={6}
                type="number"
                value={setupCode}
                onChange={setSetupCode}
                oneTimeCode
              />
              <Group>
                <Button
                  variant="light"
                  loading={setupStep === 'verifying'}
                  disabled={setupCode.length !== 6}
                  onClick={async () => {
                    setSetupStep('verifying');
                    try {
                      await verifySetupPhone(setupCode, setupPhone);
                      setTfaStatus({ twoFactorEnabled: false, phoneVerified: true, phone: setupPhone.slice(0, -4).replace(/./g, '*') + setupPhone.slice(-4) });
                      setSetupStep('idle');
                      setSetupCode('');
                      refreshSmsCredits();
                      toast.success('Phone number verified');
                    } catch (err: any) {
                      toast.error(err.message ?? 'Verification failed');
                      setSetupStep('code-sent');
                    }
                  }}
                >
                  Verify
                </Button>
                <Button variant="subtle" onClick={() => { setSetupStep('idle'); setSetupCode(''); }}>
                  Cancel
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Paper>

      <Modal
        opened={removePhoneModalOpen}
        onClose={() => setRemovePhoneModalOpen(false)}
        title="Remove Phone Number"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            This will remove your phone number and disable two-factor authentication. SMS reminders will stop working.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setRemovePhoneModalOpen(false)}>Cancel</Button>
            <Button
              color="red"
              loading={removingPhone}
              onClick={async () => {
                setRemovingPhone(true);
                try {
                  await removePhone();
                  setTfaStatus({ twoFactorEnabled: false, phoneVerified: false, phone: null });
                  setSmsCredits(null);
                  setRemovePhoneModalOpen(false);
                  toast.success('Phone number removed');
                } catch (err: any) {
                  toast.error(err.message ?? 'Failed to remove phone');
                } finally {
                  setRemovingPhone(false);
                }
              }}
            >
              Remove Phone
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
