# StreamPulse Cloudflare Stream Key Generator

This Worker creates one real Cloudflare Stream Live Input for each Live Stream Room and returns its RTMPS URL, Stream Key, Live Input ID, and HLS playback URL.

## Security model

- `CLOUDFLARE_API_TOKEN` stays in Worker secrets and is never sent to the browser.
- `CREATOR_API_SECRET` authorizes Room creators. Enter it in the StreamPulse creator console only when generating a key.
- The browser keeps the returned Stream Key in `sessionStorage`; it is not included in Room data or share links.
- `ALLOWED_ORIGIN` restricts browser calls. For the current GitHub Pages site use `https://akarenka.github.io` without a trailing slash.
- For a public production service, replace the shared creator secret with Firebase ID-token verification and apply Cloudflare rate limiting.

## Deploy

1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Copy `wrangler.toml.example` to `wrangler.toml`.
4. Sign in with `npx wrangler login`.
5. Create a Cloudflare API Token with Account / Stream / Write permission.
6. Run each command and paste the requested value:

```powershell
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put CREATOR_API_SECRET
```

`CREATOR_API_SECRET` should be a long password used only by approved StreamPulse creators.

7. Deploy:

```powershell
npx wrangler deploy
```

8. Wrangler returns a URL similar to:

```text
https://streampulse-live-api.YOUR-SUBDOMAIN.workers.dev
```

9. In `live.html`, open a Room's creator console and set Generator API URL to:

```text
https://streampulse-live-api.YOUR-SUBDOMAIN.workers.dev/api/live-inputs
```

10. Enter the same `CREATOR_API_SECRET`, select recording/latency preferences, and press **Generate 此 Room 專屬 Stream Key**.

## Important

Every press that is confirmed for an existing Room creates another Cloudflare Live Input. Recording storage and viewer delivery can incur Stream usage charges, so delete obsolete inputs and recordings when appropriate. Do not commit `wrangler.toml` if you later add private values to it, and never put the API Token in `live.html`.
