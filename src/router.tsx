import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useParams,
  useRouterState,
} from '@tanstack/react-router';
// import { ConsentBanner } from './components/Consent/ConsentBanner';
import { DashboardSkeleton, ListSkeleton } from './components/PageSkeleton';
import { LandingPage } from './components/Landing/LandingPage';
import { PrivacyPolicy } from './components/Legal/PrivacyPolicy';
import { TermsOfService } from './components/Legal/TermsOfService';
import { CookiePolicy } from './components/Legal/CookiePolicy';
import { SmsPolicy } from './components/Legal/SmsPolicy';
import { Layout } from './components/Layout/Layout';
import { NotFound } from './components/NotFound/NotFound';
import { TwoFactorVerify } from './components/Auth/TwoFactorVerify';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Documents } from './components/Documents/Documents';
import { PTODashboard } from './components/PTO/PTODashboard';
import { ChecklistView } from './components/Checklists/ChecklistView';
import { Notifications } from './components/Notifications/Notifications';
import { Settings } from './components/Settings/Settings';
import { History } from './components/History/History';
import { useObligations } from './hooks/useObligations';
import { useNotifications, useNotificationChecker } from './hooks/useNotifications';
import { useSubscriptionStatus } from './hooks/useSubscriptionStatus';
import { AppModeProvider, useAppMode } from './contexts/AppModeContext';
import { OrgProvider, useOrgContext } from './contexts/OrgContext';
import { ViewAsProvider, useViewAs } from './contexts/ViewAsContext';
import { OrgManagement } from './components/OrgManagement/OrgManagement';
import { AccountSettings } from './components/Account/AccountSettings';
import { InviteAccept } from './components/Invite/InviteAccept';
import type { OrgRole } from './types/org';

function LayoutContent() {
  const { obligations } = useObligations();
  const { isViewingAsOther } = useViewAs();
  // Skip notification checker when viewing as another user
  useNotificationChecker(isViewingAsOther ? [] : obligations);
  const { unreadCount } = useNotifications();
  const mode = useAppMode();
  const { orgId } = useOrgContext();
  const { status: subStatus } = useSubscriptionStatus(mode === 'production' ? orgId : '');
  const isPastDue = subStatus?.status === 'past_due';
  const { isNavigating, pathname, resolvedPathname } = useRouterState({
    select: (s) => ({
      isNavigating: s.status === 'pending',
      pathname: s.location.pathname,
      resolvedPathname: s.resolvedLocation?.pathname,
    }),
  });

  const isPageNavigation = isNavigating && resolvedPathname !== pathname;

  const segments = pathname.split('/');
  const page = segments[segments.length - 1] || 'dashboard';

  return (
    <Layout unreadCount={unreadCount} isPastDue={isPastDue}>
      {isPageNavigation ? (
        page === 'dashboard' ? <DashboardSkeleton /> : <ListSkeleton />
      ) : (
        <Outlet />
      )}
    </Layout>
  );
}

// --- Root ---
const rootRoute = createRootRoute({
  notFoundComponent: () => <NotFound />,
  component: function RootComponent() {
    return (
      <>
        {/* <ConsentBanner /> */}
        <Outlet />
      </>
    );
  },
});

// --- Public routes ---
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: PrivacyPolicy,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  component: TermsOfService,
});

const cookiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cookies',
  component: CookiePolicy,
});

const smsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sms',
  component: SmsPolicy,
});

const twoFactorVerifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/verify',
  component: TwoFactorVerify,
});

// --- Invite acceptance page ---
const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invite/$token',
  component: InviteAccept,
});

