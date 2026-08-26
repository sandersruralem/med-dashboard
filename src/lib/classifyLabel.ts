import type { MapPointCategory } from "../types";
import { normalizeLabel } from "./labels";

export function classifyLabel(raw: string): { category: MapPointCategory; label: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const compact = trimmed.toLowerCase().replace(/[\s-]+/g, "");
  const norm = normalizeLabel(trimmed);

  if (/^(?:droppoint|dp)\d+$/.test(compact) || /^DP-\d+$/i.test(norm)) {
    return { category: "drop_point", label: norm.startsWith("DP-") ? norm : `DP-${compact.replace(/\D/g, "")}` };
  }
  if (/^(?:unimprovedhelispot|uh)\d+$/.test(compact) || /^UH-\d+$/i.test(norm)) {
    return {
      category: "unimproved_helispot",
      label: norm.startsWith("UH-") ? norm : `UH-${compact.replace(/\D/g, "")}`,
    };
  }
  if (compact === "unimprovedhelispot" || compact === "uh") {
    return { category: "unimproved_helispot", label: "Unimproved Helispot" };
  }
  if (/^(?:helispot|h)\d+$/.test(compact) || /^H-\d+$/i.test(norm)) {
    return { category: "helispot", label: norm.startsWith("H-") ? norm : `H-${compact.replace(/\D/g, "")}` };
  }
  if (/^(?:junction|jct)\d+$/.test(compact) || /^JCT-\d+$/i.test(norm)) {
    return { category: "junction", label: norm.startsWith("JCT-") ? norm : `JCT-${compact.replace(/\D/g, "")}` };
  }
  if (compact === "junction" || compact === "jct") {
    return { category: "junction", label: "Junction" };
  }
  if (compact === "icp" || compact === "theicp" || /incidentcommand/.test(compact)) {
    return { category: "icp", label: "ICP" };
  }
  if (compact === "helibase" || compact === "hb") {
    return { category: "helibase", label: "Helibase" };
  }
  if (compact === "camp" || /spikecamp|basecamp/.test(compact)) {
    return { category: "camp", label: trimmed };
  }
  if (compact === "staging" || compact === "stg") {
    return { category: "staging", label: "Staging" };
  }
  if (/safetyzone|^sz$/.test(compact)) {
    return { category: "safety_zone", label: trimmed };
  }
  if (compact === "lookout") {
    return { category: "lookout", label: "Lookout" };
  }
  if (compact === "incidentbase" || compact === "base") {
    return { category: "incident_base", label: "Incident Base" };
  }
  return { category: "drop_point", label: norm || trimmed };
}
