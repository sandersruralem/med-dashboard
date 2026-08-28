# Med Dashboard

Two-pane **wildfire incident medical resource board**: a GISS geospatial PDF on a north-up map, plus a live table of ambulances, EMTs, and REMS. One **RADO** edits at ICP; MEDL/SITL can open a **read-only** live view.

This is a **location and movement board** (typically 5–50 resources). It is not a clinical decision engine, ICS form replacement, or IWI / GAR / return-to-work system.

**Locked GIS vocabulary:** [NWCG PMS 910](https://www.nwcg.gov/publications/pms910/nwcg-data-standards-pms-910) Event Point / Helispots names; [PMS 936](https://www.nwcg.gov/publications/pms936/nwcg-standards-for-geospatial-operations-pms-936) GeoOps and point symbology. Import path is **GeoPDF only**.

## Who uses it

| Role | Mode |
| --- | --- |
| RADO (or similar) at ICP | Editor — keyboard and Share board |
| MEDL / SITL / others on the incident LAN or hosted URL | Viewer — read-only live snapshot |

## What you get

- GeoPDF basemap with reviewable map points (Drop Point, Junction, Helispot, Unimproved Helispot, Helibase, ICP, Camp, Staging, Safety Zone, Lookout, Incident Base)
- Unit markers (ambulance, firefighter/EMT, REMS) that **stay at source while en route** and move on **Arrive** or map drop
- Movement colors: blue (ICP/camp), yellow pulse (en route), green (arrived elsewhere), red (emergency/care — manual)
- Capability **ALS / BLS** only
- Save / Export / Import for map points and units; optional live Share board (no leader name or phone in the URL)
- Share board also sends the editor’s GeoPDF (bundled High Lava, or a file they added, max 20 MB)

## Run simply (field)

Download **`MedBoard-LAN-portable.zip`** from the [latest GitHub Release](https://github.com/sandersruralem/med-dashboard/releases/latest) (or build it on a development PC with `npm.cmd run portable:pack`).

Copy the `MedBoard-LAN` folder to the RADO laptop (USB is fine). If the agency blocks running from removable media, copy the folder to the Desktop first. Double-click `Start-MedBoard.cmd` and leave the console open:

1. The board opens in the default browser at `http://<this-laptop-LAN-IP>:8787` (or the next free port through **8796**).
2. Click **Share board**. The copied link is `http://<LAN-IP>:<port>/#room=…` (never `127.0.0.1`) and includes the same GeoPDF the editor is using.
3. Viewers on the incident LAN open that link or scan the QR. They do not need the folder.
4. Closing the console stops the server. Viewers keep the last snapshot they already received.

Allow inbound TCP **8787–8796** if Windows Firewall prompts. The only executable in the folder is official **Node for Windows** (OpenJS-signed). See [docs/HOSTING.md](docs/HOSTING.md).

**Hosted (WAN):** open **https://med-dashboard-8ov.pages.dev/** as the editor and click **Share board** from that origin only. A localhost editor does not control Pages viewers.

## Run simply (developers)

PowerShell may block `npm` / `npx` scripts; use `npm.cmd` / `npx.cmd`.

```powershell
cd C:\Cursor\Med_dashboard
npm.cmd install
npm.cmd run electron:dev
```

Or the two-terminal Vite + PartyKit path:

```powershell
npm.cmd run dev
npm.cmd run party:dev
```

`electron:dev` is optional on a machine that already has Node. The field package for ICP is the USB folder, not an unsigned `.exe`.

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/operator/](docs/operator/) | **How to use the board on a wildfire incident** (start of shift through handoff) |
| [docs/HOSTING.md](docs/HOSTING.md) | USB folder packaging, firewall, Cloudflare Pages + PartyKit |
| [PLANNING.md](PLANNING.md) | Living product and GIS decisions |
| [docs/samples/geopdf/](docs/samples/geopdf/) | Sample ops GeoPDF notes |

## Privacy

Do not put incident name, leader name, or phone in URLs, folder names, zip names, or env vars. Anyone with a viewer link can read the board (including leader contact) and the **shared ops map** — treat the link like exported unit JSON.