// --- App layout (production, with auth) ---
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  beforeLoad: async ({ location }) => {
    if (!import.meta.env.VITE_API_URL) return { user: null as any };
    const { getMe, getLoginUrl } = await import('./api/http/auth');
    let user;
    try {
      user = await getMe();
    } catch {
      window.location.href = getLoginUrl();
      throw redirect({ to: '/' });
    }

    const params = new URLSearchParams(location.searchStr);

    // Handle checkout redirect from landing page pricing CTA
    const checkoutTier = params.get('checkout');
    if (checkoutTier && ['solo', 'team', 'growth', 'scale'].includes(checkoutTier) && user.orgs.length > 0) {
      const { createCheckout } = await import('./api/http/stripe');
      try {
        const { url } = await createCheckout(checkoutTier, user.orgs[0].id);
        window.location.href = url;
        throw redirect({ to: '/app' });
      } catch (e) {
        if (!(e instanceof Error)) throw e; // re-throw redirect
      }
    }

    // Demo users with no orgs and no pending invites go to demo
    const billing = params.get('billing');
    if (user.tier === 'demo' && user.orgs.length === 0 && user.pendingInviteCount === 0) {
      if (billing !== 'success' && billing !== 'mock-success') {
        throw redirect({ to: '/demo/dashboard', search: { obligationId: undefined } });
      }
    }

    return { user };
  },
  component: function AppWrapper() {
    return <Outlet />;
  },
});

// --- Search param validators (shared between app & demo routes) ---
const withObligationId = (search: Record<string, unknown>) => ({
  obligationId: (search.obligationId as string) || undefined,
});
const withDocId = (search: Record<string, unknown>) => ({
  docId: (search.docId as string) || undefined,
});
const withEntryId = (search: Record<string, unknown>) => ({
  entryId: (search.entryId as string) || undefined,
});
const withChecklistId = (search: Record<string, unknown>) => ({
  checklistId: (search.checklistId as string) || undefined,
});
const withHistoryEntryId = (search: Record<string, unknown>) => ({
  historyEntryId: (search.historyEntryId as string) || undefined,
});
const withViewAs = (search: Record<string, unknown>) => ({
  viewAs: (search.viewAs as string) || undefined,
});

// --- App index: redirect to first org or org management ---
const appIndexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  beforeLoad: async ({ context }) => {
    const { user } = context as { user: any };
    if (!user) throw redirect({ to: '/app/orgs' });
    if (user.orgs.length > 0) {
      throw redirect({ to: `/app/orgs/${user.orgs[0].id}/dashboard` as any });
    }
    throw redirect({ to: '/app/orgs' });
  },
});

// --- App /dashboard redirect (legacy URL) ---
const appDashboardRedirect = createRoute({
  getParentRoute: () => appRoute,
  path: '/dashboard',
  beforeLoad: async ({ context }) => {
    const { user } = context as { user: any };
    if (!user || user.orgs.length === 0) throw redirect({ to: '/app/orgs' });
    throw redirect({ to: `/app/orgs/${user.orgs[0].id}/dashboard` as any });
  },
});

// --- Org management page (non-org-scoped) ---
const orgManagementRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/orgs',
  component: OrgManagement,
});

// --- Account page (non-org-scoped) ---
const accountRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/account',
  component: AccountSettings,
});

// --- Org layout route: validates membership, provides OrgContext ---
const orgLayoutRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/orgs/$orgId',
  notFoundComponent: () => <NotFound showButtons={false} />,
  beforeLoad: async ({ params, context }) => {
    const { user } = context as { user: any };
    if (!user) throw redirect({ to: '/app/orgs' });
    const org = user.orgs.find((o: any) => o.id === params.orgId);
    if (!org) throw redirect({ to: '/app/orgs' });
    return { org };
  },
  component: function OrgLayout() {
    const params = useParams({ from: '/app/orgs/$orgId' });
    const state = useRouterState();
    const match = state.matches.find((m) => m.routeId === '/app/orgs/$orgId');
    const org = (match?.context as any)?.org ?? { id: params.orgId, name: '', role: 'member' };

    return (
      <OrgProvider orgId={org.id} orgName={org.name} userRole={org.role as OrgRole}>
        <AppModeProvider mode="production">
          <ViewAsProvider>
            <LayoutContent />
          </ViewAsProvider>
        </AppModeProvider>
      </OrgProvider>
    );
  },
});

