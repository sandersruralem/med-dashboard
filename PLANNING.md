# Wildfire Incident Medical Resource Tracker — Planning

Living spec. Captures what is decided, drafted, and still open. Companion to [`.cursor/rules/wildfire-medical-tracker.mdc`](.cursor/rules/wildfire-medical-tracker.mdc) (guardrails), [`docs/phase-0-sme-packet.md`](docs/phase-0-sme-packet.md), and [`docs/phase-0-builder-decisions.md`](docs/phase-0-builder-decisions.md).

**Legend:** ✅ Confirmed · 🟡 Draft (needs confirmation) · ❓ Open question

---

## 1. Overview ✅

A **dynamic two-pane web app** for tracking medical resources on a US wildfire incident. An operator imports a GISS **geospatial PDF**, the app extracts incident map points, and the operator places **ambulances, EMTs, and REMS** on the map. A live table stays in **two-way sync** with those markers.

v1 is a **location and movement board**, not a clinical decision engine, not an ICS form replacement, and not an IWI/GAR/return-to-work system.

**Locked import path:** GeoPDF only. No Event GDB, shapefile, GeoJSON sidecar, or NIFS feed in v1.

GIS **vocabulary and point categories** come from [NWCG Data Standards, PMS 910](https://www.nwcg.gov/publications/pms910/nwcg-data-standards-pms-910) (Wildland Fire Event Point, Helispots) and [PMS 936 point symbology](https://www.nwcg.gov/publications/pms936/symbology/pms-936-point-feature-symbology). How GISS produces the PDF is [PMS 936 GeoOps](https://www.nwcg.gov/publications/pms936/nwcg-standards-for-geospatial-operations-pms-936) / [PMS 936-1](https://www.nwcg.gov/publications/pms936-1/nwcg-geographic-information-system-specialist-giss-workflow-pms-936-1).

PMS 552 / PMS 350-39 are **optional later-phase domain**, not v1 scope.

**Primary operator:** RADO (or similar) at ICP. One operator. Typical load 5–50 resources.

---

## 2. Domain Glossary

### GIS & map products

| Term | Meaning |
| --- | --- |
| **PMS 910** | NWCG data-element and geospatial-layer catalog. Defines Event Point, Helispots, etc. Not a PDF schema. |
| **PMS 936 / GeoOps** | Standards for incident GIS products and services (GISS work). |
| **PMS 936-1** | GISS workflow. Includes exporting a Geospatial PDF from the Master Incident GDB. |
| **Event Point** | NWCG incident point features. **Naming standard in v1** — we do not import the Event GDB. |
| **Event GDB / NIFS** | Where GISS stores Event Points. **Not a v1 input.** |
| **Geospatial PDF / GeoPDF** | Georegistered PDF map product (Avenza / briefing / IAP). **Only geospatial input in v1.** |
| **GISS** | Geographic Information System Specialist (Planning / Situation). |
| **SITL** | Situation Unit Leader. |
| **WGS84** | Coordinate convention for stored MapPoints once the PDF is georegistered. |

### Incident points — snap targets ✅

| Label pattern | Category |
| --- | --- |
| **DP-12** (etc.) | Drop Point |
| **JCT-4** (etc.) / Junction | Junction (PMS 910 Event Point) |
| **H-3** (etc.) | Helispot |
| **UH-3** (etc.) / Unimproved Helispot | Unimproved helispot (PMS 936 helispot class) |
| **Helibase** | Helibase |
| **ICP** | Incident Command Post |
| **Camp** | Camp (spike camp, base camp) |
| **Staging** | Staging Area |
| **Safety Zone** | Safety Zone |
| **Lookout** | Lookout |
| **Incident Base** | Incident Base |

Operator may **add** a missed point. Aliases: `dp12` → `DP-12`, “helispot 3” → `H-3`, `uh3` → `UH-3`, `jct4` → `JCT-4`, “the ICP” → `ICP`.

### Medical resources (v1 marker classes) ✅

| Marker | Meaning |
| --- | --- |
| **Ambulance** | Ground ambulance (capability ALS / BLS) |
| **Firefighter** | Line EMT / medic |
| **Off-road pickup** | REMS |

| Term | Meaning |
| --- | --- |
| **ALS / BLS** | Advanced / Basic Life Support — table capability. **ILS removed** (Session A). |
| **RADO** | Radio Operator — primary keyboard at ICP |
| **MEDL** | Medical Unit Leader |
| **ICP** | Incident Command Post |

---

## 3. Product vision (v1) ✅

```mermaid
flowchart LR
  pdf[Geospatial PDF]
  geo[Georegister page to WGS84]
  extract[Extract labeled points]
  review[Operator review]
  map[Map markers]
  table[Location column]
  pdf --> geo
  geo --> extract
  extract --> review
  review --> map
  map -->|"drag drop: closest point"| table
  table -->|"type dest; move on arrival"| map
```

### Layout

- **Map pane (~2/3):** zoom and pan. **True north locked — no rotation** (Session B). Imported GeoPDF is the basemap. Overlay extracted incident points and **draggable** resource markers.
- **Table pane (~1/3):** one row per medical resource.

### Table columns ✅

| Column | Notes |
| --- | --- |
| Vendor / organization | |
| Fire-specific name | Incident call sign / local name |
| Leader name | Personnel PII — not patient PHI |
| Leader phone | Personnel PII |
| ALS / BLS | Capability (no ILS) |
| Current location | **Two-way** — see §5. Free text allowed. |

Rows are **color-coded** by movement state (§6). **Red** when providing care or responding to an emergency (manual toggle).

### Marker set ✅

- Wildland firefighter — EMT / line medic
- Ambulance
- Off-road pickup — REMS

---

## 4. GIS import — GeoPDF only ✅

v1 **never** reads Event GDB, shapefile, GeoJSON sidecar, or NIFS.

| Standard | Role in v1 |
| --- | --- |
| **Wildland Fire Event Point** | Category names and meaning |
| **Helispots** + WGS84 lat/lon elements | Store extracted coordinates as WGS84 |
| **PMS 936 point symbology** | What to look for on the PDF; do not invent icons |
| **Resource Tracking Point** | Live GPS standard — **out of v1**; markers are operator-placed |

### Pipeline

1. **Georegister** the PDF (ISO 32000 geospatial measure / Esri GeoPDF viewport → projected CRS → WGS84).
2. **Extract candidate points** from the PDF:
   - Named GeoPDF / optional-content features if present
   - Positioned text labels matching ICS patterns (`DP-12`, `H-3`, `ICP`, `Camp`, `Staging`, helibase, lookout, base)
   - Vector symbols only as a secondary heuristic
3. **Operator review** is first-class: accept, reject, relabel, or **add** a missed point.
4. Store an **app-owned MapPoint list** (category + label + WGS84).

**Daily PDF replace:** keep resource placements in WGS84; update map/points to the new edition.

**Sample PDF (G1) ✅:** [`docs/samples/geopdf/ops_arch_e_land_20260824_1905_HighLava_WAGPF000684_0825day.pdf`](docs/samples/geopdf/ops_arch_e_land_20260824_1905_HighLava_WAGPF000684_0825day.pdf)

Inspected 2026-08-25: PDF 1.7, ~6.2 MB, one page (Arch E landscape). ISO 32000 geospatial measure present (`/Subtype/GEO`, `/GPTS`, `/LPTS`, viewport `BBox`). CRS **NAD_1983_UTM_Zone_10N**. Corner GPTS ~45.82–45.94 N, 122.25–121.98 W (High Lava / WA). **No extractable text** — page is JPEG2000 raster tiles (40 images, no `showText`). v1 overlays the georegistered page and the operator **clicks to add** snap points (Session B #11).

---

## 5. Two-way location (map ↔ table) ✅

One `ResourcePlacement`. The **marker stays at the source while in transit**. Typing a destination does **not** teleport the marker until the operator marks **arrival**.

1. **Table → map.** Location cell accepts **free text** plus known-point aliases. Typing a known or free-text destination sets **intent** (`destination`). Marker **does not move** until arrival. On arrival, marker docks at an offset beside the resolved MapPoint (never covering the symbol). Unknown/unresolved text is allowed as destination label; it does not invent a snap target until the operator adds a point or it matches a known label.
2. **Map → table.** Click-and-drag. On drop, resolve the **closest accepted MapPoint**, write that label, dock the marker beside it, and treat that as **arrival** at that point. Closest = geodesic nearest. Clock-position offsets if several resources share a point.

**Label matching ✅:** case-insensitive; ignore spaces/hyphens (`dp12` = `DP-12`); “helispot 3” → `H-3`; “the ICP” → `ICP`.

**No route animation.** Teleport only on arrival (or on drop).

**Drag commit:** location updates on **mouse-up**, not live mid-drag.

---

## 6. Movement model ✅

1. At ICP or camp
2. Leaving ICP/camp, **en route** to a staging area (or other destination)
3. **Arrived** at staging (or other non-ICP/camp point)
4. **Moving** to another staging area
5. **Returning** to ICP/camp
6. Overlay: **providing care / responding to emergency** (manual toggle)

### Colors ✅ (gate G2)

| State | Color | Motion |
| --- | --- | --- |
| At ICP or camp | **Blue** (low-opacity wash) | Static |
| En route / moving (any transit) | **Yellow** (low-opacity wash) | **Subtle pulse** |
| Arrived at other location (staging, DP, H, etc.) | **Green** (low-opacity wash) | Static |
| Providing care / emergency | **Red** (low-opacity wash) | Overlay; wins over blue/yellow/green |

---

## 7. Draft v1 data model ✅

### IncidentMap

GeoPDF blob, CRS/georeference, map edition. One active incident / one PDF edition at a time.

### MapPoint

PMS 936 category (snap-target set in §2), label, WGS84 lon/lat, source (`geopdf_extract` | `manual`), review status (`pending` | `accepted` | `rejected`).

### MedicalResource

Vendor/org, fire-specific name, leader name, leader phone, capability (`ALS` | `BLS`), marker kind (`ambulance` | `firefighter` | `rems_pickup`).

### ResourcePlacement

- `at_point_id` — where the marker is docked (source while in transit)
- `destination` — typed/free-text or resolved MapPoint label; marker moves here **only on arrival**
- dock offset
- optional last lon/lat during drag
- `movement_state`
- `emergency_care` flag

---

## 8. Users ✅

Primary keyboard: **RADO** at ICP. **One operator.** Typical **5–50** medical resources.

The map records **where resources are**. It does not prescribe care.

---

## 9. Sensitive data ✅

- Leader name and phone are **personnel PII**, not patient PHI.
- Do not put PII in URLs.
- No patient identifiers, PCR files, or IWI patient fields in v1.

---

## 10. Open questions

**Phase 1 gate (G1–G3):** logged in §11. Remaining builder items do not block a north-up shell.

**Resolved (Session A/B):**

| # | Question | Resolution |
| --- | --- | --- |
| 1 | Table columns | Nothing missing |
| 2 | ILS | Removed; ALS/BLS only |
| 3 | Location input | Free text + aliases |
| 4 | Type → move marker | Only on arrival; stay at source while en route |
| 5 | Colors | Blue / yellow+pulse / green / red overlay |
| 6 | Operators | One |
| 7 | Scale | 5–50 resources |
| 8 | Drag preview | Commit on drop |
| 9 | Snap targets | DP, Helispot, Helibase, ICP, Camp, Staging, Safety Zone, Lookout, Incident Base |
| 10 | Daily PDF replace | Keep resources; update map to new edition |
| 11 | Add missed points | Yes |
| 12 | Rotate | True north only; no rotation |

**Still open (builder):**

| # | Question | Owner | Status |
| --- | --- | --- | --- |
| 13 | Map library (north-up; rotation **not** required) | Builder | 🟡 Leaflet or MapLibre |
| 14 | GeoPDF georegistration: in-browser vs server GDAL/PDFium | Builder | 🟡 Sample has ISO 32000 GEO measure — in-browser parse is viable |
| 15 | Auth / persistence / hosting | Builder | ❓ Phase 4 |

---

## 11. Decision log

1. Write the decision here (date, decision, rationale, **who**).
2. Flip matching ❓/🟡 to ✅ in this doc.
3. Mark the matching §10 row resolved.

| Date | Decision | Rationale | Who | Supersedes |
| --- | --- | --- | --- | --- |
| 2026-08-25 | v1 is a two-pane GeoPDF map + resource table, not an IWI/forms tracker | Product vision rewrite | Builder (user) | Prior IWI-centric PLANNING.md |
| 2026-08-25 | Import path is GeoPDF only | User lock; Event GDB is naming/symbology only | Builder (user) | Event GDB sidecar option |
| 2026-08-25 | Location column is two-way | User lock | Builder (user) | Location as display-only |
| 2026-08-25 | Dropped from v1: REMS dual reporting, RTW, GAR, IWI event log, old NFR bundle, old out-of-scope bans | User lock | Builder (user) | Prior “already locked” list |
| 2026-08-25 | G1: SME reports sample GeoPDF received for `docs/samples/geopdf/` | Session B G1 | SME | Confirm filename on disk |
| 2026-08-25 | G1 confirmed: `docs/samples/geopdf/ops_arch_e_land_20260824_1905_HighLava_WAGPF000684_0825day.pdf` (High Lava, NAD83 UTM 10N, GEO measure) | File on disk + inspect | Builder | G1 unconfirmed path |
| 2026-08-25 | G2: Blue = at ICP/camp; yellow + pulse = en route/moving; green = arrived at other location; red = emergency/care (manual toggle) | Session A #5 | SME | Draft color language |
| 2026-08-25 | G3: Snap targets = Drop Point, Helispot, Helibase, ICP, Camp, Staging Area, Safety Zone, Lookout, Incident Base | Session B #9 | SME | “set TBD until Session B” |
| 2026-08-25 | Added snap types Unimproved Helispot and Junction | User request; PMS 910 Event Point Junction and PMS 936 unimproved helispot class | Builder (user) | G3 list without those two |
| 2026-08-25 | Remove ILS; capability is ALS/BLS only | Session A #2 | SME | ALS/BLS/ILS column |
| 2026-08-25 | Location cell allows free text; aliases dp12 / helispot 3 / the ICP | Session A #3 | SME | Autocomplete-only default |
| 2026-08-25 | Marker stays at source while in transit; move on arrival only | Session A #4 | SME | Type-to-teleport immediately |
| 2026-08-25 | One operator; 5–50 resources | Session A #6–7 | SME | Multi-user unknown |
| 2026-08-25 | Operator may add missed map points | Session B #11 | SME | Import-only |
| 2026-08-25 | Daily PDF replace keeps resource WGS84 placements; update map/points | Session B #10 | SME | Reset-on-replace option |
| 2026-08-25 | Map is true north only; no rotation | Session B #12 | SME | Zoom/pan/rotate requirement |
| 2026-08-25 | Primary operator is RADO | PLANNING §8 edit | Builder (user) | MEDL-only operator |
| 2026-08-26 | Freeze the functional local board as `v1.0.0`; live sharing starts version 2.0 | Preserve a stable field-usable baseline before network features | Builder (user) | 0.1 development version |
| 2026-08-26 | Hosted sharing is one RADO editor plus live read-only viewers using Cloudflare Pages + PartyKit | Preserve the one-keyboard operating model while giving MEDL/SITL a current view | Builder (user) | Local-only persistence |
| 2026-08-28 | Freeze the live-viewer baseline as `v2.0.0` (editor + read-only viewers, LAN share links, Pages helpers); production cloud-prem/Pages deploy continues after the tag | Lock a reviewable network-capable board before public GitHub and hosted deploy | Builder (user) | Uncommitted v2 development |
| 2026-08-25 | Phase 1 stack start: Vite + React + TypeScript; north-up map; client in-memory store; PDF file upload | Prepare-to-build | Builder | Unspecified stack |
| 2026-08-25 | High Lava PDF is raster (JP2 tiles); no text extract. Overlay via GPTS + click-to-add points | Probe of sample ops map | Builder | Text-extract pipeline |

---

## 12. Phase 1 lockdown gate

| Gate | Status | Notes |
| --- | --- | --- |
| G1 Sample PDF | ✅ | `ops_arch_e_land_20260824_1905_HighLava_WAGPF000684_0825day.pdf` |
| G2 Status colors | ✅ Logged | §6 |
| G3 Snap types | ✅ Logged | §2 |

G1–G3 are met. Phase 2 can start: georegister this PDF (page → WGS84 via GPTS/LPTS) and extract labeled points from content streams.

---

## 13. Milestones ✅

1. **Phase 0 — Spec lockdown** — G1–G3 ✅.
2. **Phase 1 — Shell.** Two-pane layout, north-up map (zoom/pan), table, PDF upload, placeholder georegistration.
3. **Phase 2 — Points.** PDF point extract, review UI, snap/offset, add-point.
4. **Phase 3 — Resources.** Markers, two-way location (dest while en route; move on arrival; drag-to-closest), color/pulse/red.
5. **Phase 4 — Editions.** New PDF refresh (keep resources), persistence.

---

## 14. References

- [NWCG Data Standards, PMS 910](https://www.nwcg.gov/publications/pms910/nwcg-data-standards-pms-910)
- [PMS 936 GeoOps](https://www.nwcg.gov/publications/pms936/nwcg-standards-for-geospatial-operations-pms-936)
- [PMS 936-1 GISS workflow](https://www.nwcg.gov/publications/pms936-1/nwcg-geographic-information-system-specialist-giss-workflow-pms-936-1)
- [PMS 936 point feature symbology](https://www.nwcg.gov/publications/pms936/symbology/pms-936-point-feature-symbology)
- [Event Geodatabase](https://www.nwcg.gov/publications/pms936/event-geodatabase) (not a v1 import)
- ICS forms: https://www.nwcg.gov/ics-forms (out of v1 product scope)

---

## 15. Explicitly not v1

- Event GDB, NIFS, shapefile, or GPS / Resource Tracking Point live feeds
- IWI coordination, GAR scoring, return-to-work statuses, REMS dual-reporting workflows
- Replacing ICS 204 / 206 / 214 / 211 / 221
- Inventing Event Point categories not in PMS 936 (Lookout and Incident Base are Session B additions that exist in PMS 936 symbology)
- Patient care reports or patient identifiers
- Map rotation
- ILS capability
