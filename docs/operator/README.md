# Operator guide — wildfire incident use

Field checklist for running **Med Dashboard** as a location and movement board at ICP. Primary editor is the **RADO** (or similar). MEDL/SITL and others use **Share board** for a read-only live view.

This is **not** IWI documentation, GAR, return-to-work, PCR, or an ICS form system.

## Chapters

1. [Start of shift](01-start-of-shift.md) — boot the board, restore or import, confirm the map
2. [Map and snap points](02-map-and-snap-points.md) — GeoPDF, review Accept/Reject/Add/Move, PMS categories
3. [Units and movement](03-units-and-movement.md) — table, Arrive, colors, aliases, Emergency
4. [Live viewers](04-live-viewers.md) — Share board, LAN vs hosted, read-only rules
5. [Save, export, import](05-save-export-import.md) — browser Save, JSON files, daily PDF replace
6. [Limits and handoff](06-limits-and-handoff.md) — out of scope, shift change, closing the app

## Quick links

- Product summary and install: [../../README.md](../../README.md)
- Packaging, firewall, cloud deploy: [../HOSTING.md](../HOSTING.md)
- Spec decisions: [../../PLANNING.md](../../PLANNING.md)

## GIS references (map decisions)

- [NWCG PMS 910](https://www.nwcg.gov/publications/pms910/nwcg-data-standards-pms-910) — Event Point / Helispots **names** and WGS84
- [PMS 936](https://www.nwcg.gov/publications/pms936/nwcg-standards-for-geospatial-operations-pms-936) / [PMS 936-1](https://www.nwcg.gov/publications/pms936-1/nwcg-geographic-information-system-specialist-giss-workflow-pms-936-1) — GeoPDF production and point symbology
