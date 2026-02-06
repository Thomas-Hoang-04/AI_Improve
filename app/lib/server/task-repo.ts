import type { AIClassification, CreateTaskInput, Task, TaskStatus } from "../types";
import { classifyTaskWithAI } from "../ai-service";
import { applyAutoPromotion, DEFAULT_WIP_LIMIT, transitionTask } from "../state-machine";

type RepoState = {
  tasks: Task[];
  wipLimit: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __AI_IMPROVE_REPO_STATE__: RepoState | undefined;
}

function getState(): RepoState {
  if (!globalThis.__AI_IMPROVE_REPO_STATE__) {
    globalThis.__AI_IMPROVE_REPO_STATE__ = { tasks: [], wipLimit: DEFAULT_WIP_LIMIT };
  }
  return globalThis.__AI_IMPROVE_REPO_STATE__;
}

function nowIso() {
  return new Date().toISOString();
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `t_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export type ListTasksFilter = {
  status?: TaskStatus;
  notStatus?: TaskStatus;
};

export function listTasks(filter: ListTasksFilter = {}): Task[] {
  const { tasks } = getState();
  return tasks
    .filter((t) => (filter.status ? t.status === filter.status : true))
    .filter((t) => (filter.notStatus ? t.status !== filter.notStatus : true))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getTask(id: string): Task | null {
  return getState().tasks.find((t) => t.id === id) ?? null;
}

export function setWipLimit(limit: number) {
  if (!Number.isFinite(limit) || limit <= 0) throw new Error("Invalid wipLimit");
  getState().wipLimit = Math.floor(limit);
}

export function getWipLimit(): number {
  return getState().wipLimit;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const state = getState();
  const now = nowIso();
  const ai = await classifyTaskWithAI(input);

  const task: Task = {
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

  state.tasks.push(task);
  return task;
}

export function patchTaskMeta(
  id: string,
  patch: Partial<Pick<Task, "title" | "description" | "dueDate" | "effort" | "tags">>,
): Task {
  const state = getState();
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");

  const t = state.tasks[idx];
  const updated: Task = {
    ...t,
    title: patch.title ?? t.title,
    description: patch.description ?? t.description,
    dueDate: patch.dueDate === undefined ? t.dueDate : patch.dueDate,
    effort: patch.effort === undefined ? t.effort : patch.effort,
    tags: patch.tags ?? t.tags,
    updatedAt: nowIso(),
  };

  state.tasks[idx] = updated;
  return updated;
}

export function applyAIResult(id: string, ai: AIClassification): Task {
  const state = getState();
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");
  const t = state.tasks[idx];
  const updated: Task = {
    ...t,
    aiSuggestedImportance: ai.importance,
    aiSuggestedUrgency: ai.urgency,
    aiExplanation: ai.explanation,
    updatedAt: nowIso(),
  };
  state.tasks[idx] = updated;
  return updated;
}

export function acceptAI(id: string): Task {
  const state = getState();
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");
  const t = state.tasks[idx];

  const updated0: Task = {
    ...t,
    importance: t.aiSuggestedImportance,
    urgency: t.aiSuggestedUrgency,
    updatedAt: nowIso(),
  };
  const updated = applyAutoPromotion(updated0);
  state.tasks[idx] = updated;
  return updated;
}

export function overridePriority(id: string, next: { importance: boolean; urgency: boolean }): Task {
  const state = getState();
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");
  const t = state.tasks[idx];

  const updated0: Task = { ...t, ...next, updatedAt: nowIso() };
  const updated = applyAutoPromotion(updated0);
  state.tasks[idx] = updated;
  return updated;
}

export function startTask(id: string): Task {
  const state = getState();
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");
  const t = state.tasks[idx];
  if (t.status !== "BACKLOG") throw new Error("Only BACKLOG tasks can be started");

  const updated: Task = { ...t, status: "TODO", updatedAt: nowIso() };
  state.tasks[idx] = updated;
  return updated;
}

export function transition(id: string, to: TaskStatus): Task {
  const state = getState();
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");
  const t = state.tasks[idx];

  const currentInProgressCount = state.tasks.filter((x) => x.status === "IN_PROGRESS" && x.id !== t.id).length;
  const res = transitionTask(t, to, { currentInProgressCount, wipLimit: state.wipLimit });
  if (!res.ok) throw new Error(res.error);
  state.tasks[idx] = res.task;
  return res.task;
}


