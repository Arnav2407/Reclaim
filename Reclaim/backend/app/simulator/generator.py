import random
from typing import List, Dict, Any

INDIAN_FIRST_NAMES = [
    "Aarav", "Aditi", "Rohan", "Pooja", "Vikram", "Sneha", "Karan", "Ananya",
    "Rahul", "Divya", "Amit", "Meera", "Siddharth", "Neha", "Arjun", "Priya",
    "Gaurav", "Ritu", "Varun", "Isha", "Manish", "Tanvi", "Aditya", "Shreya",
    "Nikhil", "Kavita", "Ramesh", "Sunita", "Deepak", "Suman", "Rajesh", "Kiran"
]

INDIAN_LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Mehta", "Reddy", "Nair", "Gupta", "Singh",
    "Iyer", "Chopra", "Kulkarni", "Deshmukh", "Bhat", "Rao", "Joshi", "Das",
    "Mukherjee", "Agarwal", "Saxena", "Kapoor", "Malhotra", "Banerjee", "Menon"
]

FAILURE_REASONS_BY_TYPE = {
    "payment_failure": [
        ("card_declined", 0.35),
        ("insufficient_funds", 0.30),
        ("network_error", 0.20),
        ("expired_card", 0.15),
    ],
    "checkout_abandonment": [
        ("checkout_timeout", 0.45),
        ("user_dropped_off", 0.40),
        ("payment_link_expired", 0.15),
    ],
    "subscription_failure": [
        ("mandate_revoked", 0.40),
        ("insufficient_funds", 0.35),
        ("expired_card", 0.25),
    ],
    "overdue_invoice": [
        ("invoice_past_due", 0.80),
        ("payment_link_expired", 0.20),
    ],
}


def weighted_choice(choices_with_weights):
    choices, weights = zip(*choices_with_weights)
    return random.choices(choices, weights=weights, k=1)[0]


def generate_synthetic_dataset(total_cases: int = 500) -> List[Dict[str, Any]]:
    """
    Generates ~500 synthetic cases calibrated to ~₹17.0L – ₹18.5L revenue at risk (Target: ₹15L–₹20L)
    with realistic failure reasons, consumer/B2B context, escalation triggers (>₹50k), and stopping triggers.
    """
    dataset = []

    # Distribution: 40% payment failures, 30% abandonments, 15% subscriptions, 15% invoices
    counts = {
        "payment_failure": int(total_cases * 0.40),      # 200 cases (~₹3.7L)
        "checkout_abandonment": int(total_cases * 0.30),  # 150 cases (~₹3.9L)
        "subscription_failure": int(total_cases * 0.15),  # 75 cases (~₹1.0L)
        "overdue_invoice": total_cases - (
            int(total_cases * 0.40) + int(total_cases * 0.30) + int(total_cases * 0.15)
        ),  # 75 cases (~₹8.6L)
    }

    used_emails = set()
    high_value_escalation_count = 0

    for case_type, count in counts.items():
        for i in range(count):
            first = random.choice(INDIAN_FIRST_NAMES)
            last = random.choice(INDIAN_LAST_NAMES)
            full_name = f"{first} {last}"
            email_slug = f"{first.lower()}.{last.lower()}{random.randint(10, 9999)}"
            while email_slug in used_emails:
                email_slug = f"{first.lower()}.{last.lower()}{random.randint(10, 99999)}"
            used_emails.add(email_slug)

            email = f"{email_slug}@example.com"
            phone = f"+91{random.choice(['98', '99', '97', '96', '91'])}{random.randint(10000000, 99999999)}"

            # Failure reason
            failure_reason = weighted_choice(FAILURE_REASONS_BY_TYPE[case_type])

            # Amounts:
            if case_type == "payment_failure":
                amount = float(random.choice([899, 1299, 1799, 2299, 2999]))
            elif case_type == "checkout_abandonment":
                amount = float(random.choice([1299, 1899, 2499, 3199, 3999]))
            elif case_type == "subscription_failure":
                amount = float(random.choice([599, 899, 1299, 1699, 2199]))
            else:  # overdue_invoice (75 cases)
                # Exactly 6 high-value escalation cases (> ₹50,000) for clean demo proof
                if high_value_escalation_count < 6 and random.random() < 0.15:
                    amount = float(random.choice([52000, 54000, 56000, 60000]))
                    high_value_escalation_count += 1
                else:
                    amount = float(random.choice([3500, 5500, 7500, 9500, 12000]))

            # Customer context
            total_orders = random.randint(1, 12)
            successful_orders = random.randint(0, total_orders)
            ltv = float(round(amount * (successful_orders + random.uniform(1.2, 3.0)), 2))

            # Preferred payment method
            preferred_method = random.choices(["upi", "card", "netbanking"], weights=[0.65, 0.25, 0.10])[0]

            # Language preference
            lang = random.choices(["hinglish", "en", "hi"], weights=[0.55, 0.35, 0.10])[0]

            # Guardrail triggers:
            opt_out = random.random() < 0.015
            has_active_dispute = (not opt_out) and (random.random() < 0.02)

            dataset.append({
                "case_type": case_type,
                "amount": amount,
                "customer_name": full_name,
                "customer_email": email,
                "customer_phone": phone,
                "customer_ltv": ltv,
                "total_orders": total_orders,
                "successful_orders": successful_orders,
                "failure_reason": failure_reason,
                "preferred_method": preferred_method,
                "language_preference": lang,
                "opt_out": opt_out,
                "has_active_dispute": has_active_dispute,
            })

    random.shuffle(dataset)
    return dataset
