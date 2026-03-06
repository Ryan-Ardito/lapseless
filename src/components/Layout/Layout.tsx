import type { ReactNode } from 'react';
import { AppShell, Group, Button, Text, Indicator, Container, SegmentedControl } from '@mantine/core';

export type Tab = 'dashboard' | 'add' | 'notifications';

interface LayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  unreadCount: number;
  children: ReactNode;
}

export function Layout({ activeTab, onTabChange, unreadCount, children }: LayoutProps) {
  return (
    <AppShell header={{ height: 64 }} padding="lg">
      <AppShell.Header>
        <Container size="md" h="100%">
          <Group h="100%" justify="space-between">
            <Group gap="xs">
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

            <Group gap="sm">
              <SegmentedControl
                value={activeTab === 'add' ? 'dashboard' : activeTab}
                onChange={(val) => onTabChange(val as Tab)}
                data={[
                  { label: 'Dashboard', value: 'dashboard' },
                  {
                    label: unreadCount > 0 ? (
                      <Indicator label={unreadCount} size={16} color="red" offset={-2} position="top-end">
                        <span style={{ padding: '0 8px' }}>Notifications</span>
                      </Indicator>
                    ) : 'Notifications',
                    value: 'notifications',
                  },
                ]}
              />
              <Button
                size="sm"
                variant={activeTab === 'add' ? 'filled' : 'light'}
                onClick={() => onTabChange('add')}
              >
                + Add Obligation
              </Button>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="md">
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
