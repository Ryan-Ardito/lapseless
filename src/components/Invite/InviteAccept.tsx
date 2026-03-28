import { useState, useEffect } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import {
  Center,
  Paper,
  Stack,
  Text,
  Button,
  Badge,
  Loader,
  Group,
  Anchor,
} from '@mantine/core';
import { IconCheck, IconX, IconClock } from '@tabler/icons-react';
import { getInvitePreview, acceptInvite } from '../../api/http/orgs';
import { ApiError } from '../../api/http/client';
import { getMeSafe, getLoginUrl, type MeResponse } from '../../api/http/auth';
import type { InvitePreview, OrgRole } from '../../types/org';

const ROLE_COLORS: Record<OrgRole, string> = {
  owner: 'green',
  admin: 'blue',
  member: 'gray',
};

type PageState =
  | { type: 'loading' }
  | { type: 'error'; message: string; status?: number }
  | { type: 'preview'; invite: InvitePreview; user: MeResponse | null }
  | { type: 'accepted'; orgId: string }
  | { type: 'already-member'; orgId: string };

export function InviteAccept() {
  const { token } = useParams({ from: '/invite/$token' });
  const [state, setState] = useState<PageState>({ type: 'loading' });
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [invite, user] = await Promise.all([
          getInvitePreview(token),
          getMeSafe(),
        ]);
        setState({ type: 'preview', invite, user });
      } catch (err: any) {
        if (err instanceof ApiError) {
          if (err.status === 410) {
            setState({ type: 'error', message: 'This invitation has expired.', status: 410 });
          } else if (err.status === 404) {
            setState({ type: 'error', message: 'This invitation is no longer valid or has already been used.' });
          } else {
            setState({ type: 'error', message: err.message });
          }
        } else {
          setState({ type: 'error', message: 'Something went wrong' });
        }
      }
    }
    load();
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    try {
      const result = await acceptInvite(token);
      setState({ type: 'accepted', orgId: result.orgId });
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setState({ type: 'already-member', orgId: err.body.orgId ?? '' });
      } else {
        setState({ type: 'error', message: err.message ?? 'Something went wrong' });
      }
    } finally {
      setAccepting(false);
    }
  }

  return (
    <Center mih="100vh" bg="var(--mantine-color-gray-0)">
      <Paper shadow="md" p="xl" radius="md" withBorder w={420}>
        <Stack align="center" gap="md">
          <Anchor component={Link} to="/" underline="never" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/greenlogo.png" alt="The Practice Atlas" style={{ height: 28 }} />
            <Text fw={700} size="lg" c="dark">The Practice Atlas</Text>
          </Anchor>

          {state.type === 'loading' && (
            <>
              <Loader size="md" />
              <Text c="dimmed">Loading invitation...</Text>
            </>
          )}

          {state.type === 'error' && (
            <>
              <IconX size={48} color="var(--mantine-color-red-5)" />
              <Text fw={600} size="lg">Invitation Unavailable</Text>
              <Text c="dimmed" ta="center">{state.message}</Text>
              <Button component={Link} to="/" variant="light" fullWidth>
                Go Home
              </Button>
            </>
          )}

          {state.type === 'preview' && (() => {
            const { invite, user } = state;
            const emailMatch = user && user.email.toLowerCase() === invite.email.toLowerCase();

            return (
              <>
                <IconCheck size={48} color="var(--mantine-color-teal-5)" />
                <Text fw={600} size="lg">You're Invited</Text>
                <Paper p="md" radius="md" withBorder w="100%">
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Organization</Text>
                      <Text fw={600}>{invite.orgName}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Invited by</Text>
                      <Text>{invite.inviterName}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Role</Text>
                      <Badge size="sm" color={ROLE_COLORS[invite.role]} variant="light">
                        {invite.role}
                      </Badge>
                    </Group>
                  </Stack>
                </Paper>

                {!user && (
                  <>
                    <Text size="sm" c="dimmed" ta="center">
                      Log in with <Text span fw={600}>{invite.email}</Text> to accept this invitation.
                    </Text>
                    <Button
                      fullWidth
                      component="a"
                      href={getLoginUrl(`/invite/${token}`)}
                    >
                      Log In to Accept
                    </Button>
                  </>
                )}

                {user && emailMatch && (
                  <>
                    <Text size="sm" c="dimmed" ta="center">
                      Logged in as <Text span fw={600}>{user.email}</Text>
                    </Text>
                    <Button fullWidth onClick={handleAccept} loading={accepting}>
                      Accept Invitation
                    </Button>
                  </>
                )}

                {user && !emailMatch && (
                  <>
                    <Paper p="sm" radius="sm" bg="var(--mantine-color-yellow-0)" withBorder style={{ borderColor: 'var(--mantine-color-yellow-4)' }} w="100%">
                      <Text size="sm" ta="center">
                        This invite was sent to <Text span fw={600}>{invite.email}</Text>.
                        You're logged in as <Text span fw={600}>{user.email}</Text>.
                      </Text>
                    </Paper>
                    <Button
                      fullWidth
                      variant="light"
                      component="a"
                      href={getLoginUrl(`/invite/${token}`)}
                    >
                      Log In with a Different Account
                    </Button>
                  </>
                )}
              </>
            );
          })()}

          {state.type === 'accepted' && (
            <>
              <IconCheck size={48} color="var(--mantine-color-teal-5)" />
              <Text fw={600} size="lg">Welcome!</Text>
              <Text c="dimmed" ta="center">You've joined the organization.</Text>
              <Button
                fullWidth
                component={Link}
                to={`/app/orgs/${state.orgId}/dashboard` as any}
              >
                Go to Dashboard
              </Button>
            </>
          )}

          {state.type === 'already-member' && (
            <>
              <IconClock size={48} color="var(--mantine-color-blue-5)" />
              <Text fw={600} size="lg">Already a Member</Text>
              <Text c="dimmed" ta="center">You're already a member of this organization.</Text>
              {state.orgId && (
                <Button
                  fullWidth
                  component={Link}
                  to={`/app/orgs/${state.orgId}/dashboard` as any}
                >
                  Go to Dashboard
                </Button>
              )}
              <Button fullWidth variant="light" component={Link} to="/app/orgs">
                View Organizations
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Center>
  );
}
