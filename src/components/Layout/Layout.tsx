import type { ReactNode } from 'react';
import { AppShell, Group, Button, Text, Indicator, Container, NavLink, Burger, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

export type Tab = 'dashboard' | 'notifications' | 'pto' | 'checklists' | 'settings';

interface LayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  unreadCount: number;
  onAddClick: () => void;
  children: ReactNode;
}

const NAV_ITEMS: { value: Tab; label: string; icon: string }[] = [
  { value: 'dashboard', label: 'Dashboard', icon: '📊' },
  { value: 'pto', label: 'PTO', icon: '🏖' },
  { value: 'checklists', label: 'Checklists', icon: '✅' },
  { value: 'notifications', label: 'Notifications', icon: '🔔' },
  { value: 'settings', label: 'Settings', icon: '⚙' },
];

export function Layout({ activeTab, onTabChange, unreadCount, onAddClick, children }: LayoutProps) {
  const [opened, { toggle, close }] = useDisclosure();

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
            <Text
              size="xl"
              fw={800}
              variant="gradient"
              gradient={{ from: 'indigo', to: 'violet', deg: 45 }}
            >
              Lapseless
            </Text>
            <Text size="sm" c="dimmed" visibleFrom="sm">
              Never miss a deadline
            </Text>
          </Group>

          <Button size="sm" variant="light" onClick={onAddClick} hiddenFrom="sm">
            +
          </Button>
          <Button size="sm" variant="light" onClick={onAddClick} visibleFrom="sm">
            + Add Obligation
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {NAV_ITEMS.map(({ value, label, icon }) => (
          <NavLink
            key={value}
            label={
              value === 'notifications' && unreadCount > 0 ? (
                <Group gap="xs">
                  <span>{label}</span>
                  <Badge size="sm" color="red" variant="filled" circle>{unreadCount}</Badge>
                </Group>
              ) : label
            }
            leftSection={<Text size="md">{icon}</Text>}
            active={activeTab === value}
            onClick={() => { onTabChange(value); close(); }}
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
