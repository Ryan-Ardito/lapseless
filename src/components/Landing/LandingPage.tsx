import { useState, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Container, Title, Text, Button, SimpleGrid, Paper, Group, Stack, Badge, List,
  ThemeIcon, Box, Divider, Anchor, Menu, ActionIcon, Avatar, Burger, Drawer,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconClipboardList, IconFiles, IconBeach, IconChecklist, IconBell,
  IconLayoutDashboard, IconCheck, IconArrowRight, IconSettings,
  IconLogout, IconUserCircle, IconUsersGroup, IconShieldCheck, IconHistory,
} from '@tabler/icons-react';
import { notify } from '../../utils/notify';
import { logout, getLoginUrl } from '../../api/http/auth';
import { createCheckout } from '../../api/http/stripe';
import { tierFeatures, TIER_NAMES, TIER_PRICES, TIER_ORDER } from '../../lib/plan-display';
import type { PaidTier } from '../../lib/plan-display';

const CTA_TEXT: Record<PaidTier, string> = {
  solo: 'Get Started',
  team: 'Get Started',
  growth: 'Get Started',
  scale: 'Get Started',
};

const HIGHLIGHTED_TIER: PaidTier = 'growth';

const SALE_PRICES: Partial<Record<PaidTier, string>> = {
  growth: '$29',
  scale: '$29',
};

const SALE_CODES: Partial<Record<PaidTier, string>> = {
  growth: 'GROWTH29',
  scale: 'SCALE29',
};

const PRICING = TIER_ORDER.map((tier) => ({
  slug: tier,
  name: TIER_NAMES[tier],
  price: TIER_PRICES[tier],
  salePrice: SALE_PRICES[tier] ?? null,
  saleCode: SALE_CODES[tier] ?? null,
  period: '/month',
  features: tierFeatures(tier),
  cta: CTA_TEXT[tier],
  highlighted: tier === HIGHLIGHTED_TIER,
}));

const FEATURES = [
  { icon: IconClipboardList, title: 'Obligation Tracking', description: 'Track deadlines, renewals, and compliance requirements in one place.' },
  { icon: IconFiles, title: 'Document Management', description: 'Attach and organize documents directly with each obligation.' },
  { icon: IconBeach, title: 'PTO Tracking', description: 'Manage time-off requests and balances for your team.' },
  { icon: IconChecklist, title: 'Smart Checklists', description: 'Break obligations into actionable steps with progress tracking.' },
  { icon: IconBell, title: 'Notifications', description: 'Get timely reminders before deadlines so nothing slips through.' },
  { icon: IconLayoutDashboard, title: 'Dashboard Overview', description: 'See upcoming deadlines, status breakdowns, and alerts at a glance.' },
  { icon: IconUsersGroup, title: 'Organizations', description: 'Create and manage separate organizations for different teams, clients, or departments.' },
  { icon: IconShieldCheck, title: 'Role-Based Access', description: 'Control who can view, edit, or manage with owner, admin, and member roles.' },
  { icon: IconHistory, title: 'Audit Trail', description: 'Keep a clear record of changes and actions across your organizations.' },
];

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const googleAuthUrl = API_URL ? `${API_URL}/auth/google?redirect=/` : null;

