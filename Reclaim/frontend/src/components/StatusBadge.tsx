import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  const normalized = status ? status.toLowerCase() : 'open';

  const getBadgeStyle = () => {
    switch (normalized) {
      case 'recovered':
      case 'paid':
      case 'approved':
        return {
          wrapper: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30',
          dot: 'bg-[#10B981]',
          label: normalized === 'paid' ? 'Paid & Recovered' : normalized,
        };
      case 'in_progress':
      case 'delivered':
      case 'opened':
        return {
          wrapper: 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/30',
          dot: 'bg-[#06B6D4]',
          label: normalized === 'in_progress' ? 'In Progress' : normalized,
        };
      case 'escalated':
      case 'pending_approval':
        return {
          wrapper: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30 animate-pulse',
          dot: 'bg-[#F59E0B]',
          label: 'Escalated (> ₹50k)',
        };
      case 'stopped':
      case 'failed':
      case 'rejected':
      case 'expired':
        return {
          wrapper: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
          dot: 'bg-[#EF4444]',
          label: normalized,
        };
      case 'open':
      default:
        return {
          wrapper: 'bg-[#17243A] text-[#94A3B8] border-[#24344D]',
          dot: 'bg-[#64748B]',
          label: normalized,
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold uppercase tracking-wider border font-mono ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${style.wrapper} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
      <span>{style.label.replace(/_/g, ' ')}</span>
    </span>
  );
};
