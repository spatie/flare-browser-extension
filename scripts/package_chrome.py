"""Build the Chrome Web Store ZIP from the shared extension source."""

import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "extension"
DEV_RELOAD_HANDLER = '''  if (message?.type === "flare-dev-reload") {
    extensionApi.runtime.reload();
    return;
  }

'''


def package():
    manifest = json.loads((SOURCE / "manifest.json").read_text())
    for script in manifest["content_scripts"]:
        script["js"] = [name for name in script["js"] if name != "dev-reload.js"]
    manifest.pop("web_accessible_resources", None)

    version = manifest["version"]
    destination = ROOT / "dist" / f"flare-for-laravel-cloud-chrome-{version}.zip"
    destination.parent.mkdir(exist_ok=True)

    background = (SOURCE / "background.js").read_text()
    if background.count(DEV_RELOAD_HANDLER) != 1:
        raise RuntimeError("Could not remove the development reload handler")

    with ZipFile(destination, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", json.dumps(manifest, indent=2) + "\n")
        archive.writestr("background.js", background.replace(DEV_RELOAD_HANDLER, ""))
        for path in sorted(SOURCE.rglob("*")):
            if not path.is_file() or path.name in {"manifest.json", "background.js", "dev-reload.js"}:
                continue
            archive.write(path, path.relative_to(SOURCE))

    return destination


if __name__ == "__main__":
    print(package())
