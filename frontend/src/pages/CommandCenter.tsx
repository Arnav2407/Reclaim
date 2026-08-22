import React, { useState } from 'react';
import { DashboardMetrics } from '../api/types';
import { api } from '../api/client';
import { MetricCard } from '../components/MetricCard';
import { FunnelChart } from '../components/FunnelChart';
import {
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';

interface CommandCenterProps {
  metrics: DashboardMetrics | null;
  onRefresh: () => void;
  onNavigateToQueue: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  metrics,
  onRefresh,
  onNavigateToQueue,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleGenerateBatch = async () => {
    setLoadingAction('generate');
    setActionMessage(null);
    try {
      const res = await api.generateBatch(500);
      setActionMessage(res.message || '500 synthetic cases generated successfully!');
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
      setActionMessage(`Autonomous recovery complete! Processed ${res.processed_cases} cases.`);
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

  return (
    <div className="space-y-6">
      {/* Top Banner Pitch */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-blue-950/80 border border-indigo-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Autonomous Revenue Recovery Active
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight">
              &quot;We didn&apos;t build an AI that tells a merchant what to do — we built an agent that recovers money itself.&quot;
            </h1>
            <p className="text-xs lg:text-sm text-slate-300 mt-1 max-w-3xl">
              Diagnoses root causes across 4 failure sources, decides bounded interventions via AI, validates through deterministic policy guardrails, and executes real Razorpay test-mode payment links.
            </p>
          </div>

          {/* Quick Simulation Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleGenerateBatch}
              disabled={!!loadingAction}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              {loadingAction === 'generate' ? 'Generating...' : '1. Ingest ~500 Cases (₹17.5L)'}
            </button>

            <button
              onClick={handleRunBatch}
              disabled={!!loadingAction}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/25 transition disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              {loadingAction === 'run' ? 'Recovering...' : '2. Run Autonomous Loop'}
            </button>

            <button
              onClick={handleReset}
              disabled={!!loadingAction}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl transition"
              title="Reset System"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {actionMessage && (
          <div className="mt-4 p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-xs font-medium text-indigo-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {actionMessage}
          </div>
        )}
      </div>

      {/* Topline KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Revenue at Risk Identified"
          value={`Rs. ${atRisk.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subtitle={`${metrics?.total_cases_identified || 0} Total Simulated Cases`}
          icon={DollarSign}
          iconColor="text-amber-400"
        />

        <MetricCard
          title="Revenue Recovered (Proven)"
          value={`Rs. ${recovered.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subtitle={`${metrics?.recovered_cases_count || 0} Successful Transactions`}
          icon={CheckCircle2}
          iconColor="text-emerald-400"
          trend={`${rate.toFixed(1)}% Recovery Rate`}
          trendPositive={rate >= 25}
        />

        <MetricCard
          title="Measured Recovery Rate"
          value={`${rate.toFixed(2)}%`}
          subtitle="Target Bar: 25% – 35%"
          icon={TrendingUp}
          iconColor="text-indigo-400"
          trend="Within Target Range"
          trendPositive={true}
        />

        <MetricCard
          title="Compliance Escalations"
          value={metrics?.escalated_cases_count || 0}
          subtitle="Cases > Rs. 50,000 Threshold"
          icon={ShieldAlert}
          iconColor="text-rose-400"
          trend={`${metrics?.stopped_cases_count || 0} Stopped by Policy`}
          trendPositive={false}
        />
      </div>

      {/* 4-Stage Recovery Funnel */}
      {metrics?.funnel && <FunnelChart funnel={metrics.funnel} />}

      {/* Revenue Breakdown by Failure Source */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Revenue at Risk by Source</h3>
            <p className="text-xs text-slate-400">Distribution across 4 primary merchant leakage channels</p>
          </div>
          <button
            onClick={onNavigateToQueue}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            View Recovery Queue &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(metrics?.revenue_by_type || {}).map(([type, amount]) => {
            const count = metrics?.cases_by_type[type] || 0;
            return (
              <div key={type} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {type.replace(/_/g, ' ')}
                </p>
                <h4 className="text-lg font-extrabold text-white mt-1">
                  Rs. {amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">{count} cases identified</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
