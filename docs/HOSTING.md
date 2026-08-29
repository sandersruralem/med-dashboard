# Building and hosting

How to pack the USB folder and how to put the board on the internet. For running a shift, start with [README.md](../README.md) and [operator/](operator/).

There is no app database and no user login. The website and the live-room server are two deploys. Vite bakes `VITE_PARTYKIT_HOST` into the JavaScript at build time, so you deploy the live room first, then rebuild Pages if that hostname changes.

On locked-down PowerShell, use `npm.cmd` and `npx.cmd`. Leave ExecutionPolicy alone. Run commands from the project directory. Keep editor keys, incident names, leader names, and phones out of env vars and URLs.

## USB folder

Windows 11 often blocks an unsigned custom `.exe`. The field pack is a folder whose only executable is official Node for Windows (OpenJS-signed, version 22.18.0). The RADO double-clicks `Start-MedBoard.cmd`.

On a development PC (needs network the first time, to fetch Node):

```powershell
cd C:\Cursor\Med_dashboard
npm.cmd run portable:pack
```

That writes `release/MedBoard-LAN` and `release/MedBoard-LAN-portable.zip`. GitHub Releases also have a versioned zip (v2.1.2 is `MedBoard-LAN-2.1.2-portable.zip`).

Copy the whole `MedBoard-LAN` folder to a USB stick. On the ICP laptop:

1. Copy the folder to the Desktop if the agency will not run it from removable media.
2. Double-click `Start-MedBoard.cmd` and leave the console open.
3. The board opens at `http://<this-laptop’s-LAN-IP>:8787` (or 8788–8796).
4. **Share board** copies `http://<LAN-IP>:<port>/#room=…` and a QR. That is never `127.0.0.1`.
5. Other machines on the incident LAN open the link in Edge or Chrome. They do not need the folder.
6. Ctrl+C or close the console to stop. Viewers keep whatever snapshot they already have.

First run: allow `node.exe` on a private network, inbound TCP 8787–8796. If someone allowlists publishers, they need **OpenJS Foundation / Node.js**. The folder includes this project’s `LICENSE` and Node’s `LICENSE-NODE.txt`.

Share board sends the editor’s GeoPDF to LAN viewers (bundled High Lava, or a file they added, max 20 MB). Anyone with the link can read that map.

A signed single-file `MedBoard-LAN.exe` is optional later (`electron:pack` plus a real code-signing cert). You do not need it for ICP.

On this development PC you can also run `npm.cmd run electron:dev`.

## Hosted board (PartyKit, then Pages)

This project’s live room is `med-dashboard-live.sandersruralem.partykit.dev`. `npx.cmd partykit deploy` updates that URL. Shared `partykit.dev` is not taking new custom hostnames; a new name would need [cloud-prem](https://docs.partykit.io/guides/deploy-to-cloudflare/) on a domain you already manage.

```powershell
cd C:\Cursor\Med_dashboard
npx.cmd partykit login
$env:CLOUDFLARE_ACCOUNT_ID = "<account-id>"
$env:CLOUDFLARE_API_TOKEN = "<api-token>"
npx.cmd partykit deploy
```

Use the printed hostname without `https://` or `wss://` as `VITE_PARTYKIT_HOST`. Leave the API token out of the repo.

Then Pages. Build command `npm run build`, output `dist`, production env `VITE_PARTYKIT_HOST` = that hostname. Trigger a new build after you change the variable.

Direct upload:

```powershell
cd C:\Cursor\Med_dashboard
npx.cmd wrangler login
$env:VITE_PARTYKIT_HOST = "med-dashboard-live.sandersruralem.partykit.dev"
npm.cmd run build
npm.cmd run pages:deploy
```

Login opens a browser. The deploy waits until you finish that. `public/_headers` and `public/_redirects` ride along in `dist/` so WASM and PDF files get the right types. Room ids stay in the hash (`#room=…`).

Smoke-test on **https://med-dashboard-8ov.pages.dev/**, not localhost. Click **Share board** on that origin so the editor key lands in that browser’s session storage. The copied link is `https://med-dashboard-8ov.pages.dev/#room=…`. A second window on that link is read-only. A localhost editor cannot control a Pages viewer, even if the room id looks the same.

Production `VITE_PARTYKIT_HOST` should not be a loopback or LAN IP.

## What the room sends

The live room carries map points, units, placements, and the editor’s GeoPDF. Bundled High Lava is a hash shortcut. A custom Add PDF is uploaded to the room (20 MB cap). Snapshots stay small (units and points). Anyone with the Share link can read the board and the map. Closing the editor tab does not promote a viewer. Save and Export are still the fallback if the network drops.

## Local two-terminal setup

```powershell
npm.cmd run dev
npm.cmd run party:dev
```

Share board rewrites `localhost` to this machine’s private IPv4. Live sockets use that IP on port 1999. If viewers cannot connect, check that PartyKit is up and that the firewall allows 5173 and 1999.

`/__lan` reports `live: "partykit-dev"` on Vite and `live: "same-origin"` on the USB server (one port, 8787). To point a local Vite build at the deployed PartyKit host, copy `.env.example` to `.env.local`, set `VITE_PARTYKIT_HOST`, and restart Vite.
