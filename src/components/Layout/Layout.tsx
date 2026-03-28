import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { AppShell, Group, Text, Container, NavLink, Burger, Badge, Anchor, Menu, ActionIcon, Avatar, Divider, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUserCircle, IconUser, IconSettings, IconLogout, IconBuilding, IconChevronDown, IconCheck, IconUserCog } from '@tabler/icons-react';
import { useProfile } from '../../hooks/useProfile';
import { logout } from '../../api/http/auth';
import { getNavItems } from '../../constants/theme';
import { useAppMode } from '../../contexts/AppModeContext';
import { useOrgContext } from '../../contexts/OrgContext';
import { useOrgs } from '../../hooks/useOrgs';
import { useAuthUser } from '../../hooks/useAuthUser';

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
  const { orgId, orgName } = useOrgContext();
  const basePath = isDemo ? '/demo' : `/app/orgs/${orgId}`;
  const segments = location.pathname.split('/');
  const activeTab = (segments[segments.length - 1] || 'dashboard') as Tab;
  const navItems = getNavItems(basePath);

  const { orgs } = useOrgs();
  const { pendingInviteCount } = useAuthUser();

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
                  You're exploring with sample data —{' '}
                  <Anchor component={Link} to="/demo/settings" c="var(--mantine-color-yellow-9)" fw={700} underline="always">
                    upgrade to a paid plan
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
            <Anchor component={Link} to={location.pathname.startsWith('/app') ? '/app/dashboard' : '/'} underline="never" px={4} py={2} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              {!isDemo && (
                <>
                  <Menu.Item leftSection={<IconUserCog size={14} />} onClick={() => navigate({ to: '/app/account' as any })}>Account</Menu.Item>
                  <Menu.Item
                    leftSection={<IconBuilding size={14} />}
                    onClick={() => navigate({ to: '/app/orgs' as any })}
                    rightSection={pendingInviteCount > 0 ? <Badge size="xs" color="red" variant="filled">{pendingInviteCount}</Badge> : undefined}
                  >
                    Organizations
                  </Menu.Item>
                </>
              )}
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
        {!isDemo && orgs.length > 1 && (
          <>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton
                  px="sm"
                  py="xs"
                  mb="xs"
                  style={{ borderRadius: 'var(--mantine-radius-md)', border: '1px solid var(--mantine-color-gray-3)', width: '100%' }}
                >
                  <Group justify="space-between" gap="xs">
                    <Group gap="xs" style={{ overflow: 'hidden' }}>
                      <IconBuilding size={16} style={{ flexShrink: 0 }} />
                      <Text size="sm" fw={600} truncate>{orgName}</Text>
                    </Group>
                    <IconChevronDown size={14} style={{ flexShrink: 0 }} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Switch Organization</Menu.Label>
                {orgs.map((org) => (
                  <Menu.Item
                    key={org.id}
                    leftSection={org.id === orgId ? <IconCheck size={14} /> : <span style={{ width: 14 }} />}
                    onClick={() => {
                      if (org.id !== orgId) {
                        navigate({ to: `/app/orgs/${org.id}/dashboard` as any });
                      }
                    }}
                  >
                    {org.name}
                  </Menu.Item>
                ))}
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconBuilding size={14} />}
                  onClick={() => navigate({ to: '/app/orgs' as any })}
                  rightSection={pendingInviteCount > 0 ? <Badge size="xs" color="red" variant="filled">{pendingInviteCount}</Badge> : undefined}
                >
                  Manage Organizations
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Divider mb="xs" />
          </>
        )}

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
