import { Stack, Group, SimpleGrid, Skeleton, Paper } from '@mantine/core';

export function DashboardSkeleton() {
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Skeleton height={32} width={200} />
        <Skeleton height={36} width={140} />
      </Group>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        {Array.from({ length: 4 }).map((_, i) => (
          <Paper key={i} p="md" radius="md" withBorder>
            <Skeleton height={28} width={40} mx="auto" mb={4} />
            <Skeleton height={12} width={60} mx="auto" />
          </Paper>
        ))}
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={120} radius="md" />
        ))}
      </SimpleGrid>
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
