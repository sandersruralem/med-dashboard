# Sample Geospatial PDFs (Phase 0 blocker — gate G1)

v1 imports **only** a GISS Geospatial PDF. The extract pipeline cannot be locked from documentation. Put **1–2 real incident maps** in this folder before Phase 1 code.

## Ask this of MEDL or GISS / SITL

Please provide files that match what you would actually use at ICP:

- **Operations map** Geospatial PDF and/or **IAP map** Geospatial PDF
- Prefer maps that show **drop points, helispots, ICP, camps, and staging** (the snap targets)
- Esri or TerraGo / Avenza-style georegistered PDF is expected (PMS 936 digital map product)

Send or copy the files here as:

```text
docs/samples/geopdf/<incident-or-year>_<ops-or-iap>.pdf
```

Example: `2024_example_ops_map.pdf`

## Handling

- These are incident products. Do not commit sensitive annotations, medical notes, or personnel lists in the same drop.
- If the only available map cannot be stored in git, log an exception in [PLANNING.md](../../../PLANNING.md) §11 (path on a local share, or a public stand-in and why it is weaker).
- After files land, note the path in the SME packet Session B **G1** row and in the decision log.

## Status

**G1 locked.** Sample on disk:

`ops_arch_e_land_20260824_1905_HighLava_WAGPF000684_0825day.pdf`

High Lava ops map (Arch E landscape, 2026-08-24/25). Geospatial measure present: NAD_1983_UTM_Zone_10N, GPTS/LPTS. Use this file for Phase 2 georegistration and extract.
