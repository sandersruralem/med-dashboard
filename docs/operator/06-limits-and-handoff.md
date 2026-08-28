# 6. Limits and handoff

## What this board is not

Do not use Med Dashboard as a substitute for:

- IWI event logging or clinical documentation
- GAR or return-to-work workflows
- ICS form generation or official resource status (ICS 209, etc.)
- REMS dual reporting systems
- Live GPS / NIFS / Event GDB / shapefile import
- Map rotation or ILS capability tracking

It is a **location and movement board** for one editor and optional read-only viewers.

## Privacy and OPSEC

- No leader name, phone, or incident name in URLs, exe names, or environment variables.
- Viewer links expose board fields — treat like Export JSON.
- Patient / PCR fields do not belong on this product.

## Shift handoff

1. **Save** in the editor browser.
2. **Export** units and snap points; leave files where the incoming RADO can find them.
3. Brief: which GeoPDF, any disputed snap labels, units still en route (yellow), any Emergency (red) toggles still on.
4. If live share must continue: keep the **same editor browser/session** open, or start a **new Share board** after the incoming operator restores/imports on their editor window. Closing the editor does not promote a viewer.
5. LAN exe: closing `MedBoard-LAN.exe` stops the server. Tell viewers the live feed will end; they retain the last snapshot already received.

## End of incident / laptop leave

- Export final units + snaps for Planning / MEDL records as your IMT requires.
- Clear or secure Export files that contain leader phones.
- Do not leave an open Share board on an unattended public URL.

## When something breaks

| Symptom | What to try |
| --- | --- |
| Viewers cannot open LAN link | Same Wi‑Fi/LAN? Firewall 8787–8796? Correct IP and port from Share board? |
| “Live host is not configured” on hosted build | Rebuild Pages with `VITE_PARTYKIT_HOST` set — [HOSTING.md](../HOSTING.md) |
| Viewer sees empty / connecting forever | Editor must have Shared from that origin; wait for sync or Export/Import offline |
| Smart App Control blocks exe | Signed build or `electron:dev` — [HOSTING.md](../HOSTING.md) |
| Marker “didn’t move” after typing DP | Press **Arrive** or drop on the map — type alone keeps marker at source while en route |

Back: [Save, export, import](05-save-export-import.md) · Index: [Operator guide](README.md)
