import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Paper, Text, Button, SimpleGrid, FileInput, Progress,
  Group, Modal, Switch, Badge, PinInput,
} from '@mantine/core';
import { IconMessage, IconMail, IconTrash, IconShieldLock, IconBell, IconDeviceMobile, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { PhoneInput } from '../PhoneInput/PhoneInput';
import { exportAllData, importData } from '../../utils/dataExport';
import { deleteAllData } from '../../utils/dataDeletion';
import { deleteAccount } from '../../api/profile';
import { useConsent } from '../../hooks/useConsent';
import {
  get2faStatus, sendSetupCode, verifySetupPhone, toggle2fa, removePhone, sendTestSms,
  sendTestEmail,
  getSmsCredits,
  type TwoFactorStatus, type SmsCredits,
} from '../../api/http/two-factor';
import { useAppMode } from '../../contexts/AppModeContext';
import { useOrgContext } from '../../contexts/OrgContext';
import { BillingSection } from './BillingSection';
import { TeamSection } from './TeamSection';
import { OrgSettingsSection } from './OrgSettingsSection';

export function Settings() {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [prefsModalOpen, setPrefsModalOpen] = useState(false);
  const navigate = useNavigate();
  const mode = useAppMode();
  const { orgId, canManageMembers } = useOrgContext();
  const { consent, hasConsented, updateConsent, revokeConsent } = useConsent();
  const [docStorage, setDocStorage] = useState(consent?.documentStorage ?? false);
  const [notifData, setNotifData] = useState(consent?.notificationData ?? false);
  const [analyticsConsent, setAnalyticsConsent] = useState(consent?.analytics ?? false);

  useEffect(() => {
    get2faStatus().then(setTfaStatus).catch(() => {});
    getSmsCredits(orgId).then(setSmsCredits).catch(() => {});
  }, [orgId]);

  async function handleImport(file: File | null) {
    if (!file) return;
    setImporting(true);
    const result = await importData(file);
    setImporting(false);
    if (result.success) {
      toast.success('Data imported! Reload the page to see changes.');
    } else {
      toast.error(result.error ?? 'Import failed');
    }
  }

  return (
    <Stack gap="lg">
      <Title order={2}>Settings</Title>

      <BillingSection />

      {mode === 'production' && canManageMembers && <TeamSection />}

      {mode === 'production' && <OrgSettingsSection />}

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
              onClick={async () => {
                setSendingTestEmailState(true);
                try {
                  await sendTestEmail(orgId);
                  toast.success('Test email sent — check your inbox');
                } catch (err: any) {
                  toast.error(err.message ?? 'Failed to send test email');
                } finally {
                  setSendingTestEmailState(false);
                }
              }}
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
                  onClick={async () => {
                    setSendingTest(true);
                    try {
                      await sendTestSms(orgId);
                      toast.success('Test SMS sent');
                    } catch (err: any) {
                      toast.error(err.message ?? 'Failed to send test SMS');
                    } finally {
                      setSendingTest(false);
                    }
                  }}
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
                      getSmsCredits(orgId).then(setSmsCredits).catch(() => {});
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

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="md">Data Management</Text>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Button variant="light" onClick={async () => { await exportAllData(); toast.success('Backup downloaded'); }}>
              Export All Data
            </Button>
            {mode === 'demo' && (
              <FileInput
                placeholder="Import backup..."
                accept=".json"
                onChange={handleImport}
                disabled={importing}
              />
            )}
          </SimpleGrid>
          <Text size="xs" c="dimmed">
            {mode === 'production'
              ? 'Export creates a JSON backup of your obligations, documents, PTO, checklists, and settings.'
              : 'Export creates a JSON backup. Import will overwrite existing data — reload after importing.'}
          </Text>
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Group mb="md" gap="xs">
          <IconShieldLock size={20} />
          <Text fw={600}>Privacy & Consent</Text>
        </Group>
        <Stack gap="md">
          {hasConsented && consent ? (
            <>
              <Group gap="xs">
                <Badge variant="light" color="green" size="sm">Consent Given</Badge>
                <Text size="xs" c="dimmed">
                  Accepted on {new Date(consent.acceptedAt).toLocaleDateString()}
                  {consent.updatedAt !== consent.acceptedAt &&
                    ` · Updated ${new Date(consent.updatedAt).toLocaleDateString()}`}
                </Text>
              </Group>
              <Group gap="lg">
                <Text size="sm">Document Storage: <strong>{consent.documentStorage ? 'Enabled' : 'Disabled'}</strong></Text>
                <Text size="sm">Notification Data: <strong>{consent.notificationData ? 'Enabled' : 'Disabled'}</strong></Text>
                <Text size="sm">Analytics: <strong>{consent.analytics ? 'Enabled' : 'Disabled'}</strong></Text>
              </Group>
            </>
          ) : (
            <Badge variant="light" color="gray" size="sm">No consent recorded</Badge>
          )}
          <Group gap="sm">
            <Button
              variant="light"
              size="sm"
              onClick={() => {
                setDocStorage(consent?.documentStorage ?? false);
                setNotifData(consent?.notificationData ?? false);
                setAnalyticsConsent(consent?.analytics ?? false);
                setPrefsModalOpen(true);
              }}
            >
              Manage Consent Preferences
            </Button>
            {hasConsented && (
              <Button
                variant="subtle"
                color="red"
                size="sm"
                onClick={() => {
                  revokeConsent();
                  toast.success('Consent revoked');
                }}
              >
                Revoke Consent
              </Button>
            )}
          </Group>
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-red-3)' }}>
        <Text fw={600} mb="md" c="red">Danger Zone</Text>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Permanently delete all your data, including obligations, documents,
            PTO records, checklists, settings, and consent preferences. This action cannot be undone.
          </Text>
          <Button
            color="red"
            variant="outline"
            leftSection={<IconTrash size={16} />}
            onClick={() => setDeleteModalOpen(true)}
          >
            Delete All My Data
          </Button>
        </Stack>
      </Paper>

      <Modal
        opened={prefsModalOpen}
        onClose={() => setPrefsModalOpen(false)}
        title="Privacy Preferences"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Choose which types of data storage you consent to.
          </Text>
          <Switch
            label="Essential Storage"
            description="Required for basic application functionality"
            checked
            disabled
          />
          <Switch
            label="Document Storage"
            description="Store and process uploaded documents and file attachments"
            checked={docStorage}
            onChange={(e) => setDocStorage(e.currentTarget.checked)}
          />
          <Switch
            label="Notification Data"
            description="Store and process notification preferences, phone number, and email for reminders"
            checked={notifData}
            onChange={(e) => setNotifData(e.currentTarget.checked)}
          />
          <Switch
            label="Analytics"
            description="Allow anonymous usage analytics to help improve The Practice Atlas"
            checked={analyticsConsent}
            onChange={(e) => setAnalyticsConsent(e.currentTarget.checked)}
          />
          <Group justify="flex-end" mt="sm">
            <Button
              variant="light"
              onClick={() => {
                updateConsent({ documentStorage: docStorage, notificationData: notifData, analytics: analyticsConsent });
                setPrefsModalOpen(false);
                toast.success('Consent preferences updated');
              }}
            >
              Save Preferences
            </Button>
          </Group>
        </Stack>
      </Modal>

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

      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete All Data"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete all your data? This will permanently remove:
          </Text>
          <Text size="sm" component="ul" style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>All tracked obligations and deadlines</li>
            <li>All uploaded documents</li>
            <li>PTO records and configuration</li>
            <li>Checklists and progress</li>
            <li>Notification settings</li>
            <li>Consent preferences</li>
          </Text>
          <Text size="sm" fw={600} c="red">This action cannot be undone.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button
              color="red"
              loading={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await deleteAccount();
                  await deleteAllData();
                  queryClient.clear();
                  toast.success('All data deleted');
                  setDeleteModalOpen(false);
                  navigate({ to: '/' });
                } catch {
                  toast.error('Failed to delete data');
                } finally {
                  setDeleting(false);
                }
              }}
            >
              Delete Everything
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
