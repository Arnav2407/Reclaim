import React from 'react';
import {
  Menu,
  ShieldCheck,
  RefreshCw,
  Play,
  Layers,
  RotateCcw,
  Calendar
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface NavbarProps {
  activeTab: NavTab;
  onToggleMobileMenu?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onGenerateBatch?: () => void;
  onRunBatch?: () => void;
  onReset?: () => void;
  loadingAction?: string | null;
  onOpenPolicyModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onToggleMobileMenu,
  onRefresh,
  isRefreshing = false,
  onGenerateBatch,
  onRunBatch,
  onReset,
  loadingAction = null,
  onOpenPolicyModal,
}) => {
  const getTabTitle = (tab: NavTab) => {
    switch (tab) {
      case 'command':
        return {
          title: 'Financial Overview',
          subtitle: 'Real-time autonomous revenue recovery and leakage diagnostics',
        };
      case 'queue':
        return {
          title: 'Recovery Queue',
          subtitle: 'Multi-channel intervention queue with root-cause diagnostics',
        };
      case 'activity':
        return {
          title: 'AI Operations Center',
          subtitle: 'Live chronological stream of diagnosis, policy checks, and autonomous dispatch',
        };
      case 'roi':
        return {
          title: 'ROI & Impact Proof',
          subtitle: 'Auditable recovery metrics and deterministic policy performance',
        };
    }
  };

  const currentInfo = getTabTitle(activeTab);

  return (
    <header className="sticky top-0 z-20 bg-[#0B1220]/90 backdrop-blur-md border-b border-[#24344D] px-4 lg:px-8 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Mobile menu toggle & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleMobileMenu}
            className="p-2 rounded-lg bg-[#111C2E] border border-[#24344D] text-[#94A3B8] hover:text-white md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-bold text-white tracking-tight truncate">
                {currentInfo.title}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#17243A] text-[#94A3B8] border border-[#24344D]">
                <Calendar className="w-3 h-3" />
                Live Period
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8] hidden sm:block truncate">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls & Simulation Pipeline */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Policy Guardrail Badge */}
          <button
            onClick={onOpenPolicyModal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/25 text-xs font-semibold text-[#10B981] hover:bg-[#10B981]/15 transition"
            title="View active policy rules"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Guardrails: ACTIVE</span>
          </button>

          {/* Quick Simulation Batch Triggers */}
          {onGenerateBatch && (
            <button
              onClick={onGenerateBatch}
              disabled={!!loadingAction}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#111C2E] hover:bg-[#17243A] text-[#94A3B8] hover:text-white border border-[#24344D] rounded-lg text-xs font-medium transition disabled:opacity-50"
              title="Ingest ~500 simulated merchant leakage cases"
            >
              <Layers className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>{loadingAction === 'generate' ? 'Ingesting...' : 'Ingest Cases'}</span>
            </button>
          )}

          {onRunBatch && (
            <button
              onClick={onRunBatch}
              disabled={!!loadingAction}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#10B981] hover:bg-[#059669] text-[#04130D] rounded-lg text-xs font-bold transition shadow-emerald-glow disabled:opacity-50"
              title="Execute autonomous recovery loop on all open cases"
            >
              <Play className="w-3.5 h-3.5 fill-[#04130D]" />
              <span>{loadingAction === 'run' ? 'Recovering...' : 'Run Agent'}</span>
            </button>
          )}

          {onReset && (
            <button
              onClick={onReset}
              disabled={!!loadingAction}
              className="p-2 rounded-lg bg-[#111C2E] border border-[#24344D] text-[#64748B] hover:text-[#EF4444] hover:bg-[#17243A] transition disabled:opacity-50"
              title="Reset Database"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Refresh Data */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-[#111C2E] border border-[#24344D] hover:border-[#334B6E] text-[#94A3B8] hover:text-white transition disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#10B981]' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
