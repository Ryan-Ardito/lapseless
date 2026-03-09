import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Layout, type Tab } from './components/Layout/Layout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { ObligationForm } from './components/ObligationForm/ObligationForm';
import { Notifications } from './components/Notifications/Notifications';
import { useObligations } from './hooks/useObligations';
import { useNotifications } from './hooks/useNotifications';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { obligations, addObligation, updateObligation, deleteObligation, toggleComplete, loadSeedData } = useObligations();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications(obligations);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { fontSize: '0.9rem' } }} />
      <Layout activeTab={activeTab} onTabChange={setActiveTab} unreadCount={unreadCount}>
        {activeTab === 'dashboard' && (
          <Dashboard
            obligations={obligations}
            onToggleComplete={toggleComplete}
            onDelete={deleteObligation}
            onUpdate={updateObligation}
            onLoadSeed={loadSeedData}
          />
        )}
        {activeTab === 'add' && (
          <ObligationForm onAdd={addObligation} onAdded={() => setActiveTab('dashboard')} />
        )}
        {activeTab === 'notifications' && (
          <Notifications
            notifications={notifications}
            onMarkAllRead={markAllRead}
            onClearAll={clearAll}
          />
        )}
      </Layout>
    </>
  );
}

export default App;
