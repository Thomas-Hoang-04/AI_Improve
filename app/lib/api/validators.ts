import type { CreateTaskInput, Effort, TaskStatus } from "../types";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function readJsonBody<T = unknown>(req: Request): Promise<T> {
  return req.json() as Promise<T>;
}

export function normalizeEffort(v: unknown): Effort | null {
  return v === "S" || v === "M" || v === "L" ? v : null;
}

export function normalizeTaskStatus(v: unknown): TaskStatus | null {
  return v === "BACKLOG" || v === "TODO" || v === "IN_PROGRESS" || v === "REVIEW" || v === "DONE" ? v : null;
}

export function normalizeCreateTaskInput(body: unknown): CreateTaskInput {
  if (!isObject(body)) throw new Error("Body must be an object");
  const title = body.title;
  if (typeof title !== "string" || title.trim().length === 0) throw new Error("title is required");

  const description = typeof body.description === "string" ? body.description : undefined;
  const dueDate = typeof body.dueDate === "string" ? body.dueDate : undefined;
  const effort = normalizeEffort(body.effort) ?? undefined;
  const tags = Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === "string") : undefined;

  return { title: title.trim(), description, dueDate, effort, tags };
}

export function normalizePatchMeta(body: unknown): Partial<{
  title: string;
  description: string;
  dueDate: string | null;
  effort: Effort | null;
  tags: string[];
}> {
  if (!isObject(body)) throw new Error("Body must be an object");

  const patch: Partial<{
    title: string;
    description: string;
    dueDate: string | null;
    effort: Effort | null;
    tags: string[];
  }> = {};

  if ("title" in body) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) throw new Error("title must be a string");
    patch.title = body.title.trim();
  }
  if ("description" in body) {
    if (typeof body.description !== "string") throw new Error("description must be a string");
    patch.description = body.description;
  }
  if ("dueDate" in body) {
    if (body.dueDate !== null && typeof body.dueDate !== "string") throw new Error("dueDate must be string or null");
    patch.dueDate = body.dueDate as string | null;
  }
  if ("effort" in body) {
    if (body.effort !== null && normalizeEffort(body.effort) === null) throw new Error("effort must be S/M/L or null");
    patch.effort = body.effort as Effort | null;
  }
  if ("tags" in body) {
    if (!Array.isArray(body.tags) || body.tags.some((t) => typeof t !== "string")) throw new Error("tags must be string[]");
    patch.tags = body.tags as string[];
  }

  return patch;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}


