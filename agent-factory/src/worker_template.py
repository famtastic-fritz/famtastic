"""Worker template — lets the orchestrator MINT new worker variants at runtime.

The orchestrator decides what kind of worker it needs (e.g. a "triage"
specialist vs an "analysis" specialist) and calls mint_worker(specialization).
That writes a small standalone launcher into workers/ which the orchestrator can
then spawn as its own process. The launcher just forwards into src.worker.run
with the specialization baked in, so all the real logic stays in one place and
"core code" is never duplicated or rewritten — only thin, generated launchers.
"""
import os
import stat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKERS_DIR = os.path.join(ROOT, "workers")

TEMPLATE = '''#!/usr/bin/env python3
"""AUTO-GENERATED worker variant: {specialization}.
Minted by the orchestrator from src/worker_template.py. Do not hand-edit —
it is regenerated on demand. Thin launcher; all logic lives in src/worker.py.
"""
import os
import sys

ROOT = {root!r}
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from src.worker import main

SPECIALIZATION = {specialization!r}

if __name__ == "__main__":
    argv = sys.argv[1:]
    if "--specialization" not in argv:
        argv += ["--specialization", SPECIALIZATION]
    main(argv)
'''


def mint_worker(specialization):
    """Write workers/worker_<specialization>.py and return its path."""
    os.makedirs(WORKERS_DIR, exist_ok=True)
    safe = "".join(c if c.isalnum() else "_" for c in specialization)
    path = os.path.join(WORKERS_DIR, f"worker_{safe}.py")
    code = TEMPLATE.format(specialization=specialization, root=ROOT)
    with open(path, "w") as f:
        f.write(code)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)
    return path


if __name__ == "__main__":
    print("minted:", mint_worker("triage"))
    print("minted:", mint_worker("analysis"))
