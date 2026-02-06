import type { CreateTaskInput, Task, TaskStatus } from "./types";
import { applyAutoPromotion, DEFAULT_WIP_LIMIT, transitionTask } from "./state-machine";
import { classifyTaskWithAI } from "./ai-service";

const STORAGE_KEY = "ai_improve_tasks_v1";
const SETTINGS_KEY = "ai_improve_settings_v1";

export type AppSettings = {
  wipLimit: number;
  todoWarnThreshold: number;
};

const DEFAULT_SETTINGS: AppSettings = {
  wipLimit: DEFAULT_WIP_LIMIT,
  todoWarnThreshold: 12,
};

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function readAllTasks(): Task[] {
  const ls = getLocalStorage();
  if (!ls) return [];
  const parsed = safeJsonParse<Task[]>(ls.getItem(STORAGE_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

function writeAllTasks(tasks: Task[]) {
  const ls = getLocalStorage();
  if (!ls) return;
  ls.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function newId(): string {
  // Browser-safe UUID.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `t_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function getSettings(): AppSettings {
  const ls = getLocalStorage();
  if (!ls) return DEFAULT_SETTINGS;
  const parsed = safeJsonParse<Partial<AppSettings>>(ls.getItem(SETTINGS_KEY)) ?? {};
  return {
    wipLimit:
      typeof parsed.wipLimit === "number" && parsed.wipLimit > 0 ? parsed.wipLimit : DEFAULT_SETTINGS.wipLimit,
    todoWarnThreshold:
      typeof parsed.todoWarnThreshold === "number" && parsed.todoWarnThreshold > 0
        ? parsed.todoWarnThreshold
        : DEFAULT_SETTINGS.todoWarnThreshold,
  };
}

export function setSettings(next: Partial<AppSettings>): AppSettings {
  const ls = getLocalStorage();
  const merged: AppSettings = { ...getSettings(), ...next };
  if (ls) ls.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

export function listTasks(): Task[] {
  return readAllTasks().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getTask(id: string): Task | null {
  return readAllTasks().find((t) => t.id === id) ?? null;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const tasks = readAllTasks();
  const now = nowIso();

  const ai = await classifyTaskWithAI(input);

  const base: Task = {
    id: newId(),
    title: input.title,
    description: input.description ?? "",
    status: "BACKLOG",
    importance: false,
    urgency: false,
    aiSuggestedImportance: ai.importance,
    aiSuggestedUrgency: ai.urgency,
    aiExplanation: ai.explanation,
    effort: input.effort ?? null,
    dueDate: input.dueDate ?? null,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };

  tasks.push(base);
  writeAllTasks(tasks);
  return base;
}

export async function rerunAI(id: string): Promise<Task> {
  const tasks = readAllTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");

  const t = tasks[idx];
  const ai = await classifyTaskWithAI({
    title: t.title,
    description: t.description,
    dueDate: t.dueDate ?? undefined,
    effort: t.effort ?? undefined,
    tags: t.tags,
  });

  const updated: Task = {
    ...t,
    aiSuggestedImportance: ai.importance,
    aiSuggestedUrgency: ai.urgency,
    aiExplanation: ai.explanation,
    updatedAt: nowIso(),
  };

  tasks[idx] = updated;
  writeAllTasks(tasks);
  return updated;
}

export function acceptAISuggestion(id: string): Task {
  const tasks = readAllTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");

  const t = tasks[idx];
  const updated0: Task = {
    ...t,
    importance: t.aiSuggestedImportance,
    urgency: t.aiSuggestedUrgency,
    updatedAt: nowIso(),
  };
  const updated = applyAutoPromotion(updated0);

  tasks[idx] = updated;
  writeAllTasks(tasks);
  return updated;
}

export function overridePriority(id: string, next: { importance: boolean; urgency: boolean }): Task {
  const tasks = readAllTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");

  const t = tasks[idx];
  const updated0: Task = { ...t, ...next, updatedAt: nowIso() };
  const updated = applyAutoPromotion(updated0);

  tasks[idx] = updated;
  writeAllTasks(tasks);
  return updated;
}

export function startTask(id: string): Task {
  // Manual “Start task” action: BACKLOG → TODO (explicit user action)
  const tasks = readAllTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");

  const t = tasks[idx];
  if (t.status !== "BACKLOG") throw new Error("Only BACKLOG tasks can be started");

  const updated: Task = { ...t, status: "TODO", updatedAt: nowIso() };
  tasks[idx] = updated;
  writeAllTasks(tasks);
  return updated;
}

export function transition(id: string, to: TaskStatus): Task {
  const settings = getSettings();
  const tasks = readAllTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");

  const t = tasks[idx];
  const currentInProgressCount = tasks.filter((x) => x.status === "IN_PROGRESS" && x.id !== t.id).length;
  const res = transitionTask(t, to, { currentInProgressCount, wipLimit: settings.wipLimit });
  if (!res.ok) throw new Error(res.error);

  tasks[idx] = res.task;
  writeAllTasks(tasks);
  return res.task;
}


