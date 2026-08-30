import React, { useState, useEffect } from 'react';
import { DashboardMetrics } from './api/types';
import { api } from './api/client';
import { Sidebar, NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { PolicyModal } from './components/PolicyModal';
import { CommandCenter } from './pages/CommandCenter';
import { RecoveryQueue } from './pages/RecoveryQueue';
import { AgentActivity } from './pages/AgentActivity';
import { RoiImpact } from './pages/RoiImpact';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('command');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

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

  const handleGenerateBatch = async () => {
    setLoadingAction('generate');
    try {
      await api.generateBatch(500);
      await fetchMetrics();
    } catch (e: any) {
      console.error('Batch generation failed:', e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRunBatch = async () => {
    setLoadingAction('run');
    try {
      await api.runBatch(500);
      await fetchMetrics();
    } catch (e: any) {
      console.error('Batch run failed:', e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResetSystem = async () => {
    if (!confirm('Are you sure you want to reset all simulation data and cases?')) return;
    setLoadingAction('reset');
    try {
      await api.resetSystem();
      await fetchMetrics();
    } catch (e: any) {
      console.error('Reset failed:', e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleNavigateToQueue = (sourceFilter: string = 'all') => {
    setSelectedSourceFilter(sourceFilter);
    setActiveTab('queue');
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex font-sans antialiased selection:bg-[#10B981]/25 selection:text-white">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedSourceFilter={selectedSourceFilter}
        onSelectSourceFilter={setSelectedSourceFilter}
        onOpenPolicyModal={() => setIsPolicyModalOpen(true)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 lg:pl-72">
        {/* Top Navigation Header */}
        <Navbar
          activeTab={activeTab}
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
          onRefresh={fetchMetrics}
          isRefreshing={isRefreshing}
          onGenerateBatch={handleGenerateBatch}
          onRunBatch={handleRunBatch}
          onReset={handleResetSystem}
          loadingAction={loadingAction}
          onOpenPolicyModal={() => setIsPolicyModalOpen(true)}
        />

        {/* Page View Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'command' && (
            <CommandCenter
              metrics={metrics}
              onRefresh={fetchMetrics}
              onNavigateToQueue={handleNavigateToQueue}
              onOpenPolicyModal={() => setIsPolicyModalOpen(true)}
            />
          )}

          {activeTab === 'queue' && (
            <RecoveryQueue initialSourceFilter={selectedSourceFilter} />
          )}

          {activeTab === 'activity' && <AgentActivity />}

          {activeTab === 'roi' && <RoiImpact metrics={metrics} />}
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-[#24344D] bg-[#0B1220]/80 py-4 px-6 text-center text-xs text-[#64748B]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              Reclaim Autonomous Revenue Recovery &bull; Integrated with Razorpay Gateway
            </p>
            <p className="font-mono text-[11px] text-[#94A3B8]">
              Deterministic Policy Guardrails: Active (6 Rules)
            </p>
          </div>
        </footer>
      </div>

      {/* Interactive Policy Guardrails Modal */}
      <PolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
      />
    </div>
  );
};

export default App;
