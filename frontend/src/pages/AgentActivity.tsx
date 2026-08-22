import React, { useState, useEffect } from 'react';
import { AuditFeedItem } from '../api/types';
import { api } from '../api/client';
import {
  Activity,
  ShieldCheck,
  BrainCircuit,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';

export const AgentActivity: React.FC = () => {
  const [feed, setFeed] = useState<AuditFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchFeed();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchFeed(false);
    }, 2500);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchFeed = async (showLoading: boolean = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await api.getAuditFeed(60);
      setFeed(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const filteredFeed = feed.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'policy_check':
        return { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
      case 'agent_decision':
        return { icon: BrainCircuit, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' };
      case 'communication_sent':
        return { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
      default:
        return { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-800' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Live Agent Activity Feed</h2>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-xs text-slate-400">
            Real-time chronological stream of diagnosis, deterministic policy checks, and autonomous dispatching
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            {autoRefresh ? 'Auto-Polling: ON (2.5s)' : 'Auto-Polling: OFF'}
          </button>

          <button
            onClick={() => fetchFeed(true)}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Activity' },
          { id: 'policy_check', label: 'Policy Guardrails' },
          { id: 'agent_decision', label: 'Agent Decisions' },
          { id: 'communication_sent', label: 'Outreach Dispatched' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Live Feed List */}
      <div className="space-y-3">
        {loading && feed.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 bg-slate-900/60 rounded-xl border border-slate-800">
            Streaming live agent events...
          </div>
        ) : filteredFeed.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 bg-slate-900/60 rounded-xl border border-slate-800">
            No events match selected filter
          </div>
        ) : (
          filteredFeed.map((item) => {
            const { icon: Icon, color, bg } = getEventIcon(item.type);

            return (
              <div
                key={item.id}
                className="bg-slate-900/80 backdrop-blur border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-4 transition shadow-md flex items-start gap-3.5"
              >
                <div className={`p-2 rounded-lg border shrink-0 ${bg} ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">
                        {item.type === 'policy_check' && `Policy Check: ${item.rule_name}`}
                        {item.type === 'agent_decision' && `Orchestrator Proposes: ${item.proposed_action} (Attempt #${item.attempt_number})`}
                        {item.type === 'communication_sent' && `Dispatched via ${item.channel?.toUpperCase()} (${item.language?.toUpperCase()})`}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        Case #{item.case_id}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-500 font-mono shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Body details */}
                  {item.type === 'policy_check' && (
                    <div className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                      <span
                        className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded ${
                          item.decision_action === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.decision_action === 'escalated'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.decision_action}
                      </span>
                      <span>{item.details || 'Compliant with safety guardrails'}</span>
                    </div>
                  )}

                  {item.type === 'agent_decision' && (
                    <p className="text-xs text-slate-300 mt-1">
                      <span className="text-slate-400">Rationale: </span>
                      {item.rationale}
                    </p>
                  )}

                  {item.type === 'communication_sent' && (
                    <div className="mt-1.5 p-2 bg-slate-950/80 rounded border border-slate-800 text-xs text-slate-300 font-sans whitespace-pre-line">
                      <span className="text-[10px] text-slate-500 uppercase block mb-0.5">
                        Recipient: {item.recipient}
                      </span>
                      {item.preview}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
