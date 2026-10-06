"""Submit an existing Chrome Web Store item using the V2 API."""

import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from zipfile import ZipFile


def required(name):
    value = os.environ.get(name, "")
    if not value:
        raise SystemExit(f"Missing {name}")
    return value


def api_request(method, url, token, data=None, content_type=None):
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    if content_type:
        headers["Content-Type"] = content_type
    request = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=60) as response:
            return json.load(response)
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:2000]
        raise SystemExit(f"Chrome Web Store API returned {error.code}: {detail}") from error


def publish(package):
    token = required("CHROME_WEB_STORE_ACCESS_TOKEN")
    publisher_id = required("CHROME_WEB_STORE_PUBLISHER_ID")
    item_id = required("CHROME_WEB_STORE_ITEM_ID")
    if not re.fullmatch(r"[0-9a-f-]{36}", publisher_id):
        raise SystemExit("Invalid Chrome Web Store publisher ID")
    if not re.fullmatch(r"[a-p]{32}", item_id):
        raise SystemExit("Invalid Chrome Web Store item ID")

    with ZipFile(package) as archive:
        version = json.loads(archive.read("manifest.json"))["version"]
    if package.name != f"flare-chrome-{version}.zip":
        raise SystemExit("Package filename and manifest version differ")

    item = f"publishers/{publisher_id}/items/{item_id}"
    upload_url = f"https://chromewebstore.googleapis.com/upload/v2/{item}:upload"
    upload = api_request("POST", upload_url, token, package.read_bytes(), "application/zip")
    state = upload.get("uploadState")
    for _ in range(30):
        if state not in {"IN_PROGRESS", "UPLOAD_IN_PROGRESS"}:
            break
        time.sleep(2)
        status = api_request("GET", f"https://chromewebstore.googleapis.com/v2/{item}:fetchStatus", token)
        state = status.get("lastAsyncUploadState")
    if state != "SUCCEEDED":
        raise SystemExit(f"Chrome Web Store upload did not succeed: {state}")

    body = json.dumps({"publishType": "DEFAULT_PUBLISH", "blockOnWarnings": True}).encode()
    result = api_request(
        "POST",
        f"https://chromewebstore.googleapis.com/v2/{item}:publish",
        token,
        body,
        "application/json",
    )
    print(f"Submitted Chrome {version}: {result.get('state', 'status unknown')}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: publish_chrome_store.py CHROME_PACKAGE.zip")
    publish(Path(sys.argv[1]))
