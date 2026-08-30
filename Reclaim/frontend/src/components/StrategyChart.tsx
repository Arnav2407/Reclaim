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
  Legend,
} from 'recharts';
import { ShieldCheck, Layers } from 'lucide-react';

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
      <div className="bg-[#111C2E] border border-[#24344D] rounded-xl p-5 lg:p-6 shadow-subtle-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#17243A] text-[#10B981] border border-[#24344D]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Strategy Performance Breakdown
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Recovery efficiency by channel and autonomous intervention type
              </p>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748B"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748B" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#17243A',
                    borderColor: '#24344D',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  }}
                  itemStyle={{ color: '#F8FAFC' }}
                  formatter={(val: any, name: string) => [
                    name === 'recovered'
                      ? `${val} cases recovered`
                      : `${val} attempts`,
                    name === 'recovered' ? 'Recovered' : 'Total Attempts',
                  ]}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                />
                <Bar
                  dataKey="attempts"
                  fill="#334B6E"
                  radius={[4, 4, 0, 0]}
                  name="Attempts"
                />
                <Bar
                  dataKey="recovered"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  name="Recovered"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[#64748B] text-xs">
              No strategy performance records yet
            </div>
          )}
        </div>
      </div>

      {/* Policy Stopping Rules */}
      <div className="bg-[#111C2E] border border-[#24344D] rounded-xl p-5 lg:p-6 shadow-subtle-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#17243A] text-[#EF4444] border border-[#24344D]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Deterministic Stopping Rules Enforced
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Proof of bounded execution &amp; non-intrusive merchant boundaries
              </p>
            </div>
          </div>
        </div>

        <div className="h-64 w-full flex flex-col justify-center space-y-3 overflow-y-auto pr-1">
          {stopData.length > 0 ? (
            stopData.map((item) => (
              <div
                key={item.name}
                className="bg-[#0B1220]/70 border border-[#24344D] rounded-lg p-3 hover:border-[#334B6E] transition"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#F8FAFC] capitalize">{item.name}</span>
                  <span className="font-mono font-bold text-[#EF4444] text-[11px]">
                    {item.count} cases safely stopped
                  </span>
                </div>
                <div className="h-2 w-full bg-[#17243A] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#EF4444]/80 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(12, item.count * 1.8))}%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-[#64748B] text-xs">
              No stopped cases recorded yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
