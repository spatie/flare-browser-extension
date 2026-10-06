"""Watch local extension files and publish each saved change."""

import hashlib
import os
import plistlib
import subprocess
import sys
import time
from pathlib import Path

from publish_dev import publish


root = Path(__file__).resolve().parent.parent
extension = root / "extension"
label = "io.flareapp.laravel-cloud-extension-dev"
agent_path = Path.home() / "Library" / "LaunchAgents" / f"{label}.plist"
log_path = Path.home() / "Library" / "Logs" / "FlareExtensionDevWatcher.log"
domain = f"gui/{os.getuid()}"


def fingerprint():
    digest = hashlib.sha256()

    for path in sorted(extension.rglob("*")):
        if not path.is_file() or path.name == "manifest.json":
            continue

        digest.update(str(path.relative_to(extension)).encode())
        digest.update(path.read_bytes())

    return digest.digest()


def watch():
    last_fingerprint = fingerprint()
    changed_at = None

    while True:
        time.sleep(0.5)
        current_fingerprint = fingerprint()

        if current_fingerprint != last_fingerprint:
            last_fingerprint = current_fingerprint
            changed_at = time.monotonic()

        if changed_at is not None and time.monotonic() - changed_at >= 0.75:
            try:
                version = publish()
            except Exception as error:
                print(f"Publish failed: {error}", flush=True)
                continue

            print(f"Published extension {version}", flush=True)
            changed_at = None


def install():
    agent_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    agent = {
        "Label": label,
        "ProgramArguments": ["/usr/bin/python3", str(Path(__file__).resolve()), "watch"],
        "RunAtLoad": True,
        "KeepAlive": True,
        "ProcessType": "Background",
        "StandardOutPath": str(log_path),
        "StandardErrorPath": str(log_path),
    }
    agent_path.write_bytes(plistlib.dumps(agent))

    subprocess.run(
        ["launchctl", "bootout", domain, str(agent_path)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    subprocess.run(["launchctl", "bootstrap", domain, str(agent_path)], check=True)
    print(f"Watching {extension}")


def uninstall():
    subprocess.run(
        ["launchctl", "bootout", domain, str(agent_path)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    agent_path.unlink(missing_ok=True)
    print("Stopped extension watcher")


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else "watch"

    if command == "install":
        install()
    elif command == "uninstall":
        uninstall()
    elif command == "watch":
        watch()
    else:
        raise SystemExit(f"Unknown command: {command}")
