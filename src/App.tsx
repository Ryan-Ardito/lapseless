import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Layout, type Tab } from './components/Layout/Layout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { ObligationForm } from './components/ObligationForm/ObligationForm';
import { Notifications } from './components/Notifications/Notifications';
import { PTODashboard } from './components/PTO/PTODashboard';
import { ChecklistView } from './components/Checklists/ChecklistView';
import { Settings } from './components/Settings/Settings';
import { useObligations } from './hooks/useObligations';
import { useNotifications } from './hooks/useNotifications';
import { usePTO } from './hooks/usePTO';
import { useChecklists } from './hooks/useChecklists';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { obligations, addObligation, updateObligation, deleteObligation, toggleComplete, loadSeedData } = useObligations();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications(obligations);
  const {
    entries: ptoEntries, config: ptoConfig, totalUsed, remaining,
    usedByType, addEntry, updateEntry, deleteEntry, updateConfig,
  } = usePTO();
  const {
    checklists, createFromTemplate, deleteChecklist,
    toggleItem, addItem, removeItem,
  } = useChecklists();

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { fontSize: '0.9rem' } }} />
      <Layout activeTab={activeTab} onTabChange={setActiveTab} unreadCount={unreadCount} onAddClick={() => setAddModalOpen(true)}>
        {activeTab === 'dashboard' && (
          <Dashboard
            obligations={obligations}
            onToggleComplete={toggleComplete}
            onDelete={deleteObligation}
            onUpdate={updateObligation}
            onLoadSeed={loadSeedData}
          />
        )}
        {activeTab === 'notifications' && (
          <Notifications
            notifications={notifications}
            onMarkAllRead={markAllRead}
            onClearAll={clearAll}
          />
        )}
        {activeTab === 'pto' && (
          <PTODashboard
            entries={ptoEntries}
            config={ptoConfig}
            totalUsed={totalUsed}
            remaining={remaining}
            usedByType={usedByType}
            onAddEntry={addEntry}
            onUpdateEntry={updateEntry}
            onDeleteEntry={deleteEntry}
          />
        )}
        {activeTab === 'checklists' && (
          <ChecklistView
            checklists={checklists}
            onCreateFromTemplate={createFromTemplate}
            onDeleteChecklist={deleteChecklist}
            onToggleItem={toggleItem}
            onAddItem={addItem}
            onRemoveItem={removeItem}
          />
        )}
        {activeTab === 'settings' && (
          <Settings
            ptoConfig={ptoConfig}
            onUpdatePTOConfig={updateConfig}
          />
        )}
      </Layout>
      <ObligationForm
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={addObligation}
      />
    </>
  );
}

export default App;
