import type { ReactNode } from 'react';
import styles from './Layout.module.css';

export type Tab = 'dashboard' | 'add' | 'notifications';

interface LayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  unreadCount: number;
  children: ReactNode;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'notifications', label: 'Notifications' },
];

export function Layout({ activeTab, onTabChange, unreadCount, children }: LayoutProps) {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <span className={styles.brand}>Lapseless</span>
            <span className={styles.tagline}>Never miss a deadline</span>
          </div>
          <nav className={styles.tabs}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
                {tab.id === 'notifications' && unreadCount > 0 && (
                  <span className={styles.badge}>{unreadCount}</span>
                )}
              </button>
            ))}
            <button
              className={`${styles.addBtn} ${activeTab === 'add' ? styles.addBtnActive : ''}`}
              onClick={() => onTabChange('add')}
            >
              + Add Obligation
            </button>
          </nav>
        </div>
      </header>
      <main className={styles.content}>{children}</main>
    </>
  );
}
