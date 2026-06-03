export function formatTournamentName(name: string): string {
  if (!name) return "";
  // Regex to match UUIDs: 8-4-4-4-12 hex characters
  const uuidRegex = /\s*[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\s*/g;
  return name.replace(uuidRegex, "").trim() || name;
}
