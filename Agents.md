R — Requirements
Functional
Detect revenue-at-risk events across 4 sources: payment failures, checkout abandonment, subscription failures, overdue B2B invoices.
Diagnose root cause per case (e.g., card_declined, insufficient_funds, checkout_timeout).
Predict a recovery probability per case using customer context (LTV, order history, preferred method, days since last purchase).
Decide one intervention per case: retry, payment link, WhatsApp/email/Hinglish message, escalate to human, or stop.
Validate every AI decision against a deterministic policy engine before execution — the LLM proposes, code approves.
Execute the approved action via Razorpay APIs (Payment Links, retries, webhooks).
Observe the result and replan on failure (retry with alternate strategy, escalate, or stop after max attempts).
Log every event, decision, policy check, and outcome to an append-only audit trail.
Report batch-level results: revenue at risk, revenue recovered, recovery rate, attempts, strategy breakdown.
Non-functional / guardrails (mandatory, judged explicitly)
Hard stopping rules: max 3 recovery attempts per case, 24h contact cooldown, no action on cases with an active dispute or duplicate open case.
Escalation threshold: cases above ₹50,000 require human approval before any customer-facing action.
Spend/discount bounds: max 10% discount offer, max 2 outbound messages per case.
Compliance: no contact outside policy windows, opt-out respected, every action attributable to a specific policy check that passed.
Auditability: every state transition is a timestamped, immutable-style record — case → decision → policy check → action → result.
No fabricated results: recovered-amount figures must derive from real recorded events in a Razorpay test/simulation environment, not hardcoded numbers.
Out of scope for MVP
Full voice calling (Hinglish is text/WhatsApp only for the demo).
More than the 4 recovery scenarios listed.
Building 5+ microservices — one orchestrator agent, one communication agent, deterministic services for everything involving money.

I — Implementation Architecture
Agent design (what to hand Antigravity as separate delegatable agents)
Recovery Orchestrator Agent — diagnosis, customer-context assembly, strategy selection, replanning on failure. This is the "brain."
Communication Agent — generates channel-specific copy (email / WhatsApp / SMS), including Hinglish variants based on customer language preference.
Policy Engine (deterministic, not an LLM) — validates every proposed action against the guardrails in the Requirements section. This must be plain code, not a prompt, because it's the safety boundary.
Data flow
Revenue Event → Detect → Diagnose → Predict (recovery probability)
   → Decide (LLM proposes action) → Policy Engine (approves/rejects)
   → Execute (Razorpay API) → Observe result
      → success → mark RECOVERED, log
      → failure → Replan (retry / escalate / stop), loop
Decision contract (structured I/O between orchestrator and policy engine)

Input to LLM:

json
{
  "amount": 12999,
  "customer_ltv": 74200,
  "previous_orders": 9,
  "successful_payments": 8,
  "failure_reason": "card_declined",
  "attempt_number": 1,
  "preferred_method": "upi",
  "days_since_last_purchase": 12
}

Output from LLM (then checked by policy engine, never executed directly):

json
{
  "action": "payment_link",
  "channel": "whatsapp",
  "priority": "high",
  "delay_minutes": 20,
  "max_attempts": 2,
  "escalation": false
}
Tech stack
Frontend: React, TypeScript, Vite, Tailwind, Recharts
Backend: FastAPI, Python, Pydantic
Data: PostgreSQL, Redis (queue for webhook events)
AI: Gemini or Groq for orchestrator + communication agents
Payments: Razorpay Payment Links API, Razorpay Webhooks (test/simulation mode)
Comms: Resend/SMTP for email; mock adapter (or real provider if available) for WhatsApp
Infra: Docker; Vercel (frontend); Render/Railway (backend); Neon (Postgres); Upstash (Redis)
Core tables

customers, payments, orders, recovery_cases, recovery_attempts, agent_decisions, policy_checks, webhook_events, communication_logs

Dashboard surfaces (4 screens)
Command Center — top-line ₹ at risk / ₹ recovered / recovery rate, funnel view.
AI Recovery Queue — per-case table: customer, amount, recovery probability, next action.
Agent Activity (live feed) — real-time decision/action/result log, proves autonomy.
ROI / Impact — batch summary: attempts, successful recoveries, avg recovery time, strategy performance breakdown.