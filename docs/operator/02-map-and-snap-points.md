# 2. Map and snap points

**Map points** is the list of incident locations the table and markers attach to. The pane starts collapsed — click the heading to open it. A short, correct list beats a clever extract that mislabels a drop point.

Names follow [NWCG PMS 910](https://www.nwcg.gov/publications/pms910/nwcg-data-standards-pms-910) Event Point / Helispots and [PMS 936](https://www.nwcg.gov/publications/pms936/nwcg-standards-for-geospatial-operations-pms-936) symbology. Stick to the types below. Ask before adding a new category.

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

Import is GeoPDF only. There is no Event GDB, shapefile, GeoJSON sidecar, NIFS, or live GPS on this board.

## Review

Open Map points and only accept what you trust:

- **Accept** — table and markers may snap here
- **Reject** — leave it out of snap targets
- **Relabel** — fix DP / H / JCT naming before units depend on it
- **Add** — a missed point you place yourself
- **Move** — the symbol was in the wrong spot
- **Remove** / restore as the buttons provide

The list sorts A–Z with numbers in order (DP-2 before DP-10).

Unit markers sit on an offset dock so they do not cover the Event Point symbol. Shared points use clock-style offsets. Dropping a unit snaps to the nearest accepted point. The map is north-up only.

## New ops PDF

When Planning drops a new map, use **Add PDF**, then re-review Map points. Resource positions stay in WGS84. Leave the unit table alone unless you mean to Import a different units file.

If Share board is already live, Add PDF replaces the room map. Viewers pick up the new file without a refresh. Units stay on the board.

Next: [Units and movement](03-units-and-movement.md) · Back: [Start of shift](01-start-of-shift.md)
