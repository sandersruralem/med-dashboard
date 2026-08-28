# 3. Units and movement

Track where medical resources **are** and where they are **going**. Markers and the Units table stay in one placement store so they cannot diverge.

## Marker kinds

| Marker | Meaning |
| --- | --- |
| Ambulance | Ground ambulance |
| Firefighter | Line EMT / medic |
| Off-road pickup | REMS |

Capability is **ALS** or **BLS** only (no ILS).

## Table columns

Typical fields: vendor/organization, fire-specific name, leader name, leader phone, ALS/BLS, location, status, Arrive / Emergency actions.

- Edit cells in place (editor only).
- Column kebab shows/hides columns (saved in this browser).
- Drag the handle (or Alt+arrows) to reorder rows.
- **Add resource** / **Remove units** as needed.

Leader name and phone are personnel contact fields — not patient PHI — but still treat Export files carefully.

## Location (two-way)

- Type a destination in the location cell (combobox + free text). Draft text does not commit until you confirm the value.
- Aliases normalize, for example:
  - `dp12` → DP-12
  - `h3` / “helispot 3” → H-3
  - `uh3` → UH-3
  - `jct4` → JCT-4
  - “the ICP” / `icp` → ICP
- **Typing a destination does not move the map marker** while the unit is in transit. The marker stays at the **source** until **Arrive** (or you drop the marker on the map).
- Dragging a marker to the map docks to the closest accepted map point and updates location.

## Movement colors (locked)

| State | Color | Behavior |
| --- | --- | --- |
| At ICP / camp | Blue | Static |
| En route / moving | Yellow | Subtle pulse |
| Arrived at other location | Green | Static |
| Emergency / care | Red overlay | Manual toggle — not automatic |

## Arrive and Emergency

- **Arrive** — commit the move: marker jumps to the destination / docked point.
- **Emergency** — red overlay for care / emergency response. Toggle manually. **No patient or PCR fields** on this board.

## Radio traffic tip

Update destination when the unit is dispatched; press **Arrive** when they report on scene (or when you drop them on the map). That keeps the board honest for MEDL looking at a live viewer.

Next: [Live viewers](04-live-viewers.md) · Back: [Map and snap points](02-map-and-snap-points.md)
