import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class CommunicationAgent:
    """
    Generates channel-specific, localized copy (WhatsApp, Email, SMS)
    with natural Hinglish, Hindi, and English variants.
    """

    def generate_message(
        self,
        channel: str,
        language: str,
        customer_name: str,
        amount: float,
        payment_link: str,
        case_type: str,
        discount_percentage: float = 0.0,
        attempt_number: int = 1,
    ) -> Dict[str, str]:
        first_name = customer_name.split()[0] if customer_name else "Valued Customer"
        formatted_amount = f"Rs. {amount:,.2f}"
        discount_text = f" and applied a {int(discount_percentage)}% courtesy discount" if discount_percentage > 0 else ""
        discount_text_hinglish = f" aur aapke liye {int(discount_percentage)}% special discount add kiya hai" if discount_percentage > 0 else ""
        discount_text_hindi = f" और आपके लिए {int(discount_percentage)}% विशेष छूट जोड़ी गई है" if discount_percentage > 0 else ""

        if channel == "whatsapp":
            return self._generate_whatsapp(
                first_name, formatted_amount, payment_link, language, case_type, discount_text_hinglish, discount_text_hindi, discount_text, attempt_number
            )
        elif channel == "email":
            return self._generate_email(
                first_name, formatted_amount, payment_link, language, case_type, discount_text, discount_text_hinglish, discount_text_hindi, attempt_number
            )
        else:  # SMS or default
            return self._generate_sms(
                first_name, formatted_amount, payment_link, language, discount_percentage
            )

    def _generate_whatsapp(
        self,
        name: str,
        amount: str,
        link: str,
        language: str,
        case_type: str,
        discount_hinglish: str,
        discount_hindi: str,
        discount_en: str,
        attempt: int,
    ) -> Dict[str, str]:
        if language == "hi":
            if attempt == 1:
                body = (
                    f"नमस्ते {name}! 🙏\n\n"
                    f"आपका {amount} का भुगतान पूरा नहीं हो सका था{discount_hindi}।\n"
                    f"आप नीचे दिए गए सुरक्षित Razorpay लिंक से UPI या कार्ड द्वारा आसानी से पूरा कर सकते हैं:\n\n"
                    f"👉 {link}\n\n"
                    f"सहायता के लिए हमें उत्तर दें। टीम Reclaim"
                )
            else:
                body = (
                    f"नमस्ते {name}, आपके लंबित भुगतान {amount} का अनुस्मारक ⏳{discount_hindi}।\n"
                    f"कृपया समय समाप्त होने से पहले लिंक पर क्लिक करके पूरा करें:\n\n"
                    f"👉 {link}\n\n"
                    f"सुरक्षित भुगतान Razorpay द्वारा संचालित।"
                )
        elif language == "hinglish":
            if attempt == 1:
                body = (
                    f"Namaste {name}! 🙏\n\n"
                    f"Aapka {amount} ka payment complete nahi ho paya tha{discount_hinglish}.\n"
                    f"Aap niche diye gaye secure Razorpay link se UPI ya Card ke zariye 1-click me complete kar sakte hain:\n\n"
                    f"👉 {link}\n\n"
                    f"Koi issue ho toh humein reply karein. Team Reclaim"
                )
            else:
                body = (
                    f"Hi {name}, reminder regarding your pending payment of {amount} ⏳{discount_hinglish}.\n"
                    f"Link expire hone se pehle yahan complete karein:\n\n"
                    f"👉 {link}\n\n"
                    f"Secure payments powered by Razorpay."
                )
        else:
            if attempt == 1:
                body = (
                    f"Hi {name},\n\n"
                    f"We noticed your payment of {amount} couldn't be completed{discount_en}.\n"
                    f"You can quickly complete your transaction using the secure Razorpay link below (UPI, Cards, NetBanking):\n\n"
                    f"👉 {link}\n\n"
                    f"Best regards,\nMerchant Support Team"
                )
            else:
                body = (
                    f"Hi {name}, this is a gentle reminder to complete your pending order of {amount}{discount_en}.\n\n"
                    f"Complete securely here: {link}\n\n"
                    f"Link expires soon."
                )

        return {
            "channel": "whatsapp",
            "subject": None,
            "body": body,
            "template": f"whatsapp_recovery_{language}_v{attempt}",
        }

    def _generate_email(
        self,
        name: str,
        amount: str,
        link: str,
        language: str,
        case_type: str,
        discount_en: str,
        discount_hinglish: str,
        discount_hindi: str,
        attempt: int,
    ) -> Dict[str, str]:
        if case_type == "overdue_invoice":
            subject = f"Invoice Reminder: Payment of {amount} is pending"
            body = (
                f"Dear {name},\n\n"
                f"This is a formal reminder regarding your outstanding invoice of {amount}.\n"
                f"To ensure uninterrupted services, please complete the payment through the Razorpay secure portal:\n\n"
                f"{link}\n\n"
                f"If you have already processed this or need an updated tax invoice, please let us know.\n\n"
                f"Finance & Accounts Team"
            )
        elif case_type == "subscription_failure":
            subject = f"Action Required: Subscription renewal for {name}"
            body = (
                f"Dear {name},\n\n"
                f"Your recent subscription charge of {amount} could not be processed by your bank.\n"
                f"Please update your payment method or retry using the secure link below to prevent service disruption:\n\n"
                f"{link}\n\n"
                f"Best regards,\nBilling Support"
            )
        else:
            subject = f"Action Required: Complete your order ({amount})"
            body = (
                f"Dear {name},\n\n"
                f"We noticed that your recent checkout of {amount} was interrupted{discount_en}.\n"
                f"Your order items are safely reserved for the next 24 hours. You can resume checkout with one click:\n\n"
                f"Complete Payment Now: {link}\n\n"
                f"Thank you for shopping with us!\nCustomer Care Team"
            )

        return {
            "channel": "email",
            "subject": subject,
            "body": body,
            "template": f"email_{case_type}_v{attempt}",
        }

    def _generate_sms(
        self,
        name: str,
        amount: str,
        link: str,
        language: str,
        discount: float,
    ) -> Dict[str, str]:
        if language == "hinglish":
            disc_str = f" ({int(discount)}% off ke saath)" if discount > 0 else ""
            body = f"Namaste {name}, aapka pending payment of {amount}{disc_str} Razorpay se complete karein: {link}"
        elif language == "hi":
            disc_str = f" ({int(discount)}% छूट के साथ)" if discount > 0 else ""
            body = f"नमस्ते {name}, अपना लंबित भुगतान {amount}{disc_str} Razorpay द्वारा पूरा करें: {link}"
        else:
            disc_str = f" with {int(discount)}% off" if discount > 0 else ""
            body = f"Hi {name}, complete your pending payment of {amount}{disc_str} securely via Razorpay: {link}"
        return {
            "channel": "sms",
            "subject": None,
            "body": body,
            "template": f"sms_{language}_standard",
        }


communication_agent = CommunicationAgent()
