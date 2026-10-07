"""Package Firefox source and build instructions for Mozilla review."""

import json
from zipfile import ZIP_DEFLATED, ZipFile

from package_chrome import ROOT, SOURCE


def package():
    version = json.loads((SOURCE / "manifest.json").read_text())["version"]
    destination = ROOT / "dist" / f"flare-firefox-source-{version}.zip"
    destination.parent.mkdir(exist_ok=True)

    with ZipFile(destination, "w", compression=ZIP_DEFLATED) as archive:
        for name in ["package_chrome.py", "package_firefox.py"]:
            path = ROOT / "scripts" / name
            archive.write(path, path.relative_to(ROOT))

        for path in sorted(SOURCE.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(ROOT))

        instructions = (ROOT / "store" / "firefox-source-readme.md").read_text()
        archive.writestr("README.md", instructions.format(version=version))

    return destination


if __name__ == "__main__":
    print(package())
