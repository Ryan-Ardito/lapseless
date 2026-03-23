import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { AppShell, Group, Text, Container, NavLink, Burger, Badge, Anchor, Menu, ActionIcon, Avatar } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUserCircle, IconUser, IconSettings, IconLogout } from '@tabler/icons-react';
import { useProfile } from '../../hooks/useProfile';
import { logout, getLoginUrl } from '../../api/http/auth';
import { getNavItems } from '../../constants/theme';
import { useAppMode } from '../../contexts/AppModeContext';

export type Tab = 'dashboard' | 'documents' | 'notifications' | 'pto' | 'checklists' | 'history' | 'settings';

interface LayoutProps {
  unreadCount: number;
  children: ReactNode;
}

export function Layout({ unreadCount, children }: LayoutProps) {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const { initials, hasProfile } = useProfile();
  const mode = useAppMode();
  const isDemo = mode === 'demo';
  const basePath = isDemo ? '/demo' : '/app';
  const activeTab = (location.pathname.split('/')[2] ?? 'dashboard') as Tab;
  const navItems = getNavItems(basePath);

  return (
    <AppShell
      header={{ height: isDemo ? 96 : 64 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding={{ base: 'sm', sm: 'lg' }}
    >
      <AppShell.Header>
        {isDemo && (
          <Group justify="center" bg="var(--mantine-color-yellow-1)" py={4} style={{ borderBottom: '1px solid var(--mantine-color-yellow-3)' }}>
            <Text size="xs" fw={500} c="var(--mantine-color-yellow-9)">
              {import.meta.env.VITE_API_URL ? (
                <>
                  You're viewing a demo with sample data —{' '}
                  <Anchor href={getLoginUrl()} c="var(--mantine-color-yellow-9)" fw={700} underline="always">
                    sign in with Google
                  </Anchor>
                  {' '}to start tracking your own deadlines
                </>
              ) : (
                'You\'re viewing a demo with sample data'
              )}
            </Text>
          </Group>
        )}
        <Group h={64} justify="space-between" px="md">
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Anchor component={Link} to="/" underline="never" px={4} py={2} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/greenlogo.png" alt="The Practice Atlas" style={{ height: 32, display: 'block' }} />
              <Text fw={700} size="lg" c="dark" style={{ lineHeight: 1 }}>The Practice Atlas</Text>
            </Anchor>
            <Text size="sm" c="dimmed" visibleFrom="sm">
              Never miss a deadline
            </Text>
          </Group>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" size="lg" radius="xl">
                {hasProfile ? (
                  <Avatar size={28} radius="xl" color="sage">{initials}</Avatar>
                ) : (
                  <IconUserCircle size={28} />
                )}
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Account</Menu.Label>
              <Menu.Item leftSection={<IconUser size={14} />} onClick={() => navigate({ to: `${basePath}/profile` as any })}>Profile</Menu.Item>
              <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => navigate({ to: `${basePath}/settings` as any })}>Settings</Menu.Item>
              <Menu.Divider />
              <Menu.Item leftSection={<IconLogout size={14} />} color="red" onClick={async () => {
                if (mode === 'production') {
                  await logout().catch(() => {});
                }
                navigate({ to: '/' });
              }}>Log out</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {navItems.map(({ value, label, icon: Icon, path }) => (
          <NavLink
            key={value}
            component={Link}
            to={path as any}
            label={
              value === 'notifications' && unreadCount > 0 ? (
                <Group gap="xs">
                  <span>{label}</span>
                  <Badge size="sm" color="red" variant="filled" circle>{unreadCount}</Badge>
                </Group>
              ) : label
            }
            leftSection={<Icon size={20} stroke={1.5} />}
            active={activeTab === value}
            onClick={close}
            variant="light"
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="md">
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
