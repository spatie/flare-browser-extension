# Chrome Web Store listing

Visibility: Unlisted

Name: Flare

Short description: Open your Flare errors and performance from Laravel Cloud.

Category: Developer Tools

Detailed description:

> Open the matching Flare project from your Laravel Cloud dashboard.
>
> After connecting your Flare account, a Flare button appears beside Deploy on Laravel Cloud project pages. Open the project's Errors page directly, or use the menu to open Performance or Logs. If no matching Flare project exists, the button opens the Laravel installation guide.
>
> The connection uses read-only access. The extension checks the Laravel Cloud project name against your Flare projects. It does not access your application code or Laravel Cloud credentials.

Single purpose: Link a Laravel Cloud project to its matching Flare Errors, Performance, and Logs pages.

Permission justifications:

- `storage`: Keep the Flare OAuth connection and pending approval state on the user's device.
- `https://flareapp.io/*`: Request OAuth tokens, match the current Laravel Cloud project, and revoke the connection.
- `https://cloud.laravel.com/*` content script: Read the project name from the page URL and add the Flare action beside Deploy.

Remote code: None. The extension loads fonts and scripts from its own package and exchanges JSON with Flare.

Data disclosure: The extension reads the Laravel Cloud project name from the URL and sends it to Flare for matching. It stores Flare OAuth tokens locally and sends them only to Flare. See [PRIVACY.md](../PRIVACY.md).

Test instructions: Open a Laravel Cloud project page, then click the Flare toolbar icon. Connect a Flare account through the device approval screen. If the account has a project with the same domain or name, the Flare button opens Errors and its menu offers Performance and Logs. Otherwise, Set up Flare opens the installation guide.

Homepage: https://flareapp.io

Support: https://flareapp.io/support

Privacy policy: https://github.com/spatie/flare-extension/blob/main/PRIVACY.md
