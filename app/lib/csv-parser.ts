import type { CreateTaskInput, CSVTask, Effort } from "./types";

function splitCSVLine(line: string): string[] {
  // Minimal CSV: supports quoted fields with commas and double quotes.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeEffort(v: string | undefined): Effort | undefined {
  const s = (v ?? "").trim().toUpperCase();
  if (s === "S" || s === "M" || s === "L") return s;
  return undefined;
}

function normalizeTags(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  // Accept "a,b,c" or "a; b; c"
  const parts = v
    .split(/[;,]/g)
    .map((t) => t.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export function parseCSVTasks(csvText: string): CSVTask[] {
  const lines = csvText
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const header = splitCSVLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => header.indexOf(name.toLowerCase());

  const titleI = idx("title");
  if (titleI === -1) throw new Error("CSV must include a 'title' column");

  const descI = idx("description");
  const dueI = idx("duedate");
  const effortI = idx("effort");
  const tagsI = idx("tags");

  const tasks: CSVTask[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const title = cols[titleI]?.trim();
    if (!title) continue;
    const t: CSVTask = { title };
    const description = descI !== -1 ? cols[descI]?.trim() : undefined;
    const dueDate = dueI !== -1 ? cols[dueI]?.trim() : undefined;
    const effort = effortI !== -1 ? (cols[effortI]?.trim() as Effort) : undefined;
    const tags = tagsI !== -1 ? cols[tagsI]?.trim() : undefined;

    if (description) t.description = description;
    if (dueDate) t.dueDate = dueDate;
    if (effort) t.effort = normalizeEffort(effort);
    if (tags) t.tags = tags;

    tasks.push(t);
  }
  return tasks;
}

export function csvTaskToCreateInput(t: CSVTask): CreateTaskInput {
  return {
    title: t.title,
    description: t.description,
    dueDate: t.dueDate,
    effort: normalizeEffort(t.effort),
    tags: normalizeTags(t.tags),
  };
}


