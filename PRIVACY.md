# Flare privacy

This browser extension adds Flare links to Laravel Cloud project pages. It is provided by Facade BV, the company behind Flare.

The extension reads the project name from the URL of a Laravel Cloud page. After you connect a Flare account, it sends that name to `flareapp.io` over HTTPS to look for a matching project. Flare returns the project's Errors and Performance destinations. The extension does not read your application code or Laravel Cloud credentials.

Connecting uses Flare's read-only OAuth device flow. The extension stores the access token and refresh token in browser extension storage on your device. It sends them only to `flareapp.io` for authentication and project matching. Disconnecting revokes the refresh token and removes the stored tokens. Uninstalling the extension removes its local storage, but does not revoke a token already issued by Flare. You can revoke the connection in Flare.

The extension does not contain advertising, analytics, or third-party tracking code. It does not sell or share extension data with third parties. Data sent to Flare is handled under [Flare's privacy and cookie policy](https://flareapp.io/privacy-cookie-policy).

Questions about this extension can be sent to [support@flareapp.io](mailto:support@flareapp.io).
