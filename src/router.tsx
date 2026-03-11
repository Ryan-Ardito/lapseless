import { useState } from 'react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { Toaster } from 'react-hot-toast';
import { ConsentBanner } from './components/Consent/ConsentBanner';
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
import { ObligationForm } from './components/ObligationForm/ObligationForm';
import { useObligations } from './hooks/useObligations';
import { useNotifications } from './hooks/useNotifications';
import { usePTO } from './hooks/usePTO';
import { useChecklists } from './hooks/useChecklists';
import { useDocuments } from './hooks/useDocuments';
import { DemoContext } from './contexts/DemoContext';
import { useDemoContext } from './contexts/DemoContext';

// --- Root ---
const rootRoute = createRootRoute({
  component: function RootComponent() {
    return (
      <>
        <ConsentBanner />
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

// --- Demo layout ---
const demoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/demo',
  component: function DemoLayout() {
    const [addModalOpen, setAddModalOpen] = useState(false);
    const { obligations, addObligation, updateObligation, deleteObligation, toggleComplete, loadSeedData } = useObligations();
    const { notifications, unreadCount, markAllRead, clearAll } = useNotifications(obligations);
    const {
      entries: ptoEntries, config: ptoConfig, totalUsed, remaining,
      usedByType, addEntry, updateEntry, deleteEntry, updateConfig,
      loadSeedData: loadPTOSeedData,
    } = usePTO();
    const {
      checklists, createFromTemplate, deleteChecklist,
      toggleItem, addItem, removeItem,
      loadSeedData: loadChecklistSeedData,
    } = useChecklists();
    const {
      documents: standaloneDocs, addDocument: addStandaloneDoc,
      updateDocument: updateStandaloneDoc, removeDocument: removeStandaloneDoc,
      loadSeedData: loadDocSeedData,
    } = useDocuments();

    return (
      <DemoContext.Provider
        value={{
          obligations, addObligation, updateObligation, deleteObligation, toggleComplete, loadSeedData,
          notifications, unreadCount, markAllRead, clearAll,
          ptoEntries, ptoConfig, totalUsed, remaining, usedByType,
          addEntry, updateEntry, deleteEntry, updateConfig, loadPTOSeedData,
          checklists, createFromTemplate, deleteChecklist, toggleItem, addItem, removeItem, loadChecklistSeedData,
          standaloneDocs, addStandaloneDoc, updateStandaloneDoc, removeStandaloneDoc, loadDocSeedData,
          addModalOpen, setAddModalOpen,
        }}
      >
        <Toaster position="top-right" toastOptions={{ style: { fontSize: '0.9rem' } }} />
        <Layout unreadCount={unreadCount}>
          <Outlet />
        </Layout>
        <ObligationForm
          opened={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onAdd={addObligation}
        />
      </DemoContext.Provider>
    );
  },
});

// --- Demo index redirect ---
const demoIndexRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/demo/dashboard' });
  },
});

// --- Tab routes ---
const dashboardRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/dashboard',
  component: function DashboardRoute() {
    const ctx = useDemoContext();
    return (
      <Dashboard
        obligations={ctx.obligations}
        onToggleComplete={ctx.toggleComplete}
        onDelete={ctx.deleteObligation}
        onUpdate={ctx.updateObligation}
        onLoadSeed={ctx.loadSeedData}
        onLoadPTOSeed={ctx.loadPTOSeedData}
        onLoadChecklistSeed={ctx.loadChecklistSeedData}
        onLoadDocSeed={ctx.loadDocSeedData}
        onAddClick={() => ctx.setAddModalOpen(true)}
      />
    );
  },
});

const documentsRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/documents',
  component: function DocumentsRoute() {
    const ctx = useDemoContext();
    return (
      <Documents
        obligations={ctx.obligations}
        onUpdateObligation={ctx.updateObligation}
        standaloneDocs={ctx.standaloneDocs}
        onAddStandaloneDoc={ctx.addStandaloneDoc}
        onUpdateStandaloneDoc={ctx.updateStandaloneDoc}
        onRemoveStandaloneDoc={ctx.removeStandaloneDoc}
      />
    );
  },
});

const ptoRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/pto',
  component: function PTORoute() {
    const ctx = useDemoContext();
    return (
      <PTODashboard
        entries={ctx.ptoEntries}
        config={ctx.ptoConfig}
        totalUsed={ctx.totalUsed}
        remaining={ctx.remaining}
        usedByType={ctx.usedByType}
        onAddEntry={ctx.addEntry}
        onUpdateEntry={ctx.updateEntry}
        onDeleteEntry={ctx.deleteEntry}
        onUpdateConfig={ctx.updateConfig}
      />
    );
  },
});

const checklistsRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/checklists',
  component: function ChecklistsRoute() {
    const ctx = useDemoContext();
    return (
      <ChecklistView
        checklists={ctx.checklists}
        onCreateFromTemplate={ctx.createFromTemplate}
        onDeleteChecklist={ctx.deleteChecklist}
        onToggleItem={ctx.toggleItem}
        onAddItem={ctx.addItem}
        onRemoveItem={ctx.removeItem}
      />
    );
  },
});

const notificationsRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/notifications',
  component: function NotificationsRoute() {
    const ctx = useDemoContext();
    return (
      <Notifications
        notifications={ctx.notifications}
        onMarkAllRead={ctx.markAllRead}
        onClearAll={ctx.clearAll}
      />
    );
  },
});

const settingsRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/settings',
  component: Settings,
});

const profileRoute = createRoute({
  getParentRoute: () => demoRoute,
  path: '/profile',
  component: Profile,
});

// --- Route tree & router ---
const routeTree = rootRoute.addChildren([
  landingRoute,
  privacyRoute,
  termsRoute,
  cookiesRoute,
  demoRoute.addChildren([
    demoIndexRoute,
    dashboardRoute,
    documentsRoute,
    ptoRoute,
    checklistsRoute,
    notificationsRoute,
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
