import { useState, useEffect } from 'react';
import {
  Paper, Text, Group, Badge, Button, Stack, SimpleGrid, Loader, Card,
  Progress, Alert,
} from '@mantine/core';
import { IconCreditCard, IconAlertTriangle } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import {
  getSubscriptionStatus, getPortalUrl, createCheckout,
  type SubscriptionStatus,
} from '../../api/http/stripe';
import {
  PLAN_LIMITS, formatStorage, tierFeatureSummary,
  type Tier,
} from '../../lib/plan-display';

const TIER_COLORS: Record<string, string> = {
  demo: 'yellow',
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

const TIER_ORDER: Tier[] = ['solo', 'team', 'growth', 'scale'];
type PaidTier = Exclude<Tier, 'demo'>;
const TIER_PRICES: Record<PaidTier, string> = {
  solo: '$9',
  team: '$29',
  growth: '$49',
  scale: '$99',
};
const TIER_NAMES: Record<Tier, string> = {
  demo: 'Demo',
  solo: 'Solo',
  team: 'Team',
  growth: 'Growth',
  scale: 'Scale',
};

function usageBarColor(pct: number): string {
  if (pct >= 100) return 'red';
  if (pct >= 80) return 'orange';
  if (pct >= 60) return 'yellow';
  return 'green';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
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

  const isDemo = status?.tier === 'demo';
  const hasStripeSubscription = status && status.tier !== 'solo' && status.tier !== 'demo';
  const isCanceling = status?.cancelAtPeriodEnd;

  const limits = status ? PLAN_LIMITS[status.tier] : null;
  const usage = status?.usage;

  const obligationPct = limits && limits.obligations && usage
    ? (usage.obligations / limits.obligations) * 100 : 0;
  const storageLimitBytes = limits ? limits.storageMB * 1024 * 1024 : 0;
  const storagePct = storageLimitBytes && usage
    ? (usage.storageBytes / storageLimitBytes) * 100 : 0;
  const smsPct = limits && usage
    ? (usage.smsUsed / limits.smsPerMonth) * 100 : 0;

  const overObligations = limits?.obligations != null && usage
    ? usage.obligations >= limits.obligations : false;
  const overStorage = storageLimitBytes > 0 && usage
    ? usage.storageBytes >= storageLimitBytes : false;
  const overSms = limits && usage
    ? usage.smsUsed >= limits.smsPerMonth : false;
  const isOverLimit = overObligations || overStorage || overSms;

  const upgradeTiers = status
    ? TIER_ORDER.filter((t) => TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(status.tier))
    : [];

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

          {isDemo && (
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
              You're on the free demo — upgrade to save your data to the cloud and unlock all features.
            </Alert>
          )}

          {!isDemo && isOverLimit && (
            <Alert color="red" icon={<IconAlertTriangle size={16} />}>
              You are over your plan limits. You cannot create new
              {overObligations ? ' obligations' : ''}{overStorage ? ' uploads' : ''}{overSms ? ' SMS messages' : ''}
              {' '}until you upgrade or reduce usage.
            </Alert>
          )}

          {!isDemo && usage && limits && (
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Stack gap={4}>
                <Text size="xs" c="dimmed">Obligations</Text>
                <Progress
                  value={limits.obligations ? Math.min(obligationPct, 100) : 0}
                  size="lg"
                  radius="xl"
                  color={limits.obligations ? usageBarColor(obligationPct) : 'green'}
                />
                <Text size="sm" fw={500}>
                  {usage.obligations} / {limits.obligations ?? '∞'}
                </Text>
              </Stack>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">Storage</Text>
                <Progress
                  value={Math.min(storagePct, 100)}
                  size="lg"
                  radius="xl"
                  color={usageBarColor(storagePct)}
                />
                <Text size="sm" fw={500}>
                  {formatBytes(usage.storageBytes)} / {formatStorage(limits.storageMB)}
                </Text>
              </Stack>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">SMS Credits</Text>
                <Progress
                  value={Math.min(smsPct, 100)}
                  size="lg"
                  radius="xl"
                  color={usageBarColor(smsPct)}
                />
                <Text size="sm" fw={500}>
                  {usage.smsUsed} / {limits.smsPerMonth}
                </Text>
              </Stack>
            </SimpleGrid>
          )}

          {hasStripeSubscription && (
            <Button
              variant="light"
              onClick={handlePortal}
              loading={portalLoading}
            >
              Manage Billing
            </Button>
          )}

          {upgradeTiers.length > 0 && (
            <Stack gap="sm">
              <Text size="sm" fw={500}>Upgrade your plan</Text>
              <SimpleGrid cols={{ base: 1, sm: Math.min(upgradeTiers.length, 3) }} spacing="sm">
                {upgradeTiers.map((t) => (
                  <Card key={t} padding="sm" radius="md" withBorder>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600}>{TIER_NAMES[t]}</Text>
                        <Text fw={700} c={TIER_COLORS[t]}>{TIER_PRICES[t as PaidTier]}<Text span size="xs" c="dimmed">/mo</Text></Text>
                      </Group>
                      <Text size="xs" c="dimmed">{tierFeatureSummary(t)}</Text>
                      <Button
                        variant="light"
                        size="xs"
                        color={TIER_COLORS[t]}
                        loading={checkoutLoading === t}
                        onClick={() => handleCheckout(t)}
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
