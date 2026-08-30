import React, { useState, useEffect } from 'react';
import { RecoveryCase } from '../api/types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { CaseDetailModal } from '../components/CaseDetailModal';
import {
  Search,
  ShieldAlert,
  RefreshCw,
  CreditCard,
  ShoppingCart,
  RotateCcw,
  FileText,
  Layers,
  ArrowRight,
  X,
  Inbox
} from 'lucide-react';

interface RecoveryQueueProps {
  initialSourceFilter?: string;
}

export const RecoveryQueue: React.FC<RecoveryQueueProps> = ({
  initialSourceFilter = 'all',
}) => {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>(initialSourceFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (initialSourceFilter) {
      setTypeFilter(initialSourceFilter);
    }
  }, [initialSourceFilter]);

  useEffect(() => {
    fetchCases();
  }, [statusFilter, typeFilter]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.case_type = typeFilter;
      const data = await api.listCases(params);
      setCases(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = c.customer?.name?.toLowerCase().includes(q) || false;
    const emailMatch = c.customer?.email?.toLowerCase().includes(q) || false;
    const idMatch = c.id.toString().includes(q) || (c.external_id && c.external_id.toLowerCase().includes(q));
    return nameMatch || emailMatch || idMatch;
  });

  const sourceTabs = [
    { id: 'all', label: 'All Sources', icon: Layers },
    { id: 'payment_failure', label: 'Payment Failures', color: 'text-[#EF4444]', icon: CreditCard },
    { id: 'checkout_abandonment', label: 'Checkout Abandonment', color: 'text-[#F59E0B]', icon: ShoppingCart },
    { id: 'subscription_failure', label: 'Subscriptions', color: 'text-[#8B5CF6]', icon: RotateCcw },
    { id: 'overdue_invoice', label: 'B2B Invoices', color: 'text-[#06B6D4]', icon: FileText },
  ];

  const statusTabs = [
    { id: 'all', label: 'All Statuses' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'escalated', label: 'Escalated (> ₹50k)' },
    { id: 'recovered', label: 'Recovered' },
    { id: 'stopped', label: 'Stopped' },
    { id: 'open', label: 'Open' },
  ];

  const handleResetFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || searchQuery !== '';

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="bg-[#111C2E] border border-[#24344D] rounded-xl p-5 shadow-subtle-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">AI Recovery Queue</h2>
              <span className="text-xs text-[#10B981] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 border border-[#10B981]/25">
                {filteredCases.length} Cases Loaded
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Live case diagnostics, predicted recovery probability, and executed interventions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search customer, email, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0B1220] border border-[#24344D] rounded-lg pl-9 pr-8 py-1.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4] w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 rounded-lg bg-[#17243A] hover:bg-[#24344D] text-[#94A3B8] hover:text-white text-xs font-semibold border border-[#24344D] transition flex items-center gap-1.5"
                title="Reset all filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            )}

            <button
              onClick={fetchCases}
              disabled={loading}
              className="p-2 rounded-lg bg-[#17243A] hover:bg-[#24344D] text-[#94A3B8] hover:text-white border border-[#24344D] transition"
              title="Refresh Cases"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#10B981]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Source Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-[#24344D] pt-3">
          {sourceTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                  isSelected
                    ? 'bg-[#17243A] text-white border-[#334B6E]'
                    : 'bg-[#0B1220]/50 text-[#94A3B8] border-transparent hover:text-white hover:bg-[#17243A]/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.color || 'text-[#94A3B8]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {statusTabs.map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-mono'
                    : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[#17243A]/40'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Case Table - Desktop */}
      <div className="hidden md:block bg-[#111C2E] border border-[#24344D] rounded-xl overflow-hidden shadow-subtle-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B1220]/90 text-[#94A3B8] uppercase font-semibold border-b border-[#24344D]">
              <tr>
                <th className="px-5 py-3.5">Case &amp; Customer</th>
                <th className="px-5 py-3.5">Source &amp; Diagnosis</th>
                <th className="px-5 py-3.5">Amount at Risk</th>
                <th className="px-5 py-3.5">Recovery Probability</th>
                <th className="px-5 py-3.5">Strategy / Channel</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24344D]/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#10B981]" />
                      <span>Loading recovery cases...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-full bg-[#17243A] border border-[#24344D] flex items-center justify-center text-[#64748B]">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <p className="text-white font-semibold text-sm">No Matching Cases Found</p>
                      <p className="text-xs text-[#94A3B8]">
                        Try adjusting your search query, source selection, or status filters.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 px-3 py-1.5 bg-[#17243A] hover:bg-[#24344D] text-white text-xs font-semibold rounded-lg border border-[#24344D] transition"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className="hover:bg-[#17243A]/70 cursor-pointer transition"
                  >
                    {/* Case & Customer */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F8FAFC] font-mono">#{c.id}</span>
                        {c.amount >= 50000 && (
                          <span className="p-1 rounded bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25" title="> ₹50k High Value Escalation">
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-white mt-0.5">{c.customer?.name}</p>
                      <p className="text-[11px] text-[#64748B] font-mono truncate max-w-[180px]">
                        {c.customer?.email}
                      </p>
                    </td>

                    {/* Source & Diagnosis */}
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-wider font-mono">
                        {c.case_type.replace(/_/g, ' ')}
                      </span>
                      <p className="text-[#94A3B8] mt-0.5 truncate max-w-xs text-[11px]" title={c.root_cause_diagnosis || c.failure_reason}>
                        {c.failure_reason}
                      </p>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4 font-mono">
                      <span className="font-bold text-[#F8FAFC]">
                        ₹{c.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                      {c.recovered_amount > 0 && (
                        <p className="text-[11px] text-[#10B981] font-semibold">
                          Recovered ₹{c.recovered_amount.toLocaleString('en-IN')}
                        </p>
                      )}
                    </td>

                    {/* Probability Gauge */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[#0B1220] rounded-full overflow-hidden border border-[#24344D]">
                          <div
                            className="h-full bg-gradient-to-r from-[#06B6D4] to-[#10B981] rounded-full"
                            style={{ width: `${c.recovery_probability * 100}%` }}
                          />
                        </div>
                        <span className="font-bold text-[#F8FAFC] font-mono text-[11px]">
                          {(c.recovery_probability * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-0.5 font-mono">
                        Attempt {c.attempt_count} of {c.max_attempts}
                      </p>
                    </td>

                    {/* Strategy & Channel */}
                    <td className="px-5 py-4">
                      <span className="text-[#F8FAFC] font-medium capitalize text-xs">
                        {c.current_strategy?.replace(/_/g, ' ') || 'Payment Link'}
                      </span>
                      {c.customer?.language_preference && (
                        <p className="text-[10px] text-[#64748B] uppercase font-mono">
                          Lang: {c.customer.language_preference}
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusBadge status={c.status} size="sm" />
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCase(c);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#17243A] hover:bg-[#24344D] text-[#94A3B8] hover:text-white border border-[#24344D] transition text-xs font-semibold"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List Fallback */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#64748B] bg-[#111C2E] rounded-xl border border-[#24344D]">
            Loading recovery cases...
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B] bg-[#111C2E] rounded-xl border border-[#24344D]">
            <p className="text-white font-semibold mb-1">No Matching Cases</p>
            <p className="text-xs text-[#94A3B8] mb-3">Try adjusting your filters.</p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-[#17243A] text-white text-xs font-semibold rounded-lg border border-[#24344D]"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          filteredCases.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedCase(c)}
              className="bg-[#111C2E] border border-[#24344D] rounded-xl p-4 space-y-3 cursor-pointer hover:border-[#334B6E] transition shadow-subtle-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white font-mono">#{c.id}</span>
                  <StatusBadge status={c.status} size="sm" />
                </div>
                <span className="font-mono font-bold text-white text-sm">
                  ₹{c.amount.toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <p className="font-semibold text-white text-xs">{c.customer?.name}</p>
                <p className="text-[11px] text-[#94A3B8] truncate">{c.failure_reason}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#24344D] text-xs">
                <span className="text-[10px] uppercase font-bold text-[#06B6D4] font-mono">
                  {c.case_type.replace(/_/g, ' ')}
                </span>
                <span className="text-[#10B981] font-semibold flex items-center gap-1 text-[11px]">
                  <span>Inspect Timeline</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Case Timeline Detail Modal */}
      {selectedCase && (
        <CaseDetailModal
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onUpdate={() => {
            fetchCases();
          }}
        />
      )}
    </div>
  );
};
