import { useState } from 'react';
import {
  Paper, Text, Group, Button, Stack, Badge, Switch, Modal,
} from '@mantine/core';
import { IconShieldLock } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useConsent } from '../../hooks/useConsent';

export function PrivacyConsentSection() {
  const { consent, hasConsented, updateConsent, revokeConsent } = useConsent();
  const [prefsModalOpen, setPrefsModalOpen] = useState(false);
  const [docStorage, setDocStorage] = useState(consent?.documentStorage ?? false);
  const [notifData, setNotifData] = useState(consent?.notificationData ?? false);
  const [analyticsConsent, setAnalyticsConsent] = useState(consent?.analytics ?? false);

  return (
    <>
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
    </>
  );
}
