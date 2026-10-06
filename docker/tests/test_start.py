import importlib.util
from pathlib import Path
import signal
import sys
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("smartquote_start", Path(__file__).parents[1] / "start.py")
start = importlib.util.module_from_spec(spec)
spec.loader.exec_module(start)


class SupervisorTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.cwd_patch = patch.object(start, "BACKEND", Path(self.directory.name))
        self.cwd_patch.start()
        self.addCleanup(self.cwd_patch.stop)
        self.supervisor = start.Supervisor()
        self.addCleanup(self.supervisor.stop)

    def test_successful_initialization_is_not_treated_as_a_service_failure(self):
        self.assertEqual(self.supervisor.run_once("migrazione", [sys.executable, "-c", "pass"]), 0)
        self.supervisor.check()
        self.assertEqual(self.supervisor.services, [])

    def test_failed_initialization_prevents_following_services_from_starting(self):
        with self.assertRaisesRegex(start.StartupError, "migrazione fallito"):
            self.supervisor.run_once("migrazione", [sys.executable, "-c", "raise SystemExit(2)"])
        self.assertEqual(self.supervisor.services, [])

    def test_missing_model_can_trigger_a_download_instead_of_aborting(self):
        self.assertEqual(self.supervisor.run_once(
            "modello", [sys.executable, "-c", "raise SystemExit(1)"], allow_failure=True
        ), 1)
        self.supervisor.check()

    def test_worker_failure_is_detected_and_other_services_are_stopped(self):
        api = self.supervisor.start("API", [sys.executable, "-c", "import time; time.sleep(60)"])
        worker = self.supervisor.start("promemoria", [sys.executable, "-c", "raise SystemExit(2)"])
        worker.wait(timeout=5)
        with self.assertRaisesRegex(start.StartupError, "promemoria si è fermato"):
            self.supervisor.check()
        self.supervisor.stop()
        self.assertIsNotNone(api.poll())
        self.assertEqual(self.supervisor.services, [])

    def test_shutdown_signal_stops_services_and_prevents_new_ones(self):
        process = self.supervisor.start("API", [sys.executable, "-c", "import time; time.sleep(60)"])
        self.supervisor.request_shutdown(signal.SIGTERM, None)
        with self.assertRaises(start.ShutdownRequested) as caught:
            self.supervisor.start("frontend", [sys.executable, "-c", "pass"])
        self.assertEqual(caught.exception.signum, signal.SIGTERM)
        self.supervisor.stop()
        self.assertIsNotNone(process.poll())

    def test_readiness_timeout_does_not_start_dependent_services(self):
        with self.assertRaisesRegex(start.StartupError, "PostgreSQL non disponibile"):
            self.supervisor.wait_ready("PostgreSQL", lambda: False, timeout=0)


if __name__ == "__main__":
    unittest.main()
