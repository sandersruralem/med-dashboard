# 1. Start of shift

You want one editor keyboard, the current ops GeoPDF facing north, and a unit list you trust before the radio gets busy.

Confirm you are the editor for this shift. Viewers stay read-only if you disconnect. Pick one path — the USB folder (`Start-MedBoard.cmd`) or the hosted HTTPS board — and stay on it. A localhost editor will not drive Pages viewers. If this is a new browser or laptop, have last shift’s Export JSON handy.

## USB at ICP

Copy the `MedBoard-LAN` folder from the stick (or unzip `MedBoard-LAN-portable.zip`). Copy it to the Desktop if the agency will not run programs from USB. Double-click `Start-MedBoard.cmd` and leave the console open. The board opens at this laptop’s LAN IP, port 8787 (or 8788–8796). If the firewall asks, allow `node.exe` on a private network for those ports. Packaging notes are in [HOSTING.md](../HOSTING.md).

## Hosted

Open [https://med-dashboard-8ov.pages.dev/](https://med-dashboard-8ov.pages.dev/) in Edge or Chrome on the editor machine. Click **Share board** on that same page so the editor key stays in this browser. The dialog shows the HTTPS link and a QR.

## Restore or import

Same browser as last shift may say it restored the last saved board. Look at units and Map points before you trust it. On a new machine, Import the JSON you exported last time — Units header for the table, Map points for the list. A known-good file beats rebuilding from memory under radio load.

## Check the map and table

Confirm the GeoPDF is today’s ops product (bundled sample or **Add PDF**). Zoom and pan only; the map stays true north. Open **Map points** and fix DP / H / ICP labels before you start moving units (chapter 2).

Scan fire names, ALS/BLS, and locations. Hide unused columns with the kebab if the pane is tight. Leave leader names and phones out of URLs and chat titles.

Before you call it ready: you are on the editor window (not a viewer link), the map is the right PDF and north is up, Map points look trustworthy, the unit list matches check-in or last Export, and you only hit **Share board** when MEDL or SITL actually need it (chapter 4).

Next: [Map and snap points](02-map-and-snap-points.md)
