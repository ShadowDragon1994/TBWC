from __future__ import annotations

import hashlib
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

TERMINAL = {"SUCCEEDED", "FAILED", "BLOCKED", "CANCELLED", "BUDGET_EXCEEDED"}
SECRET_MARKERS = ("TOKEN", "SECRET", "PASSWORD", "API_KEY", "PRIVATE_KEY")


def _atomic_json(path: Path, value: dict[str, Any]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temporary, path)


def _redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: ("[REDACTED]" if any(mark in key.upper() for mark in SECRET_MARKERS) else _redact(item)) for key, item in value.items()}
    if isinstance(value, list):
        return [_redact(item) for item in value]
    return value


def _event(run_dir: Path, state: dict[str, Any], kind: str, data: dict[str, Any]) -> None:
    record = {"sequence": state["event_sequence"] + 1, "at": time.time(), "kind": kind, "data": _redact(data)}
    state["event_sequence"] = record["sequence"]
    with (run_dir / "events.jsonl").open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(record, ensure_ascii=False) + "\n")
        stream.flush()
        os.fsync(stream.fileno())
    _atomic_json(run_dir / "state.json", state)


def load_state(run_dir: Path) -> dict[str, Any]:
    return json.loads((run_dir / "state.json").read_text(encoding="utf-8"))


def _execute(command: str, cwd: Path, env: dict[str, str], timeout: float) -> dict[str, Any]:
    started = time.monotonic()
    try:
        result = subprocess.run(command, cwd=cwd, env={**os.environ, **env}, shell=True, text=True, capture_output=True, timeout=timeout)
        category = None if result.returncode == 0 else "deterministic_tool_failure"
        return {"ok": result.returncode == 0, "exit_code": result.returncode, "stdout": result.stdout, "stderr": result.stderr, "duration_ms": round((time.monotonic() - started) * 1000), "failure_category": category}
    except subprocess.TimeoutExpired as error:
        return {"ok": False, "exit_code": None, "stdout": error.stdout or "", "stderr": error.stderr or "", "duration_ms": round((time.monotonic() - started) * 1000), "failure_category": "transient_timeout"}


def _fingerprint(action: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(action, sort_keys=True).encode()).hexdigest()


def _budget_exceeded(state: dict[str, Any], contract: dict[str, Any]) -> str | None:
    budget = contract["budgets"]
    if state["actions"] >= budget["max_actions"]:
        return "max_actions"
    if time.time() - state["started_at"] >= budget["max_seconds"]:
        return "max_seconds"
    return None


def _drive(run_dir: Path) -> dict[str, Any]:
    state = load_state(run_dir)
    contract = json.loads((run_dir / "contract.json").read_text(encoding="utf-8"))
    if state["status"] in TERMINAL:
        return state
    workspace = Path(contract.get("workspace", ".")).resolve()
    env = {str(k): str(v) for k, v in contract.get("env", {}).items()}
    _event(run_dir, state, "RUN_RESUMED", {"completed": state["completed_step_ids"]})

    for step in contract["steps"]:
        if step["id"] in state["completed_step_ids"]:
            continue
        action = {"type": "command", "step_id": step["id"], "command": step["command"]}
        fingerprint = _fingerprint(action)
        state["repeat_count"] = state["repeat_count"] + 1 if fingerprint == state["last_fingerprint"] else 1
        state["last_fingerprint"] = fingerprint
        if state["repeat_count"] > contract["budgets"]["max_repeated_action"]:
            state["status"], state["reason"] = "BLOCKED", "repeated_action"
            _event(run_dir, state, "TERMINATED", {"reason": state["reason"]})
            return state

        max_attempts = int(step.get("retries", 0)) + 1
        for attempt in range(1, max_attempts + 1):
            reason = _budget_exceeded(state, contract)
            if reason:
                state["status"], state["reason"] = "BUDGET_EXCEEDED", reason
                _event(run_dir, state, "TERMINATED", {"reason": reason})
                return state
            state["actions"] += 1
            key = f'{state["run_id"]}:{step["id"]}:{attempt}'
            _event(run_dir, state, "ACTION_STARTED", {"action": action, "attempt": attempt, "idempotency_key": key})
            observation = _execute(step["command"], workspace, env, float(step.get("timeout_seconds", 60)))
            _event(run_dir, state, "ACTION_FINISHED", {"step_id": step["id"], "attempt": attempt, "observation": observation})
            if observation["ok"]:
                state["completed_step_ids"].append(step["id"])
                state["repeat_count"] = 0
                _event(run_dir, state, "STEP_VERIFIED", {"step_id": step["id"]})
                break
            if observation["failure_category"] != "transient_timeout" or attempt == max_attempts:
                state["status"], state["reason"] = "FAILED", observation["failure_category"]
                _event(run_dir, state, "TERMINATED", {"reason": state["reason"], "step_id": step["id"]})
                return state

    reason = _budget_exceeded(state, contract)
    if reason:
        state["status"], state["reason"] = "BUDGET_EXCEEDED", reason
        _event(run_dir, state, "TERMINATED", {"reason": reason})
        return state
    verifier = contract["verifier"]
    state["actions"] += 1
    evidence = _execute(verifier["command"], workspace, env, float(verifier.get("timeout_seconds", 60)))
    state["verification"] = evidence
    state["status"] = "SUCCEEDED" if evidence["ok"] else "FAILED"
    state["reason"] = "verifier_passed" if evidence["ok"] else "verifier_rejected"
    _event(run_dir, state, "VERIFICATION_FINISHED", {"observation": evidence})
    _event(run_dir, state, "TERMINATED", {"reason": state["reason"]})
    return state


def run_new(contract_path: Path, runs_dir: Path = Path(".agent-runs")) -> dict[str, Any]:
    contract = json.loads(contract_path.read_text(encoding="utf-8"))
    run_id = contract["run_id"]
    run_dir = runs_dir / run_id
    if run_dir.exists():
        return resume(run_dir)
    run_dir.mkdir(parents=True)
    contract.setdefault("budgets", {})
    contract["budgets"] = {"max_actions": 20, "max_seconds": 600, "max_repeated_action": 3, **contract["budgets"]}
    _atomic_json(run_dir / "contract.json", contract)
    state = {"run_id": run_id, "status": "RUNNING", "reason": None, "started_at": time.time(), "actions": 0, "completed_step_ids": [], "last_fingerprint": "", "repeat_count": 0, "event_sequence": 0, "verification": None}
    _atomic_json(run_dir / "state.json", state)
    _event(run_dir, state, "RUN_CREATED", {"contract": contract})
    return _drive(run_dir)


def resume(run_dir: Path) -> dict[str, Any]:
    return _drive(run_dir)
