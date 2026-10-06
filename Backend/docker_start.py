"""Apply migrations and run the API and reminder worker in one container."""

import os
import signal
import subprocess
import sys
import time


def main():
    processes = []
    shutdown_signal = None

    def request_shutdown(signum, _frame):
        nonlocal shutdown_signal
        shutdown_signal = signum

    def start(*arguments):
        process = subprocess.Popen(
            [sys.executable, "manage.py", *arguments], start_new_session=True
        )
        processes.append(process)
        return process

    def wait_for_exit(watched):
        while shutdown_signal is None:
            for process in watched:
                code = process.poll()
                if code is not None:
                    return code if code >= 0 else 128 - code
            time.sleep(0.2)
        return 128 + shutdown_signal

    signal.signal(signal.SIGTERM, request_shutdown)
    signal.signal(signal.SIGINT, request_shutdown)

    try:
        migration = start("migrate", "--noinput")
        code = wait_for_exit([migration])
        if code:
            return code
        processes.remove(migration)
        if shutdown_signal is not None:
            return 128 + shutdown_signal

        start("generate_quote_reminders", "--watch", "--interval", "60")
        if shutdown_signal is not None:
            return 128 + shutdown_signal
        start("runserver", "0.0.0.0:8000", "--noreload")
        print("API e promemoria avviati nello stesso container.", flush=True)
        # A worker or API exit must stop the container so Compose can restart both.
        return max(1, wait_for_exit(processes))
    finally:
        for process in processes:
            try:
                os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
        deadline = time.monotonic() + 8
        for process in processes:
            try:
                process.wait(timeout=max(0, deadline - time.monotonic()))
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait()


if __name__ == "__main__":
    sys.exit(main())