export function LandingPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email: string; name: string; tier: string; orgs?: { id: string; name: string; role: string }[] } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
      const messages: Record<string, string> = {
        oauth_invalid: 'Sign-in failed. Please try again.',
        oauth_failed: 'Something went wrong during sign-in. Please try again.',
      };
      notify.error(messages[error] || 'An error occurred. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setUser(data); })
      .catch(() => {});
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '';

  const hasDashboard = user && (user.tier !== 'demo' || (user.orgs?.length ?? 0) > 0);
  const dashboardLink = user?.orgs?.[0] ? `/app/orgs/${user.orgs[0].id}/dashboard` : '/app/orgs';

  const [navOpen, { toggle: toggleNav, close: closeNav }] = useDisclosure();

  async function handleCheckout(tier: string) {
    setCheckoutLoading(tier);
    try {
      const { url } = await createCheckout(tier);
      window.location.href = url;
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <Box>
      {/* Header */}
      <Box
        component="header"
        style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(250, 248, 245, 0.97)', borderBottom: '1px solid var(--mantine-color-gray-2)' }}
      >
        <Container size="lg">
          <Group h={64} justify="space-between">
            <Group gap={8} align="center">
              <img src="/greenlogo.png" alt="The Practice Atlas" style={{ height: 32 }} />
              <Text fw={700} size="lg" c="dark" style={{ lineHeight: 1 }}>The Practice Atlas</Text>
            </Group>
            <Group component="nav" gap="lg">
              <Anchor href="#features" c="dimmed" underline="never" size="sm" fw={500} visibleFrom="sm">Features</Anchor>
              <Anchor href="#pricing" c="dimmed" underline="never" size="sm" fw={500} visibleFrom="sm">Pricing</Anchor>
              <Button component={Link} to="/demo" size="sm" variant="default" visibleFrom="sm">
                Try Free
              </Button>
              {user ? (
                <Menu shadow="md" width={200}>
                  <Menu.Target>
                    <ActionIcon variant="subtle" size="lg" radius="xl">
                      {initials ? (
                        <Avatar size={28} radius="xl" color="sage">{initials}</Avatar>
                      ) : (
                        <IconUserCircle size={28} />
                      )}
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Account</Menu.Label>
                    <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => navigate({ to: (user.tier === 'demo' && !user.orgs?.length ? '/demo/settings' : '/app/settings') as any })}>Settings</Menu.Item>
                    <Menu.Divider />
                    <Menu.Item leftSection={<IconLogout size={14} />} color="red" onClick={async () => {
                      await logout().catch(() => {});
                      setUser(null);
                      navigate({ to: '/' });
                    }}>Log out</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : googleAuthUrl ? (
                <Button component="a" href={googleAuthUrl} size="sm" variant="light" visibleFrom="sm">
                  Sign In with Google
                </Button>
              ) : null}
              <Burger opened={navOpen} onClick={toggleNav} hiddenFrom="sm" size="sm" />
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Mobile nav drawer */}
      <Drawer opened={navOpen} onClose={closeNav} position="top" size="auto" hiddenFrom="sm" withCloseButton={false}>
        <Stack gap="sm" p="md">
          <Anchor href="#features" c="dimmed" underline="never" size="sm" fw={500} onClick={closeNav}>Features</Anchor>
          <Anchor href="#pricing" c="dimmed" underline="never" size="sm" fw={500} onClick={closeNav}>Pricing</Anchor>
          <Button component={Link} to="/demo" size="sm" variant="default" onClick={closeNav}>
            Try Free
          </Button>
          {!user && googleAuthUrl ? (
            <Button component="a" href={googleAuthUrl} size="sm" variant="light">
              Sign In with Google
            </Button>
          ) : null}
        </Stack>
      </Drawer>

      <Box component="main">
      {/* Hero */}
      <Container size="md" pt={80} pb={0}>
        <Stack align="center" gap="lg" ta="center">
          <Title order={1} fz={{ base: 36, sm: 48 }} fw={800}>
            Never miss a deadline again
          </Title>
          <Text size="xl" c="dimmed" maw={560}>
            Track obligations, manage documents, and stay on top of every renewal
            and compliance deadline — all in one place.
          </Text>
          <Group mt="md">
            {hasDashboard ? (
              <Button component={Link} to={dashboardLink as any} size="lg" rightSection={<IconArrowRight size={18} />}>
                Go to Dashboard
              </Button>
            ) : (
              <Button component={Link} to="/demo" size="lg" rightSection={<IconArrowRight size={18} />}>
                Try Free
              </Button>
            )}
            <Button component="a" href="#pricing" size="lg" variant="outline">
              View Pricing
            </Button>
          </Group>
        </Stack>
      </Container>

      {/* Hero Image */}
      <Container size="lg" pb={60}>
        <Box
          mt={48}
          mx="auto"
          maw={900}
          style={{
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Faux browser chrome */}
          <Box
            style={{
              background: 'linear-gradient(to bottom, #f5f5f5, #ebebeb)',
              borderBottom: '1px solid #ddd',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
            <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#febc2e' }} />
            <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28c840' }} />
          </Box>
          <img
            src="/demoscreen.png"
            alt="Dashboard showing obligation tracking with deadlines, status overview, and smart reminders"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
            }}
          />
          {/* Bottom fade overlay */}
          <Box
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
              background: 'linear-gradient(to top, rgba(255,255,255,0.95), transparent)',
              pointerEvents: 'none',
            }}
          />
        </Box>
      </Container>

      {/* Features */}
      <Box component="section" id="features" py={60} style={{ backgroundColor: 'var(--mantine-color-gray-0)', scrollMarginTop: 64 }}>
        <Container size="lg">
          <Stack align="center" gap="xs" mb="xl" ta="center">
            <Title order={2}>Everything you need to stay compliant</Title>
            <Text c="dimmed" maw={480}>
              Powerful tools to track, manage, and never forget your obligations.
            </Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {FEATURES.map((f) => (
              <Paper key={f.title} className="hover-lift" p="xl" withBorder>
                <ThemeIcon size={44} radius="md" variant="light" mb="md">
                  <f.icon size={24} stroke={1.5} />
                </ThemeIcon>
                <Text fw={600} mb={4}>{f.title}</Text>
                <Text size="sm" c="dimmed">{f.description}</Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Pricing */}
      <Box component="section" id="pricing" py={60} style={{ scrollMarginTop: 64 }}>
        <Container size="lg">
          <Stack align="center" gap="xs" mb="xl" ta="center">
            <Title order={2}>Simple, transparent pricing</Title>
            <Text c="dimmed">Pick the plan that fits your workflow.</Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
            {PRICING.map((tier) => (
              <Paper
                key={tier.name}
                p="xl"
                withBorder
                style={tier.highlighted ? { borderColor: 'var(--mantine-color-sage-5)', borderWidth: 2 } : undefined}
              >
                <Stack gap="sm">
                  <Group gap="xs">
                    <Text fw={700} size="lg">{tier.name}</Text>
                    {tier.highlighted && <Badge variant="filled" size="sm">Popular</Badge>}
                  </Group>
                  {tier.salePrice ? (
                    <Stack gap={0}>
                      <Group align="baseline" gap={6}>
                        <Text fz={36} fw={800}>{tier.salePrice}</Text>
                        <Text size="sm" c="dimmed">{tier.period}</Text>
                        <Text fz={20} fw={600} c="dimmed" td="line-through">{tier.price}</Text>
                      </Group>
                      <Badge size="sm" variant="light" color="red" mt={4}>First month code {tier.saleCode}</Badge>
                    </Stack>
                  ) : (
                    <Group align="baseline" gap={4}>
                      <Text fz={36} fw={800}>{tier.price}</Text>
                      <Text size="sm" c="dimmed">{tier.period}</Text>
                    </Group>
                  )}
                  <Divider />
                  <List
                    spacing="xs"
                    size="sm"
                    icon={
                      <ThemeIcon size={20} radius="xl" variant="light">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    {tier.features.map((feat) => (
                      <List.Item key={feat}>{feat}</List.Item>
                    ))}
                  </List>
                  {hasDashboard ? (
                    <Button
                      component={Link}
                      to={dashboardLink as any}
                      variant={tier.highlighted ? 'filled' : 'outline'}
                      fullWidth
                      mt="sm"
                    >
                      Go to Dashboard
                    </Button>
                  ) : user ? (
                    <Button
                      variant={tier.highlighted ? 'filled' : 'outline'}
                      fullWidth
                      mt="sm"
                      loading={checkoutLoading === tier.slug}
                      onClick={() => handleCheckout(tier.slug)}
                    >
                      {tier.cta}
                    </Button>
                  ) : API_URL ? (
                    <Button
                      component="a"
                      href={getLoginUrl(`/app?checkout=${tier.slug}`)}
                      variant={tier.highlighted ? 'filled' : 'outline'}
                      fullWidth
                      mt="sm"
                    >
                      {tier.cta}
                    </Button>
                  ) : (
                    <Button
                      component={Link}
                      to="/demo"
                      variant={tier.highlighted ? 'filled' : 'outline'}
                      fullWidth
                      mt="sm"
                    >
                      {tier.cta}
                    </Button>
                  )}
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Bottom CTA */}
      <Box component="section" py={60} style={{ backgroundColor: 'var(--mantine-color-sage-0)' }}>
        <Container size="sm">
          <Stack align="center" gap="md" ta="center">
            <Title order={2}>Ready to take control?</Title>
            <Text c="dimmed">
              See how we keep every obligation on track.
            </Text>
            <Group>
              {hasDashboard ? (
                <Button component={Link} to={dashboardLink as any} size="lg" rightSection={<IconArrowRight size={18} />}>
                  Go to Dashboard
                </Button>
              ) : (
                <Button component={Link} to="/demo" size="lg" rightSection={<IconArrowRight size={18} />}>
                  Try Free
                </Button>
              )}
              <Button component="a" href="#pricing" size="lg" variant="outline">
                View Pricing
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      </Box>

      {/* Footer */}
      <Box component="footer" py="xl" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
        <Container size="lg">
          <Group justify="space-between">
            <Group gap={8} align="center">
              <img src="/greenlogo.png" alt="The Practice Atlas" style={{ height: 28 }} />
              <Text fw={700} size="sm" c="dark" style={{ lineHeight: 1 }}>The Practice Atlas</Text>
            </Group>
            <Group gap="md">
              <Anchor component={Link} to="/privacy" size="xs" c="dimmed">Privacy Policy</Anchor>
              <Anchor component={Link} to="/terms" size="xs" c="dimmed">Terms of Service</Anchor>
              <Anchor component={Link} to="/cookies" size="xs" c="dimmed">Cookie Policy</Anchor>
              <Anchor component={Link} to="/sms" size="xs" c="dimmed">SMS Policy</Anchor>
            </Group>
            <Text size="xs" c="dimmed">&copy; {new Date().getFullYear()} Data Locality LLC. All rights reserved.</Text>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
