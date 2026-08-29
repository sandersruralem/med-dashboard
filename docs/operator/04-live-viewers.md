# 4. Live viewers

**Share board** gives MEDL, SITL, and anyone else a live read-only copy of map points, units, and the same GeoPDF you are using (bundled High Lava or a PDF you added). They tile that file in their own browser. The person who clicked Share board is the editor. Everyone else on the `#room=…` link is a viewer.

If you close the editor, the room keeps the last snapshot. No viewer is promoted. Start a new Share from the RADO’s saved or exported board if that session is gone.

## USB folder

In the browser that `Start-MedBoard.cmd` opened, click **Share board**. You get a QR and a link like `http://<this-laptop-LAN-IP>:<port>/#room=…` (usually port 8787). It will not be `127.0.0.1`. Viewers on the same incident LAN open that URL in Edge or Chrome. If they cannot connect, allow inbound TCP 8787–8796 on the RADO machine.

The room id is opaque on purpose. Leave incident name, leader name, and phone out of the link.

## Hosted

Open [https://med-dashboard-8ov.pages.dev/](https://med-dashboard-8ov.pages.dev/) as the editor — not localhost — and click **Share board** there. The copied link is `https://med-dashboard-8ov.pages.dev/#room=…`. A localhost editor will not control Pages viewers even if the room id looks similar. How the PartyKit host gets into the build is in [HOSTING.md](../HOSTING.md).

Anyone with the viewer URL can read leader contact fields and the ops map. Treat the link like exported units JSON. Prefer the incident LAN or that known HTTPS origin over a public chat channel.

Banners show connecting or disconnected. A viewer who never got a snapshot will not see your local autosave. Keep Save and Export for when the network drops (chapter 5).

Next: [Save, export, import](05-save-export-import.md) · Back: [Units and movement](03-units-and-movement.md)
