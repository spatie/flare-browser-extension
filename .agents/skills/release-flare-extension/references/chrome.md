# Chrome Web Store

The Spatie publisher ID is `f3a95eff-6cae-48e7-8977-0f9fc5cc21c9`; the Flare item ID is `bjgblbdbghcbojdccdekbbmmdehifogk`. Its intended visibility is **Unlisted**. The publisher contact is `info@spatie.be`. Use `store/listing.md` and `PRIVACY.md` for listing copy and disclosures.

Build `dist/flare-chrome-<version>.zip` with `python3 scripts/package_chrome.py`. Check the ZIP manifest version. In the [developer dashboard](https://chrome.google.com/webstore/devconsole/f3a95eff-6cae-48e7-8977-0f9fc5cc21c9/), inspect the item's existing package and review state before uploading or replacing it. A submitted version can remain in review while a newer GitHub release exists.

`.github/workflows/release.yml` has an optional Chrome submission job. It needs `GCP_WORKLOAD_IDENTITY_PROVIDER` and `CHROME_WEB_STORE_SERVICE_ACCOUNT` repository variables, plus the existing publisher and item IDs. When those are absent, use the dashboard after a publisher account sign-in. `scripts/publish_chrome_store.py` performs the API upload and submission when a valid short-lived access token is available.

After submission, verify the dashboard's submitted version, visibility, and review state. Check the [install page](https://chromewebstore.google.com/detail/bjgblbdbghcbojdccdekbbmmdehifogk) without assuming a submitted draft is installable. Browser approval and Chrome's updates happen after Google publishes it.
