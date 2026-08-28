export const UNIT_COLUMNS = [
  { id: "vendor", label: "Vendor / org" },
  { id: "fireName", label: "Fire name" },
  { id: "kind", label: "Type" },
  { id: "leaderName", label: "Leader" },
  { id: "leaderPhone", label: "Phone" },
  { id: "capability", label: "ALS/BLS" },
  { id: "location", label: "Location" },
  { id: "status", label: "Status" },
  { id: "actions", label: "Arrive / Emergency" },
] as const;

export type UnitColumnId = (typeof UNIT_COLUMNS)[number]["id"];

export type ColumnVisibility = Record<UnitColumnId, boolean>;

export const DEFAULT_COLUMNS: ColumnVisibility = {
  vendor: false,
  fireName: true,
  kind: true,
  leaderName: false,
  leaderPhone: false,
  capability: true,
  location: true,
  status: true,
  actions: true,
};

const STORAGE_KEY = "med-dashboard-unit-columns";

export function visibleCount(vis: ColumnVisibility): number {
  return UNIT_COLUMNS.reduce((n, col) => n + (vis[col.id] ? 1 : 0), 0);
}

export function parseColumnVisibility(raw: unknown): ColumnVisibility {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_COLUMNS };
  const rec = raw as Record<string, unknown>;
  const next = { ...DEFAULT_COLUMNS };
  for (const col of UNIT_COLUMNS) {
    if (typeof rec[col.id] === "boolean") next[col.id] = rec[col.id] as boolean;
  }
  if (visibleCount(next) === 0) next.fireName = true;
  return next;
}

export function loadColumnVisibility(): ColumnVisibility {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COLUMNS };
    return parseColumnVisibility(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_COLUMNS };
  }
}

export function saveColumnVisibility(vis: ColumnVisibility): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vis));
  } catch {
    /* private mode / quota */
  }
}

export function toggleColumn(vis: ColumnVisibility, id: UnitColumnId): ColumnVisibility {
  const next = { ...vis, [id]: !vis[id] };
  if (visibleCount(next) === 0) return vis;
  return next;
}
