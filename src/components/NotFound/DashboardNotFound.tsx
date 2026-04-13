import { Stack, Title, Text, Button } from '@mantine/core';
import { IconClipboardOff } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

export function DashboardNotFound({ dashboardPath = '/app' }: { dashboardPath?: string }) {
  return (
    <Stack align="center" gap="xl" py={60}>
      <IconClipboardOff size={64} stroke={1.5} color="var(--mantine-color-gray-5)" />

      <Stack align="center" gap="xs">
        <Title order={1} fz={{ base: 48, sm: 64 }} fw={700} c="sage.6" ta="center">
          404
        </Title>
        <Title order={2} fz={{ base: 20, sm: 24 }} fw={600} ta="center">
          This page missed its deadline
        </Title>
        <Text c="dimmed" ta="center" maw={400}>
          Looks like this obligation was never filed.
        </Text>
      </Stack>

      <Button component={Link} to={dashboardPath} variant="outline" size="md">
        Go to Dashboard
      </Button>
    </Stack>
  );
}
