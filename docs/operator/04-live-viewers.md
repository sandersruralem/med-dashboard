# 4. Live viewers

**Share board** gives MEDL, SITL, and others a live read-only copy of snap points, units, and placements. The GeoPDF file itself is **not** synced — each browser uses its own loaded or bundled map.

## Editor vs viewer

| | Editor (RADO) | Viewer |
| --- | --- | --- |
| Who | The browser that clicked **Share board** (or holds the editor key in session storage) | Anyone opening the copied `#room=…` link without that key |
| Can edit | Yes | No — **Live view — read only** |
| If editor closes | Room keeps last snapshot; **no viewer is promoted** | Keeps last received snapshot if disconnected |

Start a **new** Share board from the RADO’s saved/exported board if the editor session is lost.

## LAN (MedBoard-LAN.exe)

1. On the editor window, click **Share board**.
2. The copied link looks like `http://<this-laptop-LAN-IP>:<port>/#room=…` (port usually **8787**).
3. Viewers on the **same incident LAN** open that URL in Edge or Chrome.
4. Allow firewall inbound TCP **8787–8796** on the RADO machine if viewers cannot connect.

Do not put incident name, leader name, or phone in the link. The room id is opaque on purpose.

## Hosted (Cloudflare Pages + live room)

1. Open the **Pages HTTPS** URL as the editor (not localhost).
2. Click **Share board** so the editor key is stored on that origin.
3. Copied link is `https://<pages-host>/#room=…`.
4. A localhost editor does **not** control Pages viewers even if the room id looks similar.

Deploy details: [HOSTING.md](../HOSTING.md).

## Security mindset

Anyone with the viewer URL can read the board, including leader contact fields. Treat the link like the exported units JSON. Prefer incident LAN or a known HTTPS origin — not a public chat channel.

## Disconnect behavior

- Banner may show connecting / disconnected states.
- Viewers who never received a snapshot will not see your local autosave board (by design).
- Keep **Save** / **Export** as the WAN-loss fallback (chapter 5).

Next: [Save, export, import](05-save-export-import.md) · Back: [Units and movement](03-units-and-movement.md)
