import { useState, useEffect } from 'react';
import {
  Paper, Text, Group, Badge, Button, Stack, SimpleGrid, Loader, Card,
} from '@mantine/core';
import { IconCreditCard, IconAlertTriangle } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import {
  getSubscriptionStatus, getPortalUrl, createCheckout,
  type SubscriptionStatus,
} from '../../api/http/stripe';

const TIER_COLORS: Record<string, string> = {
  solo: 'gray',
  team: 'blue',
  growth: 'green',
  scale: 'violet',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  trialing: 'cyan',
  past_due: 'orange',
  canceled: 'red',
  unpaid: 'red',
  incomplete: 'yellow',
};

const UPGRADE_TIERS = [
  { tier: 'team', name: 'Team', price: '$29', features: '500 obligations, 3 users, 2 GB storage, 150 SMS/mo' },
  { tier: 'growth', name: 'Growth', price: '$49', features: 'Unlimited obligations, 7 users, 10 GB storage, 300 SMS/mo' },
  { tier: 'scale', name: 'Scale', price: '$99', features: 'Unlimited obligations, 15 users, 25 GB storage, 750 SMS/mo' },
];

function formatStorage(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
  return `${mb} MB`;
}

export function BillingSection() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    getSubscriptionStatus()
      .then(setStatus)
      .catch(() => toast.error('Failed to load billing info'))
      .finally(() => setLoading(false));
  }, []);

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const { url } = await getPortalUrl();
      window.open(url, '_blank');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleCheckout(tier: string) {
    setCheckoutLoading(tier);
    try {
      const { url } = await createCheckout(tier);
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  }

  const hasStripeSubscription = status && status.tier !== 'solo';
  const isCanceling = status?.cancelAtPeriodEnd;

  return (
    <Paper p="md" radius="md" withBorder>
      <Group mb="md" gap="xs">
        <IconCreditCard size={20} />
        <Text fw={600}>Plan & Billing</Text>
      </Group>

      {loading ? (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      ) : !status ? (
        <Text size="sm" c="dimmed">Unable to load billing information.</Text>
      ) : (
        <Stack gap="md">
          <Group gap="sm">
            <Badge variant="filled" color={TIER_COLORS[status.tier] ?? 'gray'} size="lg" tt="capitalize">
              {status.tier}
            </Badge>
            <Badge variant="light" color={STATUS_COLORS[status.status] ?? 'gray'} size="sm" tt="capitalize">
              {status.status.replace('_', ' ')}
            </Badge>
          </Group>

          {isCanceling && status.currentPeriodEnd && (
            <Group gap={4}>
              <IconAlertTriangle size={14} color="var(--mantine-color-orange-6)" />
              <Text size="sm" c="orange">
                Your plan will cancel on {new Date(status.currentPeriodEnd).toLocaleDateString()}
              </Text>
            </Group>
          )}

          {!isCanceling && status.currentPeriodEnd && (
            <Text size="sm" c="dimmed">
              Current period ends {new Date(status.currentPeriodEnd).toLocaleDateString()}
            </Text>
          )}

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
            <Stack gap={2}>
              <Text size="xs" c="dimmed">Obligations</Text>
              <Text size="sm" fw={500}>{status.limits.obligations ?? 'Unlimited'}</Text>
            </Stack>
            <Stack gap={2}>
              <Text size="xs" c="dimmed">Users</Text>
              <Text size="sm" fw={500}>{status.limits.users}</Text>
            </Stack>
            <Stack gap={2}>
              <Text size="xs" c="dimmed">Storage</Text>
              <Text size="sm" fw={500}>{formatStorage(status.limits.storageMB)}</Text>
            </Stack>
            <Stack gap={2}>
              <Text size="xs" c="dimmed">SMS Credits</Text>
              <Text size="sm" fw={500}>{status.limits.smsPerMonth}/mo</Text>
            </Stack>
          </SimpleGrid>

          {hasStripeSubscription ? (
            <Button
              variant="light"
              onClick={handlePortal}
              loading={portalLoading}
            >
              Manage Billing
            </Button>
          ) : (
            <Stack gap="sm">
              <Text size="sm" fw={500}>Upgrade your plan</Text>
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                {UPGRADE_TIERS.map((t) => (
                  <Card key={t.tier} padding="sm" radius="md" withBorder>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600}>{t.name}</Text>
                        <Text fw={700} c={TIER_COLORS[t.tier]}>{t.price}<Text span size="xs" c="dimmed">/mo</Text></Text>
                      </Group>
                      <Text size="xs" c="dimmed">{t.features}</Text>
                      <Button
                        variant="light"
                        size="xs"
                        color={TIER_COLORS[t.tier]}
                        loading={checkoutLoading === t.tier}
                        onClick={() => handleCheckout(t.tier)}
                      >
                        Upgrade
                      </Button>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </Stack>
          )}
        </Stack>
      )}
    </Paper>
  );
}
