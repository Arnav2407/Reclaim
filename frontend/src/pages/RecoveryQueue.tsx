import React, { useState, useEffect } from 'react';
import { RecoveryCase } from '../api/types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { CaseDetailModal } from '../components/CaseDetailModal';
import {
  Search,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

export const RecoveryQueue: React.FC = () => {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchCases();
  }, [statusFilter, typeFilter]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 150 };
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
    const q = searchQuery.toLowerCase();
    const nameMatch = c.customer?.name.toLowerCase().includes(q) || false;
    const emailMatch = c.customer?.email.toLowerCase().includes(q) || false;
    const idMatch = c.id.toString().includes(q) || c.external_id.toLowerCase().includes(q);
    return nameMatch || emailMatch || idMatch;
  });

  const filterTabs = [
    { id: 'all', label: 'All Cases' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'escalated', label: 'Escalated (> ₹50k)' },
    { id: 'recovered', label: 'Recovered' },
    { id: 'stopped', label: 'Stopped' },
    { id: 'open', label: 'Open' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">AI Recovery Queue</h2>
            <p className="text-xs text-slate-400">
              Live per-case diagnosis, predicted probability, and executed interventions
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search customer, email, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-60"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Sources</option>
              <option value="payment_failure">Payment Failures</option>
              <option value="checkout_abandonment">Checkout Abandonment</option>
              <option value="subscription_failure">Subscriptions</option>
              <option value="overdue_invoice">Overdue Invoices</option>
            </select>

            <button
              onClick={fetchCases}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh Cases"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800/80 overflow-x-auto pb-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Case Table */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Case &amp; Customer</th>
                <th className="px-5 py-3.5">Source &amp; Diagnosis</th>
                <th className="px-5 py-3.5">Amount at Risk</th>
                <th className="px-5 py-3.5">Recovery Probability</th>
                <th className="px-5 py-3.5">Strategy / Channel</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Audit Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    Loading recovery cases...
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No matching cases found
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    {/* Case & Customer */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">#{c.id}</span>
                        {c.amount >= 50000 && (
                          <span className="p-1 rounded bg-amber-500/20 text-amber-400" title="> Rs. 50k Escalation">
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-300 mt-0.5">{c.customer?.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{c.customer?.email}</p>
                    </td>

                    {/* Source & Diagnosis */}
                    <td className="px-5 py-4">
                      <span className="text-[11px] font-semibold text-indigo-300 uppercase">
                        {c.case_type.replace(/_/g, ' ')}
                      </span>
                      <p className="text-slate-400 mt-0.5 truncate max-w-xs" title={c.root_cause_diagnosis || c.failure_reason}>
                        {c.failure_reason}
                      </p>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4 font-mono font-bold text-slate-100">
                      Rs. {c.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      {c.recovered_amount > 0 && (
                        <p className="text-[11px] text-emerald-400 font-semibold font-sans">
                          Recovered Rs. {c.recovered_amount.toLocaleString('en-IN')}
                        </p>
                      )}
                    </td>

                    {/* Probability Gauge */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                            style={{ width: `${c.recovery_probability * 100}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-300">
                          {(c.recovery_probability * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Attempt {c.attempt_count} of {c.max_attempts}</p>
                    </td>

                    {/* Strategy & Channel */}
                    <td className="px-5 py-4">
                      <span className="text-slate-300 font-medium capitalize">
                        {c.current_strategy?.replace(/_/g, ' ') || 'payment link'}
                      </span>
                      {c.customer?.language_preference && (
                        <p className="text-[10px] text-slate-500 uppercase">
                          Lang: {c.customer.language_preference}
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusBadge status={c.status} />
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCase(c);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition font-medium"
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
