import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStyles = () => {
    switch (status.toLowerCase()) {
      case 'recovered':
      case 'paid':
      case 'approved':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'in_progress':
      case 'delivered':
      case 'opened':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'escalated':
      case 'pending_approval':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse';
      case 'stopped':
      case 'failed':
      case 'rejected':
      case 'expired':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'open':
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${getStyles()} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {status.replace(/_/g, ' ')}
    </span>
  );
};
