import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Paper, Text, Button, SimpleGrid, FileInput, Progress,
  TextInput, Group, Modal, Switch, Badge, PinInput,
} from '@mantine/core';
import { IconMessage, IconTrash, IconShieldLock, IconShield } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { exportAllData, importData } from '../../utils/dataExport';
import { getStorageEstimate } from '../../utils/documents';
import { deleteAllData } from '../../utils/dataDeletion';
import { useConsent } from '../../hooks/useConsent';
import {
  get2faStatus, sendSetupCode, verifySetupPhone, disable2fa, sendTestSms,
  type TwoFactorStatus,
} from '../../api/http/two-factor';

export function Settings() {
  const queryClient = useQueryClient();
  const [storageUsed, setStorageUsed] = useState<number | null>(null);
  const [storageQuota, setStorageQuota] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [tfaStatus, setTfaStatus] = useState<TwoFactorStatus | null>(null);
  const [setupPhone, setSetupPhone] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [setupStep, setSetupStep] = useState<'idle' | 'code-sent' | 'verifying'>('idle');
  const [sendingSetup, setSendingSetup] = useState(false);
  const [disabling2fa, setDisabling2fa] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [prefsModalOpen, setPrefsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { consent, hasConsented, updateConsent, revokeConsent } = useConsent();
  const [docStorage, setDocStorage] = useState(consent?.documentStorage ?? false);
  const [notifData, setNotifData] = useState(consent?.notificationData ?? false);
  const [analyticsConsent, setAnalyticsConsent] = useState(consent?.analytics ?? false);

  useEffect(() => {
    get2faStatus().then(setTfaStatus).catch(() => {});
  }, []);

  async function checkStorage() {
    const est = await getStorageEstimate();
    setStorageUsed(est.used);
    setStorageQuota(est.quota);
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

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

      <Paper p="md" radius="md" withBorder>
        <Group mb="md" gap="xs">
          <IconShield size={20} />
          <Text fw={600}>Security — Two-Factor Authentication</Text>
        </Group>
        <Stack gap="md">
          {tfaStatus?.twoFactorEnabled ? (
            <>
              <Group gap="xs">
                <Badge variant="light" color="green" size="sm">2FA Enabled</Badge>
                {tfaStatus.phone && (
                  <Text size="sm" c="dimmed">Phone: {tfaStatus.phone}</Text>
                )}
              </Group>
              <Button
                variant="light"
                color="red"
                size="sm"
                loading={disabling2fa}
                onClick={async () => {
                  setDisabling2fa(true);
                  try {
                    await disable2fa();
                    setTfaStatus((s) => s ? { ...s, twoFactorEnabled: false } : s);
                    toast.success('Two-factor authentication disabled');
                  } catch (err: any) {
                    toast.error(err.message ?? 'Failed to disable 2FA');
                  } finally {
                    setDisabling2fa(false);
                  }
                }}
              >
                Disable 2FA
              </Button>
            </>
          ) : setupStep === 'idle' ? (
            <>
              <Text size="sm" c="dimmed">
                Add an extra layer of security to your account. You'll receive a verification code via SMS when you log in.
              </Text>
              <Group align="end">
                <TextInput
                  label="Phone number (E.164)"
                  placeholder="+15551234567"
                  value={setupPhone}
                  onChange={(e) => setSetupPhone(e.currentTarget.value)}
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
                      setTfaStatus({ twoFactorEnabled: true, phoneVerified: true, phone: setupPhone.slice(0, -4).replace(/./g, '*') + setupPhone.slice(-4) });
                      setSetupStep('idle');
                      setSetupCode('');
                      toast.success('Two-factor authentication enabled');
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
        <Text fw={600} mb="md">SMS Reminder Test</Text>
        <Stack gap="md">
          {tfaStatus?.phoneVerified ? (
            <>
              <Text size="sm" c="dimmed">
                Send a test SMS to your verified phone number to confirm notifications work correctly.
              </Text>
              <Button
                leftSection={<IconMessage size={16} />}
                variant="light"
                disabled={sendingTest}
                loading={sendingTest}
                onClick={async () => {
                  setSendingTest(true);
                  try {
                    await sendTestSms();
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
            </>
          ) : (
            <Text size="sm" c="dimmed">
              Set up two-factor authentication to send test SMS messages.
            </Text>
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
            <FileInput
              placeholder="Import backup..."
              accept=".json"
              onChange={handleImport}
              disabled={importing}
            />
          </SimpleGrid>
          <Text size="xs" c="dimmed">
            Export creates a JSON backup of all your obligations, PTO, checklists, and settings.
            Import will overwrite existing data — reload after importing.
          </Text>
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="md">Storage Usage</Text>
        <Button variant="light" size="xs" mb="md" onClick={checkStorage}>
          Check Storage
        </Button>
        {storageUsed !== null && storageQuota !== null && (
          <Stack gap="xs">
            <Progress
              value={storageQuota > 0 ? (storageUsed / storageQuota) * 100 : 0}
              size="lg"
              radius="xl"
              color="sage"
            />
            <Text size="sm" c="dimmed">
              {formatBytes(storageUsed)} used of {formatBytes(storageQuota)}
            </Text>
          </Stack>
        )}
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
            description="Allow anonymous usage analytics to help improve Lapseless"
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
