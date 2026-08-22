import asyncio
import sys
import logging

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.core.database import init_db, AsyncSessionLocal
from app.api.simulation import generate_batch_cases, run_batch_simulation, reset_database
from app.services.analytics_service import analytics_service

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("SimulationCLI")


async def main():
    print("\n========================================================")
    print(" [*] RECLAIM: AUTONOMOUS REVENUE RECOVERY BATCH RUNNER")
    print("========================================================\n")
    
    # 1. Initialize Tables
    print("1. Initializing DB schema and 9 core tables...")
    await init_db()
    print("   [+] DB schema ready.\n")

    async with AsyncSessionLocal() as db:
        # 2. Reset DB
        print("2. Clearing old simulation runs...")
        await reset_database(db)
        print("   [+] Database clean.\n")

        # 3. Generate 500 cases (~₹15L-20L)
        print("3. Generating 500 synthetic cases across 4 failure sources...")
        gen_result = await generate_batch_cases(count=500, db=db)
        print(f"   [+] Created: {gen_result['cases_created']} cases")
        print(f"   [+] Revenue at Risk: {gen_result['formatted_revenue']} (Rs. {gen_result['total_revenue_at_risk']:,.2f})\n")

        # 4. Run Autonomous Recovery Loop
        print("4. Launching Autonomous Recovery Orchestrator & Policy Engine...")
        print("   - Evaluating Diagnosis & Recovery Probabilities")
        print("   - Proposing Interventions (Payment Links, WhatsApp Hinglish, Email)")
        print("   - Enforcing Deterministic Policy Guardrails (<3 attempts, cooldown, <=10% discount)")
        print("   - Human Escalation for high-value cases (>Rs. 50,000)")
        print("   - Stopping rules for low-probability / opted-out cases")
        print("   - Live multi-stage replanning on attempt failures\n")
        
        sim_result = await run_batch_simulation(limit=500, db=db)
        metrics = sim_result["metrics"]

        print("========================================================")
        print(" [=] BATCH SIMULATION RESULTS & PROOF OF RECOVERY")
        print("========================================================")
        print(f" Total Revenue at Risk Identified:  Rs. {metrics.total_revenue_at_risk:,.2f}")
        print(f" Total Revenue Recovered (PROVEN):  Rs. {metrics.total_revenue_recovered:,.2f}")
        print(f" Measured Recovery Rate:            {metrics.recovery_rate_pct:.2f}%")
        print("--------------------------------------------------------")
        print(f" Total Cases Processed:             {metrics.total_cases_identified}")
        print(f" Recovered Cases:                   {metrics.recovered_cases_count}")
        print(f" In-Progress / Replanning Cases:    {metrics.in_progress_cases_count}")
        print(f" Escalated to Human (>Rs. 50k):     {metrics.escalated_cases_count}")
        print(f" Stopped by Policy / Low Prob:      {metrics.stopped_cases_count}")
        print("--------------------------------------------------------")
        print(" Revenue Breakdown by Source:")
        for ctype, amt in metrics.revenue_by_type.items():
            print(f"   - {ctype.replace('_', ' ').title()}: Rs. {amt:,.2f}")
        print("--------------------------------------------------------")
        print(" Strategy Performance Breakdown:")
        for s in metrics.strategy_performance:
            print(f"   - {s.strategy} via {s.channel}: {s.successful_recoveries}/{s.total_attempts} recovered ({s.recovery_rate:.1f}%)")
        print("========================================================")
        print(" Pitch: \"We didn't build an AI that tells a merchant what to do —")
        print(" we built an agent that recovers money itself, inside defined boundaries,")
        print(" and can prove exactly how much it recovered.\"\n")


if __name__ == "__main__":
    asyncio.run(main())
