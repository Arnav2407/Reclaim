import asyncio
import sys
import httpx

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.main import app
from app.core.database import init_db


async def run_tests():
    print("\n--- Running FastAPI Integration Tests ---")
    await init_db()
    
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print(" [+] GET /health: OK")

        # 2. Dashboard metrics
        res = await client.get("/api/dashboard/metrics")
        assert res.status_code == 200, f"Dashboard metrics failed: {res.text}"
        data = res.json()
        assert "total_revenue_at_risk" in data
        assert "recovery_rate_pct" in data
        print(f" [+] GET /api/dashboard/metrics: OK (At Risk: Rs. {data['total_revenue_at_risk']:,.2f}, Recovered: Rs. {data['total_revenue_recovered']:,.2f}, Rate: {data['recovery_rate_pct']}%)")

        # 3. Cases list
        res = await client.get("/api/cases?limit=5")
        assert res.status_code == 200, f"Cases list failed: {res.text}"
        cases = res.json()
        assert len(cases) > 0, "No cases found in DB"
        print(f" [+] GET /api/cases: OK (Retrieved {len(cases)} sample cases)")

        sample_case_id = cases[0]["id"]

        # 4. Case detail with complete audit timeline
        res = await client.get(f"/api/cases/{sample_case_id}")
        assert res.status_code == 200, f"Case detail failed: {res.text}"
        detail = res.json()
        assert "attempts" in detail
        assert "decisions" in detail
        assert "policy_checks" in detail
        print(f" [+] GET /api/cases/{sample_case_id}: OK (Attempts: {len(detail['attempts'])}, Decisions: {len(detail['decisions'])}, Policy Checks: {len(detail['policy_checks'])})")

        # 5. Case ordered timeline (Task 7)
        res = await client.get(f"/api/cases/{sample_case_id}/timeline")
        assert res.status_code == 200, f"Case timeline failed: {res.text}"
        timeline_data = res.json()
        assert "timeline" in timeline_data
        assert timeline_data["total_events"] > 0
        print(f" [+] GET /api/cases/{sample_case_id}/timeline: OK ({timeline_data['total_events']} chronological audit events)")

        # 6. Case audit certificate export (Task 7)
        res = await client.get(f"/api/cases/{sample_case_id}/export-audit")
        assert res.status_code == 200, f"Audit export failed: {res.text}"
        export_data = res.json()
        assert "audit_certificate" in export_data
        print(f" [+] GET /api/cases/{sample_case_id}/export-audit: OK (Verification: {export_data['audit_certificate']['verification_status']})")

        # 7. Audit live feed
        res = await client.get("/api/audit/feed?limit=10")
        assert res.status_code == 200, f"Audit feed failed: {res.text}"
        feed = res.json()
        assert len(feed) > 0, "No audit feed items found"
        print(f" [+] GET /api/audit/feed: OK (Retrieved {len(feed)} live timeline items)")

        # 8. Orchestrator standalone endpoint (Task 3)
        res = await client.post("/api/agents/orchestrator/decide", json={
            "amount": 12999,
            "customer_ltv": 74200,
            "previous_orders": 9,
            "successful_payments": 8,
            "failure_reason": "card_declined",
            "attempt_number": 1,
            "preferred_method": "upi",
            "days_since_last_purchase": 12,
        })
        assert res.status_code == 200, f"Orchestrator decide failed: {res.text}"
        dec_data = res.json()
        assert "action" in dec_data
        assert "channel" in dec_data
        print(f" [+] POST /api/agents/orchestrator/decide: OK (Action: {dec_data['action']}, Channel: {dec_data['channel']})")

        # 9. Communicator standalone endpoint (Task 6)
        res = await client.post("/api/agents/communicator/generate", json={
            "channel": "whatsapp",
            "language": "hinglish",
            "customer_name": "Rohan Sharma",
            "amount": 12999.0,
            "payment_link": "https://rzp.io/i/test1234",
            "case_type": "payment_failure",
            "discount_percentage": 5.0,
            "attempt_number": 1,
        })
        assert res.status_code == 200, f"Communicator generate failed: {res.text}"
        msg_data = res.json()
        assert "body" in msg_data
        assert "Namaste Rohan" in msg_data["body"]
        print(f" [+] POST /api/agents/communicator/generate: OK (Hinglish copy generated)")

        # 10. Policy evaluate standalone endpoint (Task 4)
        res = await client.post("/api/policy/evaluate", json={
            "case_input": {
                "amount": 65000.0,
                "customer_ltv": 100000.0,
                "previous_orders": 5,
                "successful_payments": 5,
                "failure_reason": "invoice_past_due",
                "attempt_number": 1,
            },
            "proposed_decision": {
                "action": "payment_link",
                "channel": "email",
                "priority": "high",
                "delay_minutes": 0,
                "max_attempts": 3,
                "discount_percentage": 0.0,
                "escalation": False,
                "rationale": "High value case",
            },
            "existing_attempt_count": 0,
            "escalation_approved": False,
        })
        assert res.status_code == 200, f"Policy evaluate failed: {res.text}"
        pol_data = res.json()
        assert pol_data["applied_action"] == "human_escalation"
        assert pol_data["requires_human_approval"] is True
        print(f" [+] POST /api/policy/evaluate: OK (High-value policy escalated correctly)")

        # 11. Razorpay Webhook Ingestion
        webhook_id = f"evt_test_webhook_{int(asyncio.get_event_loop().time() * 1000)}"
        webhook_payload = {
            "event": "payment.failed",
            "id": webhook_id,
            "payload": {
                "payment": {
                    "entity": {
                        "id": f"pay_test_{webhook_id[-6:]}",
                        "amount": 499900,  # paise = Rs. 4,999
                        "currency": "INR",
                        "error_code": "card_declined",
                        "error_description": "Card issuer declined transaction",
                        "email": f"test.cust.{webhook_id[-4:]}@example.com",
                        "contact": "+919876543210",
                    }
                }
            }
        }
        res = await client.post("/api/webhooks/razorpay", json=webhook_payload)
        assert res.status_code == 200, f"Webhook handling failed: {res.text}"
        print(f" [+] POST /api/webhooks/razorpay: OK ({res.json()})")

    print("\n [ALL 11 INTEGRATION TESTS PASSED SUCCESSFULLY!]\n")


if __name__ == "__main__":
    asyncio.run(run_tests())
