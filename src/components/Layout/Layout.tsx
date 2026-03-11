import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AppShell, Group, Button, Text, Container, NavLink, Burger, Badge, Anchor } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';
import { NAV_ITEMS } from '../../constants/theme';

export type Tab = 'dashboard' | 'documents' | 'notifications' | 'pto' | 'checklists' | 'settings';

interface LayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  unreadCount: number;
  onAddClick: () => void;
  children: ReactNode;
}

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
            <Anchor component={Link} to="/" underline="never" px={4} py={2}>
              <Text
                size="xl"
                fw={800}
                variant="gradient"
                gradient={{ from: 'sage', to: 'teal', deg: 45 }}
              >
                Lapseless
              </Text>
            </Anchor>
            <Text size="sm" c="dimmed" visibleFrom="sm">
              Never miss a deadline
            </Text>
          </Group>

          <Button size="sm" variant="light" onClick={onAddClick} hiddenFrom="sm" leftSection={<IconPlus size={16} />}>
            Add
          </Button>
          <Button size="sm" variant="light" onClick={onAddClick} visibleFrom="sm" leftSection={<IconPlus size={16} />}>
            Add Obligation
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
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
            leftSection={<Icon size={20} stroke={1.5} />}
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
