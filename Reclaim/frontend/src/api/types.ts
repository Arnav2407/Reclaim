export interface Customer {
  id: number;
  external_id: string;
  name: string;
  email: string;
  phone: string;
  ltv: number;
  total_orders: number;
  successful_orders: number;
  preferred_method: string;
  language_preference: string;
  opt_out: boolean;
  has_active_dispute: boolean;
  created_at: string;
}

export interface RecoveryAttempt {
  id: number;
  attempt_number: number;
  strategy: string;
  channel?: string;
  discount_offered: number;
  outcome: 'pending' | 'delivered' | 'opened' | 'paid' | 'failed' | 'expired';
  outcome_details?: string;
  created_at: string;
  completed_at?: string;
}

export interface AgentDecision {
  id: number;
  attempt_number: number;
  proposed_action: string;
  proposed_channel?: string;
  proposed_discount: number;
  proposed_delay_minutes: number;
  priority: 'low' | 'medium' | 'high';
  confidence_score: number;
  rationale: string;
  created_at: string;
}

export interface PolicyCheck {
  id: number;
  rule_name: string;
  rule_category: string;
  is_compliant: boolean;
  decision_action: 'approved' | 'modified' | 'rejected' | 'escalated';
  violation_details?: string;
  created_at: string;
}

export interface CommunicationLog {
  id: number;
  recipient: string;
  channel: string;
  language: string;
  subject?: string;
  body_content: string;
  status: string;
  sent_at: string;
}

export interface RecoveryCase {
  id: number;
  external_id: string;
  case_type: 'payment_failure' | 'checkout_abandonment' | 'subscription_failure' | 'overdue_invoice';
  status: 'open' | 'in_progress' | 'escalated' | 'recovered' | 'stopped' | 'failed';
  amount: number;
  customer_id: number;
  failure_reason?: string;
  root_cause_diagnosis?: string;
  recovery_probability: number;
  attempt_count: number;
  max_attempts: number;
  current_strategy?: string;
  escalation_required: boolean;
  escalation_status: 'none' | 'pending_approval' | 'approved' | 'rejected';
  escalation_reason?: string;
  stop_reason?: string;
  recovered_amount: number;
  recovered_at?: string;
  razorpay_payment_link_id?: string;
  razorpay_short_url?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface RecoveryCaseDetail extends RecoveryCase {
  attempts: RecoveryAttempt[];
  decisions: AgentDecision[];
  policy_checks: PolicyCheck[];
  communication_logs: CommunicationLog[];
}

export interface TimelineEvent {
  event_type: string;
  stage: string;
  timestamp: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
}

export interface CaseTimelineResponse {
  case_id: number;
  external_id: string;
  current_status: string;
  total_events: number;
  timeline: TimelineEvent[];
}

export interface StrategyStat {
  strategy: string;
  channel: string;
  total_attempts: number;
  successful_recoveries: number;
  revenue_recovered: number;
  recovery_rate: number;
  avg_recovery_minutes: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  amount: number;
}

export interface DashboardMetrics {
  total_revenue_at_risk: number;
  total_revenue_recovered: number;
  recovery_rate_pct: number;
  total_cases_identified: number;
  recovered_cases_count: number;
  in_progress_cases_count: number;
  escalated_cases_count: number;
  stopped_cases_count: number;
  avg_recovery_time_hours: number;
  cases_by_type: Record<string, number>;
  revenue_by_type: Record<string, number>;
  strategy_performance: StrategyStat[];
  funnel: FunnelStage[];
  stopping_reasons_breakdown: Record<string, number>;
}

export interface AuditFeedItem {
  id: string;
  type: 'policy_check' | 'agent_decision' | 'communication_sent';
  case_id: number;
  rule_name?: string;
  rule_category?: string;
  is_compliant?: boolean;
  decision_action?: string;
  details?: string;
  attempt_number?: number;
  proposed_action?: string;
  proposed_channel?: string;
  confidence?: number;
  rationale?: string;
  channel?: string;
  recipient?: string;
  language?: string;
  preview?: string;
  timestamp: string;
}
