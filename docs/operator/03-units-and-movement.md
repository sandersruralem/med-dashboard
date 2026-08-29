# 3. Units and movement

The table and the map share one placement store, so a location you type and a marker you drag cannot drift apart.

Ambulance, Line EMT, Line Paramedic, and REMS. Capability is ALS or BLS — no ILS.

Vendor, fire name, leader, phone, ALS/BLS, location, status, and Arrive / Emergency are the usual columns. Edit cells in place (editor only). The kebab shows or hides columns and remembers that in this browser. Drag the handle on the left, or Alt+arrows, to reorder. **Add resource** and **Remove units** are on the Units header. Leader name and phone are contact fields, not patient PHI, but still treat the Export file with care.

## Location

Type in the location cell. The list offers known points; free text is fine. Draft text does not commit until you confirm it. Common aliases: `dp12` → DP-12, `h3` or “helispot 3” → H-3, `uh3` → UH-3, `jct4` → JCT-4, “the ICP” → ICP.

Typing a destination does not move the marker while the unit is in transit. It stays at the source until you press **Arrive** or drop the marker on the map. A drop docks to the closest accepted map point and updates the cell.

## Colors

Blue and still at ICP or camp. Yellow pulse while en route. Green and still once they arrive somewhere else. Red overlay for Emergency — you toggle that; the board will not guess.

**Arrive** commits the move. **Emergency** is for care or emergency response. There are no patient or PCR fields here.

When they are dispatched, set the destination. When they report on scene, press Arrive (or drop them). That is what MEDL sees on a live viewer.

Next: [Live viewers](04-live-viewers.md) · Back: [Map and snap points](02-map-and-snap-points.md)
