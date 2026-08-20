from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from agent_harness.loop import _fingerprint, load_state, resume, run_new


class HarnessTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.runs = self.root / "runs"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def contract(self, *, command: str = "python -c \"pass\"", verifier: str = "python -c \"pass\"", max_actions: int = 10) -> Path:
        value = {
            "run_id": "test-run",
            "workspace": str(self.root),
            "steps": [{"id": "step-1", "command": command, "timeout_seconds": 5, "retries": 0}],
            "verifier": {"command": verifier, "timeout_seconds": 5},
            "budgets": {"max_actions": max_actions, "max_seconds": 60, "max_repeated_action": 3},
        }
        path = self.root / "task.json"
        path.write_text(json.dumps(value), encoding="utf-8")
        return path

    def test_normal_completion(self) -> None:
        state = run_new(self.contract(), self.runs)
        self.assertEqual("SUCCEEDED", state["status"])
        self.assertEqual(["step-1"], state["completed_step_ids"])

    def test_tool_failure(self) -> None:
        state = run_new(self.contract(command="python -c \"raise SystemExit(7)\""), self.runs)
        self.assertEqual("FAILED", state["status"])
        self.assertEqual("deterministic_tool_failure", state["reason"])

    def test_repeated_action_detection(self) -> None:
        path = self.contract()
        contract = json.loads(path.read_text())
        contract["budgets"]["max_repeated_action"] = 2
        path.write_text(json.dumps(contract))
        run_dir = self.runs / "test-run"
        run_dir.mkdir(parents=True)
        (run_dir / "contract.json").write_text(json.dumps(contract))
        action = {"type": "command", "step_id": "step-1", "command": contract["steps"][0]["command"]}
        state = {"run_id": "test-run", "status": "RUNNING", "reason": None, "started_at": 9999999999, "actions": 0, "completed_step_ids": [], "last_fingerprint": _fingerprint(action), "repeat_count": 2, "event_sequence": 0, "verification": None}
        (run_dir / "state.json").write_text(json.dumps(state))
        result = resume(run_dir)
        self.assertEqual("BLOCKED", result["status"])

    def test_resume_after_interruption_skips_verified_step(self) -> None:
        path = self.contract()
        real_execute_calls = []
        from agent_harness import loop
        real_execute = loop._execute

        def interrupt_on_verifier(command, cwd, env, timeout):
            real_execute_calls.append(command)
            if len(real_execute_calls) == 2:
                raise KeyboardInterrupt()
            return real_execute(command, cwd, env, timeout)

        with patch("agent_harness.loop._execute", side_effect=interrupt_on_verifier):
            with self.assertRaises(KeyboardInterrupt):
                run_new(path, self.runs)
        state = load_state(self.runs / "test-run")
        self.assertEqual(["step-1"], state["completed_step_ids"])
        result = resume(self.runs / "test-run")
        self.assertEqual("SUCCEEDED", result["status"])
        self.assertEqual(2, result["actions"])

    def test_verifier_rejection(self) -> None:
        state = run_new(self.contract(verifier="python -c \"raise SystemExit(1)\""), self.runs)
        self.assertEqual("FAILED", state["status"])
        self.assertEqual("verifier_rejected", state["reason"])

    def test_budget_exhaustion(self) -> None:
        state = run_new(self.contract(max_actions=1), self.runs)
        self.assertEqual("BUDGET_EXCEEDED", state["status"])
        self.assertEqual("max_actions", state["reason"])


if __name__ == "__main__":
    unittest.main()
