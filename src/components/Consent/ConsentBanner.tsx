import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Paper, Text, Button, Group, Modal, Stack, Switch, Anchor, Box,
} from '@mantine/core';
import { useConsent } from '../../hooks/useConsent';

export function ConsentBanner() {
  const { hasConsented, isConsentStale, acceptAll, acceptEssentialOnly, updateConsent } = useConsent();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [docStorage, setDocStorage] = useState(false);
  const [notifData, setNotifData] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);

  if (hasConsented && !isConsentStale) return null;

  return (
    <>
      <Box
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <Paper p="md" radius={0} shadow="lg" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
          <Group justify="space-between" wrap="wrap" gap="md">
            <Text size="sm" style={{ flex: 1, minWidth: 200 }}>
              We store and process your data to provide our services.
              Read our <Anchor component={Link} to="/privacy" size="sm">Privacy Policy</Anchor> and <Anchor component={Link} to="/cookies" size="sm">Cookie Policy</Anchor> for details.
            </Text>
            <Group gap="sm" wrap="nowrap">
              <Button variant="light" size="sm" onClick={() => setPrefsOpen(true)}>
                Manage Preferences
              </Button>
              <Button variant="outline" size="sm" onClick={acceptEssentialOnly}>
                Reject All
              </Button>
              <Button size="sm" onClick={acceptAll}>
                Accept All
              </Button>
            </Group>
          </Group>
        </Paper>
      </Box>

      <Modal
        opened={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        title="Privacy Preferences"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Choose which types of data storage you consent to. Essential storage is always required
            for the application to function.
          </Text>

          <Switch
            label="Essential Storage"
            description="Required for basic application functionality (settings, preferences)"
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
                setPrefsOpen(false);
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
