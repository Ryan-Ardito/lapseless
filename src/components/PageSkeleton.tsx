import { Stack, Group, Skeleton, Paper } from '@mantine/core';

export function DashboardSkeleton() {
  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={30} width={90} radius="xl" />
          ))}
        </Group>
        <Skeleton height={34} width={80} radius="md" />
      </Group>
      <Stack gap="xs">
        {Array.from({ length: 5 }).map((_, i) => (
          <Paper key={i} p="sm" radius="md" withBorder>
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
                <Skeleton height={32} width={4} radius={2} />
                <Skeleton height={14} width={`${50 + i * 8}%`} style={{ maxWidth: 200 }} />
              </Group>
              <Group gap="xs" wrap="nowrap">
                <Skeleton height={18} width={60} radius="xl" />
                <Skeleton height={14} width={70} />
                <Skeleton height={18} width={65} radius="xl" />
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}

export function ListSkeleton() {
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Skeleton height={32} width={200} />
        <Skeleton height={36} width={120} />
      </Group>
      <Stack gap="sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={60} radius="md" />
        ))}
      </Stack>
    </Stack>
  );
}
