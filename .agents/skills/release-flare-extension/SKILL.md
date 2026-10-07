---
name: release-flare-extension
description: Release or check publication of the Flare browser extension across Chrome Web Store, Firefox Add-ons, and Safari TestFlight or the Mac App Store from this repository.
---

# Release Flare

Use this workflow for a new version, a store submission, or a publication status check. The shared extension lives in `extension/`. Chrome and Firefox use store-specific ZIPs; Safari embeds the same files in its macOS app. A GitHub release alone does not publish to any browser store.

1. Inspect `extension/manifest.json`, the current Git tag, the working tree, and the changes since the last release. The development watcher bumps the manifest on saves. Use the final version in every package and store submission.
2. Build the Chrome and Firefox ZIPs with `scripts/package_chrome.py` and `scripts/package_firefox.py`. Run `web-ext lint --warnings-as-errors` on the extracted Firefox ZIP. Build the Safari Xcode scheme for macOS. Verify a changed browser UI in a browser before release.
3. Push the release commit and run `.github/workflows/release.yml` from `main` using `gh`. Confirm its GitHub release contains the intended version and files. The workflow can submit Chrome updates only when its Google Workload Identity variables are configured; inspect them before enabling that input.
4. Submit or check each requested channel using the relevant reference below. Inspect the current draft or published version in that store before changing it. Report each store's actual status and install link separately. Distinguish a package, a submitted draft, an approved TestFlight build, and a published store listing.

- [Chrome Web Store](references/chrome.md): unlisted listing, uploads, and review.
- [Firefox Add-ons](references/firefox.md): Mozilla signing, listed submission, and source archive.
- [Safari](references/safari.md): signed TestFlight builds, external testers, and the Mac App Store.

Use `gh` for GitHub operations and the `agent-browser` skill for browser automation. Store dashboards can require human sign-in or legal agreements. Complete the package and listing preparation before pausing at such a step.
