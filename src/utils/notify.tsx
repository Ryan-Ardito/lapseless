import { Group, Text, Button } from '@mantine/core';
import { notifications } from '@mantine/notifications';

export const notify = {
  success: (message: string) =>
    notifications.show({ message, color: 'teal', autoClose: 4000 }),
  error: (message: string) =>
    notifications.show({ message, color: 'red', autoClose: 5000 }),
  info: (message: string) =>
    notifications.show({ message, autoClose: 4000 }),
};

export function showUndoNotification(message: string, onUndo: () => void) {
  const id = `undo-${Date.now()}`;
  notifications.show({
    id,
    message: (
      <Group justify="space-between" wrap="nowrap" gap="md">
        <Text size="sm">{message}</Text>
        <Button
          variant="subtle"
          size="compact-xs"
          fw={600}
          onClick={() => {
            onUndo();
            notifications.hide(id);
          }}
        >
          Undo
        </Button>
      </Group>
    ),
    autoClose: 7000,
    withCloseButton: false,
    color: 'dark',
  });
}
