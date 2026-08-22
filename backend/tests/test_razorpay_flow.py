import asyncio
import sys
import json
import httpx

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.main import app
from app.core.database import init_db, AsyncSessionLocal
from app.models.customer import Customer
from app.models.order import Order
from app.models.recovery_case import RecoveryCase
from app.services.razorpay_service import razorpay_service


async def test_razorpay_end_to_end_flow():
    print("\n========================================================")
    print(" [*] RAZORPAY INTEGRATION: END-TO-END RECOVERY TEST")
    print("========================================================\n")
    
    await init_db()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Simulate Payment Failure Event
        print("1. Ingesting 'payment.failed' event from Razorpay...")
        unique_test_id = int(asyncio.get_event_loop().time() * 1000)
        fail_webhook_payload = {
            "event": "payment.failed",
            "id": f"evt_fail_{unique_test_id}",
            "payload": {
                "payment": {
                    "entity": {
                        "id": f"pay_test_declined_{unique_test_id}",
                        "amount": 249900,  # paise = Rs. 2,499.00
                        "currency": "INR",
                        "error_code": "card_declined",
                        "error_description": "Card issuer declined transaction due to bank daily limit",
                        "email": f"rohan.sharma.{unique_test_id % 10000}@example.com",
                        "contact": "+919876543210",
                        "method": "card",
                    }
                }
            }
        }
        raw_body_fail = json.dumps(fail_webhook_payload)
        sig_fail = razorpay_service.generate_signature(raw_body_fail)

        res_fail = await client.post(
            "/api/webhooks/razorpay",
            content=raw_body_fail,
            headers={"x-razorpay-signature": sig_fail, "Content-Type": "application/json"}
        )
        assert res_fail.status_code == 200, f"Failure webhook ingestion failed: {res_fail.text}"
        print("   [+] Ingested payment.failed event successfully.\n")

        # Step 2: Query created Recovery Case
        res_cases = await client.get("/api/cases?limit=1")
        cases = res_cases.json()
        assert len(cases) > 0, "No cases found"
        case = cases[0]
        case_id = case["id"]
        print(f"2. Recovery Case #{case_id} Created:")
        print(f"   - Customer:  {case['customer']['name']} ({case['customer']['email']})")
        print(f"   - Amount:    Rs. {case['amount']:,.2f}")
        print(f"   - Diagnosis: {case['root_cause_diagnosis']}")
        print(f"   - Status:    {case['status'].upper()}")
        print(f"   - Payment Link: {case['razorpay_short_url']}")
        print(f"   - Link ID:      {case['razorpay_payment_link_id']}\n")

        assert case["status"] == "in_progress", f"Expected 'in_progress', got {case['status']}"
        assert case["razorpay_payment_link_id"] is not None

        # Step 3: Inspect Case Detail & Policy Approval
        res_detail = await client.get(f"/api/cases/{case_id}")
        detail = res_detail.json()
        print("3. Autonomous Agent & Policy Validation:")
        print(f"   - Orchestrator Action:  {detail['decisions'][0]['proposed_action']} via {detail['decisions'][0]['proposed_channel']}")
        print(f"   - Orchestrator Rationale: {detail['decisions'][0]['rationale']}")
        print(f"   - Policy Checks Passed:   {len(detail['policy_checks'])} rules validated")
        print(f"   - Outreach Message Log:   {detail['communication_logs'][0]['body_content'][:80]}...\n")

        # Step 4: Simulate Customer Completing Payment Link via Razorpay Webhook
        print("4. Simulating Customer Payment on Razorpay Payment Link...")
        plink_id = case["razorpay_payment_link_id"]
        ref_id = f"rec_{case_id}_att_1"
        
        paid_webhook_payload = razorpay_service.generate_webhook_payload(
            event="payment_link.paid",
            payment_link_id=plink_id,
            reference_id=ref_id,
            amount=case["amount"],
            customer_email=case["customer"]["email"],
            customer_phone=case["customer"]["phone"],
        )
        raw_body_paid = json.dumps(paid_webhook_payload)
        sig_paid = razorpay_service.generate_signature(raw_body_paid)

        res_paid = await client.post(
            "/api/webhooks/razorpay",
            content=raw_body_paid,
            headers={"x-razorpay-signature": sig_paid, "Content-Type": "application/json"}
        )
        assert res_paid.status_code == 200, f"Paid webhook failed: {res_paid.text}"
        print("   [+] Razorpay webhook 'payment_link.paid' delivered with valid HMAC-SHA256 signature.\n")

        # Step 5: Verify Case Transitioned to RECOVERED
        print("5. Verifying Case State Transition:")
        res_final = await client.get(f"/api/cases/{case_id}")
        final_case = res_final.json()
        print(f"   - Updated Status:           {final_case['status'].upper()} (Target: RECOVERED)")
        print(f"   - Revenue Recovered:        Rs. {final_case['recovered_amount']:,.2f}")
        print(f"   - Recovery Timestamp:       {final_case['recovered_at']}")
        print(f"   - Customer Successful Orders: {final_case['customer']['successful_orders']}")
        print(f"   - Customer Updated LTV:     Rs. {final_case['customer']['ltv']:,.2f}\n")

        assert final_case["status"] == "recovered", f"Expected 'recovered', got {final_case['status']}"
        assert final_case["recovered_amount"] == 2499.0

        # Step 6: Complete Queryable Chronological Audit Timeline
        print("6. Querying Complete Audit Timeline (GET /api/cases/{id}/timeline):")
        res_timeline = await client.get(f"/api/cases/{case_id}/timeline")
        timeline_data = res_timeline.json()
        for i, ev in enumerate(timeline_data["timeline"], 1):
            print(f"   Step {i} [{ev['stage'].upper()}]: {ev['title']} ({ev['timestamp']})")
        print("\n========================================================")
        print(" [ALL RAZORPAY INTEGRATION TESTS PASSED SUCCESSFULLY!]")
        print("========================================================\n")


if __name__ == "__main__":
    asyncio.run(test_razorpay_end_to_end_flow())
