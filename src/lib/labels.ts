const ALIASES: Record<string, string> = {
  theicp: "ICP",
  icp: "ICP",
  junction: "Junction",
  jct: "Junction",
  unimprovedhelispot: "Unimproved Helispot",
  uh: "Unimproved Helispot",
};

/** Case-insensitive; ignore spaces/hyphens. Helispot 3 → H-3. */
export function normalizeLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const compact = trimmed.toLowerCase().replace(/[\s-]+/g, "");

  if (ALIASES[compact]) return ALIASES[compact];

  const unimproved = /^(?:unimprovedhelispot|uh)(\d+)$/.exec(compact);
  if (unimproved) return `UH-${unimproved[1]}`;

  const helispot = /^(?:helispot|h)(\d+)$/.exec(compact);
  if (helispot) return `H-${helispot[1]}`;

  const junction = /^(?:junction|jct)(\d+)$/.exec(compact);
  if (junction) return `JCT-${junction[1]}`;

  const drop = /^(?:droppoint|dp)(\d+)$/.exec(compact);
  if (drop) return `DP-${drop[1]}`;

  return trimmed;
}

export function labelsMatch(a: string, b: string): boolean {
  return normalizeLabel(a).toLowerCase() === normalizeLabel(b).toLowerCase();
}

export function findPointByLabel<T extends { label: string }>(points: T[], raw: string): T | undefined {
  const target = normalizeLabel(raw);
  if (!target) return undefined;
  return points.find((p) => labelsMatch(p.label, target));
}

export function filterLabels(labels: string[], query: string): string[] {
  const q = query.trim().toLowerCase().replace(/[\s-]+/g, "");
  if (!q) return labels;
  return labels.filter((label) => {
    const compact = label.toLowerCase().replace(/[\s-]+/g, "");
    return compact.includes(q) || label.toLowerCase().includes(query.trim().toLowerCase());
  });
}