// --- Org child routes ---
const orgIndexRoute = createRoute({
  getParentRoute: () => orgLayoutRoute,
  path: '/',
  beforeLoad: ({ params }) => {
    throw redirect({ to: `/app/orgs/${params.orgId}/dashboard` as any });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => orgLayoutRoute,
  path: '/dashboard',
  component: Dashboard,
  validateSearch: (s: Record<string, unknown>) => ({ ...withObligationId(s), ...withViewAs(s) }),
});

const documentsRoute = createRoute({
  getParentRoute: () => orgLayoutRoute,
  path: '/documents',
  component: Documents,
  validateSearch: (s: Record<string, unknown>) => ({ ...withDocId(s), ...withViewAs(s) }),
});

const ptoRoute = createRoute({
  getParentRoute: () => orgLayoutRoute,
  path: '/pto',
  component: PTODashboard,
  validateSearch: (s: Record<string, unknown>) => ({ ...withEntryId(s), ...withViewAs(s) }),
});

const checklistsRoute = createRoute({
  getParentRoute: () => orgLayoutRoute,
  path: '/checklists',
  component: ChecklistView,
  validateSearch: (s: Record<string, unknown>) => ({ ...withChecklistId(s), ...withViewAs(s) }),
});

const notificationsRoute = createRoute({
  getParentRoute: () => orgLayoutRoute,
  path: '/notifications',
  component: Notifications,
  validateSearch: withObligationId,
});

const historyRoute = createRoute({
  getParentRoute: () => orgLayoutRoute,
  path: '/history',
  component: History,
  validateSearch: (s: Record<string, unknown>) => ({ ...withHistoryEntryId(s), ...withViewAs(s) }),
});

const settingsRoute = createRoute({
  getParentRoute: () => orgLayoutRoute,
  path: '/settings',
  component: Settings,
});

// --- Demo layout (auth required, but uses localStorage mock data) ---
const demoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/demo',
  notFoundComponent: () => <NotFound showButtons={false} />,
  beforeLoad: async () => {
    if (import.meta.env.VITE_API_URL) {
      const { getMe, getLoginUrl } = await import('./api/http/auth');
      let user;
      try {
        user = await getMe();
      } catch {
        window.location.href = getLoginUrl('/demo/dashboard');
        throw redirect({ to: '/' });
      }
      // If user has orgs, redirect to app
      if (user.orgs.length > 0) {
        throw redirect({ to: `/app/orgs/${user.orgs[0].id}/dashboard` as any });
      }
      if (user.tier !== 'demo') {
        throw redirect({ to: '/app' });
      }
    }
  },
  component: function DemoLayout() {
    return (
      <OrgProvider orgId="demo" orgName="Demo" userRole="owner">
        <AppModeProvider mode="demo">
          <LayoutContent />
        </AppModeProvider>
      </OrgProvider>
    );
  },
});

// --- Demo child routes ---
const demoIndexRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/demo/dashboard', search: { obligationId: undefined } });
  },
});

const demoDashboardRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/dashboard',
  component: Dashboard,
  validateSearch: withObligationId,
});

const demoDocumentsRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/documents',
  component: Documents,
  validateSearch: withDocId,
});

const demoPtoRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/pto',
  component: PTODashboard,
  validateSearch: withEntryId,
});

const demoChecklistsRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/checklists',
  component: ChecklistView,
  validateSearch: withChecklistId,
});

const demoNotificationsRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/notifications',
  component: Notifications,
  validateSearch: withObligationId,
});

const demoHistoryRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/history',
  component: History,
  validateSearch: withHistoryEntryId,
});

const demoSettingsRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/settings',
  component: Settings,
});

// --- Route tree & router ---
const routeTree = rootRoute.addChildren([
  landingRoute,
  privacyRoute,
  termsRoute,
  cookiesRoute,
  smsRoute,
  twoFactorVerifyRoute,
  inviteRoute,
  appRoute.addChildren([
    appIndexRoute,
    appDashboardRedirect,
    orgManagementRoute,
    accountRoute,
    orgLayoutRoute.addChildren([
      orgIndexRoute,
      dashboardRoute,
      documentsRoute,
      ptoRoute,
      checklistsRoute,
      notificationsRoute,
      historyRoute,
      settingsRoute,
    ]),
  ]),
  demoRoute.addChildren([
    demoIndexRoute,
    demoDashboardRoute,
    demoDocumentsRoute,
    demoPtoRoute,
    demoChecklistsRoute,
    demoNotificationsRoute,
    demoHistoryRoute,
    demoSettingsRoute,
  ]),
]);

export const router = createRouter({ routeTree, defaultNotFoundComponent: () => <NotFound /> });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
