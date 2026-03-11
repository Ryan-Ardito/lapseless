import { Link } from 'react-router-dom';
import {
  Container, Title, Text, Button, SimpleGrid, Paper, Group, Stack, Badge, List,
  ThemeIcon, Box, Divider, Anchor,
} from '@mantine/core';
import {
  IconClipboardList, IconFiles, IconBeach, IconChecklist, IconBell,
  IconLayoutDashboard, IconCheck, IconArrowRight,
} from '@tabler/icons-react';

const FEATURES = [
  { icon: IconClipboardList, title: 'Obligation Tracking', description: 'Track deadlines, renewals, and compliance requirements in one place.' },
  { icon: IconFiles, title: 'Document Management', description: 'Attach and organize documents directly with each obligation.' },
  { icon: IconBeach, title: 'PTO Tracking', description: 'Manage time-off requests and balances for your team.' },
  { icon: IconChecklist, title: 'Smart Checklists', description: 'Break obligations into actionable steps with progress tracking.' },
  { icon: IconBell, title: 'Notifications', description: 'Get timely reminders before deadlines so nothing slips through.' },
  { icon: IconLayoutDashboard, title: 'Dashboard Overview', description: 'See upcoming deadlines, status breakdowns, and alerts at a glance.' },
];

const PRICING = [
  {
    name: 'Starter',
    price: '$9',
    period: '/month',
    features: ['25 Tracked Obligations', 'Unlimited Email Reminders', '20 Message Credits', '1 User', '100 MB File Storage'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Basic',
    price: '$29',
    period: '/month',
    features: ['200 Tracked Obligations', 'Unlimited Email Reminders', '75 Message Credits', '2 Users', '1 GB File Storage'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/month',
    features: ['500 Tracked Obligations', 'Unlimited Email Reminders', '150 Message Credits', '5 Users', '5 GB File Storage'],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Business',
    price: '$99',
    period: '/month',
    features: ['1,500 Tracked Obligations', 'Unlimited Email Reminders', '400 Message Credits', '10 Users', '10 GB File Storage'],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export function LandingPage() {
  return (
    <Box>
      {/* Header */}
      <Box
        component="header"
        style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)', backgroundColor: 'rgba(250, 248, 245, 0.85)', borderBottom: '1px solid var(--mantine-color-gray-2)' }}
      >
        <Container size="lg">
          <Group h={64} justify="space-between">
            <img src="/greenlogo.png" alt="Home" style={{ height: 32 }} />
            <Group gap="lg">
              <Anchor href="#features" c="dimmed" underline="never" size="sm" fw={500}>Features</Anchor>
              <Anchor href="#pricing" c="dimmed" underline="never" size="sm" fw={500}>Pricing</Anchor>
              <Button component={Link} to="/app" size="sm" variant="light">
                Try Demo
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Hero */}
      <Container size="md" pt={80} pb={0}>
        <Stack align="center" gap="lg" ta="center">
          <Badge variant="light" size="lg">Demo Available</Badge>
          <Title order={1} fz={{ base: 36, sm: 48 }} fw={800}>
            Never miss a deadline again
          </Title>
          <Text size="xl" c="dimmed" maw={560}>
            Track obligations, manage documents, and stay on top of every renewal
            and compliance deadline — all in one place.
          </Text>
          <Group mt="md">
            <Button component={Link} to="/app" size="lg" rightSection={<IconArrowRight size={18} />}>
              Try the Demo
            </Button>
            <Button component="a" href="#features" size="lg" variant="outline">
              Learn More
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
      <Box id="features" py={60} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
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
      <Box id="pricing" py={60}>
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
                  <Group align="baseline" gap={4}>
                    <Text fz={36} fw={800}>{tier.price}</Text>
                    <Text size="sm" c="dimmed">{tier.period}</Text>
                  </Group>
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
                  <Button
                    component={Link}
                    to="/app"
                    variant={tier.highlighted ? 'filled' : 'outline'}
                    fullWidth
                    mt="sm"
                  >
                    {tier.cta}
                  </Button>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
          <Text ta="center" size="xs" c="dimmed" mt="lg">
            This is a demo application. No real payments are processed.
          </Text>
        </Container>
      </Box>

      {/* Bottom CTA */}
      <Box py={60} style={{ backgroundColor: 'var(--mantine-color-sage-0)' }}>
        <Container size="sm">
          <Stack align="center" gap="md" ta="center">
            <Title order={2}>Ready to take control?</Title>
            <Text c="dimmed">
              See how we keep every obligation on track.
            </Text>
            <Button component={Link} to="/app" size="lg" rightSection={<IconArrowRight size={18} />}>
              Try the Demo
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Box py="xl" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
        <Container size="lg">
          <Group justify="space-between">
            <Group gap="xs">
              <img src="/greenlogo.png" alt="Home" style={{ height: 28 }} />
              <Badge variant="light" size="sm" color="gray">Demo Application</Badge>
            </Group>
            <Text size="xs" c="dimmed">&copy; {new Date().getFullYear()} Data Locality LLC. All rights reserved.</Text>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
