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

- GeoPDF basemap with reviewable snap points (Drop Point, Junction, Helispot, Unimproved Helispot, Helibase, ICP, Camp, Staging, Safety Zone, Lookout, Incident Base)
- Unit markers (ambulance, firefighter/EMT, REMS) that **stay at source while en route** and move on **Arrive** or map drop
- Movement colors: blue (ICP/camp), yellow pulse (en route), green (arrived elsewhere), red (emergency/care — manual)
- Capability **ALS / BLS** only
- Save / Export / Import for snap points and units; optional live Share board (no leader name or phone in the URL)

## Run simply (field)

On a development PC with Node installed, build the portable Windows exe once:

```powershell
cd C:\Cursor\Med_dashboard
npm.cmd install
npm.cmd run electron:pack
```

Copy `release/MedBoard-LAN.exe` to the RADO laptop (USB is fine). Double-click it:

1. The board opens in a desktop window (local server on port **8787**, or the next free port through **8796**).
2. Click **Share board** and send the copied LAN link to viewers on the same network.
3. Closing the exe stops the server. Viewers keep the last snapshot they already received.

Allow inbound TCP **8787–8796** if Windows Firewall prompts. Unsigned builds may be blocked by Smart App Control — see [docs/HOSTING.md](docs/HOSTING.md).

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

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/operator/](docs/operator/) | **How to use the board on a wildfire incident** (start of shift through handoff) |
| [docs/HOSTING.md](docs/HOSTING.md) | LAN exe packaging, firewall, Smart App Control / signing, Cloudflare Pages + PartyKit |
| [PLANNING.md](PLANNING.md) | Living product and GIS decisions |
| [docs/samples/geopdf/](docs/samples/geopdf/) | Sample ops GeoPDF notes |

## Privacy

Do not put incident name, leader name, or phone in URLs, exe names, or env vars. Anyone with a viewer link can see board fields (including leader contact) — treat the link like exported unit JSON.
