export function createLabSlug(
  value: string,
  fallbackSuffix = crypto.randomUUID().slice(0, 8),
) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalized || "lab-" + fallbackSuffix;
}
