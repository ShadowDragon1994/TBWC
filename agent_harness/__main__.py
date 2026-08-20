from __future__ import annotations

import argparse
import json
from pathlib import Path

from .loop import load_state, resume, run_new


def main() -> None:
    parser = argparse.ArgumentParser(prog="agent_harness")
    sub = parser.add_subparsers(dest="command", required=True)
    run_parser = sub.add_parser("run")
    run_parser.add_argument("contract", type=Path)
    run_parser.add_argument("--runs-dir", type=Path, default=Path(".agent-runs"))
    resume_parser = sub.add_parser("resume")
    resume_parser.add_argument("run_dir", type=Path)
    status_parser = sub.add_parser("status")
    status_parser.add_argument("run_dir", type=Path)
    args = parser.parse_args()

    if args.command == "run":
        state = run_new(args.contract, args.runs_dir)
    elif args.command == "resume":
        state = resume(args.run_dir)
    else:
        state = load_state(args.run_dir)
    print(json.dumps(state, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

