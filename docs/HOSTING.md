# Hosting the live board

Operator field use (start of shift through handoff) lives in [operator/](operator/). Product summary and simplest run commands: [../README.md](../README.md).

The static React app and the PartyKit live-room server deploy separately. There is no application database and no login besides Cloudflare / PartyKit account access for you as the deployer.

**Order matters:** deploy the live room first, copy its hostname, set `VITE_PARTYKIT_HOST` on Pages, then build Pages. Vite bakes that variable into the JavaScript at `npm run build`. Changing the env var later requires a new Pages build.

Do not put an editor key, incident name, leader name, or phone number in `VITE_PARTYKIT_HOST` or in any deployed URL.

On Windows PowerShell, if `npx` / `npm` fail with **running scripts is disabled**, use `npx.cmd` and `npm.cmd` instead. Do not change ExecutionPolicy for this. Run commands from the project directory.

## 1. Deploy the live room (cloud-prem)

This project’s live room is already on PartyKit at `med-dashboard-live.sandersruralem.partykit.dev` (`npx.cmd partykit deploy` updates that URL). Shared `partykit.dev` has hit Cloudflare’s custom-domain cap for **new** projects; a new hostname would need [cloud-prem](https://docs.partykit.io/guides/deploy-to-cloudflare/) on a domain you manage:

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
$env:VITE_PARTYKIT_HOST = "med-dashboard-live.sandersruralem.partykit.dev"
npm.cmd run build
npm.cmd run pages:deploy
```

`partykit login` and `wrangler login` open a browser. Deploy commands will sit on “Attempting to login…” until that consent finishes. You cannot use a localhost editor session to control a Pages viewer.

`public/_headers` and `public/_redirects` copy into `dist/` so `.wasm` / PDF assets get the right types and a non-hash path still serves `index.html`. Room IDs still live in the URL hash (`#room=…`).

## 3. Smoke test on the Pages URL

Use the HTTPS Pages origin **https://med-dashboard-8ov.pages.dev/**, not `localhost`.

- Map, table, and bundled GeoPDF load.
- Save / export / import still work (`localStorage` is per origin; production starts empty until you import or place units).
- **Share board** copies `https://med-dashboard-8ov.pages.dev/#room=…` (not a LAN IP) and shows a QR for that same HTTPS URL.
- A second browser or incognito window with that link is read-only and receives snapshot updates.
- The viewer cannot push changes. Closing the editor tab does not promote a viewer.

**Share board must be clicked on the Pages origin.** The editor credential is stored in that origin’s `sessionStorage`. A localhost editor does not control a Pages viewer, even if the room id looks the same.

## Live-room operating notes

- Anyone with the viewer URL can read the board, including leader contact fields. Treat it like the exported unit JSON.
- Closing the editor tab ends that editor session; the room keeps its last snapshot for viewers. Start a new shared room from the RADO’s locally saved board if needed.
- Keep using Save/Export as the WAN-loss fallback. Viewers retain the last snapshot they received while disconnected.
- The room syncs map points, units, placements, and the editor’s GeoPDF (bundled High Lava is a hash shortcut; a custom Add PDF is uploaded to the room, max 20 MB). Anyone with the Share link can read that map. Leader names and phones still must not go in the URL.

## LAN USB folder (ICP laptop)

An unsigned custom `.exe` will be blocked by Smart App Control on typical Windows 11 PCs. The field artifact is a **folder** whose only executable is official **Node for Windows x64** (OpenJS-signed). The RADO double-clicks a `.cmd`; the board opens in the default browser.

Build on a development computer (needs network once to fetch Node **22.18.0**):

```powershell
cd C:\Cursor\Med_dashboard
npm.cmd run portable:pack
```

Field download: the versioned zip on the [GitHub Releases](https://github.com/sandersruralem/med-dashboard/releases) page (v2.1.1 is `MedBoard-LAN-2.1.1-portable.zip`). Or unzip `release/MedBoard-LAN-portable.zip` after a local pack. Copy the whole `MedBoard-LAN` folder to a USB stick. On the ICP laptop:

1. If the agency blocks running from removable media, copy the folder to the Desktop first.
2. Double-click `Start-MedBoard.cmd`. Leave the console window open.
3. The board opens at `http://<DHCP-IPv4>:8787` when this computer has a LAN address (otherwise `http://127.0.0.1:8787`). Port may be 8788–8796 if 8787 is busy.
4. **Share board** copies `http://<DHCP-IPv4>:<port>/#room=…` (never `127.0.0.1`) and shows a QR code for phones on the same LAN.
5. Other laptops on the incident LAN open that link in Edge or Chrome (read-only). They do not need the folder.
6. Ctrl+C or close the console to stop. Viewers keep the last snapshot they already received.

First run: allow **private** network for `node.exe`, inbound TCP **8787–8796**. If an agency allowlists publishers, they must allow **OpenJS Foundation / Node.js**.

Do not put an editor key, incident name, leader name, or phone number in the folder name, `.cmd`, zip name, or copied URL. Share board also sends the editor’s GeoPDF to LAN viewers (same 20 MB cap). The v2.1.1 USB zip is the field artifact that includes that path.

### This development PC

Node is already installed. A desktop window (Electron) is fine here:

```powershell
npm.cmd run electron:dev
```

### If you later have a code-signing certificate

Then you can ship a single signed `MedBoard-LAN.exe` again (`npm run electron:pack` plus Azure Trusted Signing or an Authenticode `.pfx`). That is optional and not required for the USB folder.

Cloudflare Pages + PartyKit stay the WAN path. Do **not** set production `VITE_PARTYKIT_HOST` to a loopback or LAN IP.

## Local development (LAN)

Install dependencies, then run Vite and PartyKit in separate terminals:

```sh
npm run dev
npm run party:dev
```

On the Vite+PartyKit dev path, Share board replaces `localhost` with this machine’s private IPv4 in the copied URL, and live sockets use that same IP on port 1999. `/__lan` reports `live: "partykit-dev"` on the Vite server and `live: "same-origin"` on the USB folder server (one port, 8787).

If viewers cannot connect in this two-terminal setup, confirm PartyKit is listening (`npm run party:dev`) and that Windows Firewall allows inbound TCP 5173 and 1999.

Do **not** set production `VITE_PARTYKIT_HOST` to a loopback or LAN IP. For a local override against a deployed PartyKit host, copy `.env.example` to `.env.local`, set `VITE_PARTYKIT_HOST`, and restart Vite.
