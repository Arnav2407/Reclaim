import json
import logging
from datetime import datetime
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.webhook_event import WebhookEvent
from app.models.customer import Customer
from app.models.order import Order
from app.models.payment import Payment
from app.models.recovery_case import RecoveryCase
from app.models.recovery_attempt import RecoveryAttempt
from app.services.razorpay_service import razorpay_service
from app.services.recovery_runner import recovery_runner

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Razorpay Webhooks"])


@router.post("/razorpay")
async def handle_razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")

    # Verify HMAC-SHA256 signature
    is_valid = razorpay_service.verify_webhook_signature(body_str, x_razorpay_signature)
    if not is_valid:
        logger.warning("Invalid webhook signature received from Razorpay")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json.loads(body_str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {e}")

    event_type = payload.get("event", "unknown")
    event_id = payload.get("id") or f"evt_{int(datetime.utcnow().timestamp())}"

    # Idempotency check
    if payload.get("id"):
        stmt_existing = select(WebhookEvent).where(WebhookEvent.event_id == payload.get("id"))
        res_existing = await db.execute(stmt_existing)
        if res_existing.scalar_one_or_none():
            return {"status": "already_processed", "event": event_type, "event_id": payload.get("id")}

    # Record Webhook Event in DB
    webhook_record = WebhookEvent(
        event_id=event_id,
        event_type=event_type,
        payload=body_str,
        signature=x_razorpay_signature,
        processed=False,
    )
    db.add(webhook_record)
    await db.flush()

    try:
        # 1. Failure Event: Detects revenue-at-risk & triggers autonomous recovery
        if event_type == "payment.failed":
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            amount = float(payment_entity.get("amount", 0)) / 100.0
            error_code = payment_entity.get("error_code", "payment_failed")
            error_desc = payment_entity.get("error_description", "Payment transaction failed")
            contact = payment_entity.get("contact", "+919876543210")
            email = payment_entity.get("email", "customer@example.com")
            payment_method = payment_entity.get("method", "card")

            # Find or create customer
            stmt = select(Customer).where(Customer.email == email)
            res = await db.execute(stmt)
            customer = res.scalar_one_or_none()
            if not customer:
                customer = Customer(
                    external_id=f"cust_{email.split('@')[0]}",
                    name=email.split("@")[0].replace(".", " ").title(),
                    email=email,
                    phone=contact,
                    ltv=amount * 2,
                    total_orders=1,
                    successful_orders=0,
                    preferred_method="upi" if payment_method == "upi" else "card",
                )
                db.add(customer)
                await db.flush()

            # Find or record failed Payment
            pay_ext_id = payment_entity.get("id", f"pay_fail_{int(datetime.utcnow().timestamp())}")
            stmt_pay = select(Payment).where(Payment.external_id == pay_ext_id)
            res_pay = await db.execute(stmt_pay)
            payment_record = res_pay.scalar_one_or_none()

            if not payment_record:
                payment_record = Payment(
                    external_id=pay_ext_id,
                    customer_id=customer.id,
                    amount=amount,
                    status="failed",
                    method=payment_method,
                    failure_code=error_code,
                    failure_reason=error_desc,
                    raw_response=json.dumps(payment_entity),
                )
                db.add(payment_record)
                await db.flush()

            # Create recovery case
            case = RecoveryCase(
                external_id=f"case_rzp_{payment_record.external_id}",
                case_type="payment_failure",
                status="open",
                amount=amount,
                customer_id=customer.id,
                payment_id=payment_record.id,
                failure_reason=error_code.lower() if error_code else "card_declined",
            )
            db.add(case)
            await db.flush()

            # Auto trigger autonomous diagnosis & recovery proposal
            await recovery_runner.process_case(db=db, case_id=case.id, simulate_outcome=False)

        # 2. Payment Captured / Paid Event: Successfully recovers revenue!
        elif event_type in ["payment_link.paid", "payment.captured", "order.paid"]:
            plink_entity = payload.get("payload", {}).get("payment_link", {}).get("entity", {})
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            
            reference_id = (
                plink_entity.get("reference_id")
                or payment_entity.get("description")
                or payment_entity.get("notes", {}).get("reference_id")
            )
            amount_paid = float(plink_entity.get("amount_paid") or payment_entity.get("amount", 0)) / 100.0
            payment_id = payment_entity.get("id") or f"pay_rec_{int(datetime.utcnow().timestamp())}"
            payment_method = payment_entity.get("method", "upi")

            case = None
            attempt_number = None

            # Parse reference ID format: rec_{case_id}_att_{attempt_number}
            if reference_id and reference_id.startswith("rec_"):
                parts = reference_id.split("_")
                if len(parts) >= 2 and parts[1].isdigit():
                    case_id = int(parts[1])
                    if len(parts) >= 4 and parts[3].isdigit():
                        attempt_number = int(parts[3])

                    stmt = (
                        select(RecoveryCase)
                        .where(RecoveryCase.id == case_id)
                        .options(
                            selectinload(RecoveryCase.customer),
                            selectinload(RecoveryCase.attempts),
                        )
                    )
                    res = await db.execute(stmt)
                    case = res.scalar_one_or_none()

            # Fallback by Razorpay payment link ID
            if not case and plink_entity.get("id"):
                plink_id = plink_entity.get("id")
                stmt = (
                    select(RecoveryCase)
                    .where(RecoveryCase.razorpay_payment_link_id == plink_id)
                    .options(
                        selectinload(RecoveryCase.customer),
                        selectinload(RecoveryCase.attempts),
                    )
                )
                res = await db.execute(stmt)
                case = res.scalar_one_or_none()

            if case:
                # Update case to recovered
                case.status = "recovered"
                case.recovered_amount = amount_paid if amount_paid > 0 else case.amount
                case.recovered_at = datetime.utcnow()

                # Update customer
                if case.customer:
                    case.customer.successful_orders += 1
                    case.customer.ltv += case.recovered_amount

                # Update associated attempt
                if case.attempts:
                    target_attempt = None
                    if attempt_number:
                        target_attempt = next((a for a in case.attempts if a.attempt_number == attempt_number), None)
                    if not target_attempt:
                        target_attempt = case.attempts[-1]

                    target_attempt.outcome = "paid"
                    target_attempt.outcome_details = f"Verified payment captured via Razorpay ({payment_id})"
                    target_attempt.completed_at = datetime.utcnow()

                # Record successful Payment in payments table
                stmt_pay_captured = select(Payment).where(Payment.external_id == payment_id)
                res_pay_captured = await db.execute(stmt_pay_captured)
                payment_record = res_pay_captured.scalar_one_or_none()

                if not payment_record:
                    payment_record = Payment(
                        external_id=payment_id,
                        customer_id=case.customer_id,
                        order_id=case.order_id,
                        amount=case.recovered_amount,
                        status="captured",
                        method=payment_method,
                        raw_response=json.dumps(payload),
                    )
                    db.add(payment_record)
                else:
                    payment_record.status = "captured"
                    payment_record.amount = case.recovered_amount

        webhook_record.processed = True
        webhook_record.processed_at = datetime.utcnow()
        await db.commit()

    except Exception as e:
        logger.error(f"Error processing webhook {event_type}: {e}")
        webhook_record.processing_error = str(e)
        await db.commit()

    return {"status": "ok", "event": event_type, "processed": webhook_record.processed}
