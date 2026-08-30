import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: string;
  trendPositive?: boolean;
  isHero?: boolean;
  valueColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-[#10B981]',
  iconBg = 'bg-[#17243A]',
  trend,
  trendPositive = true,
  isHero = false,
  valueColor = 'text-white',
}) => {
  return (
    <div
      className={`rounded-xl p-5 border transition-all duration-200 relative overflow-hidden group flex flex-col justify-between h-full ${
        isHero
          ? 'bg-gradient-to-br from-[#111C2E] via-[#17243A] to-[#111C2E] border-[#10B981]/40 shadow-emerald-glow'
          : 'bg-[#111C2E] border-[#24344D] hover:border-[#334B6E] hover:bg-[#17243A]/90 shadow-subtle-card'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] truncate">{title}</p>
          <div
            className={`p-2 rounded-lg border border-[#24344D] ${iconBg} ${iconColor} group-hover:scale-105 transition-transform shrink-0`}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3">
          <h3
            className={`font-extrabold tracking-tight font-mono font-tabular ${valueColor} ${
              isHero ? 'text-2xl sm:text-3xl lg:text-4xl text-[#10B981]' : 'text-2xl lg:text-3xl'
            }`}
          >
            {value}
          </h3>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-[#24344D]/50 flex flex-wrap items-center justify-between gap-2 text-xs">
        {trend && (
          <span
            className={`font-semibold px-2 py-0.5 rounded text-[11px] font-mono ${
              trendPositive
                ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25'
                : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/25'
            }`}
          >
            {trend}
          </span>
        )}
        {subtitle && <span className="text-[11px] text-[#94A3B8] truncate max-w-full">{subtitle}</span>}
      </div>

      {/* Subtle corner glow on hero */}
      {isHero && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#10B981]/10 rounded-bl-full pointer-events-none" />
      )}
    </div>
  );
};
