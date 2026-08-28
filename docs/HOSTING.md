# Hosting the live board

The static React app and the PartyKit live-room server deploy separately. There is no application database and no login besides Cloudflare / PartyKit account access for you as the deployer.

**Order matters:** deploy the live room first, copy its hostname, set `VITE_PARTYKIT_HOST` on Pages, then build Pages. Vite bakes that variable into the JavaScript at `npm run build`. Changing the env var later requires a new Pages build.

Do not put an editor key, incident name, leader name, or phone number in `VITE_PARTYKIT_HOST` or in any deployed URL.

On Windows PowerShell, if `npx` / `npm` fail with **running scripts is disabled**, use `npx.cmd` and `npm.cmd` instead. Do not change ExecutionPolicy for this. Run commands from the project directory.

## 1. Deploy the live room (cloud-prem)

Shared `partykit.dev` has hit Cloudflare’s custom-domain cap, so new rooms cannot deploy there. Put the same `party/` worker on **your** Cloudflare account ([cloud-prem](https://docs.partykit.io/guides/deploy-to-cloudflare/)):

1. Create an API token from the **Edit Cloudflare Workers** template.
2. Use a hostname already managed under that account.

```powershell
cd C:\Cursor\Med_dashboard
npx.cmd partykit login
$env:CLOUDFLARE_ACCOUNT_ID = "<account-id>"
$env:CLOUDFLARE_API_TOKEN = "<api-token>"
npx.cmd partykit deploy --domain live.<your-domain>
```

Copy the printed hostname **without** `https://` or `wss://`. That value is `VITE_PARTYKIT_HOST`. Do not put the API token in the repo or in the viewer URL.

## 2. Deploy Cloudflare Pages

Create a Pages project for this repository (or upload `dist/`):

- Build command: `npm run build` (or `npm.cmd run build` on locked-down PowerShell)
- Build output directory: `dist`
- Environment variable (Production, and Preview if you test preview URLs): `VITE_PARTYKIT_HOST` = the cloud-prem hostname from step 1

Then trigger a **new** build so the variable is inlined.

Direct upload after `wrangler login`:

```powershell
cd C:\Cursor\Med_dashboard
npx.cmd wrangler login
$env:VITE_PARTYKIT_HOST = "live.<your-domain>"
npm.cmd run build
npm.cmd run pages:deploy
```

`partykit login` and `wrangler login` open a browser. Deploy commands will sit on “Attempting to login…” until that consent finishes. You cannot use a localhost editor session to control a Pages viewer.

`public/_headers` and `public/_redirects` copy into `dist/` so `.wasm` / PDF assets get the right types and a non-hash path still serves `index.html`. Room IDs still live in the URL hash (`#room=…`).

## 3. Smoke test on the Pages URL

Use the HTTPS Pages origin (for example `https://<project>.pages.dev`), not `localhost`.

- Map, table, and bundled GeoPDF load.
- Save / export / import still work (`localStorage` is per origin; production starts empty until you import or place units).
- **Share board** copies `https://<pages-host>/#room=…` (not a LAN IP).
- A second browser or incognito window with that link is read-only and receives snapshot updates.
- The viewer cannot push changes. Closing the editor tab does not promote a viewer.

**Share board must be clicked on the Pages origin.** The editor credential is stored in that origin’s `sessionStorage`. A localhost editor does not control a Pages viewer, even if the room id looks the same.

## Live-room operating notes

- Anyone with the viewer URL can read the board, including leader contact fields. Treat it like the exported unit JSON.
- Closing the editor tab ends that editor session; the room keeps its last snapshot for viewers. Start a new shared room from the RADO’s locally saved board if needed.
- Keep using Save/Export as the WAN-loss fallback. Viewers retain the last snapshot they received while disconnected.
- The room syncs snap points, units, and placements. It does not upload the GeoPDF; each browser uses its own loaded or bundled map.

## Local development (LAN)

Install dependencies, then run Vite and PartyKit in separate terminals:

```sh
npm run dev
npm run party:dev
```

On the LAN, Share board replaces `localhost` with this machine’s private IPv4 in the copied URL, and live sockets use that same IP on port 1999. `/__lan` exists only on the Vite dev/preview server.

If viewers cannot connect locally, confirm PartyKit is listening (`npm run party:dev`) and that Windows Firewall allows inbound TCP 5173 and 1999.

Do **not** set production `VITE_PARTYKIT_HOST` to a loopback or LAN IP. For a local override against a deployed PartyKit host, copy `.env.example` to `.env.local`, set `VITE_PARTYKIT_HOST`, and restart Vite.
