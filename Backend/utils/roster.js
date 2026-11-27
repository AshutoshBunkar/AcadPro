import { validEmail } from "./challenges.js";

export function identifiers(email, mis) {
  if (typeof email !== "string" || typeof mis !== "string") return null;
  email = email.trim().toLowerCase();
  mis = mis.trim();
  if (!validEmail(email) || !mis || mis.length > 64) return null;
  return { email, mis };
}

export function parseRoster(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("Expected a nonempty JSON array");
  const emails = new Set();
  const numbers = new Set();
  return rows.map((row, index) => {
    const id = identifiers(row?.email, row?.mis);
    if (!id || typeof row.name !== "string" || !row.name.trim() ||
        typeof row.department !== "string" || !row.department.trim() ||
        !Number.isInteger(row.semester) || row.semester < 1 || row.semester > 8)
      throw new Error("Invalid roster row " + (index + 1));
    if (emails.has(id.email) || numbers.has(id.mis)) throw new Error("Duplicate identity at row " + (index + 1));
    emails.add(id.email);
    numbers.add(id.mis);
    return { ...id, name: row.name.trim(), department: row.department.trim(), semester: row.semester };
  });
}
