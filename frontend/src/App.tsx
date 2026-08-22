import React, { useState, useEffect } from 'react';
import { DashboardMetrics } from './api/types';
import { api } from './api/client';
import { Navbar } from './components/Navbar';
import { CommandCenter } from './pages/CommandCenter';
import { RecoveryQueue } from './pages/RecoveryQueue';
import { AgentActivity } from './pages/AgentActivity';
import { RoiImpact } from './pages/RoiImpact';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'command' | 'queue' | 'activity' | 'roi'>('command');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getMetrics();
      setMetrics(data);
    } catch (e) {
      console.error('Failed to load metrics:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={fetchMetrics}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {activeTab === 'command' && (
          <CommandCenter
            metrics={metrics}
            onRefresh={fetchMetrics}
            onNavigateToQueue={() => setActiveTab('queue')}
          />
        )}

        {activeTab === 'queue' && <RecoveryQueue />}

        {activeTab === 'activity' && <AgentActivity />}

        {activeTab === 'roi' && <RoiImpact metrics={metrics} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 px-6 text-center text-xs text-slate-500">
        <p>Reclaim Autonomous Revenue Recovery &bull; Integrated with Razorpay Gateway &bull; Compliant Policy Engine</p>
      </footer>
    </div>
  );
};

export default App;
