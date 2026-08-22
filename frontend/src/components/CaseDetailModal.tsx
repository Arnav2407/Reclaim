import React, { useState, useEffect } from 'react';
import { RecoveryCase, CaseTimelineResponse } from '../api/types';
import { api } from '../api/client';
import { StatusBadge } from './StatusBadge';
import {
  X,
  ShieldCheck,
  Clock,
  User,
  CreditCard,
  AlertTriangle,
  FileCheck,
  Zap,
  Check,
  Ban,
} from 'lucide-react';

interface CaseDetailModalProps {
  caseItem: RecoveryCase | null;
  onClose: () => void;
  onUpdate: () => void;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  caseItem,
  onClose,
  onUpdate,
}) => {
  const [timeline, setTimeline] = useState<CaseTimelineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (caseItem) {
      loadTimeline();
    }
  }, [caseItem]);

  const loadTimeline = async () => {
    if (!caseItem) return;
    setLoading(true);
    try {
      const data = await api.getCaseTimeline(caseItem.id);
      setTimeline(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalation = async (approved: boolean) => {
    if (!caseItem) return;
    setActionLoading(true);
    try {
      await api.submitEscalationDecision(caseItem.id, approved, reviewerNotes);
      await loadTimeline();
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerRecovery = async () => {
    if (!caseItem) return;
    setActionLoading(true);
    try {
      await api.triggerCaseRecovery(caseItem.id, true);
      await loadTimeline();
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (caseItem?.razorpay_short_url) {
      navigator.clipboard.writeText(caseItem.razorpay_short_url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (!caseItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Case #{caseItem.id}</h2>
                <StatusBadge status={caseItem.status} />
                {caseItem.amount >= 50000 && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    High Value &gt; Rs. 50k
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">{caseItem.external_id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer Info */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <User className="w-4 h-4 text-indigo-400" />
                Customer Context
              </div>
              <p className="font-bold text-slate-100">{caseItem.customer?.name}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{caseItem.customer?.email}</p>
              <p className="text-xs text-slate-400 font-mono">{caseItem.customer?.phone}</p>
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Customer LTV:</span>
                <span className="font-bold text-slate-200">
                  Rs. {caseItem.customer?.ltv.toLocaleString('en-IN') || 0}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-slate-400">Language:</span>
                <span className="font-semibold text-indigo-400 uppercase">
                  {caseItem.customer?.language_preference || 'Hinglish'}
                </span>
              </div>
            </div>

            {/* Diagnosis & Probability */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                AI Diagnosis & Probability
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Recovery Probability:</span>
                <span className="text-sm font-bold text-indigo-400">
                  {(caseItem.recovery_probability * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                  style={{ width: `${caseItem.recovery_probability * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-300 bg-slate-900/90 p-2 rounded border border-slate-800">
                {caseItem.root_cause_diagnosis || caseItem.failure_reason}
              </p>
            </div>

            {/* Financial Details & Razorpay Link */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Amount & Razorpay Link
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs text-slate-400">Amount at Risk:</span>
                <span className="text-lg font-extrabold text-white">
                  Rs. {caseItem.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
              {caseItem.recovered_amount > 0 && (
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs text-slate-400">Recovered:</span>
                  <span className="text-sm font-bold text-emerald-400">
                    Rs. {caseItem.recovered_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {caseItem.razorpay_short_url ? (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={caseItem.razorpay_short_url}
                      className="text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-indigo-300 font-mono w-full truncate focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition whitespace-nowrap"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : 'Copy'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-2">No payment link generated yet</p>
              )}
            </div>
          </div>

          {/* Supervisor Escalation Action Banner */}
          {caseItem.status === 'escalated' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-300">
                    Supervisor Approval Required (&gt; Rs. 50,000 Threshold)
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {caseItem.escalation_reason ||
                      'This recovery case exceeds standard autonomous thresholds and requires compliance sign-off before sending outreach.'}
                  </p>

                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Supervisor review notes (optional)..."
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEscalation(true)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve &amp; Dispatch
                      </button>
                      <button
                        onClick={() => handleEscalation(false)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Reject &amp; Stop
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chronological Audit Trail Timeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Append-Only Immutable Audit Trail
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {timeline?.total_events || 0} Ordered Events
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading audit history...</div>
            ) : timeline && timeline.timeline.length > 0 ? (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {timeline.timeline.map((event, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-slate-900 border-2 border-indigo-500 group-hover:border-emerald-400 transition" />

                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-200">{event.title}</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">No timeline events recorded</div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            Audit Verified — Razorpay Gateway Linked
          </div>

          <div className="flex items-center gap-2">
            {caseItem.status === 'open' && (
              <button
                onClick={handleTriggerRecovery}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                Trigger Autonomous Recovery
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
