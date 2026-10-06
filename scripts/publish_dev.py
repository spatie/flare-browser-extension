"""Make the current extension files visible to the installed development build."""

import json
from pathlib import Path


def publish():
    manifest_path = Path(__file__).resolve().parent.parent / "extension" / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    version = [int(part) for part in manifest["version"].split(".")]
    version[-1] += 1
    manifest["version"] = ".".join(str(part) for part in version)

    temporary_path = manifest_path.with_suffix(".json.tmp")
    temporary_path.write_text(json.dumps(manifest, indent=2) + "\n")
    temporary_path.replace(manifest_path)

    return manifest["version"]


if __name__ == "__main__":
    print(publish())
