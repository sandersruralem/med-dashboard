# 2. Map and snap points

**Map points** (the pane on the board) are the incident locations the unit table and markers attach to. Prefer a **correct, reviewable list** over a silent bad extract. The pane starts **collapsed** — click **Map points** to open it.

Categories follow [NWCG PMS 910](https://www.nwcg.gov/publications/pms910/nwcg-data-standards-pms-910) Event Point / Helispots naming and [PMS 936](https://www.nwcg.gov/publications/pms936/nwcg-standards-for-geospatial-operations-pms-936) point symbology. Do **not** invent new Event Point types in the field.

## Allowed snap types

| Typical label | Category |
| --- | --- |
| DP-12 | Drop Point |
| JCT-4 | Junction |
| H-3 | Helispot |
| UH-3 | Unimproved Helispot |
| Helibase | Helibase |
| ICP | ICP |
| Camp | Camp |
| Staging | Staging Area |
| Safety Zone | Safety Zone |
| Lookout | Lookout |
| Incident Base | Incident Base |

Import is **GeoPDF only**. There is no Event GDB, shapefile, GeoJSON sidecar, NIFS, or live GPS feed in this board.

## Review the point list

Use the Map points controls so only trustworthy points become snap targets:

- **Accept** — point may be used for location / closest-point dock
- **Reject** — keep it out of snap targets
- **Relabel** — fix DP/H/JCT naming before units rely on it
- **Add** — operator-added missed point (allowed)
- **Move** — relocate a point on the map when the symbol was wrong
- **Remove** / restore as the UI provides

The list sorts A–Z with numeric awareness (DP-2 before DP-10).

## Map placement rules

- **Never cover** an Event Point symbol with a unit marker. Markers use an **offset dock**; shared points use clock-style offsets.
- Dropping a unit on the map snaps to the **nearest accepted** MapPoint (geodesic).
- The map is **north-up only** — zoom and pan, no rotate.

## Daily / new GeoPDF

When Planning drops a new ops map:

1. Load the new GeoPDF (**Add PDF** on the map).
2. Re-review Map points for that product.
3. Resource placements stay in WGS84; update the map and points, do not wipe the unit table unless Import replaces units on purpose.

If **Share board** is already live, Add PDF replaces the room map. Viewers reload the new GeoPDF without a refresh; units stay on the board.

Next: [Units and movement](03-units-and-movement.md) · Back: [Start of shift](01-start-of-shift.md)
