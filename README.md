# Wildfire Medical Resource Tracking (WMRT)

A two-pane board for tracking ambulances, EMTs, and REMS on a wildfire incident. You load a GISS GeoPDF, mark the points you trust, and keep units on a north-up map next to a live table. One person at ICP edits (usually the RADO). Everyone else can watch a read-only Share link.

This is a location board, not IWI documentation, ICS forms, or a clinical system. Point names follow [NWCG PMS 910](https://www.nwcg.gov/publications/pms910/nwcg-data-standards-pms-910) and [PMS 936](https://www.nwcg.gov/publications/pms936/nwcg-standards-for-geospatial-operations-pms-936). Import is GeoPDF only.

Markers stay put while a unit is en route and move when you press Arrive or drop them on the map. Colors are blue at ICP/camp, yellow while moving, green once they arrive somewhere else, and red if you toggle Emergency. Capability is ALS or BLS.

## On an incident

Grab the latest `MedBoard-LAN-portable.zip` from [Releases](https://github.com/sandersruralem/med-dashboard/releases/latest). Unzip it and copy the `MedBoard-LAN` folder onto the RADO laptop. If the agency will not run programs from a USB stick, copy the folder to the Desktop first.

Double-click `Start-MedBoard.cmd` and leave that console open. The board opens in the default browser at `http://<this-laptop’s-LAN-IP>:8787` (8788–8796 if 8787 is taken). Click **Share board** and send the copied link or QR to phones and other laptops on the same network. The link looks like `http://<LAN-IP>:<port>/#room=…` — never `127.0.0.1`. Viewers get the same GeoPDF you are using. They do not need the folder.

If Windows Firewall asks, allow `node.exe` on a private network for TCP 8787–8796. The only executable in the folder is official Node for Windows.

For a hosted shift, open [https://med-dashboard-8ov.pages.dev/](https://med-dashboard-8ov.pages.dev/) on the editor machine and click **Share board** from that page. A localhost editor will not drive Pages viewers.

Anyone with the viewer link can read the unit table (including leader contact) and the ops map. Treat it like an exported units file. Leave incident name, leader name, and phone out of the URL.

Shift steps live in [docs/operator/](docs/operator/). How to rebuild the USB folder or redeploy Pages is in [docs/HOSTING.md](docs/HOSTING.md).

## On a development PC

PowerShell often blocks `npm` / `npx` scripts. Use `npm.cmd` and `npx.cmd` instead.

```powershell
cd C:\Cursor\Med_dashboard
npm.cmd install
npm.cmd run dev
```

In a second terminal:

```powershell
npm.cmd run party:dev
```

`npm.cmd run electron:dev` opens a desktop window if you already have Node. The thing you take to ICP is still the USB folder, not an unsigned `.exe`.

## License

[PolyForm Noncommercial 1.0.0](LICENSE). You can run, copy, and fork this for non-commercial incident work. Keep the copyright and license notices. See `LICENSE` for the legal text.
