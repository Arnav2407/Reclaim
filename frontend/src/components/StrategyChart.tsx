import React from 'react';
import { StrategyStat } from '../api/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface StrategyChartProps {
  strategies: StrategyStat[];
  stoppingReasons?: Record<string, number>;
}

export const StrategyChart: React.FC<StrategyChartProps> = ({
  strategies,
  stoppingReasons = {},
}) => {
  const chartData = strategies.map((s) => ({
    name: `${s.strategy.replace(/_/g, ' ')} (${s.channel})`,
    attempts: s.total_attempts,
    recovered: s.successful_recoveries,
    rate: s.recovery_rate,
  }));

  const stopData = Object.entries(stoppingReasons).map(([reason, count]) => ({
    name: reason.replace(/_/g, ' '),
    count,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Strategy Performance */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Strategy Performance Breakdown</h3>
            <p className="text-xs text-slate-400">Recovery rate (%) by channel and intervention type</p>
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(val: any, name: string) => [
                    name === 'rate' ? `${val}%` : val,
                    name === 'rate' ? 'Recovery Rate' : name === 'recovered' ? 'Recovered Cases' : 'Total Attempts',
                  ]}
                />
                <Bar dataKey="attempts" fill="#334155" radius={[4, 4, 0, 0]} name="attempts" />
                <Bar dataKey="recovered" fill="#10b981" radius={[4, 4, 0, 0]} name="recovered" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No strategy data recorded yet
            </div>
          )}
        </div>
      </div>

      {/* Policy Stopping Rules */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Deterministic Stopping Rules Enforced</h3>
            <p className="text-xs text-slate-400">Proves judgment and non-intrusive merchant boundaries</p>
          </div>
        </div>

        <div className="h-64 w-full flex flex-col justify-center space-y-3 overflow-y-auto">
          {stopData.length > 0 ? (
            stopData.map((item) => (
              <div key={item.name} className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-200 capitalize">{item.name}</span>
                  <span className="font-bold text-rose-400">{item.count} cases stopped</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500/80 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(10, item.count * 1.5))}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No stopped cases recorded yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
