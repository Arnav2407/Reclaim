import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Activity,
  TrendingUp,
  ShieldCheck,
  Zap,
  CreditCard,
  ShoppingCart,
  RefreshCw,
  FileText,
  ChevronRight,
  Sparkles,
  X
} from 'lucide-react';

export type NavTab = 'command' | 'queue' | 'activity' | 'roi';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedSourceFilter?: string;
  onSelectSourceFilter?: (source: string) => void;
  onOpenPolicyModal?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedSourceFilter = 'all',
  onSelectSourceFilter,
  onOpenPolicyModal,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const mainNav = [
    { id: 'command' as NavTab, label: 'Overview', icon: LayoutDashboard, badge: 'Live' },
    { id: 'queue' as NavTab, label: 'Recovery Queue', icon: Layers },
    { id: 'activity' as NavTab, label: 'AI Actions', icon: Activity, badge: 'Autonomous' },
    { id: 'roi' as NavTab, label: 'Analytics & ROI', icon: TrendingUp },
  ];

  const recoverySources = [
    { id: 'payment_failure', label: 'Payment Failures', color: 'bg-[#EF4444]', icon: CreditCard },
    { id: 'checkout_abandonment', label: 'Checkout Abandonment', color: 'bg-[#F59E0B]', icon: ShoppingCart },
    { id: 'subscription_failure', label: 'Subscription Failures', color: 'bg-[#8B5CF6]', icon: RefreshCw },
    { id: 'overdue_invoice', label: 'B2B Invoices', color: 'bg-[#06B6D4]', icon: FileText },
  ];

  const handleSourceClick = (sourceId: string) => {
    setActiveTab('queue');
    if (onSelectSourceFilter) {
      onSelectSourceFilter(sourceId);
    }
    if (onCloseMobile) onCloseMobile();
  };

  const handleTabClick = (tabId: NavTab) => {
    setActiveTab(tabId);
    if (tabId === 'queue' && onSelectSourceFilter) {
      onSelectSourceFilter('all');
    }
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#111C2E] border-r border-[#24344D] text-[#F8FAFC]">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-[#24344D] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] shadow-emerald-glow">
            <Zap className="w-5 h-5 fill-[#10B981]/30" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-wider text-white">RECLAIM</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30">
                AI Agent
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-medium">Autonomous Revenue Recovery</p>
          </div>
        </div>

        {isMobileOpen && (
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#17243A] md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Section */}
        <div>
          <p className="px-3 text-[10px] font-semibold tracking-wider uppercase text-[#64748B] mb-2">
            Navigation
          </p>
          <div className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group ${
                    isActive
                      ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#17243A] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-[#10B981]' : 'text-[#64748B] group-hover:text-[#94A3B8]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-[#10B981]/20 text-[#10B981]'
                          : item.badge === 'Autonomous'
                          ? 'bg-[#06B6D4]/15 text-[#06B6D4]'
                          : 'bg-[#17243A] text-[#64748B]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recovery Sources Subsection */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] font-semibold tracking-wider uppercase text-[#64748B]">
              Recovery Channels
            </p>
            <span className="text-[10px] text-[#64748B] font-mono">4 Sources</span>
          </div>
          <div className="space-y-1">
            {recoverySources.map((source) => {
              const isSelected = activeTab === 'queue' && selectedSourceFilter === source.id;
              return (
                <button
                  key={source.id}
                  onClick={() => handleSourceClick(source.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#17243A] text-[#F8FAFC] border border-[#334B6E]'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#17243A]/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${source.color} shrink-0`} />
                    <span className="truncate">{source.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748B] opacity-0 group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Policy & Guardrails Section */}
        <div>
          <p className="px-3 text-[10px] font-semibold tracking-wider uppercase text-[#64748B] mb-2">
            Infrastructure &amp; Safety
          </p>
          <button
            onClick={() => {
              if (onOpenPolicyModal) onOpenPolicyModal();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#17243A] border border-[#24344D] bg-[#0B1220]/50 transition group"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>Policy Guardrails</span>
            </div>
            <span className="text-[10px] text-[#10B981] font-bold uppercase tracking-wider">
              6 Rules Active
            </span>
          </button>
        </div>
      </div>

      {/* Merchant / Gateway Account Footer */}
      <div className="p-3.5 border-t border-[#24344D] bg-[#0B1220]/60">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#111C2E] border border-[#24344D]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-[#17243A] border border-[#24344D] flex items-center justify-center text-xs font-bold text-[#10B981]">
              RZ
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Merchant Gateway</p>
              <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                <span>Razorpay Live Mode</span>
              </div>
            </div>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#0B1220]/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
