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
  FileCheck,
  Zap,
  Check,
  Ban,
  Copy,
  Bot,
  ArrowRight
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1220]/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#111C2E] border border-[#24344D] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24344D] bg-[#0B1220]/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#17243A] border border-[#24344D] text-[#10B981]">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Case #{caseItem.id}</h2>
                <StatusBadge status={caseItem.status} size="sm" />
                {caseItem.amount >= 50000 && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 font-mono">
                    High Value &gt; ₹50k
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B] font-mono">{caseItem.external_id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#17243A] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 4-Step Narrative Lifecycle Indicator */}
          <div className="bg-[#0B1220]/70 border border-[#24344D] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <span className="font-semibold text-white">1. Leakage Detected</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#334B6E] hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />
              <span className="font-semibold text-white">2. AI Diagnosed ({(caseItem.recovery_probability * 100).toFixed(0)}%)</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#334B6E] hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
              <span className="font-semibold text-white">3. Policy Guardrail Verified</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#334B6E] hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${caseItem.status === 'recovered' ? 'bg-[#10B981]' : 'bg-[#64748B]'}`} />
              <span className={`font-semibold ${caseItem.status === 'recovered' ? 'text-[#10B981]' : 'text-[#94A3B8]'}`}>
                4. {caseItem.status === 'recovered' ? 'Recovered' : 'Awaiting Settlement'}
              </span>
            </div>
          </div>

          {/* Top Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer Context */}
            <div className="bg-[#0B1220]/70 border border-[#24344D] rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2.5">
                <User className="w-4 h-4 text-[#06B6D4]" />
                <span>Customer Profile</span>
              </div>
              <p className="font-bold text-[#F8FAFC] text-sm">{caseItem.customer?.name}</p>
              <p className="text-xs text-[#94A3B8] font-mono mt-0.5 truncate">{caseItem.customer?.email}</p>
              <p className="text-xs text-[#64748B] font-mono">{caseItem.customer?.phone}</p>
              
              <div className="mt-3 pt-3 border-t border-[#24344D] flex items-center justify-between text-xs">
                <span className="text-[#94A3B8]">Customer LTV:</span>
                <span className="font-bold text-[#F8FAFC] font-mono">
                  ₹{(caseItem.customer?.ltv || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-[#94A3B8]">Preferred Language:</span>
                <span className="font-semibold text-[#06B6D4] uppercase text-[11px]">
                  {caseItem.customer?.language_preference || 'Hinglish'}
                </span>
              </div>
            </div>

            {/* AI Diagnosis & Probability */}
            <div className="bg-[#0B1220]/70 border border-[#24344D] rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2.5">
                <Bot className="w-4 h-4 text-[#06B6D4]" />
                <span>AI Root Cause &amp; Probability</span>
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[#94A3B8]">Predicted Recovery:</span>
                <span className="text-sm font-bold text-[#10B981] font-mono">
                  {(caseItem.recovery_probability * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 w-full bg-[#17243A] rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-[#06B6D4] to-[#10B981] rounded-full transition-all duration-500"
                  style={{ width: `${caseItem.recovery_probability * 100}%` }}
                />
              </div>
              <div className="p-2.5 rounded-lg bg-[#111C2E] border border-[#24344D] text-xs text-[#F8FAFC]">
                <span className="text-[10px] uppercase font-semibold text-[#06B6D4] block mb-0.5">Diagnosis</span>
                {caseItem.root_cause_diagnosis || caseItem.failure_reason}
              </div>
            </div>

            {/* Financial Details & Razorpay Link */}
            <div className="bg-[#0B1220]/70 border border-[#24344D] rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2.5">
                <CreditCard className="w-4 h-4 text-[#10B981]" />
                <span>Financial Impact</span>
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs text-[#94A3B8]">Amount at Risk:</span>
                <span className="text-lg font-bold text-white font-mono">
                  ₹{caseItem.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
              {caseItem.recovered_amount > 0 && (
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs text-[#94A3B8]">Recovered:</span>
                  <span className="text-sm font-bold text-[#10B981] font-mono">
                    ₹{caseItem.recovered_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {caseItem.razorpay_short_url ? (
                <div className="mt-3 pt-3 border-t border-[#24344D]">
                  <p className="text-[10px] uppercase font-semibold text-[#94A3B8] mb-1">Razorpay Payment Link</p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={caseItem.razorpay_short_url}
                      className="text-xs bg-[#111C2E] border border-[#24344D] rounded-lg px-2.5 py-1.5 text-[#06B6D4] font-mono w-full truncate focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-2.5 py-1.5 bg-[#17243A] hover:bg-[#24344D] text-white border border-[#24344D] rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#64748B] mt-2">No payment link generated yet</p>
              )}
            </div>
          </div>

          {/* Supervisor Escalation Action Banner */}
          {caseItem.status === 'escalated' && (
            <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl p-5 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#F59E0B]/20 text-[#F59E0B] mt-0.5 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-[#F59E0B]">
                    Supervisor Approval Required (&gt; ₹50,000 Threshold)
                  </h4>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {caseItem.escalation_reason ||
                      'This recovery case exceeds standard autonomous thresholds and requires compliance sign-off before sending outreach.'}
                  </p>

                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Supervisor review notes (optional)..."
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      className="flex-1 bg-[#111C2E] border border-[#24344D] rounded-lg px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEscalation(true)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-[#04130D] rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-emerald-glow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve &amp; Dispatch
                      </button>
                      <button
                        onClick={() => handleEscalation(false)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
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

          {/* Chronological Immutable Audit Trail Timeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#06B6D4]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Append-Only Immutable Audit Trail
                </h3>
              </div>
              <span className="text-xs text-[#64748B] font-mono">
                {timeline?.total_events || 0} Ordered Events
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-[#64748B]">Loading audit history...</div>
            ) : timeline && timeline.timeline.length > 0 ? (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#24344D]">
                {timeline.timeline.map((event, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-[#111C2E] border-2 border-[#06B6D4] group-hover:border-[#10B981] transition" />

                    <div className="bg-[#0B1220]/70 border border-[#24344D] rounded-xl p-3.5 hover:border-[#334B6E] transition">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-[#F8FAFC]">{event.title}</span>
                        <span className="text-[#64748B] font-mono text-[11px]">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8]">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#64748B]">No timeline events recorded</div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3.5 border-t border-[#24344D] bg-[#0B1220]/80 flex items-center justify-between">
          <div className="text-xs text-[#64748B] font-mono">
            Audit Verified &bull; Razorpay Gateway Linked
          </div>

          <div className="flex items-center gap-2">
            {caseItem.status === 'open' && (
              <button
                onClick={handleTriggerRecovery}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-[#04130D] rounded-lg text-xs font-bold transition shadow-emerald-glow disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                Trigger Autonomous Recovery
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#17243A] hover:bg-[#24344D] text-[#F8FAFC] rounded-lg text-xs font-semibold transition border border-[#24344D]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
