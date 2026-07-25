export const DEFAULT_LAB_ACCENT = "#ffd84d";

export function normalizeLabAccent(value: string) {
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toLowerCase() : DEFAULT_LAB_ACCENT;
}

export function labInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("")
    .toUpperCase() || "LAB";
}
