import { useState, useEffect } from 'react';
import {
  Paper, Text, Group, Badge, Button, Stack, SimpleGrid, Loader, Card,
  Progress, Alert, Modal,
} from '@mantine/core';
import { IconCreditCard, IconAlertTriangle, IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useOrgContext } from '../../contexts/OrgContext';
import {
  getSubscriptionStatus, getPortalUrl, createCheckout, changeTier, cancelDowngrade,
  getDowngradeWarnings,
  type SubscriptionStatus,
} from '../../api/http/stripe';
import {
  PLAN_LIMITS, TIER_ORDER, TIER_PRICES, TIER_NAMES, TIER_COLORS,
  formatStorage, tierFeatureSummary,
  type PaidTier,
} from '../../lib/plan-display';

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  trialing: 'cyan',
  past_due: 'orange',
  canceled: 'red',
  unpaid: 'red',
  incomplete: 'yellow',
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
  const { orgId, isOwner } = useOrgContext();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [tierChangeLoading, setTierChangeLoading] = useState<string | null>(null);
  const [cancelDowngradeLoading, setCancelDowngradeLoading] = useState(false);
  const [downgradeModal, setDowngradeModal] = useState<{
    tier: PaidTier;
    warnings: string[];
  } | null>(null);
  const [downgradeWarningsLoading, setDowngradeWarningsLoading] = useState<string | null>(null);

  useEffect(() => {
    getSubscriptionStatus(orgId)
      .then(setStatus)
      .catch(() => toast.error('Failed to load billing info'))
      .finally(() => setLoading(false));
  }, [orgId]);

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const { url } = await getPortalUrl(orgId);
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
      const { url } = await createCheckout(tier, orgId);
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleUpgrade(tier: string) {
    setTierChangeLoading(tier);
    try {
      await changeTier(tier, orgId);
      toast.success(`Upgraded to ${TIER_NAMES[tier as PaidTier]}`);
      const updated = await getSubscriptionStatus(orgId);
      setStatus(updated);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to upgrade');
    } finally {
      setTierChangeLoading(null);
    }
  }

  async function handleDowngradeClick(tier: PaidTier) {
    setDowngradeWarningsLoading(tier);
    try {
      const { warnings } = await getDowngradeWarnings(tier, orgId);
      setDowngradeModal({ tier, warnings });
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to check downgrade');
    } finally {
      setDowngradeWarningsLoading(null);
    }
  }

  async function handleDowngradeConfirm() {
    if (!downgradeModal) return;
    const tier = downgradeModal.tier;
    setDowngradeModal(null);
    setTierChangeLoading(tier);
    try {
      await changeTier(tier, orgId);
      toast.success(`Downgrade to ${TIER_NAMES[tier]} scheduled`);
      const updated = await getSubscriptionStatus(orgId);
      setStatus(updated);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to schedule downgrade');
    } finally {
      setTierChangeLoading(null);
    }
  }

  async function handleCancelDowngrade() {
    setCancelDowngradeLoading(true);
    try {
      await cancelDowngrade(orgId);
      toast.success('Downgrade canceled');
      const updated = await getSubscriptionStatus(orgId);
      setStatus(updated);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to cancel downgrade');
    } finally {
      setCancelDowngradeLoading(false);
    }
  }

  const isDemo = status?.tier === 'demo';
  const hasPaidSubscription = status && status.tier !== 'demo';
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

  const currentTierIndex = status
    ? (TIER_ORDER as readonly string[]).indexOf(status.tier)
    : -1;

  const upgradeTiers = status
    ? TIER_ORDER.filter((_, i) => i > currentTierIndex)
    : [];

  const downgradeTiers = status && hasPaidSubscription
    ? TIER_ORDER.filter((_, i) => i < currentTierIndex)
    : [];

  return (
    <>
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

            {status.pendingTier && status.pendingTierScheduledAt && (
              <Alert color="blue" icon={<IconArrowDown size={16} />}>
                <Group justify="space-between" align="center">
                  <Text size="sm">
                    Your plan will change to <Text span fw={600}>{TIER_NAMES[status.pendingTier as PaidTier]}</Text> on{' '}
                    {new Date(status.pendingTierScheduledAt).toLocaleDateString()}
                  </Text>
                  {isOwner && (
                    <Button
                      variant="subtle"
                      size="xs"
                      color="blue"
                      loading={cancelDowngradeLoading}
                      onClick={handleCancelDowngrade}
                    >
                      Cancel Downgrade
                    </Button>
                  )}
                </Group>
              </Alert>
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

            {isOwner && hasPaidSubscription && (
              <Button
                variant="light"
                onClick={handlePortal}
                loading={portalLoading}
              >
                Manage Billing
              </Button>
            )}

            {isOwner && upgradeTiers.length > 0 && (
              <Stack gap="sm">
                <Group gap="xs">
                  <IconArrowUp size={16} />
                  <Text size="sm" fw={500}>Upgrade your plan</Text>
                </Group>
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
                          loading={isDemo ? checkoutLoading === t : tierChangeLoading === t}
                          onClick={() => isDemo ? handleCheckout(t) : handleUpgrade(t)}
                        >
                          Upgrade
                        </Button>
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              </Stack>
            )}

            {isOwner && downgradeTiers.length > 0 && !status.pendingTier && (
              <Stack gap="sm">
                <Group gap="xs">
                  <IconArrowDown size={16} />
                  <Text size="sm" fw={500}>Downgrade your plan</Text>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: Math.min(downgradeTiers.length, 3) }} spacing="sm">
                  {downgradeTiers.map((t) => (
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
                          color="gray"
                          loading={downgradeWarningsLoading === t || tierChangeLoading === t}
                          onClick={() => handleDowngradeClick(t)}
                        >
                          Downgrade
                        </Button>
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              </Stack>
            )}

            {!isOwner && (
              <Text size="sm" c="dimmed">
                Only the organization owner can manage billing.
              </Text>
            )}
          </Stack>
        )}
      </Paper>

      <Modal
        opened={!!downgradeModal}
        onClose={() => setDowngradeModal(null)}
        title="Confirm Downgrade"
        centered
      >
        {downgradeModal && (
          <Stack gap="md">
            {downgradeModal.warnings.length > 0 ? (
              <>
                <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
                  Your current usage exceeds the limits of the {TIER_NAMES[downgradeModal.tier]} plan:
                </Alert>
                <Stack gap="xs">
                  {downgradeModal.warnings.map((w, i) => (
                    <Text key={i} size="sm">- {w}</Text>
                  ))}
                </Stack>
              </>
            ) : (
              <Text size="sm">
                Your plan will change to <Text span fw={600}>{TIER_NAMES[downgradeModal.tier]}</Text> ({TIER_PRICES[downgradeModal.tier]}/mo)
                at the end of your current billing period
                {status?.currentPeriodEnd && ` on ${new Date(status.currentPeriodEnd).toLocaleDateString()}`}.
              </Text>
            )}

            <Text size="sm" c="dimmed">
              You'll keep your current plan features until the end of this billing period.
            </Text>

            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={() => setDowngradeModal(null)}>
                Cancel
              </Button>
              <Button color="orange" onClick={handleDowngradeConfirm}>
                Confirm Downgrade
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
