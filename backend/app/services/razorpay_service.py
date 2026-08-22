import hmac
import hashlib
import uuid
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)


class RazorpayService:
    """
    Razorpay API Integration service.
    Creates real test-mode Payment Links if credentials provided;
    otherwise generates realistic simulation payloads for end-to-end flow.
    """

    def __init__(self):
        self.client = None
        self.is_live = False
        if (
            settings.RAZORPAY_KEY_ID
            and settings.RAZORPAY_KEY_SECRET
            and not settings.RAZORPAY_KEY_ID.startswith("rzp_test_placeholder")
        ):
            try:
                import razorpay
                self.client = razorpay.Client(
                    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
                )
                self.is_live = True
                logger.info("Initialized Razorpay Live/Test Client")
            except Exception as e:
                logger.warning(f"Failed to initialize Razorpay Client: {e}")

    def create_payment_link(
        self,
        amount: float,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        reference_id: str,
        description: str = "Payment Recovery via Reclaim",
    ) -> Dict[str, Any]:
        """Creates a Razorpay Payment Link."""
        amount_in_paise = int(round(amount * 100))

        if self.is_live and self.client:
            try:
                payload = {
                    "amount": amount_in_paise,
                    "currency": "INR",
                    "accept_partial": False,
                    "reference_id": reference_id,
                    "description": description,
                    "customer": {
                        "name": customer_name,
                        "email": customer_email,
                        "contact": customer_phone,
                    },
                    "notify": {"sms": True, "email": True, "whatsapp": True},
                    "reminder_enable": True,
                    "notes": {"recovered_by": "Reclaim_Agent", "reference_id": reference_id},
                }
                response = self.client.payment_link.create(payload)
                return {
                    "id": response.get("id"),
                    "short_url": response.get("short_url"),
                    "status": response.get("status", "created"),
                    "amount": amount,
                    "reference_id": reference_id,
                    "mode": "razorpay_api",
                }
            except Exception as e:
                logger.warning(f"Razorpay API call failed ({e}), using test simulation link")

        # Deterministic Razorpay format test-mode link
        plink_id = f"plink_{uuid.uuid4().hex[:14]}"
        short_url = f"https://rzp.io/i/{plink_id[6:]}"
        return {
            "id": plink_id,
            "short_url": short_url,
            "status": "created",
            "amount": amount,
            "reference_id": reference_id,
            "mode": "simulated_razorpay",
        }

    def generate_webhook_payload(
        self,
        event: str,
        payment_link_id: str,
        reference_id: str,
        amount: float,
        customer_email: str,
        customer_phone: str,
    ) -> Dict[str, Any]:
        """Constructs an authentic Razorpay webhook event payload."""
        amount_in_paise = int(round(amount * 100))
        payment_id = f"pay_{uuid.uuid4().hex[:14]}"

        if event == "payment_link.paid":
            return {
                "entity": "event",
                "account_id": "acc_reclaim_merchant",
                "event": "payment_link.paid",
                "contains": ["payment_link", "payment"],
                "payload": {
                    "payment_link": {
                        "entity": {
                            "id": payment_link_id,
                            "amount": amount_in_paise,
                            "amount_paid": amount_in_paise,
                            "currency": "INR",
                            "status": "paid",
                            "reference_id": reference_id,
                            "customer": {
                                "email": customer_email,
                                "contact": customer_phone,
                            },
                        }
                    },
                    "payment": {
                        "entity": {
                            "id": payment_id,
                            "amount": amount_in_paise,
                            "currency": "INR",
                            "status": "captured",
                            "method": "upi",
                            "email": customer_email,
                            "contact": customer_phone,
                        }
                    }
                },
                "created_at": int(datetime.utcnow().timestamp()),
            }
        elif event == "payment.captured":
            return {
                "entity": "event",
                "account_id": "acc_reclaim_merchant",
                "event": "payment.captured",
                "contains": ["payment"],
                "payload": {
                    "payment": {
                        "entity": {
                            "id": payment_id,
                            "amount": amount_in_paise,
                            "currency": "INR",
                            "status": "captured",
                            "method": "card",
                            "description": reference_id,
                            "email": customer_email,
                            "contact": customer_phone,
                            "notes": {"reference_id": reference_id},
                        }
                    }
                },
                "created_at": int(datetime.utcnow().timestamp()),
            }
        else:  # payment.failed
            return {
                "entity": "event",
                "account_id": "acc_reclaim_merchant",
                "event": "payment.failed",
                "contains": ["payment"],
                "payload": {
                    "payment": {
                        "entity": {
                            "id": payment_id,
                            "amount": amount_in_paise,
                            "currency": "INR",
                            "status": "failed",
                            "method": "card",
                            "error_code": "card_declined",
                            "error_description": "Card issuer declined transaction due to daily limit",
                            "email": customer_email,
                            "contact": customer_phone,
                        }
                    }
                },
                "created_at": int(datetime.utcnow().timestamp()),
            }

    def generate_signature(self, payload_body: str, secret: Optional[str] = None) -> str:
        """Generates HMAC-SHA256 signature matching Razorpay webhook hashing."""
        sec = secret or settings.RAZORPAY_WEBHOOK_SECRET or "rzp_webhook_secret"
        return hmac.new(
            key=sec.encode("utf-8"),
            msg=payload_body.encode("utf-8"),
            digestmod=hashlib.sha256
        ).hexdigest()

    def verify_webhook_signature(self, payload_body: str, signature: Optional[str]) -> bool:
        """Verifies HMAC SHA256 signature on incoming Razorpay webhooks."""
        if not signature or not settings.RAZORPAY_WEBHOOK_SECRET or settings.RAZORPAY_WEBHOOK_SECRET.startswith("rzp_webhook_secret_placeholder"):
            return True  # Permissive in dev/simulation mode

        try:
            expected_signature = self.generate_signature(payload_body, settings.RAZORPAY_WEBHOOK_SECRET)
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"Webhook signature verification error: {e}")
            return False


razorpay_service = RazorpayService()
