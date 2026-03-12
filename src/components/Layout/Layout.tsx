import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { AppShell, Group, Text, Container, NavLink, Burger, Badge, Anchor, Menu, ActionIcon, Avatar } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUserCircle, IconUser, IconSettings, IconLogout } from '@tabler/icons-react';
import { useProfile } from '../../hooks/useProfile';
import { NAV_ITEMS } from '../../constants/theme';

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
  const activeTab = (location.pathname.split('/')[2] ?? 'dashboard') as Tab;

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding={{ base: 'sm', sm: 'lg' }}
    >
      <AppShell.Header>
        <Group h="100%" justify="space-between" px="md">
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Anchor component={Link} to="/" underline="never" px={4} py={2}>
              <img src="/greenlogo.png" alt="Home" style={{ height: 32, display: 'block' }} />
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
              <Menu.Item leftSection={<IconUser size={14} />} onClick={() => navigate({ to: '/app/profile' })}>Profile</Menu.Item>
              <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => navigate({ to: '/app/settings' })}>Settings</Menu.Item>
              <Menu.Divider />
              <Menu.Item leftSection={<IconLogout size={14} />} color="red" onClick={() => navigate({ to: '/' })}>Log out</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {NAV_ITEMS.map(({ value, label, icon: Icon, path }) => (
          <NavLink
            key={value}
            component={Link}
            to={path}
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
