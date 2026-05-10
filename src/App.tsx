import React, { useMemo, useState } from 'react';
import { ExpenseProvider, useExpense } from './context/ExpenseContext';
import { Dashboard } from './components/Dashboard';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { PieChartCard } from './components/PieChartCard';
import { TodayHintCard } from './components/TodayHintCard';
import { MonthSummaryCard } from './components/MonthSummaryCard';
import { BudgetProgressCard } from './components/BudgetProgressCard';
import { DailyTrendCard } from './components/DailyTrendCard';
import { TabBar } from './components/TabBar';
import { Fab } from './components/Fab';
import { Modal } from './components/Modal';
import { Toast } from './components/Toast';
import { TodayTab } from './components/tabs/TodayTab';
import { RecordsTab } from './components/tabs/RecordsTab';
import { ChartsTab } from './components/tabs/ChartsTab';
import { ReportsTab } from './components/tabs/ReportsTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { useActiveTab, TabKey } from './hooks/useActiveTab';
import './index.css';

const renderTab = (tab: TabKey) => {
  switch (tab) {
    case 'today':    return <TodayTab />;
    case 'records':  return <RecordsTab />;
    case 'charts':   return <ChartsTab />;
    case 'reports':  return <ReportsTab />;
    case 'settings': return <SettingsTab />;
  }
};

const Shell: React.FC = () => {
  const { isReady, editingTransaction, closeEditor, transactions, activeMonth } = useExpense();
  const [tab, setTab] = useActiveTab('today');
  const [fabOpen, setFabOpen] = useState(false);
  const desktopMonthItems = useMemo(
    () => transactions.filter((tx) => tx.date.startsWith(activeMonth)),
    [activeMonth, transactions]
  );

  if (!isReady) {
    return (
      <div className="app-loading">
        <p>載入中…</p>
      </div>
    );
  }

  const desktopRich = tab === 'today';

  return (
    <div className={`app-container ${desktopRich ? 'desktop-rich' : ''}`}>
      <header className="app-header">
        <h1>💰 跨平台記帳</h1>
        <p>輕鬆管理您的收支</p>
      </header>

      {/* Tab-driven single panel (mobile always; desktop on non-today tabs) */}
      <main className="mobile-main">
        {renderTab(tab)}
      </main>

      {/* Desktop today-only rich two-column dashboard */}
      {desktopRich && (
        <main className="desktop-main">
          <div className="dashboard-section">
            <TodayHintCard />
            <Dashboard />
          </div>
          <div className="content-grid">
            <div className="left-column">
              <TransactionForm />
              <BudgetProgressCard />
            </div>
            <div className="right-column">
              <MonthSummaryCard />
              <DailyTrendCard />
              <PieChartCard />
              <TransactionList title="選定月紀錄" items={desktopMonthItems} />
            </div>
          </div>
        </main>
      )}

      <Fab onClick={() => setFabOpen(true)} />

      <Modal open={fabOpen} onClose={() => setFabOpen(false)} title="新增紀錄">
        <TransactionForm onSubmitted={() => setFabOpen(false)} />
      </Modal>

      <Modal
        open={editingTransaction !== null}
        onClose={closeEditor}
        title="編輯紀錄"
      >
        <TransactionForm editing={editingTransaction} onSubmitted={closeEditor} />
      </Modal>

      <Toast />
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
};

const App: React.FC = () => (
  <ExpenseProvider>
    <Shell />
  </ExpenseProvider>
);

export default App;
