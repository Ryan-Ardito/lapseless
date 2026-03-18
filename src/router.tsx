import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { Toaster } from 'react-hot-toast';
// import { ConsentBanner } from './components/Consent/ConsentBanner';
import { LandingPage } from './components/Landing/LandingPage';
import { PrivacyPolicy } from './components/Legal/PrivacyPolicy';
import { TermsOfService } from './components/Legal/TermsOfService';
import { CookiePolicy } from './components/Legal/CookiePolicy';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Documents } from './components/Documents/Documents';
import { PTODashboard } from './components/PTO/PTODashboard';
import { ChecklistView } from './components/Checklists/ChecklistView';
import { Notifications } from './components/Notifications/Notifications';
import { Settings } from './components/Settings/Settings';
import { Profile } from './components/Profile/Profile';
import { History } from './components/History/History';
import { useObligations } from './hooks/useObligations';
import { useNotifications, useNotificationChecker } from './hooks/useNotifications';

// --- Root ---
const rootRoute = createRootRoute({
  component: function RootComponent() {
    return (
      <>
        {/* <ConsentBanner /> */}
        <Outlet />
      </>
    );
  },
});

// --- Landing ---
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
});

// --- Legal pages ---
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

// --- App layout ---
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  beforeLoad: async () => {
    if (import.meta.env.VITE_API_URL) {
      const { getMe, getLoginUrl } = await import('./api/http/auth');
      try {
        await getMe();
      } catch {
        window.location.href = getLoginUrl();
        throw redirect({ to: '/' });
      }
    }
  },
  component: function AppLayout() {
    const { obligations } = useObligations();
    useNotificationChecker(obligations);
    const { unreadCount } = useNotifications();

    return (
      <>
        <Toaster position="top-right" toastOptions={{ style: { fontSize: '0.9rem' } }} />
        <Layout unreadCount={unreadCount}>
          <Outlet />
        </Layout>
      </>
    );
  },
});

// --- App index redirect ---
const appIndexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/app/dashboard' });
  },
});

// --- Tab routes ---
const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/dashboard',
  component: Dashboard,
});

const documentsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/documents',
  component: Documents,
});

const ptoRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/pto',
  component: PTODashboard,
});

const checklistsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/checklists',
  component: ChecklistView,
});

const notificationsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/notifications',
  component: Notifications,
});

const historyRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/history',
  component: History,
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: Settings,
});

const profileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/profile',
  component: Profile,
});

// --- Route tree & router ---
const routeTree = rootRoute.addChildren([
  landingRoute,
  privacyRoute,
  termsRoute,
  cookiesRoute,
  appRoute.addChildren([
    appIndexRoute,
    dashboardRoute,
    documentsRoute,
    ptoRoute,
    checklistsRoute,
    notificationsRoute,
    historyRoute,
    settingsRoute,
    profileRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
