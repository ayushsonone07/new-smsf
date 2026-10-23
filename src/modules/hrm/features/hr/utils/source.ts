const SOURCE_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  naukri: "Naukri",
  referral: "Referral",
  walk_in: "Walk-in",
  college: "College",
  collage: "College",
  other: "Other",
};

export function normalizeSourceKey(source: string): string {
  return source
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function canonicalSourceKey(source: string): string {
  const key = normalizeSourceKey(source);
  return key === "collage" ? "college" : key;
}

export function prettySource(source: string): string {
  const key = canonicalSourceKey(source);
  if (SOURCE_LABELS[key]) return SOURCE_LABELS[key];
  return source.trim() || "Other";
}

export function normalizeSourceForSave(source: string): string {
  return canonicalSourceKey(source);
}
