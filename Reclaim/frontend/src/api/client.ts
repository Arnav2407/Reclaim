import {
  DashboardMetrics,
  RecoveryCase,
  RecoveryCaseDetail,
  CaseTimelineResponse,
  AuditFeedItem,
} from './types';

// Supports relative '/api' (proxied by Vite or Vercel rewrites) or external absolute URL
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '') + '/api';

async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(input, init);
    return res;
  } catch (err: any) {
    if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(
        'Cannot connect to backend server. Please verify the backend service is running and accessible.'
      );
    }
    throw err;
  }
}

export const api = {
  async getMetrics(): Promise<DashboardMetrics> {
    const res = await safeFetch(`${API_BASE}/dashboard/metrics`);
    if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
    return res.json();
  },

  async listCases(params?: {
    status?: string;
    case_type?: string;
    escalation_status?: string;
    limit?: number;
    offset?: number;
  }): Promise<RecoveryCase[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.case_type) query.set('case_type', params.case_type);
    if (params?.escalation_status) query.set('escalation_status', params.escalation_status);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    const res = await safeFetch(`${API_BASE}/cases?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch recovery cases');
    return res.json();
  },

  async getCaseDetail(caseId: number): Promise<RecoveryCaseDetail> {
    const res = await safeFetch(`${API_BASE}/cases/${caseId}`);
    if (!res.ok) throw new Error(`Failed to fetch case #${caseId}`);
    return res.json();
  },

  async getCaseTimeline(caseId: number): Promise<CaseTimelineResponse> {
    const res = await safeFetch(`${API_BASE}/cases/${caseId}/timeline`);
    if (!res.ok) throw new Error(`Failed to fetch timeline for case #${caseId}`);
    return res.json();
  },

  async triggerCaseRecovery(caseId: number, simulateOutcome: boolean = true): Promise<any> {
    const res = await safeFetch(`${API_BASE}/cases/${caseId}/recover?simulate_outcome=${simulateOutcome}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Failed to run recovery on case #${caseId}`);
    return res.json();
  },

  async submitEscalationDecision(caseId: number, approved: boolean, notes?: string): Promise<any> {
    const res = await safeFetch(`${API_BASE}/cases/${caseId}/escalation-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved, reviewer_notes: notes }),
    });
    if (!res.ok) throw new Error(`Failed to update escalation for case #${caseId}`);
    return res.json();
  },

  async getAuditFeed(limit: number = 50): Promise<AuditFeedItem[]> {
    const res = await safeFetch(`${API_BASE}/audit/feed?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch audit feed');
    return res.json();
  },

  async generateBatch(count: number = 500): Promise<any> {
    const res = await safeFetch(`${API_BASE}/simulation/generate-batch?count=${count}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Failed to generate batch (${res.status}): ${errText || res.statusText}`);
    }
    return res.json();
  },

  async runBatch(limit: number = 500): Promise<any> {
    const res = await safeFetch(`${API_BASE}/simulation/run-batch?limit=${limit}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Failed to run batch (${res.status}): ${errText || res.statusText}`);
    }
    return res.json();
  },

  async resetSystem(): Promise<any> {
    const res = await safeFetch(`${API_BASE}/simulation/reset`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to reset system');
    return res.json();
  },

  async runFullDemo(): Promise<any> {
    const res = await safeFetch(`${API_BASE}/simulation/run-full-demo`, {
      method: 'POST',
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Failed to run full demo (${res.status}): ${errText || res.statusText}`);
    }
    return res.json();
  },
};
