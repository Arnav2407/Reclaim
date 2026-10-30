import os
import sys

# Forward execution to Reclaim/run.py
reclaim_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Reclaim")
if os.path.exists(reclaim_dir):
    sys.path.insert(0, reclaim_dir)
    os.chdir(reclaim_dir)
    # Execute Reclaim/run.py
    with open(os.path.join(reclaim_dir, "run.py"), encoding="utf-8") as f:
        code = compile(f.read(), os.path.join(reclaim_dir, "run.py"), 'exec')
        exec(code, {"__name__": "__main__"})
else:
    print(f"Directory {reclaim_dir} not found.")
