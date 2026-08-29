# 6. Limits and handoff

This board tracks where medical resources are. It does not replace IWI logs, clinical notes, GAR, return-to-work, ICS 209 or other official status, REMS dual reporting, live GPS, NIFS, Event GDB, shapefiles, map rotation, or ILS.

Leave leader name, phone, and incident name out of URLs, folder names, and environment variables. A viewer link shows the same fields as an Export, including the ops map. Patient and PCR data do not belong here.

## Handoff

Save in the editor browser. Export units and map points and leave those files where the incoming RADO can find them. Brief which GeoPDF you are on, any labels you still dispute, who is still en route (yellow), and any Emergency toggles still on.

To keep live share going, leave this editor browser open, or start a new Share board after the incoming operator imports on their own editor window. Closing the editor does not promote a viewer. On the USB folder, closing the console stops the server — tell viewers the feed is ending; they keep what they already have.

At the end of the incident, Export a final copy for Planning or MEDL if your IMT wants it. Secure files that have leader phones. Do not leave Share board sitting on a public URL on an unattended machine.

## If something is off

| What you see | Try |
| --- | --- |
| Viewers cannot open the LAN link | Same Wi‑Fi? Firewall 8787–8796? IP and port from Share board? |
| “Live host is not configured” on Pages | Rebuild Pages with `VITE_PARTYKIT_HOST` set — [HOSTING.md](../HOSTING.md) |
| Viewer stuck empty or connecting | Editor Shared from that same origin; or Export/Import offline |
| Smart App Control blocks a custom exe | Use the USB folder (`Start-MedBoard.cmd` and official `node.exe`) |
| Marker did not move after you typed DP | Press **Arrive** or drop on the map |

Back: [Save, export, import](05-save-export-import.md) · Index: [Operator guide](README.md)
