# 5. Save, export, and import

Live Share board is convenience. **Save** and **Export** are how you survive a crashed browser, a new laptop, or lost WAN.

## Save (this browser)

- **Save** writes snap points and units into this browser’s storage (origin-scoped).
- Hosted Pages and LAN exe do **not** share the same storage — Export if you move machines.
- Success notice: snap points and units saved in this browser.

## Export

Use the section actions:

| Control | File contents |
| --- | --- |
| Snap list **Export** | Accepted / reviewed snap points JSON |
| Units **Export** | Unit rows and dock placements JSON |

Filenames are time-stamped. Leader names and phones are in the units file — keep it off casual shared drives if that matters.

## Import

- **Import** on the snap list replaces / loads snap points. A units file offered here will be rejected with a pointer to Units Import.
- **Import** on Units replaces the unit table and dock positions; snap points stay as they are unless you import a full board bundle that the parser accepts.
- Confirm the replace dialog before overwriting a good table under radio load.

## Recommended cadence

1. After check-in cleanup — Export units.
2. After snap review on a new GeoPDF — Export snap points.
3. Before shift handoff — Save + Export both.
4. If live viewers drop — you still have Export; viewers keep their last received snapshot only.

## Daily PDF replace

New ops GeoPDF: update the map and re-review points. Keep resource WGS84 placements unless you intentionally Import a different units file. See [Map and snap points](02-map-and-snap-points.md).

Next: [Limits and handoff](06-limits-and-handoff.md) · Back: [Live viewers](04-live-viewers.md)
