# Phase 0 builder decisions

Companion: [`PLANNING.md`](../PLANNING.md), [`.cursor/rules/wildfire-medical-tracker.mdc`](../.cursor/rules/wildfire-medical-tracker.mdc).

SME Sessions A/B are logged in PLANNING.md §11. Rotation is **out**. G2/G3 are locked. G1: confirm the sample PDF is on disk in [`docs/samples/geopdf/`](samples/geopdf/).

---

## Locked product defaults

| Topic | Decision |
| --- | --- |
| Incidents | One active incident / one PDF edition at a time |
| Markers | Operator-placed, not GPS |
| Geospatial input | GeoPDF only |
| Snap targets | DP, Junction, Helispot, Unimproved Helispot, Helibase, ICP, Camp, Staging, Safety Zone, Lookout, Incident Base |
| Add missed points | Yes |
| Daily PDF replace | Keep resource WGS84 placements; update map/points |
| Map gestures | Zoom and pan. **True north only. No rotation.** |
| Closest point | On drop = nearest accepted MapPoint (geodesic) |
| Visual snap | Offset dock; never cover the ICS symbol |
| Location cell | **Free text** + aliases; combobox of known labels still helps |
| En route | Marker **stays at source**; destination is intent; move on **arrival** |
| Drag commit | Mouse-up only |
| Capability | ALS / BLS only (no ILS) |
| Colors | Blue ICP/camp; yellow + pulse in transit; green arrived elsewhere; red emergency overlay |
| Operators | One; 5–50 resources |
| PII | Leader name/phone; not in URLs; no PCR |

---

## Two-way location (implementation contract)

`ResourcePlacement.at_point_id` = where the marker is. `destination` = typed intent.

1. **Table commit (en route):** set `destination` only. Do not move the marker.
2. **Arrival:** resolve destination to a MapPoint if possible; set `at_point_id`; dock offset; clear or keep dest as current label.
3. **Map drop:** nearest MapPoint → `at_point_id` + label; treat as arrival.

One placement store. Equidistant: nearest geodesic, then stable label sort.

---

## Stack (Phase 1 start)

Logged 2026-08-25:

| Layer | Choice | Why |
| --- | --- | --- |
| UI | **Vite + React + TypeScript** | One language for types and UI |
| Map | **Leaflet** (north-up) | Rotation no longer required |
| State | Client **in-memory** store | One operator; persistence is Phase 4 |
| PDF | File upload in UI; georegister/extract after sample is on disk | G1 bytes still need confirming |

**Still open (#14):** in-browser `pdf.js` + proj4 vs server GDAL/PDFium — decide after opening the sample PDF.

---

## GeoPDF pipeline (after file is on disk)

1. Prove georegistration: page (x, y) → WGS84.
2. Extract positioned text; match snap-target labels.
3. GeoPDF/OCG attributes if present.
4. Review UI before snap targets go live.

---

## What not to scaffold

- Event GDB / NIFS / shapefile / GPS
- IWI, GAR, RTW, dual reporting, ICS form engines
- Map rotation
- ILS
- Auth/multi-user
