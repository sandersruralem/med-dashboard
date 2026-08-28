# 1. Start of shift

Goal: one editor keyboard at ICP, a north-up map with the current ops GeoPDF, and a clean unit list before traffic picks up.

## Before you open the board

- Confirm you are the **editor** for this shift (one RADO). Viewers do not get edit rights if you disconnect.
- Know whether you are using the **LAN USB folder** (`Start-MedBoard.cmd`) or the **hosted** HTTPS board. Do not mix an editor session from localhost with viewers on a different origin.
- Have yesterday’s **Export** JSON (units and/or snap points) on hand if this browser or laptop is new.

## Boot (LAN at ICP)

1. Copy the `MedBoard-LAN` folder from USB (or unzip `MedBoard-LAN-portable.zip`). If the agency blocks running from removable media, copy the folder to the Desktop first.
2. Double-click `Start-MedBoard.cmd`. Leave the console window open.
3. The board opens in the default browser at this laptop’s LAN IP (port **8787**, or the next free port through **8796**).
4. If Windows Firewall asks, allow **node.exe** on a **private** network for ports **8787–8796**.
5. Packaging details: [HOSTING.md](../HOSTING.md).

## Boot (hosted)

1. Open **https://med-dashboard-8ov.pages.dev/** in Edge/Chrome **on the editor machine** (not localhost).
2. Click **Share board** only from that same origin so the editor credential stays in this browser’s session storage. The dialog shows the HTTPS link and a QR code.

## Restore or import

- Same browser as last shift: the board may show **Restored the last saved board in this browser.** Review units and snap points before trusting it.
- New machine or empty board: use **Import** on the Units header and/or snap list with the JSON you exported last shift.
- Prefer a known-good Export over rebuilding the whole table from memory under radio load.

## Confirm the map

1. Confirm the GeoPDF basemap is the current ops product (bundled sample or load the incident PDF).
2. Zoom/pan only — the map stays **true north** (no rotation).
3. Open the snap list: accepted points are what the table and markers snap to. Fix labels before you start moving units (chapter 2).

## Confirm the unit table

1. Scan fire names, capability (ALS/BLS), and locations.
2. Hide unused columns with the column kebab if the pane is cramped.
3. Do **not** put leader phone or names into any URL or chat title when you share the board later.

## Ready checklist

- [ ] Editor window open; you are not on a viewer-only link
- [ ] Map shows the right GeoPDF and north is up
- [ ] Snap points reviewed enough to trust DP / H / ICP labels
- [ ] Units list matches check-in (or last Export)
- [ ] **Share board** only when MEDL/SITL need the live view (chapter 4)

Next: [Map and snap points](02-map-and-snap-points.md)
