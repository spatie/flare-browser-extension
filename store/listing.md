# Chrome Web Store listing

Visibility: Unlisted

Name: Flare

Short description: Quick access to Flare errors, performance, and logs.

Category: Developer Tools

Detailed description:

> Flare puts error tracking, performance monitoring, and logs one click away from your deployment dashboard.
>
> On Laravel Cloud project pages, the extension adds a Flare button beside Deploy. When your Flare account is connected and a matching project exists, the main button opens Errors. The menu offers Performance and Logs. If no matching project exists, Set up Flare opens the project creation dialog with the project name filled in.
>
> Connect your account using Flare's read-only OAuth flow. The extension reads the project name from the Laravel Cloud URL and sends it to flareapp.io to find a match. It does not read application code or Laravel Cloud credentials.
>
> Before you connect, the main button opens your Flare project list.

Single purpose: Link a Laravel Cloud project to its matching Flare Errors, Performance, and Logs pages.

Permission justifications:

- `storage`: Keep the Flare OAuth connection and pending approval state on the user's device.
- `https://flareapp.io/*` optional host access: Request OAuth tokens, match the current Laravel Cloud project, and revoke the connection after the user allows this site.
- `https://cloud.laravel.com/*` content script: Read the project name from the page URL and add the Flare action beside Deploy.

Remote code: None. The extension loads fonts and scripts from its own package and exchanges JSON with Flare.

Data disclosure: The extension reads the Laravel Cloud project name from the URL and sends it to Flare for matching. It stores Flare OAuth tokens locally and sends them only to Flare. See [PRIVACY.md](../PRIVACY.md).

Test instructions: Open the toolbar icon and choose Connect to Flare. Allow flareapp.io access, sign in or create a Flare account, and approve the device code. On a Laravel Cloud project page, allow cloud.laravel.com access. The main Flare button opens Errors for a matching project; the menu opens Performance and Logs. Without a match, Set up Flare opens the create-project dialog. Before connection, the main button opens the Flare project list.

Homepage: https://flareapp.io

Support: https://flareapp.io/support

Privacy policy: https://github.com/spatie/flare-extension/blob/main/PRIVACY.md
