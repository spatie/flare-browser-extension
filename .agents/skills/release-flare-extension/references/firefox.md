# Firefox Add-ons

The Mozilla developer profile is **Spatie** under `freek@spatie.be`. The listed add-on is [flare-by-spatie](https://addons.mozilla.org/en-US/firefox/addon/flare-by-spatie/). Upload new versions to this listing rather than creating a new add-on. Read `store/firefox-listing.md` for the copy, support address, privacy policy, and reviewer notes. Flare has a trial followed by paid plans, so disclose that it requires a non-free service. The repository has no open source license; select All Rights Reserved unless the owner changes that choice.

Build the add-on with `python3 scripts/package_firefox.py`. Then run `python3 scripts/package_firefox_source.py`. The second ZIP contains the unmodified source, packaging scripts, and build instructions. Mozilla requires the source archive because `package_firefox.py` preprocesses the manifest and background script. Extract the source ZIP, run its README command, and compare every generated file with the submitted add-on ZIP before uploading.

The intended channel is a listed Firefox Add-ons release unless the owner chooses self-distribution. Upload the extension ZIP to the [Developer Hub](https://addons.mozilla.org/en-US/developers/), wait for validation, then upload the source ZIP when requested. Set category Web Development, privacy policy, support details, reviewer notes, and paid-service disclosure. The shared manifest currently marks Firefox for Android compatible too; check that choice when preparing a new package.

After submission, confirm the add-on URL and version status in the Developer Hub. For a listed add-on, Firefox handles updates when new versions appear on the listing. For self-distribution, Mozilla signing alone does not create a public listing or automatic updates without an update manifest.
