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

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-white">4-Stage Revenue Recovery Funnel</h3>
          <p className="text-xs text-slate-400">Conversion velocity from detection to measured bank settlement</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          Conversion Rate: {((funnel[funnel.length - 1]?.amount / maxAmount) * 100).toFixed(1)}%
        </span>
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
                  <div className={`p-1.5 rounded-md ${isFinal ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-slate-200 font-semibold">{stage.stage}</span>
                  <span className="text-slate-500">({stage.count} cases)</span>
                </div>
                <span className={`font-bold ${isFinal ? 'text-emerald-400 text-sm' : 'text-slate-300'}`}>
                  Rs. {stage.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Bar */}
              <div className="h-3.5 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/40">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isFinal
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/30'
                      : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {idx < funnel.length - 1 && (
                <div className="flex justify-center -my-1">
                  <ArrowDown className="w-3 h-3 text-slate-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
