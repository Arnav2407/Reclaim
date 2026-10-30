import os
import sys

# Define base directories safely
root_dir = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else os.getcwd()
reclaim_dir = os.path.join(root_dir, "Reclaim")
backend_dir = os.path.join(reclaim_dir, "backend")

# Ensure proper Python import paths
if reclaim_dir not in sys.path:
    sys.path.insert(0, reclaim_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Switch to Reclaim directory for relative paths
if os.path.exists(reclaim_dir):
    os.chdir(reclaim_dir)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ["--demo", "demo"]:
        import asyncio
        from app.demo_walkthrough import run_full_5min_demo
        asyncio.run(run_full_5min_demo(fast_mode=True))
    else:
        import uvicorn
        port = int(os.environ.get("PORT", 8000))
        reload = os.environ.get("APP_ENV", "development") == "development"
        print("\n" + "=" * 60)
        print(" [*] RECLAIM: AUTONOMOUS REVENUE RECOVERY ENGINE")
        print("=" * 60)
        print(f"  -> Full Web Dashboard: http://0.0.0.0:{port}")
        print(f"  -> Interactive API Docs: http://0.0.0.0:{port}/docs")
        print(f"  -> Health Check:         http://0.0.0.0:{port}/health")
        print("=" * 60 + "\n")
        uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload, app_dir=backend_dir)
