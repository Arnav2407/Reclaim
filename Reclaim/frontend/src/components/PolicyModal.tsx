import React from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  Percent,
  MessageSquare,
  Lock
} from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const rules = [
    {
      id: 'max_attempts',
      title: 'Rule 1: Maximum 3 Recovery Attempts',
      category: 'Contact Limits',
      description: 'Hard stop per case. If 3 interventions fail across channels, the case transitions to STOPPED to prevent customer friction.',
      icon: Clock,
      status: 'Deterministic Enforcement',
    },
    {
      id: 'cooldown',
      title: 'Rule 2: 24-Hour Contact Cooldown',
      category: 'Anti-Spam',
      description: 'No outbound notification can be dispatched to the same customer within 24 hours of a previous recovery outreach.',
      icon: Ban,
      status: 'Deterministic Enforcement',
    },
    {
      id: 'escalation_threshold',
      title: 'Rule 3: High-Value Human Escalation (> ₹50,000)',
      category: 'Financial Safety',
      description: 'Cases with amounts at risk exceeding ₹50,000 require manual supervisor approval in the queue before any customer-facing link is dispatched.',
      icon: AlertTriangle,
      status: 'Deterministic Enforcement',
    },
    {
      id: 'discount_bounds',
      title: 'Rule 4: Maximum 10% Discount Cap',
      category: 'Margin Protection',
      description: 'The autonomous agent is strictly bounded. Promotional discount offers cannot exceed 10% under any circumstance.',
      icon: Percent,
      status: 'Deterministic Enforcement',
    },
    {
      id: 'max_messages',
      title: 'Rule 5: Maximum 2 Outbound Messages',
      category: 'Channel Compliance',
      description: 'Across WhatsApp, SMS, or Email, a maximum of 2 outbound messages can be delivered per revenue leakage incident.',
      icon: MessageSquare,
      status: 'Deterministic Enforcement',
    },
    {
      id: 'dispute_opt_out',
      title: 'Rule 6: Active Dispute & Opt-Out Stop Rule',
      category: 'Legal & Compliance',
      description: 'Instant veto. Any case with an active payment dispute, chargeback, or customer opt-out is permanently stopped immediately.',
      icon: Lock,
      status: 'Deterministic Enforcement',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1220]/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#111C2E] border border-[#24344D] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24344D] bg-[#0B1220]/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Deterministic Policy Guardrails</h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                  100% Code Verified
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Deterministic Python policy engine — The LLM proposes, code approves before execution
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#17243A] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="p-3.5 bg-[#17243A]/80 border border-[#24344D] rounded-xl text-xs text-[#94A3B8] flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold mb-0.5">Policy Engine Core Architecture</p>
              <p>
                Every autonomous decision made by Reclaim is run through deterministic unit checks in plain Python code before interacting with Razorpay or dispatching customer messages.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {rules.map((rule) => {
              const Icon = rule.icon;
              return (
                <div
                  key={rule.id}
                  className="bg-[#0B1220]/70 border border-[#24344D] hover:border-[#334B6E] rounded-xl p-4 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-[#17243A] text-[#10B981] border border-[#24344D]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#06B6D4]">
                        {rule.category}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25">
                      Enforced
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-white mb-1">{rule.title}</h3>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">{rule.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#24344D] bg-[#0B1220]/80 flex items-center justify-between">
          <div className="text-xs text-[#64748B] font-mono">
            Safety Boundary &bull; Non-Overridable Guardrails
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#17243A] hover:bg-[#24344D] text-[#F8FAFC] rounded-lg text-xs font-semibold transition border border-[#24344D]"
          >
            Close Guardrails
          </button>
        </div>
      </div>
    </div>
  );
};
