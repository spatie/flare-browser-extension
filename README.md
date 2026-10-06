# Flare browser extension

![Flare button with Errors and Performance in Laravel Cloud](docs/flare-cloud-actions.png)

Adds a Flare button immediately to the right of **Deploy** on Laravel Cloud. Connect the extension to Flare using its toolbar icon. For a matching project, the main button opens Flare Errors and its menu offers Errors, Performance, and Logs. When no project matches, **Set up Flare** opens the Laravel installation guide. When the extension is disconnected, **Connect Flare** opens its settings.

The connection uses Flare's read-only OAuth device flow. The extension stores the access and refresh tokens in browser extension storage, keeps them out of the Laravel Cloud page, and revokes them when you disconnect. Flare matches an exact allowed domain first, then an exact project name or slug.

## Install in Chrome locally

1. [Download the repository as a ZIP](https://github.com/spatie/flare-browser-extension/archive/refs/heads/main.zip) and unzip it. Keep the unzipped folder in a permanent location.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Click **Load unpacked** and select the `extension` folder inside the unzipped repository.
4. Click the Flare toolbar icon, connect your Flare account, and approve the read-only connection on Flare.
5. Open or refresh a Laravel Cloud project page. The Flare button appears beside **Deploy**.

To update this local installation, download the latest repository ZIP, replace the files in the same `extension` folder, click **Reload** on the Flare card in `chrome://extensions`, then refresh Laravel Cloud. Chrome must keep using that folder at the same path. A local installation does not update automatically.

## Development

Run `python3 scripts/watch_extension.py install` once to start the development watcher. Saving a file in `extension` then bumps the version automatically. An open Laravel Cloud page with the Flare button detects that version, reloads the unpacked extension, and refreshes itself within a few seconds. Chrome Developer mode must stay enabled. Keep the `extension` folder at the same path while Chrome uses it.

Run `python3 scripts/watch_extension.py uninstall` to stop the watcher. You can also publish a version manually with `python3 scripts/publish_dev.py`.

For a Chrome Web Store release, run `python3 scripts/package_chrome.py`. The ZIP in `dist/` excludes the development reload script and its permissions. Upload that ZIP to the Chrome Web Store and choose **Unlisted** visibility. Store copy and privacy disclosures are drafted in [store/listing.md](store/listing.md) and [PRIVACY.md](PRIVACY.md). Store releases are reviewed and update installed copies through Chrome.

Disable the unpacked development extension before installing the Web Store version in the same Chrome profile. Both copies would otherwise try to add the button to the same page.

## Safari on macOS

Open `safari/Flare for Laravel Cloud/Flare for Laravel Cloud.xcodeproj` in Xcode, select the macOS app target, and run it. In Safari, enable the extension in **Settings > Extensions** and allow access to `cloud.laravel.com`.

The Safari Xcode project references the files in `extension`, so changes to the shared extension source can be rebuilt in Xcode.
