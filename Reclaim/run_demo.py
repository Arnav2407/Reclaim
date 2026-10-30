import os
import sys
import asyncio

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.demo_walkthrough import run_full_5min_demo

if __name__ == "__main__":
    asyncio.run(run_full_5min_demo(fast_mode=True))
