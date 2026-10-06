"""Build a Firefox add-on ZIP from the shared extension source."""

import json
from zipfile import ZIP_DEFLATED, ZipFile

from package_chrome import DEV_RELOAD_HANDLER, ROOT, SOURCE


def package():
    manifest = json.loads((SOURCE / "manifest.json").read_text())
    for script in manifest["content_scripts"]:
        script["js"] = [name for name in script["js"] if name != "dev-reload.js"]
    manifest.pop("web_accessible_resources", None)
    manifest["background"] = {"scripts": ["background.js"]}
    manifest["browser_specific_settings"] = {
        "gecko": {
            "id": "extension@flareapp.io",
            "strict_min_version": "140.0",
            "data_collection_permissions": {
                "required": ["authenticationInfo", "browsingActivity"],
            },
        },
        "gecko_android": {"strict_min_version": "142.0"},
    }

    version = manifest["version"]
    destination = ROOT / "dist" / f"flare-firefox-{version}.zip"
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
