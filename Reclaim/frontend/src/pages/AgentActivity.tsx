import React, { useState, useEffect } from 'react';
import { AuditFeedItem } from '../api/types';
import { api } from '../api/client';
import {
  Activity,
  ShieldCheck,
  BrainCircuit,
  MessageSquare,
  RefreshCw,
  Terminal,
  Clock
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
        return {
          icon: ShieldCheck,
          color: 'text-[#10B981]',
          bg: 'bg-[#10B981]/15 border-[#10B981]/30',
          label: 'Policy Engine Check',
        };
      case 'agent_decision':
        return {
          icon: BrainCircuit,
          color: 'text-[#06B6D4]',
          bg: 'bg-[#06B6D4]/15 border-[#06B6D4]/30',
          label: 'Orchestrator Decision',
        };
      case 'communication_sent':
        return {
          icon: MessageSquare,
          color: 'text-[#8B5CF6]',
          bg: 'bg-[#8B5CF6]/15 border-[#8B5CF6]/30',
          label: 'Outreach Dispatched',
        };
      default:
        return {
          icon: Activity,
          color: 'text-[#94A3B8]',
          bg: 'bg-[#17243A] border-[#24344D]',
          label: 'System Event',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Operations Center Controls */}
      <div className="bg-[#111C2E] border border-[#24344D] rounded-xl p-5 lg:p-6 shadow-subtle-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base lg:text-lg font-bold text-white tracking-tight">
              AI Operations Center &amp; Live Audit Stream
            </h2>
            <span className="flex h-2 w-2 rounded-full bg-[#06B6D4] animate-pulse" />
          </div>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Real-time immutable audit trail: AI diagnosis &rarr; Deterministic policy checks &rarr; Autonomous dispatching
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              autoRefresh
                ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                : 'bg-[#17243A] text-[#94A3B8] border-[#24344D]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoRefresh ? 'bg-[#10B981] animate-pulse' : 'bg-[#64748B]'
              }`}
            />
            <span className="font-mono text-[11px]">{autoRefresh ? 'Streaming (2.5s)' : 'Paused'}</span>
          </button>

          <button
            onClick={() => fetchFeed(true)}
            disabled={loading}
            className="p-2 rounded-lg bg-[#17243A] hover:bg-[#24344D] text-[#94A3B8] hover:text-white border border-[#24344D] transition"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#10B981]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Operations' },
          { id: 'policy_check', label: 'Policy Guardrails' },
          { id: 'agent_decision', label: 'AI Decisions' },
          { id: 'communication_sent', label: 'Outreach Dispatched' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
              filter === tab.id
                ? 'bg-[#17243A] text-white border-[#334B6E] shadow-sm'
                : 'bg-[#111C2E] border-[#24344D] text-[#94A3B8] hover:text-white hover:bg-[#17243A]/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Live Event Stream List */}
      <div className="space-y-3">
        {loading && feed.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#64748B] bg-[#111C2E] rounded-xl border border-[#24344D]">
            <RefreshCw className="w-5 h-5 animate-spin text-[#10B981] mx-auto mb-2" />
            <p className="text-white font-semibold">Connecting to Autonomous Agent Stream...</p>
          </div>
        ) : filteredFeed.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#64748B] bg-[#111C2E] rounded-xl border border-[#24344D]">
            <div className="w-10 h-10 rounded-full bg-[#17243A] border border-[#24344D] flex items-center justify-center text-[#64748B] mx-auto mb-2">
              <Terminal className="w-5 h-5" />
            </div>
            <p className="text-white font-semibold text-sm">No Activity Events Recorded</p>
            <p className="text-xs text-[#94A3B8] mt-1">
              Trigger a batch simulation from the top menu to watch the agent diagnose and intervene in real time.
            </p>
          </div>
        ) : (
          filteredFeed.map((item) => {
            const { icon: Icon, color, bg, label } = getEventIcon(item.type);

            return (
              <div
                key={item.id}
                className="bg-[#111C2E] border border-[#24344D] hover:border-[#334B6E] rounded-xl p-4 sm:p-5 transition shadow-subtle-card flex items-start gap-4"
              >
                <div className={`p-2.5 rounded-lg border shrink-0 ${bg} ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Top line metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">
                        {item.type === 'policy_check' && `Guardrail Evaluation: ${item.rule_name}`}
                        {item.type === 'agent_decision' && `Autonomous Proposal: ${item.proposed_action} (Attempt #${item.attempt_number})`}
                        {item.type === 'communication_sent' && `Dispatched via ${item.channel?.toUpperCase()} (${item.language?.toUpperCase()})`}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B1220] border border-[#24344D] text-[#06B6D4]">
                        Case #{item.case_id}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#17243A] text-[#94A3B8]">
                        {label}
                      </span>
                    </div>

                    <span className="text-[11px] text-[#64748B] font-mono shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Body Content by Type */}
                  {item.type === 'policy_check' && (
                    <div className="text-xs text-[#94A3B8] mt-1.5 flex flex-wrap items-center gap-2.5">
                      <span
                        className={`font-semibold font-mono uppercase text-[10px] px-2 py-0.5 rounded border ${
                          item.decision_action === 'approved'
                            ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                            : item.decision_action === 'escalated'
                            ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                            : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                        }`}
                      >
                        {item.decision_action}
                      </span>
                      <span>{item.details || 'Evaluation passed deterministic compliance rules'}</span>
                    </div>
                  )}

                  {item.type === 'agent_decision' && (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-xs text-[#F8FAFC]">
                        <span className="text-[#64748B] font-medium">AI Rationale: </span>
                        {item.rationale}
                      </p>
                      {item.confidence && (
                        <div className="flex items-center gap-2 text-[11px] text-[#06B6D4]">
                          <span>Confidence Score:</span>
                          <span className="font-mono font-bold">{(item.confidence * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {item.type === 'communication_sent' && (
                    <div className="mt-2 p-3 bg-[#0B1220]/80 rounded-lg border border-[#24344D] text-xs text-[#F8FAFC]">
                      <span className="text-[10px] text-[#64748B] font-mono uppercase block mb-1">
                        Recipient: {item.recipient}
                      </span>
                      <p className="whitespace-pre-line text-[#94A3B8] leading-relaxed font-sans">
                        {item.preview}
                      </p>
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
