# Phase 0 SME packet — MEDL (and GISS for a sample PDF)

Facilitator guide for locking v1 of the medical resource **map + table** dashboard. Take this to MEDL. Ask a GISS/SITL only if you need a Geospatial PDF you do not already have.

**Do not ask** GDB vs PDF, ICS form replace vs supplement, IWI/PACE/GAR, or return-to-work. Those are out of v1.

Companion spec: [`PLANNING.md`](../PLANNING.md). Session A/B answers are **logged in PLANNING.md §11** (2026-08-25). G2/G3 locked. G1: confirm the PDF is on disk.

**Facilitation rules**

- Show the two-pane sketch and PMS 936 point names; ask what is wrong. Do not ask SMEs to design a GIS schema.
- Capture **who said it** and incident type (Type 1 IMT vs Type 3) — answers may differ.
- Prefer “record location” over “enforce judgment.” The app is not a decision engine.
- Mark unknowns as SOP-dependent rather than inventing NWCG language.

**Suggested sketch to put in front of them**

```
+----------------------------------+-------------+
| MAP (~2/3)                       | TABLE (~1/3)|
| GeoPDF · zoom · pan · north-up   | org | name  |
| DP / H / ICP / Camp markers      | lead| phone |
| Drag ambulance / EMT / REMS      | ALS | loc   |
+----------------------------------+-------------+
```

---



## Session A — Table and movement (MEDL, ~30 min)

Blocks **G2** (colors) and most table/UX defaults.

### A1. Columns

Proposed columns: **vendor/organization**, **fire-specific name**, **leader name**, **leader phone**, **ALS / BLS / ILS**, **location**.

- What is wrong or missing? Radio designator? Agency resource number?
- Confirm **ILS** (intermediate life support) as a displayed capability vs AEMT-only language.



### A2. Two-way location

Walk this twice:

1. Type `DP-12` in the location cell → that resource’s marker jumps to an offset beside DP-12.
2. Drag the marker across the map → on drop, the cell becomes the **closest** known point (DP, H, ICP, camp, …).

Ask:

- Autocomplete from the known-point list only, or allow free text? Free text
- What aliases must resolve? (`dp12` → `DP-12`, “helispot 3” → `H-3`, “the ICP” → `ICP`?)yes to all
- If they type `ICP`, should the row also flip to **at ICP/camp**, or is movement state separate? Do not move marker until they arrive at a loaction, leave at source while in transit



### A3. Movement states and colors (gate G2)

Walk the six states:

1. At ICP or camp
2. Leaving ICP/camp, en route to staging
3. Arrived at staging
4. Moving to another staging area
5. Returning to ICP/camp
6. Overlay: providing care / responding to emergency → **row highlighted red**

Ask:

- Confirm the list. What is missing or wrongly split? thisis correct
- Pick **static colors** for at-ICP/camp vs at-staging.
- Confirm a **subtle pulse** for any en-route/moving state (not distracting on a projector).
- Confirm **red = care/emergency** is a **manual toggle** (default) vs something else.

**Log the color/pulse answers in PLANNING.md §11** — this is gate **G2**.

### A4. Who uses it

- Who sits at the keyboard: one MEDL at ICP, or several people dragging at once?
- Typical counts on a large fire: ambulances / EMTs / REMS (tens vs more)?



### Session A notes


| #   | Topic                                       | Answer                                                                                      | Who |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------- | --- |
| 1   | Columns / missing fields                    | Nothing Missing                                                                             | SME |
| 2   | ILS display                                 | remove ILS                                                                                  | SME |
| 3   | Autocomplete vs free text; aliases          | Free Text                                                                                   |     |
| 4   | Type location → also change movement state? | Only when upon arrival, not while enroute                                                   |     |
| 5   | Colors / pulse / emergency red (G2)         | Blue at ICP/Camp,Yellow when moving, Green arrival at other location. Pulsing while enroute |     |
| 6   | One operator vs multi-user                  | One Operator                                                                                |     |
| 7   | Typical resource counts                     | anyhwere from 5-50                                                                          |     |


---



## Session B — What appears on the PDF (MEDL, ~20 min)

Blocks **G3** (snap types). Collect **G1** (sample PDF) here if you do not have one yet.

v1 **only imports a Geospatial PDF**. Points are extracted from that file and reviewed. We use PMS 936 **names** (Drop Point, Helispot, ICP, Camp, Staging Area, …) so labels match what crews already see on the map.

### B1. Snap targets (gate G3)

Which symbols **must** become known locations (type-to-move and closest-point on drop)?


| PMS 936 category      | Include?               | Notes |
| --------------------- | ---------------------- | ----- |
| Drop Point            | Yes                    |       |
| Helispot              | Yes                    |       |
| Helibase              | Yes                    |       |
| Incident Command Post | Yes                    |       |
| Camp                  | Yes                    |       |
| Staging Area          | Yes                    |       |
| Safety Zone           | Yes                    |       |
| Other (name them)     | Lookout, Incident Base |       |


**Log the checked set in PLANNING.md §11** — this is gate **G3**.

### B2. Extract review

PDF extract will miss or mis-label points. The operator reviews: accept, reject, relabel.

- May they **add** a point the extractor missed (e.g. a spike camp)? Yes
- When the daily ops map PDF is replaced: **keep** resource placements in WGS84, or **reset** markers?keep resource, but update to changes



### B3. Map behavior

- Rotate freely, or snap north to true/grid north? true north only, no rotation



### B4. Sample file (gate G1)

Ask MEDL or GISS for **1–2 real incident Geospatial PDFs** (operations map or IAP map). Place them in `[docs/samples/geopdf/](samples/geopdf/)` and follow that README (redact sensitive notes if needed; the map itself is an incident product).

Without a sample PDF, the extract pipeline cannot be locked.

### Session B notes


| #   | Topic                            | Answer              | Who |
| --- | -------------------------------- | ------------------- | --- |
| 9   | Snap-target categories (G3)      | see above           |     |
| 10  | Daily PDF replace: keep vs reset | keep                |     |
| 11  | Operator may add missed points?  | yes                 |     |
| 12  | Free rotate vs north snap        | north locked        |     |
| G1  | Sample PDF received? Path?       | received, in folder |     |


---



## After the sessions

1. Copy answers into [PLANNING.md](../PLANNING.md) §10 (resolve rows) and §11 (decision log).
2. Flip 🟡 → ✅ only when logged.
3. Do not start Phase 1 until G1, G2, and G3 are in the decision log.

