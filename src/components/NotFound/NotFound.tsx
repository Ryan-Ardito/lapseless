import { Container, Stack, Title, Text, Button, Group } from '@mantine/core';
import { IconClipboardOff } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

export function NotFound() {
  return (
    <Container size="sm" py={120}>
      <Stack align="center" gap="xl">
        <a href="/">
          <img src="/greenlogo.png" alt="Lapseless" style={{ height: 32 }} />
        </a>

        <IconClipboardOff size={64} stroke={1.5} color="var(--mantine-color-gray-5)" />

        <Stack align="center" gap="xs">
          <Title
            order={1}
            fz={{ base: 48, sm: 64 }}
            fw={700}
            c="sage.6"
            ta="center"
          >
            404
          </Title>
          <Title order={2} fz={{ base: 20, sm: 24 }} fw={600} ta="center">
            This page missed its deadline
          </Title>
          <Text c="dimmed" ta="center" maw={400}>
            Looks like this obligation was never filed.
          </Text>
        </Stack>

        <Group>
          <Button component={Link} to="/" variant="outline" size="md">
            Go Home
          </Button>
          <Button component={Link} to="/demo" size="md">
            Try the Demo
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
