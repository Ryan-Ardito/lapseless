import { useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Container, Group, Box, Text, Anchor } from '@mantine/core';

interface LegalPageLayoutProps {
  children: React.ReactNode;
}

export function LegalPageLayout({ children }: LegalPageLayoutProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <Box>
      {/* Header */}
      <Box
        component="header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(250, 248, 245, 0.97)',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
        }}
      >
        <Container size="lg">
          <Group h={64} justify="space-between">
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <img src="/greenlogo.png" alt="The Practice Atlas" style={{ height: 32 }} />
              <Text fw={700} size="lg" c="dark" style={{ lineHeight: 1 }}>The Practice Atlas</Text>
            </Link>
            <Anchor component={Link} to="/" size="sm" fw={500}>
              &larr; Back to Home
            </Anchor>
          </Group>
        </Container>
      </Box>

      {/* Content */}
      <Container size="md" py="xl">
        {children}
      </Container>

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
            </Group>
            <Text size="xs" c="dimmed">&copy; {new Date().getFullYear()} Data Locality LLC. All rights reserved.</Text>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
