import React from 'react';
import { FunnelStage } from '../api/types';
import { ArrowDown, DollarSign, Send, Eye, CheckCircle2 } from 'lucide-react';

interface FunnelChartProps {
  funnel: FunnelStage[];
}

export const FunnelChart: React.FC<FunnelChartProps> = ({ funnel }) => {
  if (!funnel || funnel.length === 0) return null;

  const stageIcons = [DollarSign, Send, Eye, CheckCircle2];
  const maxAmount = funnel[0]?.amount || 1;
  const finalAmount = funnel[funnel.length - 1]?.amount || 0;
  const conversionRate = maxAmount > 0 ? ((finalAmount / maxAmount) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-[#111C2E] border border-[#24344D] rounded-xl p-5 lg:p-6 shadow-subtle-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            4-Stage Revenue Recovery Funnel
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Conversion velocity from failure detection to measured bank settlement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-md bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-mono">
            Conversion Rate: {conversionRate}%
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {funnel.map((stage, idx) => {
          const Icon = stageIcons[idx % stageIcons.length];
          const pct = Math.max(8, (stage.amount / maxAmount) * 100);
          const isFinal = idx === funnel.length - 1;

          return (
            <div key={stage.stage} className="relative">
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-md border ${
                      isFinal
                        ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40 shadow-emerald-glow'
                        : 'bg-[#17243A] text-[#94A3B8] border-[#24344D]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[#F8FAFC] font-semibold">{stage.stage}</span>
                  <span className="text-[#64748B] font-mono">({stage.count} cases)</span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    isFinal ? 'text-[#10B981] text-sm' : 'text-[#F8FAFC]'
                  }`}
                >
                  ₹{stage.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Progress bar track */}
              <div className="h-3 w-full bg-[#0B1220] rounded-full overflow-hidden p-0.5 border border-[#24344D]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isFinal
                      ? 'bg-gradient-to-r from-[#10B981] to-[#34D399] shadow-emerald-glow'
                      : 'bg-gradient-to-r from-[#1E314F] via-[#24344D] to-[#334B6E]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {idx < funnel.length - 1 && (
                <div className="flex justify-center -my-1">
                  <ArrowDown className="w-3 h-3 text-[#334B6E]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
