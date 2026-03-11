import { Stack, Paper, Text, Title, Button } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface ErrorDisplayProps {
  error: Error | null;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <Paper p={60} ta="center" withBorder radius="lg">
      <Stack align="center" gap="md">
        <IconAlertTriangle size={48} stroke={1.5} color="var(--mantine-color-red-6)" />
        <Title order={3} c="dark">Something went wrong</Title>
        <Text c="dimmed" size="md">
          {error?.message ?? 'An unexpected error occurred.'}
        </Text>
        {onRetry && (
          <Button variant="light" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
