"""Check the frontend, API, PostgreSQL and Ollama without creating data."""

import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.request import urlopen


def main():
    for url, expected in (
        ("http://127.0.0.1:5173/", 200),
        ("http://127.0.0.1:5173/api/auth/me/", 401),
        ("http://127.0.0.1:11434/api/tags", 200),
    ):
        try:
            with urlopen(url, timeout=2) as response:
                code = response.status
        except HTTPError as exc:
            code = exc.code
        except (URLError, TimeoutError):
            return 1
        if code != expected:
            return 1
    return subprocess.run(
        ["pg_isready", "-h", "127.0.0.1", "-p", "5432"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=2,
    ).returncode


if __name__ == "__main__":
    sys.exit(main())
