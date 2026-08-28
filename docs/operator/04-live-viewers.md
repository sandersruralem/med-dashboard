# 4. Live viewers

**Share board** gives MEDL, SITL, and others a live read-only copy of snap points, units, placements, and the **same GeoPDF** the editor is using (bundled High Lava or a PDF they added). Viewers tile that file locally. Anyone with the link can read the ops map.

## Editor vs viewer

| | Editor (RADO) | Viewer |
| --- | --- | --- |
| Who | The browser that clicked **Share board** (or holds the editor key in session storage) | Anyone opening the copied `#room=…` link without that key |
| Can edit | Yes | No — **Live view — read only** |
| If editor closes | Room keeps last snapshot; **no viewer is promoted** | Keeps last received snapshot if disconnected |

Start a **new** Share board from the RADO’s saved/exported board if the editor session is lost.

## LAN (USB folder)

1. On the editor browser that `Start-MedBoard.cmd` opened, click **Share board**.
2. The dialog shows a QR code and a link like `http://<this-laptop-LAN-IP>:<port>/#room=…` (port usually **8787**). It is never `127.0.0.1`.
3. Viewers on the **same incident LAN** open that URL or scan the QR in Edge or Chrome.
4. Allow firewall inbound TCP **8787–8796** on the RADO machine if viewers cannot connect.

Do not put incident name, leader name, or phone in the link. The room id is opaque on purpose.

## Hosted (Cloudflare Pages + live room)

1. Open **https://med-dashboard-8ov.pages.dev/** as the editor (not localhost).
2. Click **Share board** so the editor key is stored on that origin. The dialog shows the HTTPS link and QR.
3. Copied link is `https://med-dashboard-8ov.pages.dev/#room=…`.
4. A localhost editor does **not** control Pages viewers even if the room id looks similar.

Live sockets use the PartyKit host configured at build time (see [HOSTING.md](../HOSTING.md)). Do not put that hostname in a chat title with incident or leader details.

Deploy details: [HOSTING.md](../HOSTING.md).

## Security mindset

Anyone with the viewer URL can read the board, including leader contact fields and the shared ops map. Treat the link like the exported units JSON. Prefer incident LAN or a known HTTPS origin — not a public chat channel.

## Disconnect behavior

- Banner may show connecting / disconnected states.
- Viewers who never received a snapshot will not see your local autosave board (by design).
- Keep **Save** / **Export** as the WAN-loss fallback (chapter 5).

Next: [Save, export, import](05-save-export-import.md) · Back: [Units and movement](03-units-and-movement.md)
