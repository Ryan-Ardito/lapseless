import { useState, useEffect } from 'react';
import {
  Paper, Text, Group, Button, Stack, Badge, Switch, Progress, PinInput, Modal, Select,
} from '@mantine/core';
import { IconBell, IconMessage, IconMail, IconDeviceMobile, IconCheck, IconAlertTriangle, IconClock } from '@tabler/icons-react';
import { TIME_OPTIONS } from '../../constants/time';
import { notify } from '../../utils/notify';
import { PhoneInput } from '../PhoneInput/PhoneInput';
import {
  get2faStatus, sendSetupCode, verifySetupPhone, toggle2fa, removePhone,
  sendTestSms, sendTestEmail, getSmsCredits,
  sendUserTestSms, sendUserTestEmail, getUserSmsCredits,
  type TwoFactorStatus, type SmsCredits,
} from '../../api/http/two-factor';
import { useSettings } from '../../hooks/useSettings';

interface NotificationSectionProps {
  orgId?: string;
}

export function NotificationSection({ orgId }: NotificationSectionProps) {
  const { settings, updateSettings } = useSettings();
  const [defaultTime, setDefaultTime] = useState('');
  const [savingTime, setSavingTime] = useState(false);
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

  useEffect(() => {
    setDefaultTime(settings.defaultReminder.time ?? '09:00');
  }, [settings.defaultReminder.time]);

  async function handleSaveDefaultTime() {
    setSavingTime(true);
    try {
      await updateSettings({
        defaultReminder: { ...settings.defaultReminder, time: defaultTime },
      });
      notify.success('Default reminder time saved');
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to save');
    } finally {
      setSavingTime(false);
    }
  }

  async function handleTestSms() {
    setSendingTest(true);
    try {
      if (orgId) {
        await sendTestSms(orgId);
      } else {
        await sendUserTestSms();
      }
      notify.success('Test SMS sent');
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to send test SMS');
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
      notify.success('Test email sent — check your inbox');
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to send test email');
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
          <div>
            <Group mb="xs" gap="xs">
              <IconClock size={18} />
              <Text fw={600} size="sm">Default Reminder Time</Text>
            </Group>
            <Text size="sm" c="dimmed" mb="xs">
              Set the time of day you'd like to receive reminders. Individual obligations can override this.
            </Text>
            <Group align="end" gap="xs">
              <Select
                data={TIME_OPTIONS}
                value={defaultTime}
                onChange={(val) => val && setDefaultTime(val)}
                searchable
                allowDeselect={false}
                style={{ width: 160 }}
              />
              <Button
                variant="light"
                size="sm"
                loading={savingTime}
                disabled={defaultTime === (settings.defaultReminder.time ?? '09:00')}
                onClick={handleSaveDefaultTime}
              >
                Save
              </Button>
            </Group>
          </div>

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
                    notify.success(enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
                  } catch (err: any) {
                    notify.error(err.message ?? 'Failed to update 2FA');
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
                      notify.success('Verification code sent');
                    } catch (err: any) {
                      notify.error(err.message ?? 'Failed to send code');
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
                      notify.success('Phone number verified');
                    } catch (err: any) {
                      notify.error(err.message ?? 'Verification failed');
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
                  notify.success('Phone number removed');
                } catch (err: any) {
                  notify.error(err.message ?? 'Failed to remove phone');
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
