"""Start and supervise all SmartQuote services inside the Compose container."""

import os
from pathlib import Path
import signal
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen


BACKEND = Path("/app/Backend")


class StartupError(Exception):
    pass


class ShutdownRequested(Exception):
    def __init__(self, signum):
        self.signum = signum


class Supervisor:
    def __init__(self):
        self.services = []
        self.shutdown_signal = None

    def request_shutdown(self, signum, _frame):
        self.shutdown_signal = signum

    def start(self, name, command, *, quiet=False, stop_signal=signal.SIGTERM):
        self.check()
        print(f"Avvio {name}…", flush=True)
        process = subprocess.Popen(
            command,
            cwd=BACKEND,
            start_new_session=True,
            stdout=subprocess.DEVNULL if quiet else None,
            stderr=subprocess.DEVNULL if quiet else None,
        )
        self.services.append((name, process, stop_signal))
        return process

    def check(self, excluded=None):
        if self.shutdown_signal is not None:
            raise ShutdownRequested(self.shutdown_signal)
        for name, process, _stop_signal in self.services:
            if process is not excluded and process.poll() is not None:
                raise StartupError(f"{name} si è fermato (codice {process.returncode}).")

    def run_once(self, name, command, *, quiet=False, allow_failure=False):
        process = self.start(name, command, quiet=quiet)
        while process.poll() is None:
            self.check(excluded=process)
            time.sleep(0.2)
        self.services = [service for service in self.services if service[1] is not process]
        self.check()
        if process.returncode and not allow_failure:
            raise StartupError(f"{name} fallito (codice {process.returncode}).")
        return process.returncode

    def wait_ready(self, name, ready, timeout=60):
        deadline = time.monotonic() + timeout
        while True:
            self.check()
            if ready():
                return
            if time.monotonic() >= deadline:
                raise StartupError(f"{name} non disponibile entro {timeout} secondi.")
            time.sleep(0.5)

    def stop(self):
        # Stop clients before PostgreSQL; SIGINT requests its fast, clean shutdown.
        for _name, process, stop_signal in reversed(self.services):
            try:
                os.killpg(process.pid, stop_signal)
            except ProcessLookupError:
                pass
        deadline = time.monotonic() + 20
        for _name, process, _stop_signal in reversed(self.services):
            try:
                process.wait(timeout=max(0, deadline - time.monotonic()))
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait()
        self.services.clear()


def postgres_ready():
    return subprocess.run(
        ["pg_isready", "-h", "127.0.0.1", "-p", "5432"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=5,
    ).returncode == 0


def ollama_ready():
    try:
        with urlopen("http://127.0.0.1:11434/api/tags", timeout=2) as response:
            return response.status == 200
    except (URLError, TimeoutError):
        return False


def main():
    supervisor = Supervisor()
    signal.signal(signal.SIGTERM, supervisor.request_shutdown)
    signal.signal(signal.SIGINT, supervisor.request_shutdown)
    try:
        supervisor.start(
            "PostgreSQL", ["docker-entrypoint.sh", "postgres"], stop_signal=signal.SIGINT
        )
        supervisor.start("Ollama", ["ollama", "serve"])
        supervisor.wait_ready("PostgreSQL", postgres_ready)
        supervisor.run_once("Migrazioni", [sys.executable, "manage.py", "migrate", "--noinput"])
        supervisor.run_once(
            "Statici Django", [sys.executable, "manage.py", "collectstatic", "--noinput"]
        )
        supervisor.wait_ready("Ollama", ollama_ready)
        model = os.environ["OLLAMA_MODEL"]
        if supervisor.run_once(
            "Verifica modello AI", ["ollama", "show", model], quiet=True, allow_failure=True
        ):
            supervisor.run_once("Download modello AI", ["ollama", "pull", model])
        supervisor.start(
            "Promemoria",
            [sys.executable, "manage.py", "generate_quote_reminders", "--watch", "--interval", "60"],
        )
        supervisor.start(
            "API Django", [sys.executable, "manage.py", "runserver", "0.0.0.0:8000", "--noreload"]
        )
        supervisor.start("Frontend", ["nginx", "-c", "/app/docker/nginx.conf", "-g", "daemon off;"])
        print("SmartQuote avviato: http://localhost:5173", flush=True)
        while True:
            supervisor.check()
            time.sleep(0.5)
    except ShutdownRequested as exc:
        print("Arresto dei servizi SmartQuote…", flush=True)
        return 128 + exc.signum
    except (StartupError, OSError, KeyError) as exc:
        print(f"Avvio SmartQuote interrotto: {exc}", file=sys.stderr, flush=True)
        return 1
    finally:
        supervisor.stop()


if __name__ == "__main__":
    sys.exit(main())
