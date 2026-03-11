import { Link } from 'react-router-dom';
import { Container, Group, Box, Text, Anchor, Badge } from '@mantine/core';

interface LegalPageLayoutProps {
  children: React.ReactNode;
}

export function LegalPageLayout({ children }: LegalPageLayoutProps) {
  return (
    <Box>
      {/* Header */}
      <Box
        component="header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(250, 248, 245, 0.85)',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
        }}
      >
        <Container size="lg">
          <Group h={64} justify="space-between">
            <Link to="/">
              <img src="/greenlogo.png" alt="Home" style={{ height: 32 }} />
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
            <Group gap="xs">
              <img src="/greenlogo.png" alt="Home" style={{ height: 28 }} />
              <Badge variant="light" size="sm" color="gray">Demo Application</Badge>
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
