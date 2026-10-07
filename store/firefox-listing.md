# Firefox Add-ons submission

Package: `dist/flare-firefox-0.1.48.zip`

Name: Flare

Summary: Open a Laravel Cloud project's Flare errors, performance, and logs in one click.

Description:

> Flare adds a button beside Deploy on Laravel Cloud project pages. If the project exists in Flare, open its Errors page directly or choose Performance or Logs from the menu. If it does not exist yet, the button opens Flare's project creation dialog with the project name filled in.
>
> Connect your Flare account using the extension settings. The extension reads the project name from the Laravel Cloud URL and sends it to Flare to find a match. It does not read your application code or Laravel Cloud credentials.

Category: Web Development

Requires non-free service: Yes. Flare has a 10-day free trial, then requires a paid plan.

Support email: support@flareapp.io

Support website: https://flareapp.io/support

Homepage: https://flareapp.io

Privacy policy: https://github.com/spatie/flare-extension/blob/main/PRIVACY.md

License: All Rights Reserved. The repository does not contain an open source license.

Reviewer notes: This extension adds links on authenticated Laravel Cloud project pages. To test the account connection, open its settings, allow access to flareapp.io, then connect a Flare account through the read-only OAuth flow. Flare offers a 10-day trial without a credit card. On a Laravel Cloud project page, the button appears beside Deploy. The extension sends the project name from the URL to Flare to look for a match.
