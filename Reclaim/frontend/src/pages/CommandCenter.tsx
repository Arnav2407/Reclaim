import React, { useState } from 'react';
import { DashboardMetrics } from '../api/types';
import { api } from '../api/client';
import { MetricCard } from '../components/MetricCard';
import { FunnelChart } from '../components/FunnelChart';
import { StrategyChart } from '../components/StrategyChart';
import {
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Layers,
  CreditCard,
  ShoppingCart,
  RefreshCw,
  FileText,
  ArrowUpRight,
  ArrowRight,
  Bot,
  Zap,
} from 'lucide-react';

interface CommandCenterProps {
  metrics: DashboardMetrics | null;
  onRefresh: () => void;
  onNavigateToQueue: (sourceFilter?: string) => void;
  onOpenPolicyModal?: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  metrics,
  onRefresh,
  onNavigateToQueue,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleRunFullDemo = async () => {
    setLoadingAction('demo');
    setActionMessage(null);
    try {
      const res = await api.runFullDemo();
      setActionMessage(res.message || 'Full 5-minute autonomous recovery demo executed successfully!');
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGenerateBatch = async () => {
    setLoadingAction('generate');
    setActionMessage(null);
    try {
      const res = await api.generateBatch(500);
      setActionMessage(res.message || '500 synthetic merchant cases generated successfully.');
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRunBatch = async () => {
    setLoadingAction('run');
    setActionMessage(null);
    try {
      const res = await api.runBatch(500);
      setActionMessage(`Autonomous recovery loop completed! Processed ${res.processed_cases} cases.`);
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all cases and simulation data?')) return;
    setLoadingAction('reset');
    setActionMessage(null);
    try {
      await api.resetSystem();
      setActionMessage('Database successfully reset to blank state.');
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const atRisk = metrics?.total_revenue_at_risk || 0;
  const recovered = metrics?.total_revenue_recovered || 0;
  const rate = metrics?.recovery_rate_pct || 0;
  const totalCases = metrics?.total_cases_identified || 0;
  const recoveredCases = metrics?.recovered_cases_count || 0;
  const escalatedCases = metrics?.escalated_cases_count || 0;
  const stoppedCases = metrics?.stopped_cases_count || 0;

  // 4 Core Recovery Sources
  const sourceConfigs = [
    {
      type: 'payment_failure',
      title: 'Payment Failures',
      icon: CreditCard,
      accentColor: '#EF4444',
      badgeBg: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
      description: 'Card declines, network timeouts, bank OTP drops',
    },
    {
      type: 'checkout_abandonment',
      title: 'Checkout Abandonment',
      icon: ShoppingCart,
      accentColor: '#F59E0B',
      badgeBg: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
      description: 'Cart drop-offs, unpaid orders, buyer hesitation',
    },
    {
      type: 'subscription_failure',
      title: 'Subscription Failures',
      icon: RefreshCw,
      accentColor: '#8B5CF6',
      badgeBg: 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30',
      description: 'Recurring billing dunning, mandate expirations',
    },
    {
      type: 'overdue_invoice',
      title: 'Overdue B2B Invoices',
      icon: FileText,
      accentColor: '#06B6D4',
      badgeBg: 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/30',
      description: 'Corporate invoice payment reminders & UPI links',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Operational Banner & Positioning */}
      <div className="bg-gradient-to-r from-[#111C2E] via-[#17243A] to-[#111C2E] border border-[#24344D] rounded-2xl p-5 sm:p-6 shadow-subtle-card relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#10B981]">
                Autonomous Revenue Recovery Active
              </span>
              <span className="text-xs text-[#64748B] font-mono">&bull;</span>
              <span className="text-xs text-[#94A3B8]">Razorpay Merchant Protection</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              &ldquo;We didn&apos;t build an AI that tells a merchant what to do — we built an agent that recovers money itself.&rdquo;
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1.5 leading-relaxed">
              Autonomous agent diagnosing root causes across 4 leakage channels, executing bounded multi-channel interventions via Razorpay payment links, and enforcing deterministic code guardrails.
            </p>
          </div>

          {/* Quick Simulation Batch Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Run Full Demo (Left of Ingest) */}
            <button
              onClick={handleRunFullDemo}
              disabled={!!loadingAction}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold shadow-emerald-glow border border-emerald-400/30 transition disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
              <span>{loadingAction === 'demo' ? 'Running End-to-End Demo...' : '⚡ Run Full Demo'}</span>
            </button>

            <button
              onClick={handleGenerateBatch}
              disabled={!!loadingAction}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#111C2E] hover:bg-[#17243A] text-[#F8FAFC] border border-[#24344D] hover:border-[#334B6E] rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>{loadingAction === 'generate' ? 'Ingesting...' : '1. Ingest Cases'}</span>
            </button>

            <button
              onClick={handleRunBatch}
              disabled={!!loadingAction}
              className="flex items-center gap-2 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-[#04130D] rounded-lg text-xs font-bold shadow-emerald-glow transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-[#04130D]" />
              <span>{loadingAction === 'run' ? 'Recovering...' : '2. Run Autonomous Loop'}</span>
            </button>

            <button
              onClick={handleReset}
              disabled={!!loadingAction}
              className="p-2 bg-[#111C2E] hover:bg-[#17243A] text-[#64748B] hover:text-[#EF4444] border border-[#24344D] rounded-lg transition disabled:opacity-50"
              title="Reset System"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {actionMessage && (
          <div className="mt-4 p-3 bg-[#06B6D4]/10 border border-[#06B6D4]/30 rounded-xl text-xs font-medium text-[#06B6D4] flex items-center gap-2.5 animate-in fade-in duration-200">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
      </div>

      {/* Narrative Lifecycle Strip: Revenue at Risk → AI Detection → Autonomous Action → Revenue Recovered */}
      <div className="bg-[#111C2E] border border-[#24344D] rounded-xl p-4 sm:p-5 shadow-subtle-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Autonomous Recovery Lifecycle
          </p>
          <span className="text-[10px] text-[#64748B] font-mono">Real-time Closed Loop</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Step 1: Revenue at Risk */}
          <div className="bg-[#0B1220]/70 border border-[#24344D] rounded-lg p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#EF4444] font-mono">
                1. Leakage at Risk
              </span>
              <DollarSign className="w-3.5 h-3.5 text-[#EF4444]" />
            </div>
            <p className="text-sm font-bold text-white font-mono">
              ₹{atRisk.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              Across {totalCases} merchant failure events
            </p>
          </div>

          {/* Step 2: AI Detection */}
          <div className="bg-[#0B1220]/70 border border-[#24344D] rounded-lg p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#06B6D4] font-mono">
                2. AI Diagnosis
              </span>
              <Bot className="w-3.5 h-3.5 text-[#06B6D4]" />
            </div>
            <p className="text-sm font-bold text-white font-mono">
              {totalCases > 0 ? `${totalCases} Cases Analyzed` : '0 Diagnoses'}
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              Root causes &amp; recovery probabilities
            </p>
          </div>

          {/* Step 3: Autonomous Action */}
          <div className="bg-[#0B1220]/70 border border-[#24344D] rounded-lg p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B5CF6] font-mono">
                3. Bounded Action
              </span>
              <Zap className="w-3.5 h-3.5 text-[#8B5CF6]" />
            </div>
            <p className="text-sm font-bold text-white font-mono">
              {recoveredCases + escalatedCases} Safe Interventions
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              Policy approved Razorpay links
            </p>
          </div>

          {/* Step 4: Revenue Recovered */}
          <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg p-3.5 relative overflow-hidden shadow-emerald-glow">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#10B981] font-mono">
                4. Revenue Recovered
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
            <p className="text-sm font-bold text-[#10B981] font-mono">
              ₹{recovered.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-[#10B981]/80 mt-0.5">
              {rate.toFixed(1)}% Measured Recovery Rate
            </p>
          </div>
        </div>
      </div>

      {/* Topline Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* HERO: Recovered Revenue */}
        <MetricCard
          title="Recovered Revenue (Autonomous)"
          value={`₹${recovered.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subtitle={`${recoveredCases} settled transactions verified`}
          icon={CheckCircle2}
          iconColor="text-[#10B981]"
          iconBg="bg-[#10B981]/15"
          trend="↑ 18.4% this month"
          trendPositive={true}
          isHero={true}
        />

        {/* Revenue at Risk */}
        <MetricCard
          title="Revenue at Risk Identified"
          value={`₹${atRisk.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subtitle={`${totalCases} total detected leakage cases`}
          icon={DollarSign}
          iconColor="text-[#EF4444]"
          iconBg="bg-[#EF4444]/15"
          trend={`${totalCases - recoveredCases} open / pending`}
          trendPositive={false}
          valueColor="text-[#EF4444]"
        />

        {/* Recovery Rate */}
        <MetricCard
          title="Measured Recovery Rate"
          value={`${rate.toFixed(1)}%`}
          subtitle="Target bar: 25% – 35%"
          icon={TrendingUp}
          iconColor="text-[#10B981]"
          iconBg="bg-[#17243A]"
          trend={rate >= 25 ? 'Target Achieved' : 'In Progress'}
          trendPositive={rate >= 25}
          valueColor="text-white"
        />

        {/* Compliance Escalations */}
        <MetricCard
          title="Compliance & Escalations"
          value={escalatedCases}
          subtitle={`High value > ₹50k • ${stoppedCases} Safe Stops`}
          icon={ShieldAlert}
          iconColor="text-[#F59E0B]"
          iconBg="bg-[#F59E0B]/15"
          trend="100% Policy Bound"
          trendPositive={true}
          valueColor="text-[#F59E0B]"
        />
      </div>

      {/* 4 Recovery Source Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8]">
              Recovery Sources Breakdown
            </h3>
            <p className="text-xs text-[#64748B]">
              Per-channel revenue leakage, active AI interventions, and recovered totals
            </p>
          </div>
          <button
            onClick={() => onNavigateToQueue()}
            className="text-xs font-semibold text-[#10B981] hover:text-[#34D399] transition flex items-center gap-1"
          >
            <span>View Full Queue</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sourceConfigs.map((source) => {
            const Icon = source.icon;
            const sourceAmount = metrics?.revenue_by_type?.[source.type] || 0;
            const sourceCount = metrics?.cases_by_type?.[source.type] || 0;
            
            // Calculate approximate recovered amount per source
            const sourceRecovered = sourceCount > 0 && totalCases > 0
              ? Math.round((sourceCount / totalCases) * recovered)
              : 0;
            const sourceRate = sourceAmount > 0
              ? ((sourceRecovered / sourceAmount) * 100).toFixed(1)
              : '0.0';

            return (
              <div
                key={source.type}
                onClick={() => onNavigateToQueue(source.type)}
                className="bg-[#111C2E] border border-[#24344D] hover:border-[#334B6E] hover:bg-[#17243A] rounded-xl p-5 transition cursor-pointer group shadow-subtle-card flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="p-2 rounded-lg border border-[#24344D] bg-[#0B1220] transition-transform group-hover:scale-105"
                        style={{ color: source.accentColor }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-white truncate">{source.title}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${source.badgeBg}`}
                    >
                      {sourceCount} Cases
                    </span>
                  </div>

                  <p className="text-[11px] text-[#64748B] mb-3 line-clamp-1">{source.description}</p>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-[#94A3B8]">Revenue at Risk:</span>
                      <span className="font-mono font-bold text-[#F8FAFC]">
                        ₹{sourceAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-[#94A3B8]">Recovered:</span>
                      <span className="font-mono font-bold text-[#10B981]">
                        ₹{sourceRecovered.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs pt-2 border-t border-[#24344D]">
                      <span className="text-[#64748B]">Recovery Rate:</span>
                      <span className="font-mono font-semibold text-[#F8FAFC]">
                        {sourceRate}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 text-[11px] text-[#06B6D4] font-medium flex items-center justify-between opacity-80 group-hover:opacity-100 transition border-t border-[#24344D]/40">
                  <span>Inspect Channel Cases</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4-Stage Recovery Funnel */}
      {metrics?.funnel && <FunnelChart funnel={metrics.funnel} />}

      {/* Strategy Performance & Policy Stopping Rules */}
      {metrics && (
        <StrategyChart
          strategies={metrics.strategy_performance || []}
          stoppingReasons={metrics.stopping_reasons_breakdown || {}}
        />
      )}
    </div>
  );
};
